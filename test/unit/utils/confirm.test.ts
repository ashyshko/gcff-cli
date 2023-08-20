import {ux} from '@oclif/core'
import {assert, restore, stub} from 'sinon'
import {confirm} from '../../../src/utils/confirm'
import * as chaiAsPromised from 'chai-as-promised'
import {expect, use} from 'chai'

use(chaiAsPromised)

describe('utils/confirm', () => {
  afterEach(() => {
    restore()
  })
  it('should use ux.confirm', async () => {
    const confirmStub = stub(ux, 'confirm').resolves(true)
    await confirm('Prompt.')
    assert.calledOnceWithExactly(confirmStub, 'Prompt. Confirm? \u001B[90m(yes/no)\u001B[39m')
  })
  it('should throw exception if user did not confirm', async () => {
    stub(ux, 'confirm').resolves(false)
    await expect(confirm('Prompt.')).eventually.rejectedWith('Canceled')
  })
  it('should check autoConfirm flag', async () => {
    const confirmStub = stub(ux, 'confirm').resolves(false)
    await confirm('Prompt.', true)
    assert.notCalled(confirmStub)
  })
  it('should add "." to prompt', async () => {
    const confirmStub = stub(ux, 'confirm').resolves(true)
    await confirm('Prompt')
    assert.calledOnceWithExactly(confirmStub, 'Prompt. Confirm? \u001B[90m(yes/no)\u001B[39m')
  })
})
