import {mock, restore, match, stub, assert} from 'sinon'
import * as chaiAsPromised from 'chai-as-promised'
import {sleep} from '../../../src/utils/sleep'
import {expect, use} from 'chai'

use(chaiAsPromised)

describe('utils/sleep', () => {
  afterEach(() => {
    restore()
  })

  it('should use setTimeout', async () => {
    const setTimeout = stub(global, 'setTimeout')
    const res = sleep(500)
    assert.calledOnce(setTimeout)
    assert.calledWithExactly(setTimeout, match.any, 500)
    setTimeout.lastCall.firstArg()
    await res
  })
})
