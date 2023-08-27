import {Args, Command, Flags} from '@oclif/core'
import {gcloudAuth, gcloudFlags} from '../../utils/gcloud-auth'
import {
  gcloudFunctionDescribe,
  gcloudFunctionDownloadSources,
  gcloudFunctionPatch,
  gcloudFunctionUploadSources,
  gcloudFunctionWaitOperationCompletion,
} from '../../utils/gcloud-function'
import {getBucket} from '../../utils/gcs-utils'
import * as fs from 'node:fs/promises'
import {
  getAllDependencies,
  unitedDependencies,
} from '../../utils/dependencies-list'
import {updateFile} from '../../utils/zip'
import {confirm} from '../../utils/confirm'
import chalk = require('chalk');
import {stage} from '../../utils/stage'
import {addUnitedDependenciesToMetadata} from '../../utils/dependencies'

export default class DependenciesSync extends Command {
  static description = 'Update dependencies without updating server';

  static examples = ['<%= config.bin %> <%= command.id %> function-name'];

  static flags = {
    ...gcloudFlags,
    region: Flags.string({
      description: 'The Cloud region for the function',
      default: 'us-central1',
    }),
    ignoreConflicts: Flags.boolean({
      description:
        'Ignore conflicts and upload only dependencies without conflicts',
      required: false,
      default: false,
    }),
    addDependency: Flags.custom({
      description: 'Force add new dependency, overrides if dependency existed',
      aliases: ['add'],
      required: false,
      multiple: true,
      async parse(input) {
        const match = input.match(/^([^:]+):(.*)$/)
        if (!match) {
          throw new Error('incorrect dependency format, expected name:version')
        }

        return {
          dependency: match[1],
          version: match[2],
        }
      },
      default: [],
    })(),
    removeDependency: Flags.string({
      description:
        'Force remove dependency, returns error if dependency existed',
      aliases: ['remove'],
      required: false,
      multiple: true,
      default: [],
    }),
    loadDependencies: Flags.file({
      description: 'Load dependencies from JSON file, use field "dependencies"',
      aliases: ['load'],
      required: false,
      exists: true,
      exclusive: ['addDependency', 'removeDependeny'],
    }),
    yes: Flags.boolean({
      char: 'y',
      description: 'Automatically confirm any action',
    }),
  };

  static args = {
    functionName: Args.string({
      description: 'Cloud function name',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(DependenciesSync)

    const auth = await gcloudAuth(flags, this)

    const func = await gcloudFunctionDescribe({
      functionName: args.functionName,
      region: flags.region,
      auth,
    })

    if (!func) {
      throw new Error('Cloud function not found')
    }

    const {dependencies} = await stage('Fetching information', async () => {
      const dependencies: Record<string, string> = await (flags.loadDependencies ?
        async () => {
          return JSON.parse(
            await fs.readFile(flags.loadDependencies!, {encoding: 'utf-8'}),
          ).dependencies as Record<string, string>
        } :
        async () => {
          const {bucket, namePrefix} = getBucket({
            serviceConfig: func.serviceConfig,
            auth,
          })

          const dependencies = await getAllDependencies({
            bucket,
            moduleNamePrefix: namePrefix,
            buildConfig: func.buildConfig,
          })

          const merged = unitedDependencies({
            server: dependencies.server,
            modules: dependencies.modules,
          })

          if (merged.conflicts.length > 0 && !flags.ignoreConflicts) {
            this.logJson({conflicts: merged.conflicts})
            this.error(
              `Found ${merged.conflicts.length} conflicts. Consider checking conflicts via command 'dependencies check' and solving them by --addDependency and --removeDependency or --loadDependencies flags`,
            )
          }

          for (const removed of flags.removeDependency) {
            if (merged.dependencies[removed] === undefined) {
              this.logJson({dependencies: merged.dependencies})
              this.error(`There is no dependency ${removed}`)
            }

            const version = merged.dependencies[removed]
            delete merged.dependencies[removed]
            this.log(`Dependency '${removed}':'${version}' is removed`)
          }

          // bug in oclif in type deduction
          for (const added of flags.addDependency as unknown as {
              dependency: string;
              version: string;
            }[]) {
            const prev = merged.dependencies[added.dependency]
            merged.dependencies[added.dependency] = added.version
            if (prev) {
              this.log(
                `Dependency '${added.dependency}' version is changed '${prev}' -> '${added.version}'`,
              )
            } else {
              this.log(
                `Dependency '${added.dependency}':'${added.version}' is added`,
              )
            }
          }

          return merged.dependencies
        })()

      return {dependencies}
    })

    this.logJson(dependencies)

    await confirm(
      `You are about to update dependencies for Google Cloud Function ${chalk.bold(
        `${auth.project}/${args.functionName}`,
      )}`,
    )

    const op = await stage('Preparing cloud function', async () => {
      const content = await updateFile(
        await gcloudFunctionDownloadSources({
          functionName: args.functionName,
          region: flags.region,
          auth,
        }),
        'package.json',
        Buffer.from(
          new TextEncoder().encode(JSON.stringify({dependencies}, null, 2)),
        ),
      )

      func.buildConfig.source.storageSource = await gcloudFunctionUploadSources(
        {
          region: flags.region,
          auth,
          body: content,
        },
      )

      func.buildConfig.environmentVariables = addUnitedDependenciesToMetadata(
        func.buildConfig.environmentVariables,
        dependencies,
      )

      return gcloudFunctionPatch({
        functionName: args.functionName,
        region: flags.region,
        auth,
        updateFields: [
          'buildConfig.environmentVariables',
          'buildConfig.source.storageSource',
        ],
        payload: func,
      })
    })

    await gcloudFunctionWaitOperationCompletion({
      name: 'Updating cloud function',
      currentState: op,
      accessToken: auth.accessToken,
    })
  }
}
