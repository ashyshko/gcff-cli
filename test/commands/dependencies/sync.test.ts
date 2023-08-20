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

describe('dependencies:sync', () => {
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
        environmentVariables: {'build-env-var': '1'},
        source: {
          storageSource: 'prev-data-unused',
        },
      },
      serviceConfig: {
        environmentVariables: {'service-env-var': '1'},
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
  .stub(gcsUtilsModule, 'getBucket', (...args: any[]) => {
    expect(args[0]).to.eqls({
      serviceConfig: {
        environmentVariables: {'service-env-var': '1'},
      },
      auth: {
        accessToken: 'my-token',
        project: 'my-project',
      },
    })
    return {bucket: 'gcs-bucket-stub', namePrefix: 'name/prefix/'}
  })
  .stub(dependenciesListModule, 'getAllDependencies', (...args: any[]) => {
    expect(args[0]).to.eqls({
      bucket: 'gcs-bucket-stub',
      moduleNamePrefix: 'name/prefix/',
      buildConfig: {
        environmentVariables: {'build-env-var': '1'},
        source: {
          storageSource: 'prev-data-unused',
        },
      },
    })
    return Promise.resolve({
      server: {
        'server-dep': '1.0',
      },
      united: {
        'united-dep': '1.0',
      },
      modules: {
        moduleA: {
          'moduleA-dep': '1.0',
        },
      },
    })
  })
  .stub(
    gcloudFunctionModule,
    'gcloudFunctionDownloadSources',
    (...args: any[]) => {
      expect(args[0]).to.eqls({
        functionName: 'my-function',
        region: 'us-central1',
        auth: {
          accessToken: 'my-token',
          project: 'my-project',
        },
      })
      return Promise.resolve(Buffer.from([1, 2, 3]))
    },
  )
  .stub(zipModule, 'updateFile', (...args: any[]) => {
    expect(args[0]).to.eqls(Buffer.from([1, 2, 3]))
    expect(args[1]).to.equal('package.json')
    expect(new TextDecoder().decode(args[2])).to.equal(`{
  "dependencies": {
    "server-dep": "1.0",
    "moduleA-dep": "1.0"
  }
}`)
    return Promise.resolve(Buffer.from([4, 5, 6]))
  })
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
        body: Buffer.from([4, 5, 6]),
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
      ],
      payload: {
        buildConfig: {
          environmentVariables: {
            'build-env-var': '1',
            DEPENDENCIES: '{"server-dep":"1.0","moduleA-dep":"1.0"}',
          },
          source: {
            storageSource: 'storage-source-data',
          },
        },
        serviceConfig: {
          environmentVariables: {'service-env-var': '1'},
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
  .command(['dependencies:sync', 'my-function'])
  .it('should synchronize dependencies', ctx => {
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
        environmentVariables: {'build-env-var': '1'},
        source: {
          storageSource: 'prev-data-unused',
        },
      },
      serviceConfig: {
        environmentVariables: {'service-env-var': '1'},
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
  .stub(fs, 'readFile', (...args: any[]) => {
    expect(args[0]).to.equal('package.json')
    expect(args[1]).to.eqls({encoding: 'utf-8'})
    return Promise.resolve(
      Buffer.from('{"dependencies": {"newDep": "1.1"}}'),
    )
  })
  .stub(
    gcloudFunctionModule,
    'gcloudFunctionDownloadSources',
    (...args: any[]) => {
      expect(args[0]).to.eqls({
        functionName: 'my-function',
        region: 'us-central1',
        auth: {
          accessToken: 'my-token',
          project: 'my-project',
        },
      })
      return Promise.resolve(Buffer.from([1, 2, 3]))
    },
  )
  .stub(zipModule, 'updateFile', (...args: any[]) => {
    expect(args[0]).to.eqls(Buffer.from([1, 2, 3]))
    expect(args[1]).to.equal('package.json')
    expect(new TextDecoder().decode(args[2])).to.equal(`{
  "dependencies": {
    "newDep": "1.1"
  }
}`)
    return Promise.resolve(Buffer.from([4, 5, 6]))
  })
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
        body: Buffer.from([4, 5, 6]),
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
      ],
      payload: {
        buildConfig: {
          environmentVariables: {
            'build-env-var': '1',
            DEPENDENCIES: '{"newDep":"1.1"}',
          },
          source: {
            storageSource: 'storage-source-data',
          },
        },
        serviceConfig: {
          environmentVariables: {'service-env-var': '1'},
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
  .command(['dependencies:sync', 'my-function', '--load=package.json'])
  .it('should synchronize dependencies', ctx => {
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
    return Promise.resolve()
  })
  .command(['dependencies:sync', 'my-function'])
  .catch('Cloud function not found', {raiseIfNotThrown: true})
  .it('should return with error if function is not found', ctx => {
    /* do nothing */
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
        environmentVariables: {'build-env-var': '1'},
        source: {
          storageSource: 'prev-data-unused',
        },
      },
      serviceConfig: {
        environmentVariables: {'service-env-var': '1'},
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
  .stub(gcsUtilsModule, 'getBucket', (...args: any[]) => {
    expect(args[0]).to.eqls({
      serviceConfig: {
        environmentVariables: {'service-env-var': '1'},
      },
      auth: {
        accessToken: 'my-token',
        project: 'my-project',
      },
    })
    return {bucket: 'gcs-bucket-stub', namePrefix: 'name/prefix/'}
  })
  .stub(dependenciesListModule, 'getAllDependencies', (...args: any[]) => {
    expect(args[0]).to.eqls({
      bucket: 'gcs-bucket-stub',
      moduleNamePrefix: 'name/prefix/',
      buildConfig: {
        environmentVariables: {'build-env-var': '1'},
        source: {
          storageSource: 'prev-data-unused',
        },
      },
    })
    return Promise.resolve({
      server: {
        dep1: '1.0',
      },
      united: {
        dep1: '1.0',
      },
      modules: {
        moduleA: {
          dep1: '1.1',
        },
      },
    })
  })
  .command(['dependencies:sync', 'my-function'])
  .catch(/Found 1 conflicts/, {raiseIfNotThrown: true})
  .it('should show error if there are conflicts', ctx => { /* noop */ })

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
        environmentVariables: {'build-env-var': '1'},
        source: {
          storageSource: 'prev-data-unused',
        },
      },
      serviceConfig: {
        environmentVariables: {'service-env-var': '1'},
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
  .stub(gcsUtilsModule, 'getBucket', (...args: any[]) => {
    expect(args[0]).to.eqls({
      serviceConfig: {
        environmentVariables: {'service-env-var': '1'},
      },
      auth: {
        accessToken: 'my-token',
        project: 'my-project',
      },
    })
    return {bucket: 'gcs-bucket-stub', namePrefix: 'name/prefix/'}
  })
  .stub(dependenciesListModule, 'getAllDependencies', (...args: any[]) => {
    expect(args[0]).to.eqls({
      bucket: 'gcs-bucket-stub',
      moduleNamePrefix: 'name/prefix/',
      buildConfig: {
        environmentVariables: {'build-env-var': '1'},
        source: {
          storageSource: 'prev-data-unused',
        },
      },
    })
    return Promise.resolve({
      server: {
        'server-dep': '1.0',
        'conflict-dep': '1.0',
      },
      united: {
        'united-dep': '1.0',
      },
      modules: {
        moduleA: {
          'moduleA-dep': '1.0',
          'conflict-dep': '1.1',
        },
      },
    })
  })
  .stub(
    gcloudFunctionModule,
    'gcloudFunctionDownloadSources',
    (...args: any[]) => {
      expect(args[0]).to.eqls({
        functionName: 'my-function',
        region: 'us-central1',
        auth: {
          accessToken: 'my-token',
          project: 'my-project',
        },
      })
      return Promise.resolve(Buffer.from([1, 2, 3]))
    },
  )
  .stub(zipModule, 'updateFile', (...args: any[]) => {
    expect(args[0]).to.eqls(Buffer.from([1, 2, 3]))
    expect(args[1]).to.equal('package.json')
    expect(new TextDecoder().decode(args[2])).to.equal(`{
  "dependencies": {
    "server-dep": "1.0",
    "moduleA-dep": "1.0"
  }
}`)
    return Promise.resolve(Buffer.from([4, 5, 6]))
  })
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
        body: Buffer.from([4, 5, 6]),
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
      ],
      payload: {
        buildConfig: {
          environmentVariables: {
            'build-env-var': '1',
            DEPENDENCIES: '{"server-dep":"1.0","moduleA-dep":"1.0"}',
          },
          source: {
            storageSource: 'storage-source-data',
          },
        },
        serviceConfig: {
          environmentVariables: {'service-env-var': '1'},
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
  .command(['dependencies:sync', 'my-function', '--ignoreConflicts'])
  .it('should ignore conflicts with flag --ignoreConflicts', ctx => {
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
        environmentVariables: {'build-env-var': '1'},
        source: {
          storageSource: 'prev-data-unused',
        },
      },
      serviceConfig: {
        environmentVariables: {'service-env-var': '1'},
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
  .stub(gcsUtilsModule, 'getBucket', (...args: any[]) => {
    expect(args[0]).to.eqls({
      serviceConfig: {
        environmentVariables: {'service-env-var': '1'},
      },
      auth: {
        accessToken: 'my-token',
        project: 'my-project',
      },
    })
    return {bucket: 'gcs-bucket-stub', namePrefix: 'name/prefix/'}
  })
  .stub(dependenciesListModule, 'getAllDependencies', (...args: any[]) => {
    expect(args[0]).to.eqls({
      bucket: 'gcs-bucket-stub',
      moduleNamePrefix: 'name/prefix/',
      buildConfig: {
        environmentVariables: {'build-env-var': '1'},
        source: {
          storageSource: 'prev-data-unused',
        },
      },
    })
    return Promise.resolve({
      server: {
        'server-dep': '1.0',
      },
      united: {
        'united-dep': '1.0',
      },
      modules: {
        moduleA: {
          'moduleA-dep': '1.0',
        },
      },
    })
  })
  .stub(
    gcloudFunctionModule,
    'gcloudFunctionDownloadSources',
    (...args: any[]) => {
      expect(args[0]).to.eqls({
        functionName: 'my-function',
        region: 'us-central1',
        auth: {
          accessToken: 'my-token',
          project: 'my-project',
        },
      })
      return Promise.resolve(Buffer.from([1, 2, 3]))
    },
  )
  .stub(zipModule, 'updateFile', (...args: any[]) => {
    expect(args[0]).to.eqls(Buffer.from([1, 2, 3]))
    expect(args[1]).to.equal('package.json')
    expect(new TextDecoder().decode(args[2])).to.equal(`{
  "dependencies": {
    "server-dep": "1.1",
    "new-dep": "1.0"
  }
}`)
    return Promise.resolve(Buffer.from([4, 5, 6]))
  })
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
        body: Buffer.from([4, 5, 6]),
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
      ],
      payload: {
        buildConfig: {
          environmentVariables: {
            'build-env-var': '1',
            DEPENDENCIES: '{"server-dep":"1.1","new-dep":"1.0"}',
          },
          source: {
            storageSource: 'storage-source-data',
          },
        },
        serviceConfig: {
          environmentVariables: {'service-env-var': '1'},
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
  .command(['dependencies:sync', 'my-function', '--addDependency=server-dep:1.1', '--addDependency=new-dep:1.0', '--removeDependency=moduleA-dep'])
  .it('should support --addDependency and --removeDependency flags', ctx => {
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
        environmentVariables: {'build-env-var': '1'},
        source: {
          storageSource: 'prev-data-unused',
        },
      },
      serviceConfig: {
        environmentVariables: {'service-env-var': '1'},
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
  .stub(gcsUtilsModule, 'getBucket', (...args: any[]) => {
    expect(args[0]).to.eqls({
      serviceConfig: {
        environmentVariables: {'service-env-var': '1'},
      },
      auth: {
        accessToken: 'my-token',
        project: 'my-project',
      },
    })
    return {bucket: 'gcs-bucket-stub', namePrefix: 'name/prefix/'}
  })
  .stub(dependenciesListModule, 'getAllDependencies', (...args: any[]) => {
    expect(args[0]).to.eqls({
      bucket: 'gcs-bucket-stub',
      moduleNamePrefix: 'name/prefix/',
      buildConfig: {
        environmentVariables: {'build-env-var': '1'},
        source: {
          storageSource: 'prev-data-unused',
        },
      },
    })
    return Promise.resolve({
      server: {
        'server-dep': '1.0',
      },
      united: {
        'united-dep': '1.0',
      },
      modules: {
        moduleA: {
          'moduleA-dep': '1.0',
        },
      },
    })
  })
  .command(['dependencies:sync', 'my-function', '--removeDependency=non-existing-dep'])
  .catch(/There is no dependency non-existing-dep/, {raiseIfNotThrown: true})
  .it('should support --addDependency and --removeDependency flags', ctx => { /* noop */ })

  test
  .stdout()
  .command(['dependencies:sync', 'my-function', '--addDependency=wrong-format-without-colon'])
  .catch(/incorrect dependency format, expected name:version/, {raiseIfNotThrown: true})
  .it('should check addDependency format', ctx => { /* noop */ })
})
