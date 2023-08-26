import {expect} from 'chai'
import ClientInitExpress from '../../../../../src/commands/client/init/express'
import * as fs from 'node:fs'
import {assert, match, restore, stub} from 'sinon'
import * as path from 'node:path'

describe('commands/client/init/express', () => {
  describe('parseClientName', () => {
    afterEach(() => {
      restore()
    })

    it('should work when all fields set', () => {
      const cmd = new ClientInitExpress([], {} as any)
      // @ts-expect-error Property 'parseClientName' is private
      const parseClientName = cmd.parseClientName.bind(cmd)
      expect(
        parseClientName({
          destination: 'path/to/my-destination/',
          name: 'my-name',
          outDir: '/out/dir',
        }),
      ).to.eqls({packageName: 'my-name', outDir: '/out/dir'})
    })

    it('should choose packageName correctly', () => {
      stub(fs, 'existsSync').returns(false)
      const cmd = new ClientInitExpress([], {} as any)
      // @ts-expect-error Property 'parseClientName' is private
      const parseClientName = cmd.parseClientName.bind(cmd)
      expect(
        parseClientName({
          destination: 'path/to/my-destination/',
        }).packageName,
      ).to.equal('path-to-my-destination')
      expect(
        parseClientName({
          destination: 'path/to/my-destination/',
          outDir: '/out/dir-name',
        }).packageName,
      ).to.equal('dir-name')

      expect(
        parseClientName({
          destination: '',
        }).packageName,
      ).to.equal('server')
    })

    it('should choose outDir correctly', () => {
      const exists = stub(fs, 'existsSync')
      exists.onFirstCall().returns(true)
      exists.onSecondCall().returns(false)
      const cmd = new ClientInitExpress([], {} as any)
      // @ts-expect-error Property 'parseClientName' is private
      const parseClientName = cmd.parseClientName.bind(cmd)
      expect(
        parseClientName({
          destination: 'path/to/my-destination/',
        }).outDir,
      ).to.equal(path.resolve('path-to-my-destination-2'))
      assert.calledTwice(exists)
      assert.calledWithExactly(
        exists.firstCall,
        path.resolve('path-to-my-destination'),
      )
      assert.calledWithExactly(
        exists.secondCall,
        path.resolve('path-to-my-destination-2'),
      )
    })
  })

  describe('patchPackageJson', () => {
    afterEach(() => {
      restore()
    })

    it('should work with root destination', async () => {
      const readFile = stub(fs.promises, 'readFile').resolves(
        'text file with <PACKAGE_NAME> and <FUNCTION_NAME>, arguments (e.g. <FUNCTION_NAME>) could appear twice',
      )
      const writeFile = stub(fs.promises, 'writeFile').resolves()
      const cmd = new ClientInitExpress([], {} as any)
      // @ts-expect-error Property 'patchPackageJson' is private
      const patchPackageJson = cmd.patchPackageJson.bind(cmd)
      await patchPackageJson('/path/to/', 'my-package', {
        functionName: 'my-function',
        destination: '',
      })
      assert.calledOnceWithExactly(
        readFile,
        path.join('/path/to', 'package.json'),
        {encoding: 'utf-8'},
      )
      assert.calledOnceWithExactly(
        writeFile,
        path.join('/path/to', 'package.json'),
        'text file with my-package and my-function, arguments (e.g. my-function) could appear twice',
        {encoding: 'utf-8'},
      )
    })

    it('should work with destination', async () => {
      const readFile = stub(fs.promises, 'readFile').resolves(
        'text file with <PACKAGE_NAME> and <FUNCTION_NAME>, arguments (e.g. <FUNCTION_NAME>) could appear twice',
      )
      const writeFile = stub(fs.promises, 'writeFile').resolves()
      const cmd = new ClientInitExpress([], {} as any)
      // @ts-expect-error Property 'patchPackageJson' is private
      const patchPackageJson = cmd.patchPackageJson.bind(cmd)
      await patchPackageJson('/path/to/', 'my-package', {
        functionName: 'my-function',
        destination: 'dest/prefix/',
      })
      assert.calledOnceWithExactly(
        readFile,
        path.join('/path/to', 'package.json'),
        {encoding: 'utf-8'},
      )
      assert.calledOnceWithExactly(
        writeFile,
        path.join('/path/to', 'package.json'),
        'text file with my-package and my-function/dest/prefix/, arguments (e.g. my-function/dest/prefix/) could appear twice',
        {encoding: 'utf-8'},
      )
    })
  })
})
