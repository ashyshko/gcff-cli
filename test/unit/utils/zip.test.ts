import {assert, stub} from 'sinon'
import {generate, updateFile} from '../../../src/utils/zip'
import * as chaiAsPromised from 'chai-as-promised'
import {expect, use} from 'chai'

use(chaiAsPromised)

describe('utils/zip', () => {
  describe('updateFile', () => {
    it('should update provided archive', async () => {
      const admZip = stub().callsFake(() => {
        return {
          getEntries: stub().returns([]),
          addFile: stub(),
          toBufferPromise: stub().resolves(Buffer.from([7, 8, 9])),
        }
      })
      await expect(
        updateFile(
          Buffer.from([1, 2, 3]),
          'name.txt',
          Buffer.from([4, 5, 6]),
          admZip as any,
        ),
      ).eventually.to.eqls(Buffer.from([7, 8, 9]))

      assert.calledTwice(admZip)

      assert.calledWithExactly(admZip.firstCall, Buffer.from([1, 2, 3]))
      // const fromZip = admZip.firstCall.returnValue

      assert.calledWithExactly(admZip.secondCall)
      const toZip = admZip.secondCall.returnValue

      assert.calledOnceWithExactly(
        toZip.addFile,
        'name.txt',
        Buffer.from([4, 5, 6]),
      )
    })

    it('should override provided file', async () => {
      const admZip = stub().callsFake(() => {
        return {
          getEntries: stub().returns([
            {isDirectory: true, entryName: 'some/dir'},
            {isDirectory: false, entryName: 'name.txt'},
            {
              isDirectory: false,
              entryName: 'another-name.txt',
              getDataAsync(
                callback: (data: Buffer, error?: string) => void,
              ): void {
                callback(Buffer.from([10, 11, 12]))
              },
            },
          ]),
          addFile: stub(),
          toBufferPromise: stub().resolves(Buffer.from([7, 8, 9])),
        }
      })
      await expect(
        updateFile(
          Buffer.from([1, 2, 3]),
          'name.txt',
          Buffer.from([4, 5, 6]),
          admZip as any,
        ),
      ).eventually.to.eqls(Buffer.from([7, 8, 9]))

      assert.calledTwice(admZip)

      assert.calledWithExactly(admZip.firstCall, Buffer.from([1, 2, 3]))
      // const fromZip = admZip.firstCall.returnValue

      assert.calledWithExactly(admZip.secondCall)
      const toZip = admZip.secondCall.returnValue

      assert.calledTwice(toZip.addFile)
      assert.calledWithExactly(
        toZip.addFile.firstCall,
        'another-name.txt',
        Buffer.from([10, 11, 12]),
      )
      assert.calledWithExactly(
        toZip.addFile.secondCall,
        'name.txt',
        Buffer.from([4, 5, 6]),
      )
    })

    it('should handle errors from decompression', async () => {
      const admZip = stub().callsFake(() => {
        return {
          getEntries: stub().returns([
            {isDirectory: true, entryName: 'some/dir'},
            {isDirectory: false, entryName: 'name.txt'},
            {
              isDirectory: false,
              entryName: 'another-name.txt',
              getDataAsync(
                callback: (data: Buffer | undefined, error?: string) => void,
              ): void {
                callback(undefined, 'dummy-error')
              },
            },
          ]),
          addFile: stub(),
          toBufferPromise: stub().resolves(Buffer.from([7, 8, 9])),
        }
      })
      await expect(
        updateFile(
          Buffer.from([1, 2, 3]),
          'name.txt',
          Buffer.from([4, 5, 6]),
          admZip as any,
        ),
      ).eventually.rejectedWith('dummy-error')
    })
  })

  describe('generate', () => {
    it('should work', async () => {
      const admZip = {
        addLocalFolder: stub(),
        addFile: stub(),
        toBufferPromise: stub().resolves(Buffer.from([1, 2, 3])),
      }
      await expect(
        generate(
          '/folder/path/',
          {depA: '1.0'},
          stub().returns(admZip) as any,
        ),
      ).eventually.to.eqls(Buffer.from([1, 2, 3]))
      assert.calledOnceWithExactly(admZip.addLocalFolder, '/folder/path/')
      assert.calledOnceWithExactly(
        admZip.addFile,
        'package.json',
        Buffer.from(`{
  "dependencies": {
    "depA": "1.0"
  }
}`),
      )
    })
  })
})
