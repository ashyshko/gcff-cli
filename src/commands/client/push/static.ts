import {Args, Command, Flags} from '@oclif/core'
import * as path from 'node:path'
import {
  clientPushArgs,
  clientPushFlags,
  getFiles,
  pushClient,
  readFiles,
} from '../../../utils/push-client'

export default class ClientPushStatic extends Command {
  static description = 'Push static content to server';

  static examples = [
    '<%= config.bin %> <%= command.id %> function-name/path /path/to/local/folder',
  ];

  static flags = {
    ...clientPushFlags,

    default: Flags.string({
      description:
        'Serve provided file if requested file is not found. If --default specified without --index, default file is served as index',
    }),
    index: Flags.string({
      description:
        'Serve provided file if root requested. If --index is not specified but --default is specified, default file is served as index',
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
    const {args, flags} = await this.parse(ClientPushStatic)

    args.path = path.resolve(args.path)

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

    const {viewUrl} = await pushClient({
      flags,
      args: {
        functionPath: args.functionPath!,
      },
      files: await readFiles(files, args.path),
      rules,
      dependencies: {},
      command: this,
    })

    this.logJson({viewUrl})
  }
}
