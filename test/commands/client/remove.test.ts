import {expect, test} from '@oclif/test'
import * as gcloudAuthModule from '../../../src/utils/gcloud-auth'
import * as gcloudFunctionModule from '../../../src/utils/gcloud-function'
import * as gcsUtilsModule from '../../../src/utils/gcs-utils'
import * as pushClientModule from '../../../src/utils/push-client'
import {assert, match, stub} from 'sinon'

describe('client:remove', () => {
  test
  .stdout()
  .stub(gcloudAuthModule, 'gcloudAuth', async () => {
    return {accessToken: 'my-token', project: 'my-project'}
  })
  .stub(gcloudFunctionModule, 'gcloudFunctionDescribe', (...args: any[]) => {
    expect(args[0]).to.eqls({
      functionName: 'my-function',
      auth: {
        accessToken: 'my-token',
        project: 'my-project',
      },
      region: 'us-central1',
    })
    return Promise.resolve({
      dummy: 'function',
      serviceConfig: 'dummy-service-config',
    })
  })
  .stub(gcsUtilsModule, 'getBucket', (...args: any[]) => {
    expect(args[0]).to.eqls({
      serviceConfig: 'dummy-service-config',
      auth: {
        accessToken: 'my-token',
        project: 'my-project',
      },
    })
    return {
      bucket: {
        file: stub().callsFake(name => {
          expect(name).to.equal('name/prefix/path/resolve.json')
          return {
            download: stub().resolves([Buffer.from('{ "files": { "f1.txt": "sha1", "f2.txt": "sha2" } }')]),
          }
        }),
      },
      namePrefix: 'name/prefix/',
    }
  })
  .stub(pushClientModule, 'batchOperations', stub().resolves())
  .command(['client:remove', 'my-function/path', '--yes'])
  .it('should remove module', ctx => {
    const batchOperations = pushClientModule.batchOperations as any
    assert.calledOnceWithExactly(batchOperations, {
      name: 'removing',
      fileEntries: [
        ['name/prefix/path/resolve.json', null],
        ['name/prefix/path/f1.txt', null],
        ['name/prefix/path/f2.txt', null],
      ],
      bucket: match.any,
      command: match.any,
    })
  })
})
