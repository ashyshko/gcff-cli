import {expect, test} from '@oclif/test'
import * as gcloudAuthModule from '../../../src/utils/gcloud-auth'
import * as gcloudFunctionModule from '../../../src/utils/gcloud-function'
import * as dependenciesModule from '../../../src/utils/dependencies'

describe('dependencies:list', () => {
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
      buildConfig: {environmentVariables: {VAR1: 'VALUE1'}},
    })
  })
  .stub(
    dependenciesModule,
    'getDependenciesFromMetadata',
    (...args: any[]) => {
      expect(args[0]).to.eqls({
        VAR1: 'VALUE1',
      })
      return {unitedDependencies: {depA: '1.0'}}
    },
  )
  .command(['dependencies:list', 'my-function', '--json'])
  .it('should get function metadata', ctx => {
    expect(JSON.parse(ctx.stdout)).to.eqls({dependencies: {depA: '1.0'}})
  })

  test
  .stdout()
  .stderr()
  .stub(gcloudAuthModule, 'gcloudAuth', async () => {
    return {accessToken: 'my-token', project: 'my-project'}
  })
  .stub(gcloudFunctionModule, 'gcloudFunctionDescribe', () => Promise.resolve())
  .command(['dependencies:list', 'my-function'])
  .catch('Cloud function not found', {raiseIfNotThrown: true})
  .it('should return error if function is not found', ctx => {
    /* do nothing */
  })
})
