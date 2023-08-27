import {Args, Command, Flags} from '@oclif/core'
import {gcloudAuth, gcloudFlags} from '../../utils/gcloud-auth'
import {gcloudFunctionDescribe} from '../../utils/gcloud-function'
import {findModules} from '../../utils/find-modules'
import {getBucket} from '../../utils/gcs-utils'

export default class ClientList extends Command {
  static description = 'List all modules pushed to cloud function';

  static examples = ['<%= config.bin %> <%= command.id %> function-name'];

  static flags = {
    ...gcloudFlags,
    region: Flags.string({
      description: 'The Cloud region for the function',
      default: 'us-central1',
    }),
  };

  static args = {
    functionName: Args.string({
      description: 'Cloud function name',
      required: true,
    }),
  };

  static enableJsonFlag = true

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(ClientList)

    const auth = await gcloudAuth(flags, this)

    const func = await gcloudFunctionDescribe({
      functionName: args.functionName,
      region: flags.region,
      auth,
    })

    const {bucket, namePrefix} = getBucket({serviceConfig: func.serviceConfig, auth})

    const modules = await findModules({bucket, namePrefix})
    this.logJson(modules)
  }
}
