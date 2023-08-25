import {Args, Command, Flags} from '@oclif/core'
import * as path from 'node:path'
import * as chalk from 'chalk'
import {
  gcloudFunctionDescribe,
  gcloudFunctionPatch,
  gcloudFunctionUploadSources,
  gcloudFunctionWaitOperationCompletion,
} from '../../utils/gcloud-function'
import {gcloudAuth, gcloudFlags} from '../../utils/gcloud-auth'
import {
  addDependenciesToMetadata,
  diffDependencies,
  getDependenciesFromMetadata,
  getDependenciesFromPackageJson,
  mergeDependencies,
} from '../../utils/dependencies'
import {stage} from '../../utils/stage'
import {confirm} from '../../utils/confirm'
import {generate} from '../../utils/zip'

export default class ServerDeploy extends Command {
  static description = 'Updates Google Cloud Function';

  static examples = [
    '<%= config.bin %> <%= command.id %> function-name /path/to/server/dist',
  ];

  static flags = {
    ...gcloudFlags,
    region: Flags.string({
      description: 'The Cloud region for the function',
      required: true,
      default: 'us-central1',
    }),
    force: Flags.boolean({
      char: 'f',
      description: 'Override existing source without verification',
      default: false,
    }),
    'entry-point': Flags.string({
      description:
        'Name of a Google Cloud Function (as defined in source code) that will be executed',
    }),
    gcffPath: Flags.string({
      description: 'Google Cloud Storage bucket path for serving content',
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
    path: Args.directory({
      description:
        'Location of source code to deploy (root directory of function source)',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(ServerDeploy)

    args.path = path.resolve(args.path)

    const auth = await gcloudAuth(flags, this)

    const func = await gcloudFunctionDescribe({
      functionName: args.functionName,
      region: flags.region,
      auth,
    })

    if (!func) {
      throw new Error('Gcloud function not found')
    }

    const gcffPath =
      flags.gcffPath ?? func.serviceConfig.environmentVariables?.GCFF_PATH
    if (!gcffPath) {
      this.error(
        'No GCFF_PATH provided (not via env variable nor via parameter). Consider using --gcffPath',
      )
    }

    const dependenciesFromPackageJson = await getDependenciesFromPackageJson(
      args.path,
    )

    const dependencies = flags.force ? (() => {
      this.warn('Dependency check has been disabled by the `--force` flag. Only server dependencies are going to be installed, which may break some clients.')
      return dependenciesFromPackageJson
    })() : await (async () => {
      const dependenciesFromMetadata = getDependenciesFromMetadata(
        func.buildConfig.environmentVariables,
      )

      const dependencies = mergeDependencies([
        {
          sourceName: 'uploaded',
          dependencies: dependenciesFromMetadata.unitedDependencies,
        },
        {
          sourceName: 'local',
          dependencies: dependenciesFromPackageJson,
        },
      ])

      if (dependencies.conflicts.length > 0) {
        printConflicts(this, dependencies.conflicts)

        this.error('Conflict in versions detected')
      }

      const dependenciesDiff = diffDependencies(
        dependenciesFromMetadata.unitedDependencies,
        dependencies.dependencies,
      )

      printDependenciesDiff(this, dependenciesDiff)
      return dependencies.dependencies
    })()

    await confirm(
      `You are about to upload ${chalk.bold(
        args.path,
      )} to Google Cloud Function ${chalk.bold(
        `${auth.project}/${args.functionName}`,
      )}`,
      flags.yes,
    )

    const op = await stage('Preparing cloud function', async () => {
      const content = await generate(args.path, dependencies)

      func.buildConfig.source.storageSource = await gcloudFunctionUploadSources(
        {
          region: flags.region,
          auth,
          body: content,
        },
      )

      func.buildConfig.environmentVariables = addDependenciesToMetadata(
        func.buildConfig.environmentVariables,
        dependenciesFromPackageJson,
        dependencies,
      )

      func.serviceConfig.environmentVariables = {
        ...func.serviceConfig.environmentVariables,
        GCFF_PATH: gcffPath,
      }

      return gcloudFunctionPatch({
        functionName: args.functionName,
        region: flags.region,
        auth,
        updateFields: [
          'buildConfig.environmentVariables',
          'buildConfig.source.storageSource',
          'serviceConfig.environmentVariables',
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

export function printConflicts(
  command: Command,
  conflicts: ReturnType<typeof mergeDependencies>['conflicts'],
): void {
  for (const conflict of conflicts) {
    command.log(
      `Conflict in versions for dependency '${chalk.bold(
        conflict.dependencyName,
      )}':`,
    )
    for (const version of Object.entries(conflict.versions)) {
      command.log(
        `  '${chalk.bold(version[0])}' is required for ${version[1].join(', ')}`,
      )
    }
  }
}

export function printDependenciesDiff(
  command: Command,
  dependenciesDiff: ReturnType<typeof diffDependencies>,
): void {
  if (dependenciesDiff.added.length > 0) {
    command.log('This deploy will add next packages to dependencies:')
    for (const added of dependenciesDiff.added) {
      command.log(`  '${chalk.bold(added[0])}': version '${added[1]}'`)
    }
  }

  /* istanbul ignore next */
  // it's impossible that merged dependency remove something, put here just for consistency
  if (dependenciesDiff.removed.length > 0) {
    command.log('This deploy will remove next packages from dependencies:')
    for (const removed of dependenciesDiff.removed) {
      command.log(`  '${chalk.bold(removed[0])}': version was '${removed[1]}'`)
    }
  }

  /* istanbul ignore next */
  // it's impossible that merged dependency change something, put here just for consistency
  if (dependenciesDiff.changed.length > 0) {
    command.log('This deploy will change next packages in dependencies:')
    for (const changed of dependenciesDiff.changed) {
      command.log(
        `  '${chalk.bold(changed[0])}': '${changed[1].fromVersion}' -> '${
          changed[1].toVersion
        }'`,
      )
    }
  }
}
