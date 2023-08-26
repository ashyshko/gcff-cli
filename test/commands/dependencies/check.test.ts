import {expect, test} from '@oclif/test'
import * as gcloudAuthModule from '../../../src/utils/gcloud-auth'
import * as gcloudFunctionModule from '../../../src/utils/gcloud-function'
import * as gcsUtils from '../../../src/utils/gcs-utils'
import * as dependenciesModule from '../../../src/utils/dependencies'
import * as dependenciesListModule from '../../../src/utils/dependencies-list'
import * as fs from 'node:fs/promises'
import {assert, stub} from 'sinon'
import {Command} from '@oclif/core'

describe('dependencies:check', () => {
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
      buildConfig: 'function-build-config-stub',
      serviceConfig: 'function-service-config-stub',
    })
  })
  .stub(gcsUtils, 'getBucket', (...args: any[]) => {
    expect(args[0]).to.eqls({
      serviceConfig: 'function-service-config-stub',
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
      buildConfig: 'function-build-config-stub',
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
  .stub(dependenciesListModule, 'unitedDependencies', (...args: any[]) => {
    expect(args[0]).to.eqls({
      server: {
        'server-dep': '1.0',
      },
      modules: {
        moduleA: {
          'moduleA-dep': '1.0',
        },
      },
    })
    return {
      dependencies: {
        'united-dep': '1.1-new',
      },
      conflicts: [],
    }
  })
  .stub(dependenciesModule, 'diffDependencies', (...args: any[]) => {
    expect(args[0]).to.eqls({
      'united-dep': '1.0',
    })
    expect(args[1]).to.eqls({
      'united-dep': '1.1-new',
    })

    return {
      added: [['newDep', '1.0']],
      removed: [['oldDep', '1.0']],
      changed: [['changedDep', {fromVersion: '1.0', toVersion: '1.1-new'}]],
      equals: false,
    }
  })
  .command(['dependencies:check', 'my-function'])
  .it('should check dependencies', ctx => {
    expect(ctx.stdout).to.contain(`{
  "current": {
    "server": {
      "server-dep": "1.0"
    },
    "united": {
      "united-dep": "1.0"
    },
    "modules": {
      "moduleA": {
        "moduleA-dep": "1.0"
      }
    }
  },
  "proposed": {
    "united-dep": "1.1-new"
  },
  "conflicts": [],
  "missingDependencies": {
    "newDep": "1.0"
  },
  "extraDependencies": {
    "oldDep": "1.0"
  },
  "updatedDependencies": {
    "changedDep": {
      "fromVersion": "1.0",
      "toVersion": "1.1-new"
    }
  },
  "upToDate": false
}`)
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
      buildConfig: 'function-build-config-stub',
      serviceConfig: 'function-service-config-stub',
    })
  })
  .stub(gcsUtils, 'getBucket', (...args: any[]) => {
    expect(args[0]).to.eqls({
      serviceConfig: 'function-service-config-stub',
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
      buildConfig: 'function-build-config-stub',
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
  .stub(dependenciesListModule, 'unitedDependencies', (...args: any[]) => {
    expect(args[0]).to.eqls({
      server: {
        'server-dep': '1.0',
      },
      modules: {
        moduleA: {
          'moduleA-dep': '1.0',
        },
      },
    })
    return {
      dependencies: {
        'united-dep': '1.1-new',
      },
      conflicts: [],
    }
  })
  .stub(dependenciesModule, 'diffDependencies', (...args: any[]) => {
    expect(args[0]).to.eqls({
      'united-dep': '1.0',
    })
    expect(args[1]).to.eqls({
      'united-dep': '1.1-new',
    })

    return {
      added: [['newDep', '1.0']],
      removed: [['oldDep', '1.0']],
      changed: [['changedDep', {fromVersion: '1.0', toVersion: '1.1-new'}]],
      equals: false,
    }
  })
  .command(['dependencies:check', 'my-function', '--json'])
  .it('should output to json', ctx => {
    expect(JSON.parse(ctx.stdout)).to.eqls({
      current: {
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
      },
      proposed: {
        'united-dep': '1.1-new',
      },
      conflicts: [],
      missingDependencies: {
        newDep: '1.0',
      },
      extraDependencies: {
        oldDep: '1.0',
      },
      updatedDependencies: {
        changedDep: {
          fromVersion: '1.0',
          toVersion: '1.1-new',
        },
      },
      upToDate: false,
    })
  })

  test
  .stdout()
  .stub(gcloudAuthModule, 'gcloudAuth', async () => {
    return {accessToken: 'my-token', project: 'my-project'}
  })
  .stub(gcloudFunctionModule, 'gcloudFunctionDescribe', (...args: any[]) => {
    return Promise.resolve()
  })
  .command(['dependencies:check', 'my-function'])
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
    return Promise.resolve({
      buildConfig: 'function-build-config-stub',
      serviceConfig: 'function-service-config-stub',
    })
  })
  .stub(gcsUtils, 'getBucket', (...args: any[]) => {
    return {bucket: 'gcs-bucket-stub', namePrefix: 'name/prefix/'}
  })
  .stub(dependenciesListModule, 'getAllDependencies', (...args: any[]) => {
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
  .stub(dependenciesListModule, 'unitedDependencies', (...args: any[]) => {
    return {
      dependencies: {
        'united-dep': '1.1-new',
      },
      conflicts: [],
    }
  })
  .stub(dependenciesModule, 'diffDependencies', (...args: any[]) => {
    return {
      added: [['newDep', '1.0']],
      removed: [['oldDep', '1.0']],
      changed: [['changedDep', {fromVersion: '1.0', toVersion: '1.1-new'}]],
      equals: false,
    }
  })
  .stub(fs, 'writeFile', stub().resolves())
  .command(['dependencies:check', 'my-function', '--json', '--saveUpdatedDependencies=file-name.txt'])
  .it('should write dependencies to json', ctx => {
    const writeFile = fs.writeFile as any
    assert.calledOnce(writeFile)
    assert.calledWithExactly(writeFile, 'file-name.txt', `{
  "dependencies": {
    "united-dep": "1.1-new"
  }
}`, {encoding: 'utf-8'})
  })

  test
  .stderr()
  .stub(gcloudAuthModule, 'gcloudAuth', async () => {
    return {accessToken: 'my-token', project: 'my-project'}
  })
  .stub(gcloudFunctionModule, 'gcloudFunctionDescribe', (...args: any[]) => {
    return Promise.resolve({
      buildConfig: 'function-build-config-stub',
      serviceConfig: 'function-service-config-stub',
    })
  })
  .stub(gcsUtils, 'getBucket', (...args: any[]) => {
    return {bucket: 'gcs-bucket-stub', namePrefix: 'name/prefix/'}
  })
  .stub(dependenciesListModule, 'getAllDependencies', (...args: any[]) => {
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
  .stub(dependenciesListModule, 'unitedDependencies', (...args: any[]) => {
    return {
      dependencies: {
        'united-dep': '1.1-new',
      },
      conflicts: [{dependencyName: 'conflict1', versions: {v1: ['<SERVER>'], v2: ['module1']}}],
    }
  })
  .stub(dependenciesModule, 'diffDependencies', (...args: any[]) => {
    return {
      added: [['newDep', '1.0']],
      removed: [['oldDep', '1.0']],
      changed: [['changedDep', {fromVersion: '1.0', toVersion: '1.1-new'}]],
      equals: false,
    }
  })
  .stub(Command.prototype, 'logJson', stub())
  .command(['dependencies:check', 'my-function'])
  .catch('Found 1 conflicts', {raiseIfNotThrown: true})
  .it('should error in case of conflicts', ctx => {
    /* noop */
  })
})
