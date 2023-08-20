import AdmZip = require('adm-zip');

export async function updateFile(
  content: Buffer,
  fileName: string,
  filePayload: Buffer,
  /* istanbul ignore next */ AdmZipImpl = AdmZip,
): Promise<Buffer> {
  const fromZip = new AdmZipImpl(content)
  const toZip = new AdmZipImpl()
  await Promise.all(
    fromZip.getEntries().map(async v => {
      if (v.isDirectory) {
        return
      }

      if (v.entryName === fileName) {
        return
      }

      const buffer = await new Promise<Buffer>((resolve, reject) => {
        v.getDataAsync((data, error) => {
          if (error) {
            reject(new Error(error))
          } else {
            resolve(data)
          }
        })
      })

      toZip.addFile(v.entryName, buffer)
    }),
  )
  toZip.addFile(fileName, filePayload)
  return toZip.toBufferPromise()
}

export async function generate(
  folder: string,
  dependencies: Record<string, string>,
  /* istanbul ignore next */ AdmZipImpl = AdmZip,
): Promise<Buffer> {
  const zip = new AdmZipImpl()
  zip.addLocalFolder(folder)
  zip.addFile(
    'package.json',
    Buffer.from(
      new TextEncoder().encode(JSON.stringify({dependencies}, null, 2)),
    ),
  )
  return zip.toBufferPromise()
}
