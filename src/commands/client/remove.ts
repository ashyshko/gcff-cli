import {Command, Flags} from '@oclif/core'
import {gcloudAuth, gcloudFlags} from '../../utils/gcloud-auth'
import {
  batchOperations,
  clientPushArgs,
  clientPushFlags,
} from '../../utils/push-client'
import {gcloudFunctionDescribe} from '../../utils/gcloud-function'
import {getBucket} from '../../utils/gcs-utils'
import chalk = require('chalk');
import {confirm} from '../../utils/confirm'

export default class ClientRemove extends Command {
  static description =
    'Removes client and its related files from cloud function';

  static examples = ['<%= config.bin %> <%= command.id %> function-name/path'];

  static flags = {
    ...gcloudFlags,
    region: Flags.string({
      description: 'The Cloud region for the function',
      default: 'us-central1',
    }),
    yes: clientPushFlags.yes,
  };

  static args = {
    functionPath: clientPushArgs.functionPath,
  };

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(ClientRemove)

    const auth = await gcloudAuth(flags, this)

    const func = await gcloudFunctionDescribe({
      functionName: args.functionPath!.functionName,
      region: flags.region,
      auth,
    })

    const {bucket, namePrefix} = getBucket({
      serviceConfig: func.serviceConfig,
      auth,
    })

    const prevResolveJson: {
      files: Record<string, string>;
      rules: unknown[];
      dependencies: Record<string, string>;
    } = JSON.parse(
      new TextDecoder().decode(
        (
          await bucket
          .file(`${namePrefix}${args.functionPath!.destination}resolve.json`)
          .download()
        )[0],
      ),
    )

    const fileEntries: Array<[string, null]> = [
      ['resolve.json', null],
      ...Object.entries(prevResolveJson.files).map(([name]): [string, null] => [
        name,
        null,
      ]),
    ]

    this.log(
      `This change will ${chalk.red(
        `remove ${chalk.bold(fileEntries.length)} files:`,
      )}`,
    )
    for (const removed of fileEntries) {
      this.log(`  ${chalk.italic(removed[0])}`)
    }

    await confirm(
      `You are about to remove module ${chalk.bold(
        `${args.functionPath!.functionName}/${args.functionPath!.destination}`,
      )}`,
      flags.yes,
    )

    await batchOperations({
      name: 'removing',
      fileEntries: fileEntries.map(([name]) => [`${namePrefix}${args.functionPath!.destination}${name}`, null]),
      bucket,
      command: this,
    })
  }
}
