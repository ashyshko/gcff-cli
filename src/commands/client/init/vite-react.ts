import {Args, Command} from '@oclif/core'
import {parseFunctionPath} from '../../../utils/push-client'
import * as fs from 'node:fs/promises'
import path = require('node:path');
import chalk = require('chalk');

export default class ClientInitReact extends Command {
  static description = 'Initializes vite-react client';

  static examples = [
    '<%= config.bin %> <%= command.id %> function-name/server/path vite-react-app-folder',
  ];

  static flags = {};

  static args = {
    functionPath: Args.custom({
      description:
        'Cloud function name and path (function-name/path/to/upload)',
      required: true,
      async parse(value) {
        return Promise.resolve(parseFunctionPath(value))
      },
    })(),
    srcFolder: Args.directory({
      description:
        "Directory containing the ViteJS project. It is recommended to use 'npm create vite@latest my-react-app -- --template react-ts' to initialize the directory.",
      required: true,
      exists: true,
    }),
  };

  public async run(): Promise<void> {
    const {args, flags: _flags} = await this.parse(ClientInitReact)

    const packageJson = JSON.parse(
      await fs.readFile(path.join(args.srcFolder, 'package.json'), {
        encoding: 'utf-8',
      }),
    )
    packageJson.scripts.deploy = `VITE_BASE_URL=/_PUBLIC_/_URL_/_PLACEHOLDER_ npm run build && gcff client push react ${
      args.functionPath!.combined
    } ./dist --publicUrlPlaceholder=/_PUBLIC_/_URL_/_PLACEHOLDER_`
    await fs.writeFile(
      path.join(args.srcFolder, 'package.json'),
      JSON.stringify(packageJson, null, 2),
      {encoding: 'utf-8'},
    )

    this.log(
      `Vite-React client initialized in folder '${chalk.bold(args.srcFolder)}'`,
    )
    this.log('Added new command:')
    this.log(
      `  ${chalk.bold('npm run deploy')}: Deploy server to ${chalk.bold(
        args.functionPath!.combined,
      )}`,
    )
    this.log(
      `Consider adding ${chalk.inverse(
        'basename={import.meta.env.BASE_URL}',
      )} to the ${chalk.italic(
        'BrowserRouter',
      )} component in order to ensure proper functionality of ${chalk.bold(
        'react-router-dom',
      )}.`,
    )
    this.log(
      `Consider adding ${chalk.inverse(
        'base: process.env["VITE_BASE_URL"]',
      )} to the ${chalk.italic(
        'vite-config.ts',
      )} in order to ensure proper functionality of ${chalk.bold(
        'react-router-dom',
      )}.`,
    )
    this.log(chalk.italic('Happy hacking! (c)'))
  }
}
