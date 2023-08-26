import {expect, test} from '@oclif/test'
import * as gcloudAuthModule from '../../../src/utils/gcloud-auth'
import * as gcloudFunctionModule from '../../../src/utils/gcloud-function'
import * as gcsUtilsModule from '../../../src/utils/gcs-utils'
import * as dependenciesModule from '../../../src/utils/dependencies'
import * as dependenciesListModule from '../../../src/utils/dependencies-list'
import * as fs from 'node:fs/promises'
import * as stageModule from '../../../src/utils/stage'
import * as confirmModule from '../../../src/utils/confirm'
import * as zipModule from '../../../src/utils/zip'
import {assert, stub} from 'sinon'
import {Command} from '@oclif/core'

describe('server:deploy', () => {
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
      buildConfig: {
        environmentVariables: {
          'build-env-var': '1',
          SERVER_DEPENDENCIES: JSON.stringify({depA: '1.0'}),
          DEPENDENCIES: JSON.stringify({depA: '1.0', depB: '1.1'}),
        },
        source: {
          storageSource: 'prev-data-unused',
        },
      },
      serviceConfig: {
        environmentVariables: {
          'service-env-var': '1',
          GCFF_PATH: 'gcff/path',
        },
      },
    })
  })
  .stub(stageModule, 'stage', (...args: any[]) => {
    return args[1](
      /* updateStatus */ () => {
        /* noop */
      },
    )
  })
  .stub(confirmModule, 'confirm', stub().resolves())
  .stub(dependenciesModule, 'getDependenciesFromPackageJson', stub().resolves({depA: '1.0', depC: '1.0'}))
  .stub(zipModule, 'generate', stub().resolves(Buffer.from([0x30, 0x32, 0x34])))
  .stub(
    gcloudFunctionModule,
    'gcloudFunctionUploadSources',
    (...args: any[]) => {
      expect(args[0]).to.eqls({
        region: 'us-central1',
        auth: {
          accessToken: 'my-token',
          project: 'my-project',
        },
        body: Buffer.from([0x30, 0x32, 0x34]),
      })
      return Promise.resolve('storage-source-data')
    },
  )
  .stub(gcloudFunctionModule, 'gcloudFunctionPatch', (...args: any[]) => {
    expect(args[0]).to.eqls({
      functionName: 'my-function',
      region: 'us-central1',
      auth: {
        accessToken: 'my-token',
        project: 'my-project',
      },
      updateFields: [
        'buildConfig.environmentVariables',
        'buildConfig.source.storageSource',
        'serviceConfig.environmentVariables',
      ],
      payload: {
        buildConfig: {
          environmentVariables: {
            'build-env-var': '1',
            DEPENDENCIES: '{"depA":"1.0","depB":"1.1","depC":"1.0"}',
            SERVER_DEPENDENCIES: '{"depA":"1.0","depC":"1.0"}',
          },
          source: {
            storageSource: 'storage-source-data',
          },
        },
        serviceConfig: {
          environmentVariables: {
            'service-env-var': '1',
            GCFF_PATH: 'gcff/path',
          },
        },
      },
    })
    return Promise.resolve('op-id')
  })
  .stub(
    gcloudFunctionModule,
    'gcloudFunctionWaitOperationCompletion',
    stub().callsFake(params => {
      expect(params.currentState).to.equal('op-id')
      expect(params.accessToken).to.equal('my-token')
      return Promise.resolve()
    }),
  )
  .command(['server:deploy', 'my-function', './test'])
  .it('should deploy server to cloud function', ctx => {
    assert.calledOnce(
        gcloudFunctionModule.gcloudFunctionWaitOperationCompletion as any,
    )
  })

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
      buildConfig: {
        environmentVariables: {
          'build-env-var': '1',
          SERVER_DEPENDENCIES: JSON.stringify({depA: '1.0'}),
          DEPENDENCIES: JSON.stringify({depA: '1.0', depB: '1.1'}),
        },
        source: {
          storageSource: 'prev-data-unused',
        },
      },
      serviceConfig: {
        environmentVariables: {
          'service-env-var': '1',
          // no GCFF_PATH variable
        },
      },
    })
  })
  .stub(stageModule, 'stage', (...args: any[]) => {
    return args[1](
      /* updateStatus */ () => {
        /* noop */
      },
    )
  })
  .stub(confirmModule, 'confirm', stub().resolves())
  .stub(dependenciesModule, 'getDependenciesFromPackageJson', stub().resolves({depA: '1.0'}))
  .stub(zipModule, 'generate', stub().resolves(Buffer.from([0x30, 0x32, 0x34])))
  .stub(
    gcloudFunctionModule,
    'gcloudFunctionUploadSources',
    (...args: any[]) => {
      expect(args[0]).to.eqls({
        region: 'us-central1',
        auth: {
          accessToken: 'my-token',
          project: 'my-project',
        },
        body: Buffer.from([0x30, 0x32, 0x34]),
      })
      return Promise.resolve('storage-source-data')
    },
  )
  .stub(gcloudFunctionModule, 'gcloudFunctionPatch', (...args: any[]) => {
    expect(args[0]).to.eqls({
      functionName: 'my-function',
      region: 'us-central1',
      auth: {
        accessToken: 'my-token',
        project: 'my-project',
      },
      updateFields: [
        'buildConfig.environmentVariables',
        'buildConfig.source.storageSource',
        'serviceConfig.environmentVariables',
      ],
      payload: {
        buildConfig: {
          environmentVariables: {
            'build-env-var': '1',
            DEPENDENCIES: '{"depA":"1.0","depB":"1.1"}',
            SERVER_DEPENDENCIES: '{"depA":"1.0"}',
          },
          source: {
            storageSource: 'storage-source-data',
          },
        },
        serviceConfig: {
          environmentVariables: {
            'service-env-var': '1',
            GCFF_PATH: 'gcff/path',
          },
        },
      },
    })
    return Promise.resolve('op-id')
  })
  .stub(
    gcloudFunctionModule,
    'gcloudFunctionWaitOperationCompletion',
    stub().callsFake(params => {
      expect(params.currentState).to.equal('op-id')
      expect(params.accessToken).to.equal('my-token')
      return Promise.resolve()
    }),
  )
  .command(['server:deploy', 'my-function', './test', '--gcffPath=gcff/path'])
  .it('should receive gcffPath as arg', ctx => {
    assert.calledOnce(
        gcloudFunctionModule.gcloudFunctionWaitOperationCompletion as any,
    )
  })

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
      buildConfig: {
        environmentVariables: {
          'build-env-var': '1',
          SERVER_DEPENDENCIES: JSON.stringify({depA: '1.0'}),
          DEPENDENCIES: JSON.stringify({depA: '1.0', depB: '1.1'}),
        },
        source: {
          storageSource: 'prev-data-unused',
        },
      },
      serviceConfig: {
        environmentVariables: {
          'service-env-var': '1',
          // no GCFF_PATH variable
        },
      },
    })
  })
  .stub(stageModule, 'stage', (...args: any[]) => {
    return args[1](
      /* updateStatus */ () => {
        /* noop */
      },
    )
  })
  .stub(confirmModule, 'confirm', stub().resolves())
  .stub(dependenciesModule, 'getDependenciesFromPackageJson', stub().resolves({depB: '1.0' /* conflict there with env.DEPENDENCIES */, depC: '1.0'}))
  .command(['server:deploy', 'my-function', './test', '--gcffPath=gcff/path'])
  .catch('Conflict in versions detected', {raiseIfNotThrown: true})
  .it('should receive gcffPath as arg', () => {/* noop */})

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
      buildConfig: {
        environmentVariables: {
          'build-env-var': '1',
          SERVER_DEPENDENCIES: JSON.stringify({depA: '1.0'}),
          DEPENDENCIES: JSON.stringify({depA: '1.0', depB: '1.1'}),
        },
        source: {
          storageSource: 'prev-data-unused',
        },
      },
      serviceConfig: {
        environmentVariables: undefined,
      },
    })
  })
  .stub(stageModule, 'stage', (...args: any[]) => {
    return args[1](
      /* updateStatus */ () => {
        /* noop */
      },
    )
  })
  .stub(confirmModule, 'confirm', stub().resolves())
  .stub(dependenciesModule, 'getDependenciesFromPackageJson', stub().resolves({depB: '1.0' /* conflict there with env.DEPENDENCIES */, depC: '1.0'}))
  .command(['server:deploy', 'my-function', './test'] /* no --gcffPath arg */)
  .catch('No GCFF_PATH provided (not via env variable nor via parameter). Consider using --gcffPath', {raiseIfNotThrown: true})
  .it('should return error if gcffPath is not currently set and not received from cloud func', () => {/* noop */})

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
      buildConfig: {
        environmentVariables: {
          'build-env-var': '1',
          SERVER_DEPENDENCIES: JSON.stringify({depA: '1.0'}),
          DEPENDENCIES: JSON.stringify({depA: '1.1-conflict', depB: '1.1'}),
        },
        source: {
          storageSource: 'prev-data-unused',
        },
      },
      serviceConfig: {
        environmentVariables: {
          'service-env-var': '1',
          GCFF_PATH: 'gcff/path',
        },
      },
    })
  })
  .stub(stageModule, 'stage', (...args: any[]) => {
    return args[1](
      /* updateStatus */ () => {
        /* noop */
      },
    )
  })
  .stub(confirmModule, 'confirm', stub().resolves())
  .stub(dependenciesModule, 'getDependenciesFromPackageJson', stub().resolves({depA: '1.0', depC: '1.0'}))
  .stub(zipModule, 'generate', stub().resolves(Buffer.from([0x30, 0x32, 0x34])))
  .stub(
    gcloudFunctionModule,
    'gcloudFunctionUploadSources',
    (...args: any[]) => {
      expect(args[0]).to.eqls({
        region: 'us-central1',
        auth: {
          accessToken: 'my-token',
          project: 'my-project',
        },
        body: Buffer.from([0x30, 0x32, 0x34]),
      })
      return Promise.resolve('storage-source-data')
    },
  )
  .stub(gcloudFunctionModule, 'gcloudFunctionPatch', (...args: any[]) => {
    expect(args[0]).to.eqls({
      functionName: 'my-function',
      region: 'us-central1',
      auth: {
        accessToken: 'my-token',
        project: 'my-project',
      },
      updateFields: [
        'buildConfig.environmentVariables',
        'buildConfig.source.storageSource',
        'serviceConfig.environmentVariables',
      ],
      payload: {
        buildConfig: {
          environmentVariables: {
            'build-env-var': '1',
            DEPENDENCIES: '{"depA":"1.0","depC":"1.0"}',
            SERVER_DEPENDENCIES: '{"depA":"1.0","depC":"1.0"}',
          },
          source: {
            storageSource: 'storage-source-data',
          },
        },
        serviceConfig: {
          environmentVariables: {
            'service-env-var': '1',
            GCFF_PATH: 'gcff/path',
          },
        },
      },
    })
    return Promise.resolve('op-id')
  })
  .stub(
    gcloudFunctionModule,
    'gcloudFunctionWaitOperationCompletion',
    stub().callsFake(params => {
      expect(params.currentState).to.equal('op-id')
      expect(params.accessToken).to.equal('my-token')
      return Promise.resolve()
    }),
  )
  .stub(Command.prototype, 'warn', stub())
  .command(['server:deploy', 'my-function', './test', '--force'])
  .it('should apply server dependencies with --force flag', ctx => {
    assert.calledOnce(
        gcloudFunctionModule.gcloudFunctionWaitOperationCompletion as any,
    )
  })
})
