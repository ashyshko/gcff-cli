import {Bucket} from '@google-cloud/storage'

export async function findModules({bucket, namePrefix}: { bucket: Bucket, namePrefix: string }): Promise<string[]> {
  const fixedPrefix = (namePrefix.length > 0 && !namePrefix.endsWith('/')) ? `${namePrefix}/` : namePrefix
  return (await bucket.getFiles({
    matchGlob: '**/resolve.json',
  }))[0].filter(v => {
    if (fixedPrefix.length === 0) {
      return true
    }

    return v.name.startsWith(fixedPrefix)
  }).map(v => {
    if (v.name === 'resolve.json') {
      return ''
    }

    const suffix = '/resolve.json'

    /* istanbul ignore next */
    if (!v.name.endsWith(suffix)) {
      throw new Error(`internal error: invalid resolve file name ${v.name}`)
    }

    return `${v.name.slice(0, -suffix.length)}/`
  })
}
