import {Command} from '@oclif/core'
import {runCmd} from './run-cmd'
import {stage} from './stage'
import chalk = require('chalk');

export function gitCmd(args: string[], options: {
    onStdout?: (buf: Buffer) => void;
    command: Command
    title?: string
  }): Promise<void> {
  const stdErr = new TextDecoder()
  return stage(options.title ?? `git ${args[0]}`, () => {
    options.command.log(chalk.gray(`Running git ${args.join(' ')}...`))
    return runCmd('git', args, {
      onStdout: options.onStdout,
      onStderr: (buf: Buffer) => {
        options.command.log(chalk.gray(stdErr.decode(buf, {stream: true})))
      },
    })
  })
}
