import {assert, restore, stub} from 'sinon'
import * as stageModule from '../../../src/utils/stage'
import * as sleepModule from '../../../src/utils/sleep'
import {
  gcloudFunctionDescribe,
  gcloudFunctionDownloadSources,
  gcloudFunctionPatch,
  gcloudFunctionUploadSources,
  gcloudFunctionWaitOperationCompletion,
} from '../../../src/utils/gcloud-function'
import * as chaiAsPromised from 'chai-as-promised'
import {expect, use} from 'chai'

use(chaiAsPromised)

describe('utils/gcloud-function', () => {
  afterEach(() => {
    restore()
  })

  describe('describe', () => {
    it('should fetch status from api', async () => {
      stub(stageModule, 'stage').callsFake((_, v) =>
        v(() => {
          /* noop */
        }),
      )

      const json = stub().returns('123')
      const fetch = stub(global, 'fetch').resolves({ok: true, json} as any)

      await expect(
        gcloudFunctionDescribe({
          functionName: 'my-function',
          region: 'some-region',
          auth: {
            accessToken: 'my-token',
            project: 'my-project',
          },
        }),
      ).eventually.to.equal('123')

      assert.calledOnce(fetch)
      assert.calledWithExactly(
        fetch,
        'https://cloudfunctions.googleapis.com/v2/projects/my-project/locations/some-region/functions/my-function?access_token=my-token',
      )
    })

    it('should throw error if function is not found', async () => {
      stub(stageModule, 'stage').callsFake((_, v) =>
        v(() => {
          /* noop */
        }),
      )

      stub(global, 'fetch').resolves({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as any)

      await expect(
        gcloudFunctionDescribe({
          functionName: 'my-function',
          region: 'some-region',
          auth: {
            accessToken: 'my-token',
            project: 'my-project',
          },
        }),
      ).eventually.rejectedWith('Gcloud function not found: my-function')
    })

    it('should throw exception on HTTP error', async () => {
      stub(stageModule, 'stage').callsFake((_, v) =>
        v(() => {
          /* noop */
        }),
      )

      stub(global, 'fetch').resolves({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as any)

      await expect(
        gcloudFunctionDescribe({
          functionName: 'my-function',
          region: 'some-region',
          auth: {
            accessToken: 'my-token',
            project: 'my-project',
          },
        }),
      ).eventually.rejectedWith('HTTP error 401 Unauthorized')
    })
  })

  describe('waitOperationCompletion', () => {
    it('should do nothing if operation is already completed', async () => {
      stub(stageModule, 'stage').callsFake((_, v) =>
        v(() => {
          /* noop */
        }),
      )

      const sleep = stub(sleepModule, 'sleep').rejects(new Error('unexpected'))
      const fetch = stub(global, 'fetch').rejects(new Error('unexpected'))

      await expect(
        gcloudFunctionWaitOperationCompletion({
          currentState: {done: true, response: 'recv-response'},
        } as any),
      ).eventually.to.equal('recv-response')
      assert.notCalled(fetch)
      assert.notCalled(sleep)
    })

    it('should fetch for updated status after sleep', async () => {
      stub(stageModule, 'stage').callsFake((_, v) =>
        v(() => {
          /* noop */
        }),
      )

      const sleep = stub(sleepModule, 'sleep').resolves()
      const json = stub().resolves({
        done: true,
        response: 'recv-response',
      })
      const fetch = stub(global, 'fetch').resolves({
        ok: true,
        json,
      } as any)

      await expect(
        gcloudFunctionWaitOperationCompletion({
          name: 'my-op',
          currentState: {name: 'api-name', done: false, metadata: {} as any},
          accessToken: 'my-token',
        }),
      ).eventually.to.equal('recv-response')
      assert.calledOnce(sleep)
      assert.calledWithExactly(sleep, 1000)
      assert.calledOnce(fetch)
      assert.calledWithExactly(
        fetch,
        'https://cloudfunctions.googleapis.com/v2/api-name?access_token=my-token',
      )
    })

    it('should throw exception on HTTP error', async () => {
      stub(stageModule, 'stage').callsFake((_, v) =>
        v(() => {
          /* noop */
        }),
      )

      stub(sleepModule, 'sleep').resolves()
      stub(global, 'fetch').resolves({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as any)

      await expect(
        gcloudFunctionWaitOperationCompletion({
          name: 'my-op',
          currentState: {name: 'api-name', done: false, metadata: {} as any},
          accessToken: 'my-token',
        }),
      ).eventually.rejectedWith('HTTP error 401 Unauthorized')
    })

    it('should throw exception if error was received', async () => {
      stub(stageModule, 'stage').callsFake((_, v) =>
        v(() => {
          /* noop */
        }),
      )

      stub(sleepModule, 'sleep').resolves()
      const json = stub().resolves({
        done: true,
        error: {code: 418, message: 'I am teapot'},
      })

      stub(global, 'fetch').resolves({
        ok: true,
        json,
      } as any)

      await expect(
        gcloudFunctionWaitOperationCompletion({
          name: 'my-op',
          currentState: {name: 'api-name', done: false, metadata: {} as any},
          accessToken: 'my-token',
        }),
      ).eventually.rejectedWith('Error 418 I am teapot')
    })

    it('should provide correct statuses', async () => {
      const status = stub()
      stub(stageModule, 'stage').callsFake((_, v) => v(status))

      stub(sleepModule, 'sleep').resolves()

      const fetch = stub(global, 'fetch')
      fetch.onFirstCall().resolves({
        ok: true,
        json: stub().resolves({
          name: 'api-name',
          done: false,
          metadata: {
            '@type':
              'type.googleapis.com/google.cloud.functions.v2.OperationMetadata',
            stages: [
              {
                name: 'stage1',
                message: 'stage1 message',
                state: 'COMPLETE',
              },
              {
                name: 'stage2',
                message: 'stage2 message',
                state: 'COMPLETE',
              },
            ],
          },
        }),
      } as any)

      fetch.onSecondCall().resolves({
        ok: true,
        json: stub().resolves({
          name: 'api-name',
          done: true,
          metadata: {},
          response: 'recv-resp',
        }),
      } as any)

      await expect(
        gcloudFunctionWaitOperationCompletion({
          name: 'my-op',
          currentState: {
            name: 'api-name',
            done: false,
            metadata: {
              '@type':
                'type.googleapis.com/google.cloud.functions.v2.OperationMetadata',
              stages: [
                {
                  name: 'stage1',
                  message: 'stage1 message',
                  state: 'COMPLETE',
                },
                {
                  name: 'stage2',
                  message: 'stage2 message',
                  state: 'IN_PROGRESS',
                },
              ],
            },
          },
          accessToken: 'my-token',
        }),
      ).eventually.to.equal('recv-resp')

      assert.calledTwice(status)
      assert.calledWithExactly(
        status.firstCall,
        '\u001B[90mInitializing...\u001B[39m',
      )
      assert.calledWithExactly(
        status.secondCall,
        '\u001B[90m[stage2] stage2 message...\u001B[39m',
      )
    })
  })

  describe('patch', () => {
    it('should call gcloud api', async () => {
      const fetch = stub(global, 'fetch').resolves({
        ok: true,
        json: stub().resolves('long-op-def'),
      } as any)

      await expect(
        gcloudFunctionPatch({
          functionName: 'my-function',
          region: 'some-region',
          auth: {
            accessToken: 'my-token',
            project: 'my-project',
          },
          updateFields: ['field1', 'field2.field3'],
          payload: {
            field1: 'f1-value',
            field2: {
              field3: true,
            },
          } as any,
        }),
      ).eventually.to.equal('long-op-def')

      assert.calledOnce(fetch)
      assert.calledWithExactly(
        fetch,
        'https://cloudfunctions.googleapis.com/v2/projects/my-project/locations/some-region/functions/my-function?updateMask=field1,field2.field3&access_token=my-token',
        {
          method: 'PATCH',
          headers: {'Content-Type': 'application/json'},
          body: '{"field1":"f1-value","field2":{"field3":true}}',
        },
      )
    })

    it('should call gcloud api', async () => {
      const fetch = stub(global, 'fetch').resolves({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as any)

      await expect(
        gcloudFunctionPatch({
          functionName: 'my-function',
          region: 'some-region',
          auth: {
            accessToken: 'my-token',
            project: 'my-project',
          },
          updateFields: ['field1', 'field2.field3'],
          payload: {
            field1: 'f1-value',
            field2: {
              field3: true,
            },
          } as any,
        }),
      ).rejectedWith("can't patch google cloud function: 401 Unauthorized")
    })
  })

  describe('gcloudFunctionDownloadSources', () => {
    afterEach(() => {
      restore()
    })

    it('should work', async () => {
      const fetch = stub(global, 'fetch')
      fetch.onFirstCall().resolves({
        ok: true,
        json: () =>
          Promise.resolve({downloadUrl: 'http://example.com/download/url'}),
      } as any)
      fetch.onSecondCall().resolves({
        ok: true,
        arrayBuffer: () => Promise.resolve(Buffer.from([1, 2, 3])),
      } as any)

      await expect(
        gcloudFunctionDownloadSources({
          functionName: 'my-function',
          region: 'some-region',
          auth: {accessToken: 'my-token', project: 'my-project'},
        }),
      ).eventually.eqls(Buffer.from([1, 2, 3]))
      assert.calledTwice(fetch)
      assert.calledWithExactly(
        fetch.firstCall,
        'https://cloudfunctions.googleapis.com/v2/projects/my-project/locations/some-region/functions/my-function:generateDownloadUrl?access_token=my-token',
        {method: 'POST'},
      )
      assert.calledWithExactly(
        fetch.secondCall,
        'http://example.com/download/url',
      )
    })

    it('should throw exception in case of HTTP error from cloud function api', async () => {
      const fetch = stub(global, 'fetch')
      fetch.onFirstCall().resolves({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      } as any)

      await expect(
        gcloudFunctionDownloadSources({
          functionName: 'my-function',
          region: 'some-region',
          auth: {accessToken: 'my-token', project: 'my-project'},
        }),
      ).eventually.rejectedWith(
        "can't get function download url: 400 Bad Request",
      )
      assert.calledOnce(fetch)
    })

    it('should throw exception in case of HTTP error from cloud storage api', async () => {
      const fetch = stub(global, 'fetch')
      fetch.onFirstCall().resolves({
        ok: true,
        json: () =>
          Promise.resolve({downloadUrl: 'http://example.com/download/url'}),
      } as any)
      fetch.onSecondCall().resolves({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as any)

      await expect(
        gcloudFunctionDownloadSources({
          functionName: 'my-function',
          region: 'some-region',
          auth: {accessToken: 'my-token', project: 'my-project'},
        }),
      ).eventually.rejectedWith(
        "can't download function source: 404 Not Found",
      )
    })
  })

  describe('gcloudFunctionUploadSources', () => {
    afterEach(() => {
      restore()
    })

    it('should work', async () => {
      const fetch = stub(global, 'fetch')
      fetch.onFirstCall().resolves({
        ok: true,
        json: () =>
          Promise.resolve({
            uploadUrl: 'http://example.com/upload/url',
            storageSource: 'storage-source-obj',
          }),
      } as any)
      fetch.onSecondCall().resolves({
        ok: true,
      } as any)

      await expect(
        gcloudFunctionUploadSources({
          region: 'some-region',
          auth: {
            accessToken: 'my-token',
            project: 'my-project',
          },
          body: Buffer.from([1, 2, 3]),
        }),
      ).eventually.to.equal('storage-source-obj')

      assert.calledTwice(fetch)
      assert.calledWithExactly(
        fetch.firstCall,
        'https://cloudfunctions.googleapis.com/v2/projects/my-project/locations/some-region/functions:generateUploadUrl?access_token=my-token',
        {method: 'POST'},
      )
      assert.calledWithExactly(
        fetch.secondCall,
        'http://example.com/upload/url',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/zip',
          },
          body: Buffer.from([1, 2, 3]),
        },
      )
    })

    it('should throw exception in case of HTTP error from cloud function api', async () => {
      const fetch = stub(global, 'fetch')
      fetch.onFirstCall().resolves({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      } as any)

      await expect(
        gcloudFunctionUploadSources({
          region: 'some-region',
          auth: {accessToken: 'my-token', project: 'my-project'},
          body: Buffer.from([1, 2, 3]),
        }),
      ).eventually.rejectedWith(
        "can't get function upload url: 400 Bad Request",
      )
      assert.calledOnce(fetch)
    })

    it('should throw exception in case of HTTP error from cloud storage api', async () => {
      const fetch = stub(global, 'fetch')
      fetch.onFirstCall().resolves({
        ok: true,
        json: () =>
          Promise.resolve({
            uploadUrl: 'http://example.com/upload/url',
            storageSource: 'storage-source-obj',
          }),
      } as any)
      fetch.onSecondCall().resolves({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as any)

      await expect(
        gcloudFunctionUploadSources({
          region: 'some-region',
          auth: {accessToken: 'my-token', project: 'my-project'},
          body: Buffer.from([1, 2, 3]),
        }),
      ).eventually.rejectedWith("can't upload function source: 404 Not Found")
    })
  })
})
