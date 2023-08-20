import {assert, restore, stub} from 'sinon'
import {findModules} from '../../../src/utils/find-modules'
import * as chaiAsPromised from 'chai-as-promised'
import {expect, use} from 'chai'

use(chaiAsPromised)

describe('utils/find-modules', () => {
  afterEach(() => {
    restore()
  })

  it('should work without name prefix', async () => {
    const getFiles = stub().resolves([
      [
        {
          name: 'resolve.json',
        },
        {
          name: 'l1/resolve.json',
        },
        {
          name: 'l1/l2/l3/resolve.json',
        },
      ],
    ])

    await expect(
      findModules({bucket: {getFiles} as any, namePrefix: ''}),
    ).eventually.to.eqls(['', 'l1/', 'l1/l2/l3/'])
  })

  it('should work with name prefix', async () => {
    const getFiles = stub().resolves([
      [
        {
          name: 'resolve.json',
        },
        {
          name: 'l1/resolve.json',
        },
        {
          name: 'l1/l2/l3/resolve.json',
        },
      ],
    ])

    await expect(
      findModules({bucket: {getFiles} as any, namePrefix: 'l1'}),
    ).eventually.to.eqls(['l1/', 'l1/l2/l3/'])
    assert.calledOnce(getFiles)
    assert.calledWithExactly(getFiles, {matchGlob: '**/resolve.json'})
  })

  it('should work with name prefix with trailing slash', async () => {
    const getFiles = stub().resolves([
      [
        {
          name: 'resolve.json',
        },
        {
          name: 'l1/resolve.json',
        },
        {
          name: 'l1/l2/l3/resolve.json',
        },
      ],
    ])

    await expect(
      findModules({bucket: {getFiles} as any, namePrefix: 'l1/'}),
    ).eventually.to.eqls(['l1/', 'l1/l2/l3/'])
  })

  it('should throw exception if gcloud returned inproper object name', async () => {
    const getFiles = stub().resolves([
      [
        {
          name: 'resolve.json',
        },
        {
          name: 'l1/resolve.json',
        },
        {
          name: 'l1/l2/l3/resolve.json',
        },
      ],
    ])

    await expect(
      findModules({bucket: {getFiles} as any, namePrefix: 'l1/'}),
    ).eventually.to.eqls(['l1/', 'l1/l2/l3/'])
  })
})
