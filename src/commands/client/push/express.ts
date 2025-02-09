import {Args, Command, Flags} from '@oclif/core'
import * as path from 'node:path'
import * as fs from 'node:fs/promises'

import {
  clientPushArgs,
  clientPushFlags,
  pushClient,
} from '../../../utils/push-client'
export default class ClientPushExpress extends Command {
  static description = 'Push express app to server';

  static examples = [
    '<%= config.bin %> <%= command.id %> function-name/server/path /path/to/script',
  ];

  static flags = {
    ...clientPushFlags,
    manifest: Flags.file({
      description: 'path to package.json with dependencies for this project',
      required: true,
    }),
    ws: Flags.boolean({
      description: 'push as express-ws',
      default: false,
    }),
  };

  static args = {
    ...clientPushArgs,
    script: Args.file({
      description: 'Location of AMD script with default export to express',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(ClientPushExpress)

    args.script = path.resolve(args.script)

    const type = flags.ws ? 'express-ws' : 'express'

    const rules = [
      {
        path: '.',
        type,
        src: 'index.js',
      },
      {
        path: '**',
        type,
        src: 'index.js',
      },
    ]

    const dependencies = JSON.parse(
      await fs.readFile(flags.manifest, {encoding: 'utf-8'}),
    ).dependencies

    const {viewUrl} = await pushClient({
      flags,
      args: {
        functionPath: args.functionPath!,
      },
      files: {
        'index.js': await fs.readFile(args.script),
      },
      dependencies,
      rules,
      command: this,
    })

    this.logJson({viewUrl})
  }
}
