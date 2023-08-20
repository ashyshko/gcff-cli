import {OAuth2Client} from 'google-auth-library'
import {GcloudAuth} from './gcloud-auth'
import {Bucket, Storage} from '@google-cloud/storage'
import {GcloudFunction} from './gcloud-function'

export function createStorage(auth: GcloudAuth): Storage {
  const client = new OAuth2Client({})
  client.setCredentials({
    access_token: auth.accessToken,
  })

  return new Storage({
    authClient: client,
    projectId: auth.project,
  })
}

export function getBucket({
  serviceConfig,
  storage,
  auth,
}: { serviceConfig: GcloudFunction['serviceConfig'] } & (
  | { storage?: undefined; auth: GcloudAuth }
  | { storage: Storage; auth?: undefined }
)): { bucket: Bucket; namePrefix: string } {
  storage = storage ?? createStorage(auth)

  const path = serviceConfig.environmentVariables?.GCFF_PATH
  if (typeof path !== 'string') {
    throw new TypeError('No env variable GCFF_PATH for provided cloud function')
  }

  const match = path.match(/^([^/]+)(\/(.*))?$/)
  if (!match) {
    throw new Error('GCFF_PATH set to incorrect value')
  }

  let namePrefix = match[3] ?? ''
  if (namePrefix.length > 0 && !namePrefix.endsWith('/')) {
    namePrefix += '/'
  }

  return {
    bucket: storage.bucket(match[1]),
    namePrefix,
  }
}
