import {Args, Command, Flags} from '@oclif/core'
import {gcloudAuth, gcloudFlags} from '../../utils/gcloud-auth'
import {gcloudFunctionDescribe} from '../../utils/gcloud-function'
import {diffDependencies} from '../../utils/dependencies'
import {getBucket} from '../../utils/gcs-utils'
import {
  getAllDependencies,
  unitedDependencies,
} from '../../utils/dependencies-list'
import * as fs from 'node:fs/promises'

export default class DependenciesCheck extends Command {
  static description =
    'Check relevancy for nodejs dependencies for provided gcff cloud function';

  static examples = ['<%= config.bin %> <%= command.id %> function-name'];

  public static enableJsonFlag = true;

  static flags = {
    ...gcloudFlags,
    region: Flags.string({
      description: 'The Cloud region for the function',
      default: 'us-central1',
    }),
    saveUpdatedDependencies: Flags.file({
      description: 'JSON File name to save updated dependencies',
      required: false,
    }),
  };

  static args = {
    functionName: Args.string({
      description: 'Cloud function name',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(DependenciesCheck)

    const auth = await gcloudAuth(flags, this)

    const func = await gcloudFunctionDescribe({
      functionName: args.functionName,
      region: flags.region,
      auth,
    })

    if (!func) {
      throw new Error('Cloud function not found')
    }

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

    const diff = diffDependencies(dependencies.united, merged.dependencies)

    const res = {
      current: dependencies,
      proposed: merged.dependencies,
      conflicts: merged.conflicts,
      missingDependencies: Object.fromEntries(diff.added),
      extraDependencies: Object.fromEntries(diff.removed),
      updatedDependencies: Object.fromEntries(diff.changed),
      upToDate: diff.equals,
    }

    if (flags.saveUpdatedDependencies) {
      await fs.writeFile(
        flags.saveUpdatedDependencies,
        JSON.stringify({dependencies: merged.dependencies}, null, 2),
        {encoding: 'utf-8'},
      )
    }

    this.logJson(res)
    if (res.conflicts.length > 0) {
      this.error(`Found ${res.conflicts.length} conflicts`)
    }
  }
}
