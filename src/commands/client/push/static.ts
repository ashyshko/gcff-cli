import {Args, Command, Flags, ux} from '@oclif/core'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as chalk from 'chalk'

import {OAuth2Client} from 'google-auth-library'
import {Storage} from '@google-cloud/storage'
import {gcloudAuth, gcloudFlags, gcloudFunctionDescribe} from '../../../utils/gcloud'

export default class ClientPushStatic extends Command {
  static description = 'Push static content to server';

  static examples = [
    '<%= config.bin %> <%= command.id %> function-name server/path /path/to/folder --defaultFile=index.html',
  ];

  static flags = {
    ...gcloudFlags,
    region: Flags.string({
      description: 'The Cloud region for the function',
      required: true,
      default: 'us-central1',
    }),
    default: Flags.string({
      description:
        'Serve provided file if requested file is not found. If --default specified without --index, default file is served as index',
    }),
    index: Flags.string({
      description:
        'Serve provided file if root requested. If --index is not specified but --default is specified, default file is served as index',
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
    path: Args.directory({
      description:
        'Location of files to deploy (root directory of function source)',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(ClientPushStatic)

    args.path = path.resolve(args.path)

    const auth = await gcloudAuth(flags, this)

    ux.action.start('Fetching function description...')
    const func = await gcloudFunctionDescribe({functionName: args.functionName, region: flags.region, auth})
    if (!func) {
      ux.action.stop(chalk.bold.green(`Provided cloud function is not found: ${auth.project}/${flags.region}/${args.functionName}`))
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

    const rules: Array<{ path: string; type: 'static'; name: string }> = []
    const files: string[] = []
    for await (const file of getFiles(args.path)) {
      // avoid previously generated resolve.json
      if (file === 'resolve.json') {
        continue
      }

      rules.push({path: file, type: 'static', name: file})
      files.push(file)
    }

    const index = flags.index ?? flags.default
    if (index !== undefined) {
      rules.push({path: '.', type: 'static', name: index})
    }

    if (flags.default !== undefined) {
      rules.push({path: '**', type: 'static', name: flags.default})
    }

    await fs.writeFile(
      path.join(args.path, 'resolve.json'),
      JSON.stringify({rules, files}, null, 4),
      {encoding: 'utf-8'},
    )

    files.push('resolve.json')

    const gcsBucketName = func.serviceConfig.environmentVariables.GCS_BUCKET_NAME
    this.log('gcs_bucket=' + gcsBucketName)

    const progress = ux.progress({
      format: 'uploading [{bar}] {duration}s | ETA: {eta}s | {value}/{total}',
    })
    progress.start(files.length, 0)
    let uploaded = 0
    await Promise.all(files.map(async file => {
      await storage.bucket(gcsBucketName).upload(path.resolve(args.path, file), {
        destination: `${args.destination}/${file}`,
      })
      ++uploaded
      progress.update(uploaded)
    }))
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

async function * getFiles(
  filePath: string,
  relPath = '',
): AsyncGenerator<string> {
  const entries = await fs.readdir(filePath, {withFileTypes: true})

  for (const file of entries) {
    if (file.isDirectory()) {
      yield * getFiles(
        path.join(filePath, file.name),
        path.join(relPath, file.name),
      )
    } else {
      yield path.join(relPath, file.name)
    }
  }
}
