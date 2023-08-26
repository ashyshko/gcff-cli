import {expect, test} from '@oclif/test'
import * as gcloudAuthModule from '../../../src/utils/gcloud-auth'
import * as gcloudFunctionModule from '../../../src/utils/gcloud-function'
import * as gcsUtilsModule from '../../../src/utils/gcs-utils'
import * as pushClientModule from '../../../src/utils/push-client'
import {assert, match, stub} from 'sinon'

describe('client:prune', () => {
  test
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
        getFiles: stub().resolves([[]]),
      },
      namePrefix: 'name/prefix/',
    }
  })
  .stub(pushClientModule, 'batchOperations', stub().resolves())
  .stdout()
  .command(['client:prune', 'my-function'])
  .it('should do nothing if no files provided', ctx => {
    expect(ctx.stdout).to.contain('Everything is up-to-date')
  })

  test
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
  .stub(
    gcsUtilsModule,
    'getBucket',
    stub().callsFake((...args: any[]) => {
      expect(args[0]).to.eqls({
        serviceConfig: 'dummy-service-config',
        auth: {
          accessToken: 'my-token',
          project: 'my-project',
        },
      })
      return {
        bucket: {
          getFiles: stub().resolves([
            [{name: 'name/prefix/path/unlinked.txt'}],
          ]),
        },
        namePrefix: 'name/prefix/',
      }
    }),
  )
  .stub(pushClientModule, 'batchOperations', stub().resolves())
  .stdout()
  .command(['client:prune', 'my-function', '--yes', '--json'])
  .it('should remove unlinked files', ctx => {
    expect(JSON.parse(ctx.stdout)).to.eqls({
      missingFiles: [],
      damagedFiles: [],
      extraFiles: ['path/unlinked.txt'],
      verifiedFiles: [],
      filesToRemove: ['path/unlinked.txt'],
    })

    const bachOperations = pushClientModule.batchOperations as any
    assert.calledOnceWithExactly(bachOperations, {
      name: 'removing',
      fileEntries: [['name/prefix/path/unlinked.txt', null]],
      bucket: match.any,
      command: match.any,
    })
  })

  test
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
  .stub(
    gcsUtilsModule,
    'getBucket',
    stub().callsFake((...args: any[]) => {
      expect(args[0]).to.eqls({
        serviceConfig: 'dummy-service-config',
        auth: {
          accessToken: 'my-token',
          project: 'my-project',
        },
      })
      return {
        bucket: {
          getFiles: stub().resolves([
            [
              {name: 'name/prefix/path/resolve.json'},
              {name: 'name/prefix/path/deeper/a.txt'},
            ],
          ]),
          file: stub().callsFake((name: string) => {
            switch (name) {
            case 'name/prefix/path/resolve.json':
              return {
                download: stub().resolves([
                  Buffer.from(
                    JSON.stringify({
                      files: {
                        'deeper/a.txt':
                              '5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9', // 0x30
                      },
                    }),
                  ),
                ]),
              }
            case 'name/prefix/path/deeper/a.txt':
              return {
                download: stub().resolves([Buffer.from([0x30])]),
              }
            default:
              throw new Error('unknown file ' + name)
            }
          }),
        },
        namePrefix: 'name/prefix/',
      }
    }),
  )
  .stdout()
  .command(['client:prune', 'my-function', '--json'])
  .it('should check modules', ctx => {
    expect(JSON.parse(ctx.stdout)).to.eqls({
      missingFiles: [],
      damagedFiles: [],
      extraFiles: [],
      verifiedFiles: ['path/resolve.json', 'path/deeper/a.txt'],
      filesToRemove: [],
    })
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
      dummy: 'function',
      serviceConfig: 'dummy-service-config',
    })
  })
  .stub(
    gcsUtilsModule,
    'getBucket',
    stub().callsFake((...args: any[]) => {
      expect(args[0]).to.eqls({
        serviceConfig: 'dummy-service-config',
        auth: {
          accessToken: 'my-token',
          project: 'my-project',
        },
      })
      return {
        bucket: {
          getFiles: stub().resolves([
            [
              {name: 'name/prefix/path/resolve.json'},
              {name: 'name/prefix/path/deeper/a.txt'},
            ],
          ]),
          file: stub().callsFake((name: string) => {
            switch (name) {
            case 'name/prefix/path/resolve.json':
              return {
                download: stub().resolves([
                  Buffer.from(
                    JSON.stringify({
                      files: {
                        'deeper/a.txt':
                              '5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9', // 0x30
                      },
                    }),
                  ),
                ]),
              }
            case 'name/prefix/path/deeper/a.txt':
              return {
                download: stub().resolves([Buffer.from([0x30, 0x31])]),
              }
            default:
              throw new Error('unknown file ' + name)
            }
          }),
        },
        namePrefix: 'name/prefix/',
      }
    }),
  )
  .stub(pushClientModule, 'batchOperations', stub().resolves())
  .command(['client:prune', 'my-function', '--yes', '--removeDamagedFiles', '--json'])
  .it('should remove damaged files with --removeDamagedFiles flag', ctx => {
    expect(JSON.parse(ctx.stdout)).to.eqls({
      missingFiles: [],
      damagedFiles: ['path/deeper/a.txt'],
      extraFiles: [],
      verifiedFiles: ['path/resolve.json'],
      filesToRemove: ['path/deeper/a.txt'],
    })
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
      dummy: 'function',
      serviceConfig: 'dummy-service-config',
    })
  })
  .stub(
    gcsUtilsModule,
    'getBucket',
    stub().callsFake((...args: any[]) => {
      expect(args[0]).to.eqls({
        serviceConfig: 'dummy-service-config',
        auth: {
          accessToken: 'my-token',
          project: 'my-project',
        },
      })
      return {
        bucket: {
          getFiles: stub().resolves([
            [
              {name: 'name/prefix/path/resolve.json'},
              {name: 'name/prefix/path/deeper/a.txt'},
            ],
          ]),
          file: stub().callsFake((name: string) => {
            switch (name) {
            case 'name/prefix/path/resolve.json':
              return {
                download: stub().resolves([
                  Buffer.from('[]'),
                ]),
              }
            default:
              throw new Error('unknown file ' + name)
            }
          }),
        },
        namePrefix: 'name/prefix/',
      }
    }),
  )
  .stub(pushClientModule, 'batchOperations', stub().resolves())
  .command(['client:prune', 'my-function', '--yes', '--removeDamagedFiles', '--json'])
  .it('should remove damaged modules with --removeDamagedFiles flag', ctx => {
    expect(JSON.parse(ctx.stdout)).to.eqls({
      missingFiles: [],
      damagedFiles: ['path/resolve.json'],
      extraFiles: ['path/deeper/a.txt'],
      verifiedFiles: [],
      filesToRemove: ['path/deeper/a.txt', 'path/resolve.json'],
    })
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
      dummy: 'function',
      serviceConfig: 'dummy-service-config',
    })
  })
  .stub(
    gcsUtilsModule,
    'getBucket',
    stub().callsFake((...args: any[]) => {
      expect(args[0]).to.eqls({
        serviceConfig: 'dummy-service-config',
        auth: {
          accessToken: 'my-token',
          project: 'my-project',
        },
      })
      return {
        bucket: {
          getFiles: stub().resolves([
            [
              {name: 'name/prefix/path/resolve.json'},
            ],
          ]),
          file: stub().callsFake((name: string) => {
            switch (name) {
            case 'name/prefix/path/resolve.json':
              return {
                download: stub().resolves([
                  Buffer.from(
                    JSON.stringify({
                      files: {
                        'deeper/a.txt':
                              '5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9', // 0x30
                      },
                    }),
                  ),
                ]),
              }
            default:
              throw new Error('unknown file ' + name)
            }
          }),
        },
        namePrefix: 'name/prefix/',
      }
    }),
  )
  .stub(pushClientModule, 'batchOperations', stub().resolves())
  .command(['client:prune', 'my-function', '--json'])
  .it('should notify about missing files', ctx => {
    expect(JSON.parse(ctx.stdout)).to.eqls({
      missingFiles: ['path/deeper/a.txt'],
      damagedFiles: [],
      extraFiles: [],
      verifiedFiles: ['path/resolve.json'],
      filesToRemove: [],
    })
  })

  test
  .stderr()
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
  .stub(
    gcsUtilsModule,
    'getBucket',
    stub().callsFake((...args: any[]) => {
      expect(args[0]).to.eqls({
        serviceConfig: 'dummy-service-config',
        auth: {
          accessToken: 'my-token',
          project: 'my-project',
        },
      })
      return {
        bucket: {
          getFiles: stub().resolves([
            [
              {name: 'name/prefix/path/resolve.json'},
              {name: 'name/prefix/path/deeper/resolve.json'},
              {name: 'name/prefix/path/deeper/a.txt'},
            ],
          ]),
          file: stub().callsFake((name: string) => {
            switch (name) {
            case 'name/prefix/path/resolve.json':
              return {
                download: stub().resolves([
                  Buffer.from(
                    JSON.stringify({
                      files: {
                        'deeper/a.txt':
                              '5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9', // 0x30
                      },
                    }),
                  ),
                ]),
              }
            case 'name/prefix/path/deeper/resolve.json':
              return {
                download: stub().resolves([
                  Buffer.from(
                    JSON.stringify({
                      files: {
                        'a.txt':
                              '5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9', // 0x30
                      },
                    }),
                  ),
                ]),
              }
            case 'name/prefix/path/deeper/a.txt':
              return {
                download: stub().resolves([Buffer.from([0x30, 0x31])]),
              }
            default:
              throw new Error('unknown file ' + name)
            }
          }),
        },
        namePrefix: 'name/prefix/',
      }
    }),
  )
  .stub(pushClientModule, 'batchOperations', stub().resolves())
  .command(['client:prune', 'my-function'])
  .it('should warn about file linked twice', ctx => {
    expect(ctx.stderr).to.contain('File path/deeper/a.txt seems to be used by multiple modules')
  })
})
