import {expect, use} from 'chai'
import * as runCmdModule from '../../../src/utils/run-cmd'
import * as stageModule from '../../../src/utils/stage'
import {npmCmd} from '../../../src/utils/npm-utils'
import * as chaiAsPromised from 'chai-as-promised'
import {assert, match, restore, stub} from 'sinon'

use(chaiAsPromised)

describe('utils/npm-utils', () => {
  describe('npmCmd', () => {
    afterEach(() => {
      restore()
    })

    it('should use runCmd', async () => {
      stub(stageModule, 'stage').callsFake((_name, func) => Promise.resolve(func(stub())))
      const runCmd = stub(runCmdModule, 'runCmd').resolves()
      await npmCmd(['arg1', 'arg2'], {title: 'dummy', command: {log: stub()} as any})
      assert.calledOnceWithExactly(runCmd, 'npm', ['arg1', 'arg2'], match.any)
    })

    it('should output stdout', async () => {
      stub(stageModule, 'stage').callsFake((_name, func) => Promise.resolve(func(stub())))
      stub(runCmdModule, 'runCmd').callsFake((_command, _args, options) => {
        options?.onStdout?.(Buffer.from('hello, world'))
        options?.onStderr?.(Buffer.from('not output'))
        return Promise.resolve()
      })
      const onStdout = stub()
      await npmCmd(['arg1', 'arg2'], {onStdout, command: {log: stub()} as any})
      assert.calledOnce(onStdout)
      expect(new TextDecoder().decode(onStdout.firstCall.args[0])).to.equal('hello, world')
    })
  })
})
