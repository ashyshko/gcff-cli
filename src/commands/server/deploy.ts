import {Args, Command, Flags, ux} from '@oclif/core'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as AdmZip from 'adm-zip'
import * as chalk from 'chalk'
import {
  GcloudFunction,
  gcloudAuth,
  gcloudFlags,
  gcloudFunctionDescribe,
  gcloudFunctionWaitOperationCompletion,
} from '../../utils/gcloud'

export default class ServerDeploy extends Command {
  static description = 'Updates Google Cloud Function';

  static examples = [
    '<%= config.bin %> <%= command.id %> function-name /path/to/server/dist',
  ];

  static flags = {
    ...gcloudFlags,
    region: Flags.string({
      description: 'The Cloud region for the function',
      required: true,
      default: 'us-central1',
    }),
    force: Flags.boolean({
      char: 'f',
      description: 'Override existing source without verification',
      default: false,
      relationships: [{type: 'none', flags: ['merge']}],
    }),
    merge: Flags.boolean({
      description: 'Merge requested packages with uploaded',
      default: false,
      relationships: [{type: 'none', flags: ['force']}],
    }),
    gen2: Flags.boolean({
      description:
        'If enabled, this command will use Cloud Functions (Second generation)',
    }),
    'entry-point': Flags.string({
      description:
        'Name of a Google Cloud Function (as defined in source code) that will be executed',
    }),
    bucket: Flags.string({
      description: 'Google Cloud Storage bucket name for serving content',
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
    path: Args.directory({
      description:
        'Location of source code to deploy (root directory of function source)',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(ServerDeploy)

    args.path = path.resolve(args.path)

    const auth = await gcloudAuth(flags, this)

    const func = await gcloudFunctionDescribe({
      functionName: args.functionName,
      region: flags.region,
      auth,
    })

    /*

    if (flags.force) {
      this.notice('Dependency validation has been skipped via --force')
    } else {
      const uploadedManifest = await this.getUploadedManifest({
        functionName: args.functionName,
        region: flags.region,
        gen2: flags.gen2,
      })

      await this.validateDependencies(
        args.path,
        uploadedManifest.dependencies,
        flags.merge,
        flags.yes,
      )
    } */

    if (
      !flags.yes &&
      !(await ux.confirm(
        `You are about to upload ${chalk.bold(
          args.path,
        )} to Google Cloud Function ${chalk.bold(
          `${auth.project}/${args.functionName}`,
        )}. Confirm? ${chalk.gray('(yes/no)')}`,
      ))
    ) {
      return
    }

    const content = await (() => {
      const zip = new AdmZip()
      zip.addLocalFolder(args.path)
      return zip.toBufferPromise()
    })()

    const storageSource = await (async () => {
      const res = await fetch(`https://cloudfunctions.googleapis.com/v2/projects/${auth.project}/locations/${flags.region}/functions:generateUploadUrl?access_token=${auth.accessToken}`, {
        method: 'POST',
      })

      if (!res.ok) {
        throw new Error(`can't get functino upload url: ${res.status} ${res.statusText}`)
      }

      const payload = (await res.json()) as {
        uploadUrl: string,
        storageSource: GcloudFunction['buildConfig']['source']['storageSource']
      }

      const uploadRes = await fetch(payload.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/zip',
        },
        body: content,
      })

      if (!uploadRes.ok) {
        throw new Error(`can't upload function: ${uploadRes.status} ${uploadRes.statusText}`)
      }

      return payload.storageSource
    })()

    const dependencies = await (async () => {
      return JSON.parse(await fs.readFile(path.join(args.path, 'package.json'), {encoding: 'utf-8'})).dependencies
    })()

    const res = await fetch(
      `https://cloudfunctions.googleapis.com/v2/projects/${auth.project}/locations/${flags.region}/functions/${args.functionName}?updateMask=buildConfig.environmentVariables,buildConfig.source.storageSource&access_token=${auth.accessToken}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buildConfig: {
            environmentVariables: {
              PACKAGE_DEPENDENCIES: JSON.stringify(dependencies),
            },
            source: {
              storageSource,
            },
          },
        }),
      },
    )

    if (!res.ok) {
      throw new Error(
        `can't patch google cloud function: ${res.status} ${res.statusText}`,
      )
    }

    await gcloudFunctionWaitOperationCompletion({
      name: 'Deploying cloud function',
      currentState: await res.json(),
      accessToken: auth.accessToken,
    })
  }

  /*
  private async getUploadedManifest({
    functionName,
    region,
    project,
    gen2,
  }: {
    functionName: string;
    region?: string;
    project?: string;
    gen2?: boolean;
  }) {
    const extFlags: Record<string, string | true> = {}
    if (region !== undefined) {
      extFlags.region = region
    }

    if (gen2 === true) {
      extFlags.gen2 = true
    }

    try {
      ux.action.start('Fetching current function status')
      const res = (await gcloud(['functions', 'describe', functionName], {
        project,
        onStderr: (message: string) => {
          this.log(message)
        },
      })) as CloudFunctionDescription
      const gcsUrl = `gs://${res.buildConfig.source.storageSource.bucket}/${res.buildConfig.source.storageSource.object}`
      ux.action.stop(chalk.green.bold('Successful'))

      ux.action.start('Downloading current sources')

      const source = await gcloudBinaryOutput(['storage', 'cat', gcsUrl], {
        onStderr: (message: string) => {
          this.log(message)
        },
      })
      ux.action.stop(chalk.green.bold('Successful'))

      ux.action.start('Extracting package.json')
      const manifestContent = await decompress(source, {
        filter: file => file.path === 'package.json',
      })
      if (manifestContent.length === 0) {
        throw new Error('no package.json in source archive')
      }

      const manifest = JSON.parse(
        new TextDecoder().decode(manifestContent[0].data),
      )
      ux.action.stop(chalk.green.bold('Successful'))

      return manifest as Record<string, unknown> & {
        dependencies: Record<string, string>;
      }
    } catch (error) {
      ux.action.stop(
        chalk.red.bold(
          'Failed: ' +
            (error instanceof Error ? error.message : 'unknown error'),
        ),
      )
      this.errorWithoutStack('Unable to validate uploaded manifest')
      this.notice('This step could be skipped with --force option')
      ux.exit(1)
    }
  }

  private async validateDependencies(
    payloadPath: string,
    dependencies: Record<string, string>,
    merge: boolean,
    autoConfirm: boolean,
  ) {
    ux.action.start('Validating dependencies')
    const manifestFilename = path.join(payloadPath, 'package.json')
    const manifest = JSON.parse(
      await fs.readFile(manifestFilename, {
        encoding: 'utf-8',
      }),
    ) as { dependencies: Record<string, string> }

    let missing: [string, string][] = []
    const conflicts: [
      string,
      { previousVersion: string; newVersion: string }
    ][] = []

    for (const dep of Object.keys(dependencies)) {
      const previousVersion = dependencies[dep]
      const newVersion = manifest.dependencies[dep]
      if (newVersion === undefined) {
        missing.push([dep, previousVersion])
        continue
      }

      if (previousVersion !== newVersion) {
        conflicts.push([dep, {previousVersion, newVersion}])
      }
    }

    if (missing.length > 0) {
      this.log(
        `Missing dependencies: ${missing
        .map(([dep, ver]) => `${dep}: ${ver}`)
        .join(', ')}`,
      )

      if (
        merge &&
        (autoConfirm ||
          (await ux.confirm(
            `File ${chalk.bold(
              manifestFilename,
            )} is going to be overriden with new dependencies added ${chalk.gray(
              '(yes/no)',
            )}`,
          )))
      ) {
        for (const [dep, ver] of missing) {
          manifest.dependencies[dep] = ver
        }

        await fs.writeFile(manifestFilename, JSON.stringify(manifest, null, 4))
        missing = []
        this.log(`File ${chalk.bold(manifestFilename)} has been updated`)
      }
    }

    if (conflicts.length > 0) {
      for (const [dep, data] of conflicts) {
        this.warnWithoutStack(
          `Dependency ${dep}: Previously uploaded version '${data.previousVersion}' is not equal to new version '${data.newVersion}'`,
        )
      }

      ux.action.stop(chalk.red.bold('Conflicts detected'))
      this.notice('Solve conflicts manually and try again')
      this.notice('Or use --force option to override uploaded manifest')
      ux.exit(1)
    }

    if (missing.length > 0) {
      ux.action.stop(chalk.red.bold('Missing dependencies detected'))
      this.notice(
        'Some dependencies are missing but could be added automatically. Use --merge option to add these dependencies to manifest.',
      )
      this.notice(
        'Or use --force option to override uploaded manifest (remove those dependencies)',
      )
      ux.exit(1)
    }

    ux.action.stop(chalk.green.bold('Successful'))
  } */

  private warnWithoutStack(message: string) {
    this.log(chalk.yellow(chalk.bold('Warning: ') + message))
  }

  private errorWithoutStack(message: string) {
    this.log(chalk.red(chalk.bold('Error: ') + message))
  }

  private notice(message: string) {
    this.log(chalk.italic(message))
  }
}
