import {gcloudFunctionDescribe} from './gcloud-function'
import * as fs from 'node:fs/promises'
import {GcloudAuth, gcloudAuth, gcloudFlags} from './gcloud-auth'
import {Args, Command, Flags, ux} from '@oclif/core'
import {getBucket} from './gcs-utils'
import path = require('node:path');
import * as crypto from 'node:crypto'
import {confirm} from './confirm'
import chalk = require('chalk');
import {
  diffDependencies,
  getDependenciesFromMetadata,
  mergeDependencies,
} from './dependencies'
import {printConflicts} from '../commands/server/deploy'
import {Bucket} from '@google-cloud/storage'

export const clientPushFlags = {
  ...gcloudFlags,
  region: Flags.string({
    description: 'The Cloud region for the function',
    required: true,
    default: 'us-central1',
  }),
  force: Flags.boolean({
    description:
      'Override content even if it was not changed. Unlinked files from previous content are not going to be removed',
    required: false,
    default: false,
  }),
  yes: Flags.boolean({
    char: 'y',
    description: 'Automatically confirm any action',
  }),
}

export const clientPushArgs = {
  functionPath: Args.custom({
    description: 'Cloud function name and path (function-name/path/to/upload)',
    required: true,
    async parse(value) {
      return Promise.resolve(parseFunctionPath(value))
    },
  })(),
}

export async function pushClient({
  flags,
  args,
  files,
  dependencies,
  rules,
  command,
}: {
  flags: Partial<GcloudAuth> & {
    region: string;
    force: boolean;
    yes: boolean;
  };
  args: {
    functionPath: { functionName: string; destination: string };
  };
  files: Record<string, Buffer>;
  dependencies: Record<string, string>;
  rules: Array<unknown>;
  command: Command;
}): Promise<{ viewUrl: string }> {
  const auth = await gcloudAuth(flags, command)

  const functionName = args.functionPath.functionName
  const destination = args.functionPath.destination

  const func = await gcloudFunctionDescribe({
    functionName,
    region: flags.region,
    auth,
  })

  const {bucket, namePrefix} = getBucket({
    serviceConfig: func.serviceConfig,
    auth,
  })

  const uploadPath = `${destination}${namePrefix}`

  command.log(`upload_path=gs://${bucket.name}/${uploadPath}`)

  if (files['resolve.json']) {
    throw new Error('resolve.json should not be provided in files')
  }

  const payload = {
    files: Object.fromEntries(
      Object.entries(files).map(([name, buffer]) => [name, fileHash(buffer)]),
    ),
    dependencies,
    rules,
  }

  files = {
    ...files,
  }

  // just in case - ensure that there is no resolve.json in files
  delete payload.files['resolve.json']

  const fileEntries: Array<[string, Buffer | null]> = await (async () => {
    if (flags.force) {
      return Object.entries(files)
    }

    const prevResolveJson: typeof payload = await (async (): Promise<{
      files: Record<string, string>;
      rules: unknown[];
      dependencies: Record<string, string>;
    }> => {
      try {
        return JSON.parse(
          new TextDecoder().decode(
            (await bucket.file(`${uploadPath}resolve.json`).download())[0],
          ),
        )
      } catch (error) {
        if (
          /* istanbul ignore next */ error instanceof Error &&
          (error as { code?: number })?.code === 404
        ) {
          return {
            files: {},
            rules: [],
            dependencies: {},
          }
        }

        throw error
      }
    })()

    // just in case - ensure that there is no resolve.json in prev files
    delete prevResolveJson.files['resolve.json']

    const diff = filesHashDiff(prevResolveJson.files, payload.files)

    if (diff.added.length > 0) {
      command.log(
        `This change will ${chalk.green(
          `add ${chalk.bold(diff.added.length)} files:`,
        )}`,
      )
      for (const added of diff.added) {
        command.log(`  ${chalk.italic(added)}`)
      }
    }

    if (diff.changed.length > 0) {
      command.log(
        `This change will ${chalk.red(
          `change ${chalk.bold(diff.changed.length)} files:`,
        )}`,
      )
      for (const changed of diff.changed) {
        command.log(`  ${chalk.italic(changed)}`)
      }
    }

    if (diff.removed.length > 0) {
      command.log(
        `This change will ${chalk.red(
          `remove ${chalk.bold(diff.removed.length)} files:`,
        )}`,
      )
      for (const removed of diff.removed) {
        command.log(`  ${chalk.italic(removed)}`)
      }
    }

    const fileEntries: Array<[string, Buffer | null]> = [
      ...[...diff.added, ...diff.changed].map(
        v => [v, files[v]] as [string, Buffer],
      ),
      ...diff.removed.map(v => [v, null] as [string, null]),
    ]

    return fileEntries
  })()

  fileEntries.push([
    'resolve.json',
    Buffer.from(new TextEncoder().encode(JSON.stringify(payload, null, 2))),
  ])

  if (flags.force) {
    /* istanbul ignore next */
    if (Object.keys(dependencies).length > 0) {
      command.log(
        'dependency check is disabled with --force flag. Consider using command dependencies:sync after successful update',
      )
    }
  } else {
    const mergedDependencies = mergeDependencies([
      {
        sourceName: 'original',
        dependencies: getDependenciesFromMetadata(
          func.buildConfig.environmentVariables,
        ).unitedDependencies,
      },
      {sourceName: 'uploading', dependencies},
    ])

    if (mergedDependencies.conflicts.length > 0) {
      printConflicts(command, mergedDependencies.conflicts)
      command.error(
        'Conflict in dependencies detected. Consider manual conflict solving via dependencies:sync with adding/changing/removing dependencies manually. Or consider using this command with --force flag and fix dependencies later (may lead to downtime for this client)',
      )
    }

    const diff = diffDependencies(
      getDependenciesFromMetadata(func.buildConfig.environmentVariables)
      .unitedDependencies,
      mergedDependencies.dependencies,
    )

    if (!diff.equals) {
      const args: string[] = []
      args.push(
        ...diff.added.map(([dep, ver]) => `--addDependency=${dep}:${ver}`),
      )

      // added just for consistency, merge with provided logic will not change dependencies
      /* istanbul ignore next */
      if (diff.changed.length > 0) {
        args.push(
          ...diff.changed.map(
            ([dep, {toVersion}]) => `--addDependency=${dep}:${toVersion}`,
          ),
        )

        // added just for consistency, merge with provided logic will not remove dependencies
        /* istanbul ignore next */
        if (diff.removed.length > 0) {
          args.push(
            ...diff.removed.map(([dep]) => `--removeDependency=${dep}`),
          )
        }
      }

      command.error(
        `Dependencies have been changed. To avoid downtime, run first 'dependencies:sync' with next flags: '${args.join(
          ' ',
        )}'. Or consider using --force flag and fix dependencies automatically with 'dependencies:sync' later (may lead to downtime for this client)`,
      )
    }
  }

  await confirm(
    `You are about to upload changes to ${chalk.bold(
      `${args.functionPath!.functionName}/${args.functionPath!.destination}`,
    )}`,
    flags.yes,
  )

  await batchOperations({
    name: 'uploading',
    bucket,
    fileEntries: fileEntries.map(([name, body]) => [
      `${uploadPath}${name}`,
      body,
    ]),
    command,
  })

  return {
    viewUrl: func.url + '/' + destination,
  }
}

