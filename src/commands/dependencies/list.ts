import {Args, Command, Flags} from '@oclif/core'
import {gcloudAuth, gcloudFlags} from '../../utils/gcloud-auth'
import {gcloudFunctionDescribe} from '../../utils/gcloud-function'
import {getDependenciesFromMetadata} from '../../utils/dependencies'
import chalk = require('chalk')

export default class DependenciesList extends Command {
  static description = 'List currently installed packages for provided gcff cloud function'

  static examples = [
    '<%= config.bin %> <%= command.id %> function-name',
  ]

  public static enableJsonFlag = true

  static flags = {
    ...gcloudFlags,
    region: Flags.string({
      description: 'The Cloud region for the function',
      required: true,
      default: 'us-central1',
    }),
  }

  static args = {
    functionName: Args.string({
      description: 'Cloud function name',
      required: true,
    }),
  }

  public async run(): Promise<{dependencies: Record<string, string>}> {
    const {args, flags} = await this.parse(DependenciesList)

    const auth = await gcloudAuth(flags, this)

    const func = await gcloudFunctionDescribe({
      functionName: args.functionName,
      region: flags.region,
      auth,
    })

    if (!func) {
      throw new Error('Cloud function not found')
    }

    const dependencies = getDependenciesFromMetadata(func.buildConfig.environmentVariables).unitedDependencies
    this.log(`Found ${Object.keys(dependencies).length} dependencies:`)
    for (const [key, value] of Object.entries(dependencies)) {
      this.log(` ${chalk.bold(key)}: '${value}'`)
    }

    return {dependencies}
  }
}
