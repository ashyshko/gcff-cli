import {expect} from 'chai'
import {
  batchOperations,
  filesHashDiff,
  getFiles,
  parseFunctionPath,
  pushClient,
  readFiles,
} from '../../../src/utils/push-client'
import {assert, match, restore, stub} from 'sinon'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as gcloudAuthModule from '../../../src/utils/gcloud-auth'
import * as gcloudFunctionModule from '../../../src/utils/gcloud-function'
import * as gcsUtilsModule from '../../../src/utils/gcs-utils'
import * as confirmModule from '../../../src/utils/confirm'
import {ux} from '@oclif/core'

describe('utils/push-client', () => {
  describe('filesHashDiff', () => {
    it('should work properly', () => {
      expect(filesHashDiff({}, {})).to.eqls({
        added: [],
        removed: [],
        changed: [],
      })
      expect(filesHashDiff({prev: 'hash1'}, {})).to.eqls({
        added: [],
        removed: ['prev'],
        changed: [],
      })
      expect(filesHashDiff({}, {created: 'hash2'})).to.eqls({
        added: ['created'],
        removed: [],
        changed: [],
      })
      expect(
        filesHashDiff({changed: 'from_hash'}, {changed: 'to_hash'}),
      ).to.eqls({added: [], removed: [], changed: ['changed']})
    })
  })

  describe('getFiles', () => {
    afterEach(() => {
      restore()
    })

    it('should read with flat structure', async () => {
      const readdir = stub(fs, 'readdir').resolves([
        {
          name: 'f1',
          isDirectory: () => false,
        },
        {
          name: 'f2',
          isDirectory: () => false,
        },
      ] as any)

      const items: string[] = []
      for await (const item of getFiles('/some/path')) {
        items.push(item)
      }

      expect(items).to.eqls(['f1', 'f2'])
      assert.calledOnceWithExactly(readdir, '/some/path', {
        withFileTypes: true,
      })
    })

    it('should read with nested folders', async () => {
      const readdir = stub(fs, 'readdir')
      readdir.onFirstCall().resolves([
        {
          name: 'd1',
          isDirectory: () => true,
        } as any,
      ])
      readdir.onSecondCall().resolves([
        {
          name: 'f1',
          isDirectory: () => false,
        } as any,
      ])

      const items: string[] = []
      for await (const item of getFiles('/some/path')) {
        items.push(item)
      }

      expect(items).to.eqls(['d1/f1'])
      assert.calledTwice(readdir)
      assert.calledWithExactly(
        readdir.secondCall,
        path.resolve('/some/path/d1'),
        {withFileTypes: true},
      )
    })
  })

  describe('parseFunctionPath', () => {
    it('should work', () => {
      expect(parseFunctionPath('a')).to.eqls({
        functionName: 'a',
        destination: '',
        combined: 'a',
      })
      expect(parseFunctionPath('a/')).to.eqls({
        functionName: 'a',
        destination: '',
        combined: 'a/',
      })
      expect(parseFunctionPath('a/b')).to.eqls({
        functionName: 'a',
        destination: 'b/',
        combined: 'a/b',
      })
      expect(parseFunctionPath('a/b/')).to.eqls({
        functionName: 'a',
        destination: 'b/',
        combined: 'a/b/',
      })
      expect(parseFunctionPath('a/b/c')).to.eqls({
        functionName: 'a',
        destination: 'b/c/',
        combined: 'a/b/c',
      })
    })

    it('should throw error on incorrect input', () => {
      expect(() => parseFunctionPath('')).to.throw(
        'Incorrect functionPath provided. expected format function-name/path or function-name',
      )
      expect(() => parseFunctionPath('/')).to.throw(
        'Incorrect functionPath provided. expected format function-name/path or function-name',
      )
    })
  })

  describe('readFiles', () => {
    it('should read files from fs', async () => {
      const readFile = stub(fs, 'readFile')
      readFile.onFirstCall().resolves(Buffer.from([0x30]))
      readFile.onSecondCall().resolves(Buffer.from([0x31]))
      await expect(readFiles(['a', 'b'], '/path')).eventually.to.eqls({
        a: Buffer.from([0x30]),
        b: Buffer.from([0x31]),
      })
      assert.calledTwice(readFile)
      assert.calledWith(readFile, path.join('/path', 'a'))
      assert.calledWith(readFile, path.join('/path', 'b'))
    })
  })

  describe('pushClient', () => {
    afterEach(() => {
      restore()
    })

    it('should work with initial push', async () => {
      stub(gcloudAuthModule, 'gcloudAuth').resolves({
        accessToken: 'my-token',
        project: 'my-project',
      })
      stub(gcloudFunctionModule, 'gcloudFunctionDescribe').resolves({
        buildConfig: {environmentVariables: {}},
      } as any)
      const bucket = {
        file: stub(),
      }
      stub(gcsUtilsModule, 'getBucket').returns({
        bucket: bucket as any,
        namePrefix: 'name/prefix/',
      })
      const confirm = stub(confirmModule, 'confirm').resolves()
      stub(ux, 'progress').returns({
        start: stub(),
        update: stub(),
        stop: stub(),
      } as any)

      const resolveJsonFile = {
        download: stub().callsFake(() => {
          const e = new Error('not found');
          (e as any).code = 404
          return Promise.reject(e)
        }),
        save: stub(),
      }

      const aFile = {
        save: stub(),
      }

      bucket.file.callsFake((name: string) => {
        if (name === 'my/path/name/prefix/resolve.json') {
          return resolveJsonFile
        }

        if (name === 'my/path/name/prefix/a.txt') {
          return aFile
        }

        throw new Error('unexpected file ' + name)
      })

      await pushClient({
        flags: {
          region: 'some-region',
          project: 'my-project',
          force: false,
          yes: false,
        },
        args: {
          functionPath: {
            functionName: 'my-function',
            destination: 'my/path/',
          },
        },
        files: {
          'a.txt': Buffer.from([0x30]),
        },
        dependencies: {},
        rules: ['my-rule1', 'my-rule2'],
        command: {
          log: stub(),
        } as any,
      })

      assert.calledOnce(confirm)
      assert.calledOnceWithExactly(aFile.save, Buffer.from([0x30]))
      assert.calledOnce(resolveJsonFile.save)
      expect(
        JSON.parse(
          new TextDecoder().decode(resolveJsonFile.save.firstCall.args[0]),
        ),
      ).to.eqls({
        dependencies: {},
        files: {
          'a.txt':
            '5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9',
        },
        rules: ['my-rule1', 'my-rule2'],
      })
    })

    it('should push only updated files', async () => {
      stub(gcloudAuthModule, 'gcloudAuth').resolves({
        accessToken: 'my-token',
        project: 'my-project',
      })
      stub(gcloudFunctionModule, 'gcloudFunctionDescribe').resolves({
        buildConfig: {environmentVariables: {
          DEPENDENCIES: '{"depA":"1.0"}',
        }},
      } as any)
      const bucket = {
        file: stub(),
      }
      stub(gcsUtilsModule, 'getBucket').returns({
        bucket: bucket as any,
        namePrefix: 'name/prefix/',
      })
      stub(confirmModule, 'confirm').resolves()
      stub(ux, 'progress').returns({
        start: stub(),
        update: stub(),
        stop: stub(),
      } as any)

      const resolveJsonFile = {
        download: stub().resolves([Buffer.from(JSON.stringify({
          dependencies: {
            depA: '1.0',
          },
          files: {
            'a.txt': 'outdated-hash-for-changed-file',
            'b.txt': 'ignored-hash-for-deleted-file',
            'c.txt': '5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9', // 0x30
          },
          rules: ['my-rule1', 'my-rule2'],
        }))]),
        save: stub(),
      }

      const aFile = {
        save: stub().resolves(),
      }

      const bFile = {
        delete: stub().resolves(),
      }

      const newFile = {
        save: stub().resolves(),
      }

      bucket.file.callsFake((name: string) => {
        if (name === 'my/path/name/prefix/resolve.json') {
          return resolveJsonFile
        }

        if (name === 'my/path/name/prefix/a.txt') {
          return aFile
        }

        if (name === 'my/path/name/prefix/b.txt') {
          return bFile
        }

        if (name === 'my/path/name/prefix/new.txt') {
          return newFile
        }

        throw new Error('unexpected file ' + name)
      })

      await pushClient({
        flags: {
          region: 'some-region',
          project: 'my-project',
          force: false,
          yes: false,
        },
        args: {
          functionPath: {
            functionName: 'my-function',
            destination: 'my/path/',
          },
        },
        files: {
          'a.txt': Buffer.from([0x30]), // changed
          'c.txt': Buffer.from([0x30]), // not changed
          'new.txt': Buffer.from([0x31]), // added
        },
        dependencies: {
          depA: '1.0',
        },
        rules: ['my-rule1', 'my-rule2'],
        command: {
          log: stub(),
        } as any,
      })

      assert.calledOnceWithExactly(aFile.save, Buffer.from([0x30]))
      assert.calledOnceWithExactly(bFile.delete)
      assert.calledOnceWithExactly(newFile.save, Buffer.from([0x31]))

      assert.calledOnce(resolveJsonFile.save)
      expect(
        JSON.parse(
          new TextDecoder().decode(resolveJsonFile.save.firstCall.args[0]),
        ),
      ).to.eqls({
        dependencies: {
          depA: '1.0',
        },
        files: {
          'a.txt': '5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9',
          'c.txt': '5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9',
          'new.txt': '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b',
        },
        rules: ['my-rule1', 'my-rule2'],
      })
    })

    it('should update only resolve.json if no changes in files', async () => {
      stub(gcloudAuthModule, 'gcloudAuth').resolves({
        accessToken: 'my-token',
        project: 'my-project',
      })
      stub(gcloudFunctionModule, 'gcloudFunctionDescribe').resolves({
        buildConfig: {environmentVariables: {
          DEPENDENCIES: '{"depA":"1.0","depB":"1.1"}',
        }},
      } as any)
      const bucket = {
        file: stub(),
      }
      stub(gcsUtilsModule, 'getBucket').returns({
        bucket: bucket as any,
        namePrefix: 'name/prefix/',
      })
      stub(confirmModule, 'confirm').resolves()
      stub(ux, 'progress').returns({
        start: stub(),
        update: stub(),
        stop: stub(),
      } as any)

      const resolveJsonFile = {
        download: stub().resolves([Buffer.from(JSON.stringify({
          dependencies: {
            depA: '1.0',
          },
          files: {
            'c.txt': '5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9', // 0x30
          },
          rules: ['my-rule1', 'my-rule2'],
        }))]),
        save: stub(),
      }

      bucket.file.callsFake((name: string) => {
        if (name === 'my/path/name/prefix/resolve.json') {
          return resolveJsonFile
        }

        throw new Error('unexpected file ' + name)
      })

      await pushClient({
        flags: {
          region: 'some-region',
          project: 'my-project',
          force: false,
          yes: false,
        },
        args: {
          functionPath: {
            functionName: 'my-function',
            destination: 'my/path/',
          },
        },
        files: {
          'c.txt': Buffer.from([0x30]), // no changes
        },
        dependencies: {
          depA: '1.0',
        },
        rules: ['my-rule1', 'my-rule2'],
        command: {
          log: stub(),
        } as any,
      })

      assert.calledOnce(resolveJsonFile.save)
      expect(
        JSON.parse(
          new TextDecoder().decode(resolveJsonFile.save.firstCall.args[0]),
        ),
      ).to.eqls({
        dependencies: {
          depA: '1.0',
        },
        files: {
          'c.txt': '5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9',
        },
        rules: ['my-rule1', 'my-rule2'],
      })
    })

    it('should not check for previous version if force flag set', async () => {
      stub(gcloudAuthModule, 'gcloudAuth').resolves({
        accessToken: 'my-token',
        project: 'my-project',
      })
      stub(gcloudFunctionModule, 'gcloudFunctionDescribe').resolves({} as any)
      const bucket = {
        file: stub(),
      }
      stub(gcsUtilsModule, 'getBucket').returns({
        bucket: bucket as any,
        namePrefix: 'name/prefix/',
      })
      stub(confirmModule, 'confirm').resolves()
      stub(ux, 'progress').returns({
        start: stub(),
        update: stub(),
        stop: stub(),
      } as any)

      const resolveJsonFile = {
        save: stub(),
      }

      const aFile = {
        save: stub(),
      }

      bucket.file.callsFake((name: string) => {
        if (name === 'my/path/name/prefix/resolve.json') {
          return resolveJsonFile
        }

        if (name === 'my/path/name/prefix/a.txt') {
          return aFile
        }

        throw new Error('unexpected file ' + name)
      })

      await pushClient({
        flags: {
          region: 'some-region',
          project: 'my-project',
          force: true, // changed
          yes: false,
        },
        args: {
          functionPath: {
            functionName: 'my-function',
            destination: 'my/path/',
          },
        },
        files: {
          'a.txt': Buffer.from([0x30]),
        },
        dependencies: {
          depA: '1.0',
        },
        rules: ['my-rule1', 'my-rule2'],
        command: {
          log: stub(),
        } as any,
      })

      assert.calledOnceWithExactly(aFile.save, Buffer.from([0x30]))

      assert.calledOnce(resolveJsonFile.save)
      expect(
        JSON.parse(
          new TextDecoder().decode(resolveJsonFile.save.firstCall.args[0]),
        ),
      ).to.eqls({
        dependencies: {
          depA: '1.0',
        },
        files: {
          'a.txt': '5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9',
        },
        rules: ['my-rule1', 'my-rule2'],
      })
    })

    it('should throw exception on gcloud error', async () => {
      stub(gcloudAuthModule, 'gcloudAuth').resolves({
        accessToken: 'my-token',
        project: 'my-project',
      })
      stub(gcloudFunctionModule, 'gcloudFunctionDescribe').resolves({} as any)

      const bucket = {
        file: () => ({
          download: stub().rejects(new Error('unknown dummy error')),
        }),
      }
      stub(gcsUtilsModule, 'getBucket').returns({
        bucket: bucket as any,
        namePrefix: 'name/prefix/',
      })

      await expect(pushClient({
        flags: {
          region: 'some-region',
          project: 'my-project',
          force: false,
          yes: false,
        },
        args: {
          functionPath: {
            functionName: 'my-function',
            destination: 'my/path/',
          },
        },
        files: {},
        dependencies: {},
        rules: [],
        command: {
          log: stub(),
        } as any,
      })).eventually.rejectedWith('unknown dummy error')
    })

    it('should throw exception if files contain resolve.json', async () => {
      stub(gcloudAuthModule, 'gcloudAuth').resolves({
        accessToken: 'my-token',
        project: 'my-project',
      })
      stub(gcloudFunctionModule, 'gcloudFunctionDescribe').resolves({} as any)

      const bucket = {
        file: () => ({
          download: stub().resolves([]),
        }),
      }
      stub(gcsUtilsModule, 'getBucket').returns({
        bucket: bucket as any,
        namePrefix: 'name/prefix/',
      })

      await expect(pushClient({
        flags: {
          region: 'some-region',
          project: 'my-project',
          force: false,
          yes: false,
        },
        args: {
          functionPath: {
            functionName: 'my-function',
            destination: 'my/path/',
          },
        },
        files: {
          'resolve.json': Buffer.from('should not be there'),
        },
        dependencies: {},
        rules: [],
        command: {
          log: stub(),
        } as any,
      })).eventually.rejectedWith('resolve.json should not be provided in files')
    })

    it('should fail if there is conflict in dependencies', async () => {
      stub(gcloudAuthModule, 'gcloudAuth').resolves({
        accessToken: 'my-token',
        project: 'my-project',
      })
      stub(gcloudFunctionModule, 'gcloudFunctionDescribe').resolves({
        buildConfig: {environmentVariables: {
          DEPENDENCIES: '{"depA":"1.0"}',
        }},
      } as any)
      const bucket = {
        file: stub(),
      }
      stub(gcsUtilsModule, 'getBucket').returns({
        bucket: bucket as any,
        namePrefix: 'name/prefix/',
      })
      stub(confirmModule, 'confirm').resolves()
      stub(ux, 'progress').returns({
        start: stub(),
        update: stub(),
        stop: stub(),
      } as any)

      const resolveJsonFile = {
        download: stub().resolves([Buffer.from(JSON.stringify({
          dependencies: {
            depA: '1.0',
          },
          files: {},
          rules: ['my-rule1', 'my-rule2'],
        }))]),
        save: stub(),
      }

      bucket.file.callsFake((name: string) => {
        if (name === 'my/path/name/prefix/resolve.json') {
          return resolveJsonFile
        }

        throw new Error('unexpected file ' + name)
      })

      await expect(pushClient({
        flags: {
          region: 'some-region',
          project: 'my-project',
          force: false,
          yes: false,
        },
        args: {
          functionPath: {
            functionName: 'my-function',
            destination: 'my/path/',
          },
        },
        files: {},
        dependencies: {
          depA: '1.1-changed',
        },
        rules: ['my-rule1', 'my-rule2'],
        command: {
          log: stub(),
          error: stub().callsFake(v => {
            throw new Error(v)
          }),
        } as any,
      })).eventually.rejectedWith(/Conflict in dependencies detected/)
    })

    it('should fail if new dependency was added', async () => {
      stub(gcloudAuthModule, 'gcloudAuth').resolves({
        accessToken: 'my-token',
        project: 'my-project',
      })
      stub(gcloudFunctionModule, 'gcloudFunctionDescribe').resolves({
        buildConfig: {environmentVariables: {
          DEPENDENCIES: '{"depA":"1.0"}',
        }},
      } as any)
      const bucket = {
        file: stub(),
      }
      stub(gcsUtilsModule, 'getBucket').returns({
        bucket: bucket as any,
        namePrefix: 'name/prefix/',
      })
      stub(confirmModule, 'confirm').resolves()
      stub(ux, 'progress').returns({
        start: stub(),
        update: stub(),
        stop: stub(),
      } as any)

      const resolveJsonFile = {
        download: stub().resolves([Buffer.from(JSON.stringify({
          dependencies: {
            depA: '1.0',
          },
          files: {},
          rules: ['my-rule1', 'my-rule2'],
        }))]),
        save: stub(),
      }

      bucket.file.callsFake((name: string) => {
        if (name === 'my/path/name/prefix/resolve.json') {
          return resolveJsonFile
        }

        throw new Error('unexpected file ' + name)
      })

      await expect(pushClient({
        flags: {
          region: 'some-region',
          project: 'my-project',
          force: false,
          yes: false,
        },
        args: {
          functionPath: {
            functionName: 'my-function',
            destination: 'my/path/',
          },
        },
        files: {},
        dependencies: {
          depB: '1.1-new',
        },
        rules: ['my-rule1', 'my-rule2'],
        command: {
          log: stub(),
          error: stub().callsFake(v => {
            throw new Error(v)
          }),
        } as any,
      })).eventually.rejectedWith(/Dependencies have been changed/)
    })

    it('should not check dependencies with force flag', async () => {
      stub(gcloudAuthModule, 'gcloudAuth').resolves({
        accessToken: 'my-token',
        project: 'my-project',
      })
      stub(gcloudFunctionModule, 'gcloudFunctionDescribe').resolves({
        buildConfig: {environmentVariables: {
          DEPENDENCIES: '{"depA":"1.0"}',
        }},
      } as any)
      const bucket = {
        file: stub(),
      }
      stub(gcsUtilsModule, 'getBucket').returns({
        bucket: bucket as any,
        namePrefix: 'name/prefix/',
      })
      stub(confirmModule, 'confirm').resolves()
      stub(ux, 'progress').returns({
        start: stub(),
        update: stub(),
        stop: stub(),
      } as any)

      const resolveJsonFile = {
        download: stub().resolves([Buffer.from(JSON.stringify({
          dependencies: {
            depA: '1.0',
          },
          files: {},
          rules: ['my-rule1', 'my-rule2'],
        }))]),
        save: stub(),
      }

      bucket.file.callsFake((name: string) => {
        if (name === 'my/path/name/prefix/resolve.json') {
          return resolveJsonFile
        }

        throw new Error('unexpected file ' + name)
      })

      await expect(pushClient({
        flags: {
          region: 'some-region',
          project: 'my-project',
          force: true,
          yes: false,
        },
        args: {
          functionPath: {
            functionName: 'my-function',
            destination: 'my/path/',
          },
        },
        files: {},
        dependencies: {
          depB: '1.1-new',
        },
        rules: ['my-rule1', 'my-rule2'],
        command: {
          log: stub(),
          error: stub().callsFake(v => {
            throw new Error(v)
          }),
        } as any,
      })).eventually.to.be.fulfilled
    })
  })

  describe('batchOperations', () => {
    afterEach(() => {
      restore()
    })

    it('should work', async () => {
      const fileToDelete = {
        delete: stub().resolves(),
      }
      const fileToUpload = {
        save: stub().resolves(),
      }
      await batchOperations({
        name: 'dummy',
        fileEntries: [['file/to/delete', null], ['file/to/upload', Buffer.from([1, 2, 3])]],
        bucket: {
          file(name: string) {
            if (name === 'file/to/delete') {
              return fileToDelete
            }

            if (name === 'file/to/upload') {
              return fileToUpload
            }

            throw new Error('unknown file name')
          },
        } as any,
        command: {
          warn: stub(),
        } as any,
      })
      assert.calledOnceWithExactly(fileToDelete.delete)
      assert.calledOnceWithExactly(fileToUpload.save, Buffer.from([1, 2, 3]))
    })

    it('should ignore deletion errors', async () => {
      const fileToDelete = {
        delete: stub().rejects(new Error('dummy error')),
      }
      const fileToUpload = {
        save: stub().resolves(),
      }
      await batchOperations({
        name: 'dummy',
        fileEntries: [['file/to/delete', null], ['file/to/upload', Buffer.from([1, 2, 3])]],
        bucket: {
          file(name: string) {
            if (name === 'file/to/delete') {
              return fileToDelete
            }

            if (name === 'file/to/upload') {
              return fileToUpload
            }

            throw new Error('unknown file name')
          },
        } as any,
        command: {
          warn: stub(),
        } as any,
      })
      assert.calledOnceWithExactly(fileToDelete.delete)
      assert.calledOnceWithExactly(fileToUpload.save, Buffer.from([1, 2, 3]))
    })
  })
})
