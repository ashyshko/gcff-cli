import {Args, Command, Flags, ux} from '@oclif/core'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
// eslint-disable-next-line unicorn/import-style
import * as chalk from 'chalk'

import {OAuth2Client} from 'google-auth-library'
import {Storage} from '@google-cloud/storage'
import {
  gcloudAuth,
  gcloudFlags,
  gcloudFunctionDescribe,
} from '../../../utils/gcloud'

export default class ClientPushReact extends Command {
  static description = 'Push react app content to server';

  static examples = [
    '<%= config.bin %> <%= command.id %> function-name server/path /path/to/folder',
  ];

  static flags = {
    ...gcloudFlags,
    region: Flags.string({
      description: 'The Cloud region for the function',
      required: true,
      default: 'us-central1',
    }),
    publicUrlPlaceholder: Flags.string({
      description:
        'Placeholder used as PUBLIC_URL environment variable for React. Replaced with real path by server. Empty string to avoid replacement',
      default: '__REACT_APP_PUBLIC_URL_PLACEHOLDER__',
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
    const {args, flags} = await this.parse(ClientPushReact)

    args.path = path.resolve(args.path)

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

    const rules: Array<{
      path: string;
      type: 'react' | 'static';
      publicUrlPlaceholder?: string;
      name: string;
    }> = []
    const files: string[] = []
    let hasPublicUrlPlaceholder = flags.publicUrlPlaceholder === ''
    for await (const file of getFiles(args.path)) {
      // avoid previously generated resolve.json
      if (file === 'resolve.json') {
        continue
      }

      const isStatic =
        (!file.endsWith('.js') &&
          !file.endsWith('.json') &&
          !file.endsWith('.html')) ||
        flags.publicUrlPlaceholder === ''

      if (isStatic) {
        rules.push({path: file, type: 'static', name: file})
        files.push(file)
        continue
      }

      hasPublicUrlPlaceholder =
        hasPublicUrlPlaceholder ||
        (
          await fs.readFile(path.resolve(args.path, file), {
            encoding: 'utf-8',
          })
        ).includes(flags.publicUrlPlaceholder)

      rules.push({
        path: file,
        type: 'react',
        publicUrlPlaceholder: flags.publicUrlPlaceholder,
        name: file,
      })

      files.push(file)
    }

    if (!files.includes('index.html')) {
      throw new Error('no index.html provided in folder')
    }

    rules.push(
      {
        path: '.',
        type: 'react',
        publicUrlPlaceholder: flags.publicUrlPlaceholder,
        name: 'index.html',
      },
      {
        path: '**',
        type: 'react',
        publicUrlPlaceholder: flags.publicUrlPlaceholder,
        name: 'index.html',
      },
    )

    if (!hasPublicUrlPlaceholder) {
      throw new Error(
        `publicUrlPlaceholder(${flags.publicUrlPlaceholder}) is not found in provided sources. ensure that environment variable PUBLIC_URL=${flags.publicUrlPlaceholder} was set during npm run build`,
      )
    }

    await fs.writeFile(
      path.join(args.path, 'resolve.json'),
      JSON.stringify({rules, files}, null, 4),
      {encoding: 'utf-8'},
    )

    files.push('resolve.json')

    const gcsBucketName =
      func.serviceConfig.environmentVariables.GCS_BUCKET_NAME
    this.log('gcs_bucket=' + gcsBucketName)

    const progress = ux.progress({
      format: 'uploading [{bar}] {duration}s | ETA: {eta}s | {value}/{total}',
    })
    progress.start(files.length, 0)
    let uploaded = 0
    await Promise.all(
      files.map(async file => {
        await storage
        .bucket(gcsBucketName)
        .upload(path.resolve(args.path, file), {
          destination: `${args.destination}/${file}`,
        })
        ++uploaded
        progress.update(uploaded)
      }),
    )
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