export async function batchOperations({
  name,
  bucket,
  fileEntries,
  command,
}: {
  fileEntries: Array<[string, Buffer | null]>;
  bucket: Bucket;
  name: string;
  command: Command
}): Promise<void> {
  const progress = ux.progress({
    format: `${name} [{bar}] {duration}s | ETA: {eta}s | {value}/{total}`,
  })
  progress.start(fileEntries.length, 0)
  let uploaded = 0
  await Promise.all(
    fileEntries.map(async ([file, content]) => {
      await (content === null ?
        (bucket.file(file).delete()).catch(error => {
          command.warn(`Can't remove file '${chalk.bold(file)}': ${chalk.italic(error)}`)
        }) :
        bucket.file(file).save(content))

      ++uploaded
      progress.update(uploaded)
    }),
  )
  progress.stop()
}

export function parseFunctionPath(functionPath: string): {
  functionName: string;
  destination: string;
  combined: string;
} {
  const match = functionPath.match(/^([^/]+)(\/(.*))?$/)
  if (!match) {
    throw new Error(
      'Incorrect functionPath provided. expected format function-name/path or function-name',
    )
  }

  let destination = match[3] ?? ''
  if (destination.length > 0 && !destination.endsWith('/')) {
    destination += '/'
  }

  return {
    functionName: match[1],
    destination,
    combined: functionPath,
  }
}

export async function * getFiles(
  filePath: string,
  relPath = '',
): AsyncGenerator<string> {
  const entries = await fs.readdir(filePath, {withFileTypes: true})

  for (const file of entries) {
    if (file.isDirectory()) {
      yield * getFiles(
        path.join(filePath, file.name),
        relPath + file.name + '/',
      )
    } else {
      yield relPath + file.name
    }
  }
}

export async function readFiles(
  files: string[],
  folder: string,
): Promise<Record<string, Buffer>> {
  return Object.fromEntries(
    await Promise.all(
      files.map(async v => [v, await fs.readFile(path.join(folder, v))]),
    ),
  )
}

export function filesHashDiff(
  from: Record<string, string>,
  to: Record<string, string>,
): {
  changed: string[];
  added: string[];
  removed: string[];
} {
  const res: ReturnType<typeof filesHashDiff> = {
    changed: [],
    added: [],
    removed: [],
  }

  for (const toName of Object.keys(to)) {
    const fromValue = from[toName]
    if (fromValue === undefined) {
      res.added.push(toName)
    } else if (fromValue !== to[toName]) {
      res.changed.push(toName)
    }
  }

  for (const fromName of Object.keys(from)) {
    if (to[fromName] === undefined) {
      res.removed.push(fromName)
    }
  }

  return res
}

function fileHash(body: Buffer) {
  return crypto.createHash('sha256').update(body).digest('hex')
}
