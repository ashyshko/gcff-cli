import {Args, Command, Flags, ux} from '@oclif/core'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as chalk from 'chalk'
import {gcloud} from '../../../utils/runCmd'

export default class ClientPushStatic extends Command {
  static description = 'Push static content to'

  static examples = [
    '<%= config.bin %> <%= command.id %> bucket-name/internal/path /path/to/folder --defaultFile=index.html',
  ]

  static flags = {
    default: Flags.string({description: 'Serve provided file if requested file is not found. If --default specified without --index, default file is served as index'}),
    index: Flags.string({description: 'Serve provided file if root requested. If --index is not specified but --default is specified, default file is served as index'}),
    yes: Flags.boolean({char: 'y', description: 'Automatically confirm any action'}),
  }

  static args = {
    gcsUrl: Args.string({
      description: 'GCS URL (gs://bucket-name/internal/path)',
      required: true,
    }),
    path: Args.directory({
      description:
        'Location of files to deploy (root directory of function source)',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(ClientPushStatic)

    args.path = path.resolve(args.path)

    if (!args.gcsUrl.startsWith('gs://')) {
      throw new Error('Invalid GCS URL provided, should start with gs://')
    }

    const rules: Array<{path: string, type: 'static', name: string}> = []
    for await (const file of getFiles(args.path)) {
      // avoid previously generated resolve.json
      if (file === 'resolve.json') {
        continue
      }

      rules.push({path: file, type: 'static', name: file})
    }

    const index = flags.index ?? flags.default
    if (index !== undefined) {
      rules.push({path: '.', type: 'static', name: index})
    }

    if (flags.default !== undefined) {
      rules.push({path: '**', type: 'static', name: flags.default})
    }

    await fs.writeFile(path.join(args.path, 'resolve.json'), JSON.stringify(rules, null, 4), {encoding: 'utf-8'})

    if (
      !flags.yes &&
      !(await ux.confirm(
        `You are about to upload ${chalk.bold(
          args.path,
        )} to ${chalk.bold(
          args.gcsUrl,
        )}. Confirm? ${chalk.gray('(yes/no)')}`,
      ))
    ) {
      return
    }

    ux.action.start('Uploading')
    await gcloud(['storage', 'cp', args.path, args.gcsUrl, '--recursive'], {
      onStderr: (message: string) => {
        this.log(message)
      },
    })
    ux.action.stop(chalk.green.bold('Successful'))
  }
}

async function * getFiles(filePath: string, relPath = ''): AsyncGenerator<string> {
  const entries = await fs.readdir(filePath, {withFileTypes: true})

  for (const file of entries) {
    if (file.isDirectory()) {
      yield * getFiles(path.join(filePath, file.name), path.join(relPath, file.name))
    } else {
      yield path.join(relPath, file.name)
    }
  }
}
