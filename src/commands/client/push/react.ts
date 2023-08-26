import {Args, Command, Flags} from '@oclif/core'
import * as path from 'node:path'

import {
  clientPushArgs,
  clientPushFlags,
  getFiles,
  pushClient,
  readFiles,
} from '../../../utils/push-client'

export default class ClientPushReact extends Command {
  static description = 'Push react app content to server';

  static examples = [
    '<%= config.bin %> <%= command.id %> function-name/server/path /path/to/folder',
  ];

  static flags = {
    ...clientPushFlags,
    publicUrlPlaceholder: Flags.string({
      description:
        'Placeholder used as PUBLIC_URL environment variable for React. Replaced with real path by server. Empty string to avoid replacement',
      default: '__REACT_APP_PUBLIC_URL_PLACEHOLDER__',
    }),
  };

  static args = {
    ...clientPushArgs,
    path: Args.directory({
      description: 'Location of files to deploy (local directory)',
      required: true,
      exists: true,
    }),
  };

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(ClientPushReact)

    args.path = path.resolve(args.path)

    const rules: Array<{
      path: string;
      type: 'react' | 'static';
      publicUrlPlaceholder?: string;
      name: string;
    }> = []
    const files: string[] = []
    for await (const file of getFiles(args.path)) {
      // avoid previously generated resolve.json
      if (file === 'resolve.json') {
        continue
      }

      files.push(file)
    }

    const content = await readFiles(files, args.path)

    let hasPublicUrlPlaceholder = flags.publicUrlPlaceholder === ''

    for (const file of files) {
      const isStatic =
        (!file.endsWith('.js') &&
          !file.endsWith('.json') &&
          !file.endsWith('.html')) ||
        flags.publicUrlPlaceholder === ''

      if (isStatic) {
        rules.push({path: file, type: 'static', name: file})
        continue
      }

      hasPublicUrlPlaceholder =
        hasPublicUrlPlaceholder ||
        new TextDecoder()
        .decode(content[file])
        .includes(flags.publicUrlPlaceholder)

      rules.push({
        path: file,
        type: 'react',
        publicUrlPlaceholder: flags.publicUrlPlaceholder,
        name: file,
      })
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

    const {viewUrl} = await pushClient({
      flags,
      args: {
        functionPath: args.functionPath!,
      },
      files: content,
      dependencies: {},
      rules,
      command: this,
    })

    this.logJson({viewUrl})
  }
}
