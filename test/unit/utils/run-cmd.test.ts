import * as child_process from 'node:child_process'
import {assert, match, restore, stub} from 'sinon'
import {RunCmdError, runCmd} from '../../../src/utils/run-cmd'
import {expect, use} from 'chai'
import * as chaiAsPromised from 'chai-as-promised'

use(chaiAsPromised)

describe('utils/run-cmd', () => {
  describe('RunCmdError', () => {
    it('should pass exit code', () => {
      const obj = new RunCmdError(/* error */null, /* exitCode */127, /* signal */ null)
      expect(obj.error).to.be.null
      expect(obj.exitCode).to.equal(127)
      expect(obj.signal).to.be.null
      expect(obj.message).to.equal('Process exited with code 127')
      expect(obj.isENOENT()).to.be.false
    })

    it('should pass error', () => {
      const obj = new RunCmdError(/* error */new Error('dummy'), /* exitCode */null, /* signal */ null)
      expect(obj.error).to.eql(new Error('dummy'))
      expect(obj.exitCode).to.be.null
      expect(obj.signal).to.be.null
      expect(obj.message).to.equal('Process error: dummy')
      expect(obj.isENOENT()).to.be.false
    })

    it('should pass signal', () => {
      const obj = new RunCmdError(/* error */null, /* exitCode */null, /* signal */ 'SIGKILL')
      expect(obj.error).to.be.null
      expect(obj.exitCode).to.be.null
      expect(obj.signal).to.be.equal('SIGKILL')
      expect(obj.message).to.equal('Process killed by signal SIGKILL')
      expect(obj.isENOENT()).to.be.false
    })

    it('should default to unknown error if no reasons set', () => {
      const obj = new RunCmdError(/* error */null, /* exitCode */null, /* signal */ null)
      expect(obj.error).to.be.null
      expect(obj.exitCode).to.be.null
      expect(obj.signal).to.be.null
      expect(obj.message).to.equal('Unknown error')
      expect(obj.isENOENT()).to.be.false
    })

    it('should provide both exitCode and signal', () => {
      const obj = new RunCmdError(/* error */null, /* exitCode */127, /* signal */ 'SIGKILL')
      expect(obj.error).to.be.null
      expect(obj.exitCode).to.equal(127)
      expect(obj.signal).to.be.equal('SIGKILL')
      expect(obj.message).to.equal('Process exited with code 127. Process killed by signal SIGKILL')
      expect(obj.isENOENT()).to.be.false
    })

    it('should provide processExitCode', () => {
      expect(RunCmdError.processExitCode(new RunCmdError(/* error */null, /* exitCode */ 127, /* signal */ null))).to.equal(127)
      expect(RunCmdError.processExitCode(new RunCmdError(/* error */new Error('dummy'), /* exitCode */ 127, /* signal */ null))).to.be.null
      expect(RunCmdError.processExitCode(new RunCmdError(/* error */null, /* exitCode */ 127, /* signal */ 'SIGKILL'))).to.be.null
      expect(RunCmdError.processExitCode(new Error('dummy'))).to.be.null
    })

    it('should provide isENOENT', () => {
      expect(new RunCmdError(/* error */null, /* exitCode */0, /* signal */null).isENOENT()).to.be.false
      expect(new RunCmdError(/* error */{code: false} as any, /* exitCode */0, /* signal */null).isENOENT()).to.be.false
      expect(new RunCmdError(/* error */{code: 'ENOENT'} as any, /* exitCode */0, /* signal */null).isENOENT()).to.be.true
      expect(RunCmdError.isENOENT(new RunCmdError(/* error */{code: 'ENOENT'} as any, /* exitCode */0, /* signal */null))).to.be.true
      expect(RunCmdError.isENOENT(new Error('dummy'))).to.be.false
    })
  })

  describe('runCmd', () => {
    afterEach(() => {
      restore()
    })

    it('should use spawn', async () => {
      const handler = {
        stdout: {
          on: stub(),
        },
        stderr: {
          on: stub(),
        },
        on: stub(),
      }
      const spawn = stub(child_process, 'spawn').returns(handler as any)
      const obj = runCmd('command-name', ['arg1', 'arg2'])
      assert.calledOnce(spawn)
      assert.calledWithExactly(spawn as any /* ts mess with multiple overloads */, 'command-name', ['arg1', 'arg2'])
      assert.calledTwice(handler.on)
      expect(handler.on.firstCall.args[0]).to.equal('error')
      expect(handler.on.secondCall.args[0]).to.equal('close')
      const close = handler.on.secondCall.args[1]
      close(0, null)
      await obj
    })

    it('should provide stdout/stderr content', async () => {
      const handler = {
        stdout: {
          on: stub(),
        },
        stderr: {
          on: stub(),
        },
        on: stub(),
      }
      const spawn = stub(child_process, 'spawn').returns(handler as any)
      const onStdout = stub()
      const onStderr = stub()
      const obj = runCmd('command-name', ['arg1', 'arg2'], {onStdout, onStderr})
      assert.calledOnce(spawn)

      assert.calledOnce(handler.stdout.on)
      assert.calledWith(handler.stdout.on, 'data', match.any)
      const sendStdout = handler.stdout.on.firstCall.args[1]
      sendStdout(Buffer.from([1, 2, 3]))
      assert.calledOnce(onStdout)
      assert.calledWith(onStdout, Buffer.from([1, 2, 3]))

      assert.calledOnce(handler.stderr.on)
      assert.calledWith(handler.stderr.on, 'data', match.any)
      const sendStderr = handler.stderr.on.firstCall.args[1]
      sendStderr(Buffer.from([4, 5, 6]))
      assert.calledOnce(onStderr)
      assert.calledWith(onStderr, Buffer.from([4, 5, 6]))

      assert.calledTwice(handler.on)
      expect(handler.on.firstCall.args[0]).to.equal('error')
      expect(handler.on.secondCall.args[0]).to.equal('close')
      const close = handler.on.secondCall.args[1]
      close(0, null)
      await obj
    })

    it('should handle errors', async () => {
      const handler = {
        stdout: {
          on: stub(),
        },
        stderr: {
          on: stub(),
        },
        on: stub(),
      }
      const spawn = stub(child_process, 'spawn').returns(handler as any)
      const obj = runCmd('command-name', ['arg1', 'arg2'])
      assert.calledOnce(spawn)

      assert.calledTwice(handler.on)
      expect(handler.on.firstCall.args[0]).to.equal('error')
      const error = handler.on.firstCall.args[1]
      expect(handler.on.secondCall.args[0]).to.equal('close')
      const close = handler.on.secondCall.args[1]

      error(new Error('dummy error'))
      close(0, null)

      await expect(obj).eventually.rejectedWith(RunCmdError, 'Process error: dummy error')
    })

    it('should handle exit code', async () => {
      const handler = {
        stdout: {
          on: stub(),
        },
        stderr: {
          on: stub(),
        },
        on: stub(),
      }
      const spawn = stub(child_process, 'spawn').returns(handler as any)
      const obj = runCmd('command-name', ['arg1', 'arg2'])
      assert.calledOnce(spawn)

      assert.calledTwice(handler.on)
      expect(handler.on.firstCall.args[0]).to.equal('error')
      expect(handler.on.secondCall.args[0]).to.equal('close')
      const close = handler.on.secondCall.args[1]

      close(127, null)

      await expect(obj).eventually.rejectedWith(RunCmdError, 'Process exited with code 127')
    })

    it('should ignore stdout/stderr if no handler provided', async () => {
      const handler = {
        stdout: {
          on: stub(),
        },
        stderr: {
          on: stub(),
        },
        on: stub(),
      }
      const spawn = stub(child_process, 'spawn').returns(handler as any)
      const obj = runCmd('command-name', ['arg1', 'arg2'], {})
      assert.calledOnce(spawn)

      assert.calledOnce(handler.stdout.on)
      assert.calledWith(handler.stdout.on, 'data', match.any)
      const sendStdout = handler.stdout.on.firstCall.args[1]
      sendStdout(Buffer.from([1, 2, 3]))

      assert.calledOnce(handler.stderr.on)
      assert.calledWith(handler.stderr.on, 'data', match.any)
      const sendStderr = handler.stderr.on.firstCall.args[1]
      sendStderr(Buffer.from([4, 5, 6]))

      assert.calledTwice(handler.on)
      expect(handler.on.firstCall.args[0]).to.equal('error')
      expect(handler.on.secondCall.args[0]).to.equal('close')
      const close = handler.on.secondCall.args[1]
      close(0, null)
      await obj
    })
  })
})

