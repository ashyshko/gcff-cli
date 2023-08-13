import {Args, Command, Flags, ux} from '@oclif/core'
import * as path from 'node:path'
import * as chalk from 'chalk'

import {OAuth2Client} from 'google-auth-library'
import {Storage} from '@google-cloud/storage'
import {
  gcloudAuth,
  gcloudFlags,
  gcloudFunctionDescribe,
} from '../../../utils/gcloud'
export default class ClientPushExpress extends Command {
  static description = 'Push express app to server';

  static examples = [
    '<%= config.bin %> <%= command.id %> function-name server/path /path/to/script',
  ];

  static flags = {
    ...gcloudFlags,
    region: Flags.string({
      description: 'The Cloud region for the function',
      required: true,
      default: 'us-central1',
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
    destination: Args.string({
      description: 'Destination folder',
      required: true,
    }),
    script: Args.file({
      description: 'Location of AMD script with default export to express',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(ClientPushExpress)

    args.script = path.resolve(args.script)

    const auth = await gcloudAuth(flags, this)

    ux.action.start('Fetching function description...')

    const func = await gcloudFunctionDescribe({
      functionName: args.functionName,
      region: flags.region,
      auth,
    })
    if (!func) {
      ux.action.stop(
        chalk.bold.green(
          `Provided cloud function is not found: ${auth.project}/${flags.region}/${args.functionName}`,
        ),
      )
      this.exit(1)
      return
    }

    ux.action.stop(chalk.green('Successful'))

    const client = new OAuth2Client({})
    client.setCredentials({
      access_token: auth.accessToken,
    })

    const storage = new Storage({
      authClient: client,
      projectId: auth.project,
    })

    const rules = [
      {
        path: '.',
        type: 'express',
        src: 'index.js',
      },
      {
        path: '**',
        type: 'express',
        src: 'index.js',
      },
    ]

    const gcsBucketName =
      func.serviceConfig.environmentVariables.GCS_BUCKET_NAME
    this.log('gcs_bucket=' + gcsBucketName)

    const progress = ux.progress({
      format: 'uploading [{bar}] {duration}s | ETA: {eta}s | {value}/{total}',
    })

    let uploaded = 0

    const files: Array<Promise<void>> = [
      (async () => {
        await storage
        .bucket(gcsBucketName)
        .upload(args.script, {destination: `${args.destination}/index.js`})
        ++uploaded
        progress.update(uploaded)
      })(),
      (async () => {
        await storage
        .bucket(gcsBucketName)
        .file(`${args.destination}/resolve.json`)
        .save(JSON.stringify({files: ['index.js'], rules}))
        ++uploaded
        progress.update(uploaded)
      })(),
    ]

    progress.start(files.length, 0)
    await Promise.all(files)
    progress.stop()

    /* g
    if (
      !flags.yes &&
      !(await ux.confirm(
        `You are about to upload ${chalk.bold(args.path)} to ${chalk.bold(
          args.gcsUrl,
        )}. Confirm? ${chalk.gray('(yes/no)')}`,
      ))
    ) {
      return
    } */
  }
}
