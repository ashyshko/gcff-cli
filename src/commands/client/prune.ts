import {Args, Command, Flags} from '@oclif/core'
import {gcloudAuth, gcloudFlags} from '../../utils/gcloud-auth'
import {gcloudFunctionDescribe} from '../../utils/gcloud-function'
import {getBucket} from '../../utils/gcs-utils'
import * as crypto from 'node:crypto'
import chalk = require('chalk')
import {confirm} from '../../utils/confirm'
import {batchOperations, clientPushFlags} from '../../utils/push-client'

export default class ClientPrune extends Command {
  static description = 'Remove all unlinked files and verify files checksum';

  static examples = ['<%= config.bin %> <%= command.id %> function-name'];

  static flags = {
    ...gcloudFlags,
    region: Flags.string({
      description: 'The Cloud region for the function',
      default: 'us-central1',
    }),
    removeDamagedFiles: Flags.boolean({
      description: 'Remove damaged files (files with mismatched checksums or incorrect resolve.json files) from GCS',
      default: false,
    }),
    yes: clientPushFlags.yes,
  };

  static args = {
    functionName: Args.string({
      description: 'Cloud function name',
      required: true,
    }),
  };

  static enableJsonFlag = true;

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(ClientPrune)

    const auth = await gcloudAuth(flags, this)

    const func = await gcloudFunctionDescribe({
      functionName: args.functionName,
      region: flags.region,
      auth,
    })

    const {bucket, namePrefix} = getBucket({
      serviceConfig: func.serviceConfig,
      auth,
    })

    const {missingFiles, damagedFiles, extraFiles, verifiedFiles} = await (async () => {
      const {modules, files} = await (async () => {
        const modules = new Set<string>()
        const files = new Map<string, boolean>() // value - in_use

        const allFiles = (
          await bucket.getFiles({
            prefix: namePrefix,
          })
        )[0]
        .filter(v => v.name.startsWith(namePrefix) && !v.name.endsWith('/'))
        .map(v => v.name.slice(namePrefix.length))

        for (const v of allFiles) {
          if (v.endsWith('resolve.json')) {
            modules.add(v)
          } else {
            files.set(v, false)
          }
        }

        return {modules, files}
      })()

      const missingFiles = new Set<string>()
      const damagedFiles = new Set<string>()
      const verifiedFiles = new Set<string>()

      await Promise.all(
        [...modules.entries()].map(async ([name]) => {
          const modulePath = name.slice(0, -'resolve.json'.length)
          const resolveJson: { files: Record<string, string> }|undefined = await (async () => {
            try {
              const res = JSON.parse(
                new TextDecoder().decode(
                  (
                    await bucket
                    .file(`${namePrefix}${modulePath}resolve.json`)
                    .download()
                  )[0],
                ),
              )
              if (typeof res !== 'object' || typeof res.files !== 'object' || Array.isArray(res.files)) {
                throw new TypeError('mallformed resolve.json')
              }

              return res
            } catch (error) {
              this.warn(`Can't download ${modulePath}resolve.json: ${error}`)
              damagedFiles.add(`${modulePath}resolve.json`)
            }
          })()

          if (resolveJson === undefined) {
            return
          }

          verifiedFiles.add(`${modulePath}resolve.json`)

          await Promise.all(
            Object.entries(resolveJson.files).map(async ([name, checksum]) => {
              const fileName = `${modulePath}${name}`

              const fileStatus = files.get(fileName)
              if (fileStatus === undefined) {
                missingFiles.add(fileName)
                return
              }

              if (fileStatus === true) {
                this.warn(
                  `File ${fileName} seems to be used by multiple modules`,
                )
                return
              }

              files.set(fileName, true)

              const content = (
                await bucket.file(`${namePrefix}${fileName}`).download()
              )[0]
              const hash = crypto
              .createHash('sha256')
              .update(content)
              .digest('hex')
              if (hash === checksum) {
                verifiedFiles.add(fileName)
                return
              }

              damagedFiles.add(fileName)
            }),
          )
        }),
      )

      const extraFiles = [...files.entries()]
      .filter(v => v[1] === false)
      .map(v => v[0])

      return {
        missingFiles: [...missingFiles.keys()],
        damagedFiles: [...damagedFiles.keys()],
        verifiedFiles: [...verifiedFiles.keys()],
        extraFiles,
      }
    })()

    const filesToRemove = [...extraFiles]
    if (flags.removeDamagedFiles) {
      filesToRemove.push(...damagedFiles)
    }

    this.logJson({missingFiles, damagedFiles, extraFiles, verifiedFiles, filesToRemove})

    if (filesToRemove.length === 0) {
      this.log('Everything is up-to-date')
      return
    }

    this.log(
      `This change will ${chalk.red(
        `remove ${chalk.bold(filesToRemove.length)} files:`,
      )}`,
    )
    for (const removed of filesToRemove) {
      this.log(`  ${chalk.italic(removed)}`)
    }

    await confirm(
      `You are about to remove ${chalk.bold(filesToRemove.length)} files from ${chalk.bold(
        `${args.functionName}`,
      )}`,
      flags.yes,
    )

    await batchOperations({
      name: 'removing',
      fileEntries: filesToRemove.map(name => [`${namePrefix}${name}`, null]),
      bucket,
      command: this,
    })
  }
}
