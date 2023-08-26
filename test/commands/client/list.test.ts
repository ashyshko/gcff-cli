import {expect, test} from '@oclif/test'
import * as gcloudAuthModule from '../../../src/utils/gcloud-auth'
import * as gcloudFunctionModule from '../../../src/utils/gcloud-function'
import * as gcsUtilsModule from '../../../src/utils/gcs-utils'
import * as findModulesModule from '../../../src/utils/find-modules'

describe('client:list', () => {
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
      bucket: 'dummy-bucket',
    }
  })
  .stub(findModulesModule, 'findModules', (...args: any[]) => {
    expect(args[0]).to.eqls({
      bucket: 'dummy-bucket',
      namePrefix: '',
    })
    return Promise.resolve(['1', '2', '3'])
  })
  .command(['client:list', 'my-function', '--json'])
  .it('should return modules', ctx => {
    expect(JSON.parse(ctx.stdout)).to.eqls(['1', '2', '3'])
  })
})
