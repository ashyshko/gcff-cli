import {assert, match, mock, restore, stub} from 'sinon'
import {gcloudAuth} from '../../../src/utils/gcloud-auth'
import * as stageModule from '../../../src/utils/stage'
import * as runCmdModule from '../../../src/utils/run-cmd'
import {expect, use} from 'chai'

import * as chaiAsPromised from 'chai-as-promised'

use(chaiAsPromised)

describe('utils/gcloud-auth', () => {
  afterEach(() => {
    restore()
  })

  it('should do nothing if token and project are provided', async () => {
    const stage = mock(stageModule)
    stage.expects('stage').never()

    const res = await gcloudAuth({accessToken: 'my-token', project: 'my-project'}, {} as any)
    expect(res).to.eql({accessToken: 'my-token', project: 'my-project'})
    stage.verify()
  })

  it('should check access token', async () => {
    const stage = stub(stageModule, 'stage').callsFake((_, v) => v(() => { /* noop */ }))

    const runCmd = stub(runCmdModule, 'runCmd').callsFake((_command, _args, options) => {
      options?.onStdout?.(Buffer.from(JSON.stringify({token: '12345'})))
      return Promise.resolve()
    })

    const res = await gcloudAuth({project: 'my-project'}, {} as any)
    assert.calledOnce(runCmd)
    assert.calledWithExactly(runCmd, 'gcloud', ['auth', 'print-access-token', '--quiet', '--format=json'], match.any)
    expect(res).to.eql({accessToken: '12345', project: 'my-project'})

    assert.calledOnce(stage)
  })

  it('should check project', async () => {
    const stage = stub(stageModule, 'stage').callsFake((_, v) => v(() => { /* noop */ }))

    const runCmd = stub(runCmdModule, 'runCmd').callsFake((_command, _args, options) => {
      options?.onStdout?.(Buffer.from(JSON.stringify('proj-id')))
      return Promise.resolve()
    })

    const res = await gcloudAuth({accessToken: 'my-token'}, {} as any)
    assert.calledOnce(runCmd)
    assert.calledWithExactly(runCmd, 'gcloud', ['config', 'get-value', 'project', '--quiet', '--format=json'], match.any)
    expect(res).to.eql({accessToken: 'my-token', project: 'proj-id'})

    assert.calledOnce(stage)
  })

  it('should log stderr output', async () => {
    const stage = stub(stageModule, 'stage').callsFake((_, v) => v(() => { /* noop */ }))

    const runCmd = stub(runCmdModule, 'runCmd')

    runCmd.onFirstCall().callsFake((_command, _args, options) => {
      options?.onStdout?.(Buffer.from(JSON.stringify({token: '12345'})))
      options?.onStderr?.(Buffer.from('message1'))
      return Promise.resolve()
    })

    runCmd.onSecondCall().callsFake((_command, _args, options) => {
      options?.onStdout?.(Buffer.from(JSON.stringify('proj-id')))
      options?.onStderr?.(Buffer.from('message2'))
      return Promise.resolve()
    })

    const log = stub<[string, void]>()
    const res = await gcloudAuth({}, {log} as any)
    assert.calledTwice(runCmd)
    expect(res).to.eql({accessToken: '12345', project: 'proj-id'})

    assert.calledTwice(log)
    assert.calledWithExactly(log.firstCall, 'message1')
    assert.calledWithExactly(log.secondCall, 'message2')

    assert.calledOnce(stage)
  })

  it('should check for valid access token received', async () => {
    stub(stageModule, 'stage').callsFake((_, v) => v(() => { /* noop */ }))

    const runCmd = stub(runCmdModule, 'runCmd')

    runCmd.onFirstCall().callsFake((_command, _args, options) => {
      options?.onStdout?.(Buffer.from('not-json'))
      return Promise.resolve()
    })

    runCmd.onSecondCall().callsFake((_command, _args, options) => {
      options?.onStdout?.(Buffer.from(JSON.stringify('json-but-not-object')))
      return Promise.resolve()
    })

    runCmd.onThirdCall().callsFake((_command, _args, options) => {
      options?.onStdout?.(Buffer.from(JSON.stringify({error: 'json-object-but-without-token'})))
      return Promise.resolve()
    })

    await expect(gcloudAuth({project: 'my-project'}, {} as any)).eventually.rejected
    await expect(gcloudAuth({project: 'my-project'}, {} as any)).eventually.rejected
    await expect(gcloudAuth({project: 'my-project'}, {} as any)).eventually.rejected
  })

  it('should check for valid project-id received', async () => {
    stub(stageModule, 'stage').callsFake((_, v) => v(() => { /* noop */ }))

    const runCmd = stub(runCmdModule, 'runCmd')

    runCmd.onFirstCall().callsFake((_command, _args, options) => {
      options?.onStdout?.(Buffer.from('not-json'))
      return Promise.resolve()
    })

    runCmd.onSecondCall().callsFake((_command, _args, options) => {
      options?.onStdout?.(Buffer.from(JSON.stringify({error: 'json-but-string'})))
      return Promise.resolve()
    })

    await expect(gcloudAuth({accessToken: 'my-token'}, {} as any)).eventually.rejected
    await expect(gcloudAuth({accessToken: 'my-token'}, {} as any)).eventually.rejected
  })
})
