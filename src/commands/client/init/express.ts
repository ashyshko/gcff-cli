import {Args, Command, Flags} from '@oclif/core'
import path = require('node:path');
import fs = require('node:fs');
import {parseFunctionPath} from '../../../utils/push-client'
import {gitCmd} from '../../../utils/git-utils'
import {stage} from '../../../utils/stage'
import chalk = require('chalk');
import {npmCmd} from '../../../utils/npm-utils'

export default class ClientInitExpress extends Command {
  static description = 'Creates express client from template';

  static examples = [
    '<%= config.bin %> <%= command.id %> function-name/server/path',
  ];

  static flags = {
    out: Flags.directory({
      description: 'path to clone expressjs client template',
      required: false,
      exists: false,
    }),
    name: Flags.string({
      description: 'name for project',
      required: false,
    }),
    ws: Flags.boolean({
      description: 'use websocket instead of http',
      default: false,
    }),
  };

  static args = {
    functionPath: Args.custom({
      description:
        'Cloud function name and path (function-name/path/to/upload)',
      required: true,
      async parse(value) {
        return Promise.resolve(parseFunctionPath(value))
      },
    })(),
  };

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(ClientInitExpress)

    const functionPath = args.functionPath!

    if (flags.out !== undefined && fs.existsSync(flags.out)) {
      this.error(`out path ${flags.out} already exists`)
    }

    const {packageName, outDir} = this.parseClientName({
      destination: functionPath.destination,
      name: flags.name,
      outDir: flags.out,
    })

    const repository = flags.ws ? 'gcff-client-express-ws-template' : 'gcff-client-express-template'

    await gitCmd(
      [
        'clone',
        '--',
        `git@github.com:ashyshko/${repository}.git`,
        outDir,
      ],
      {command: this},
    )

    await stage('Patching packge.json', () =>
      this.patchPackageJson(outDir, packageName, functionPath.combined),
    )

    await gitCmd(['-C', outDir, 'remote', 'remove', 'origin'], {
      title: 'Removing remote repository',
      command: this,
    })

    await npmCmd(['install', '--prefix', outDir], {command: this})

    this.logJson({packageName, outDir})

    this.log(`Express client initialized in folder '${chalk.bold(outDir)}'`)
    this.log('Available commands:')
    this.log(`  ${chalk.bold('npm run start')}: Start server locally`)
    this.log(
      `  ${chalk.bold('npm run deploy')}: Deploy server to ${chalk.bold(
        functionPath.combined,
      )}`,
    )
    this.log(
      'To push a server to an existing Git repository, use the following commands:',
    )
    this.log(
      `  ${chalk.gray(
        'git remote add origin git@github.com:<USER_NAME>:<REPOSITORY_NAME>.git',
      )}`,
    )
    this.log(`  ${chalk.gray('git branch -M master')}`)
    this.log(`  ${chalk.gray('git push -u origin master')}`)
    this.log(chalk.italic('Happy hacking! (c)'))
  }

  private async patchPackageJson(
    outDir: string,
    packageName: string,
    functionPath: string,
  ): Promise<void> {
    const originalContent = await fs.promises.readFile(
      path.join(outDir, 'package.json'),
      {encoding: 'utf-8'},
    )
    const content = originalContent
    .replace(/<PACKAGE_NAME>/g, packageName)
    .replace(/<FUNCTION_NAME>/g, functionPath)
    await fs.promises.writeFile(path.join(outDir, 'package.json'), content, {
      encoding: 'utf-8',
    })
  }

  private parseClientName({
    destination,
    name,
    outDir,
  }: {
    destination: string;
    name?: string;
    outDir?: string;
  }): { packageName: string; outDir: string } {
    name =
      name ??
      (outDir === undefined ? undefined : path.basename(outDir)) ??
      (destination.replace(/\/$/, '').replace(/[^\dA-Za-z]/g, '-') || 'server')

    outDir = (() => {
      const prefix = path.resolve(outDir ?? `${name}/`)
      let out = prefix
      let index = 1
      while (fs.existsSync(out)) {
        out = `${prefix}-${++index}`
      }

      return out
    })()

    return {packageName: name, outDir}
  }
}
