import {Args, Command} from '@oclif/core'
import {parseFunctionPath} from '../../../utils/push-client'
import * as fs from 'node:fs/promises'
import path = require('node:path');
import chalk = require('chalk');

export default class ClientInitReact extends Command {
  static description = 'Initializes react client';

  static examples = [
    '<%= config.bin %> <%= command.id %> function-name/server/path react-app-folder',
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
        "Directory containing the React package. It is recommended to use 'create-react-app' to initialize the directory.",
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
    packageJson.scripts.deploy = `PUBLIC_URL=__REACT_APP_PUBLIC_URL_PLACEHOLDER__ npm run build && gcff client push react ${
      args.functionPath!.combined
    } ./build`
    await fs.writeFile(
      path.join(args.srcFolder, 'package.json'),
      JSON.stringify(packageJson, null, 2),
      {encoding: 'utf-8'},
    )

    this.log(
      `React client initialized in folder '${chalk.bold(args.srcFolder)}'`,
    )
    this.log('Added new command:')
    this.log(
      `  ${chalk.bold('npm run deploy')}: Deploy server to ${chalk.bold(
        args.functionPath!.combined,
      )}`,
    )
    this.log(
      `Consider adding ${chalk.inverse(
        'basename={process.env.PUBLIC_URL}',
      )} to the ${chalk.italic(
        'BrowserRouter',
      )} component in order to ensure proper functionality of ${chalk.bold(
        'react-router-dom',
      )}.`,
    )
    this.log(
      `  ${chalk.gray.italic(
        `For more information, please refer to the following link: ${chalk.underline(
          'https://github.com/ashyshko/gcff-cli/blob/master/docs/react-dom-router-support.md',
        )}`,
      )}`,
    )
    this.log(chalk.italic('Happy hacking! (c)'))
  }
}
