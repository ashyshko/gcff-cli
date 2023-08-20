import {expect, use} from 'chai'
import * as chaiAsPromised from 'chai-as-promised'
import {stage} from '../../../src/utils/stage'
import {mock, stub, restore, assert} from 'sinon'
import {ux} from '@oclif/core'

use(chaiAsPromised)

describe('utils/stage', () => {
  afterEach(() => {
    restore()
  })

  it('should work with non-promised types', () => {
    const callback = stub().returns(123)
    const actionMock = mock(ux.action)
    actionMock.expects('start').once().withExactArgs('dummy')
    actionMock.expects('stop').once().withExactArgs('\u001B[1m\u001B[32mDone!\u001B[39m\u001B[22m')
    const res = stage('dummy', callback)
    expect(res).eq(123)
    actionMock.verify()
  })

  it('should display error with non-promised types', () => {
    const callback = stub().throws(new Error('error-message'))
    const actionMock = mock(ux.action)
    actionMock.expects('start').once().withExactArgs('dummy')
    actionMock.expects('stop').once().withExactArgs('\u001B[1m\u001B[31merror-message\u001B[39m\u001B[22m')
    expect(() => stage('dummy', callback)).to.throw('error-message')
    actionMock.verify()
  })

  it('should work with promised types', async () => {
    const callback = stub().resolves(123)
    const actionMock = mock(ux.action)
    actionMock.expects('start').once().withExactArgs('dummy')
    actionMock.expects('stop').once().withExactArgs('\u001B[1m\u001B[32mDone!\u001B[39m\u001B[22m')
    const res = stage('dummy', callback)
    await expect(res).to.eventually.equal(123)
    actionMock.verify()
  })

  it('should display error with promised types', async () => {
    const callback = stub().rejects(new Error('async-error'))
    const actionMock = mock(ux.action)
    actionMock.expects('start').once().withExactArgs('dummy')
    actionMock.expects('stop').once().withExactArgs('\u001B[1m\u001B[31masync-error\u001B[39m\u001B[22m')
    const res = stage('dummy', callback)
    await expect(res).to.be.rejectedWith('async-error')
    actionMock.verify()
  })

  it('should update status', async () => {
    const callback = stub().callsFake(status => status('hello'))
    const statusStub = stub()
    const actionMock = mock(ux.action)
    actionMock.expects('start')
    actionMock.expects('stop')
    stub(ux.action, 'status').set(statusStub)
    stage('dummy', callback)
    assert.calledOnce(statusStub)
    assert.calledWith(statusStub, 'hello')
  })
})
