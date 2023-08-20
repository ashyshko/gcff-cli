import {
  addDependenciesToMetadata,
  diffDependencies,
  getDependenciesFromMetadata,
  getDependenciesFromPackageJson,
  getModuleDependencies,
  mergeDependencies,
  parseMetadataDependencies,
  stringifyMetadataDependencies,
} from '../../../src/utils/dependencies'
import {assert, restore, stub} from 'sinon'
import * as chaiAsPromised from 'chai-as-promised'
import * as fsModule from 'node:fs/promises'
import {expect, use} from 'chai'
import * as path from 'node:path'

use(chaiAsPromised)

describe('utils/dependencies', () => {
  describe('mergeDependencies', () => {
    it('should work with empty lists', () => {
      expect(mergeDependencies([])).to.eqls({
        dependencies: {},
        conflicts: [],
      })
    })

    it('should join dependencies', () => {
      expect(
        mergeDependencies([
          {sourceName: 'a', dependencies: {depA: '1.0'}},
          {sourceName: 'b', dependencies: {depB: '1.1'}},
        ]),
      ).to.eqls({
        dependencies: {
          depA: '1.0',
          depB: '1.1',
        },
        conflicts: [],
      })
    })

    it('should ignore duplicates', () => {
      expect(
        mergeDependencies([
          {sourceName: 'a', dependencies: {depA: '1.0'}},
          {sourceName: 'b', dependencies: {depA: '1.0'}},
        ]),
      ).to.eqls({
        dependencies: {
          depA: '1.0',
        },
        conflicts: [],
      })
    })

    it('should detect conflicts', () => {
      expect(
        mergeDependencies([
          {sourceName: 'a', dependencies: {depA: '1.0'}},
          {sourceName: 'b', dependencies: {depA: '1.1'}},
        ]),
      ).to.eqls({
        dependencies: {},
        conflicts: [
          {
            dependencyName: 'depA',
            versions: {
              '1.0': ['a'],
              1.1: ['b'],
            },
          },
        ],
      })
    })
  })

  describe('diffDependencies', () => {
    it('should work', () => {
      expect(diffDependencies(/* from */ {}, /* to */ {})).to.eqls({
        added: [],
        removed: [],
        changed: [],
        equals: true,
      })

      expect(
        diffDependencies(/* from */ {a: '1.0'}, /* to */ {b: '1.0'}),
      ).to.eqls({
        added: [['b', '1.0']],
        removed: [['a', '1.0']],
        changed: [],
        equals: false,
      })

      expect(
        diffDependencies(/* from */ {a: '1.0'}, /* to */ {a: '1.1'}),
      ).to.eqls({
        added: [],
        removed: [],
        changed: [['a', {fromVersion: '1.0', toVersion: '1.1'}]],
        equals: false,
      })

      expect(
        diffDependencies(/* from */ {a: '1.0'}, /* to */ {a: '1.0'}),
      ).to.eqls({
        added: [],
        removed: [],
        changed: [],
        equals: true,
      })
    })
  })

  describe('getModuleDependencies', () => {
    it('should read dependencies from resolve.json', async () => {
      const file = stub().returns({
        download: () =>
          Promise.resolve([Buffer.from('{"dependencies": {"depA": "1.0"}}')]),
      })
      await expect(
        getModuleDependencies({bucket: {file} as any, path: 'path/prefix/'}),
      ).eventually.to.eqls({
        depA: '1.0',
      })

      assert.calledOnceWithExactly(file, 'path/prefix/resolve.json')
    })

    it('should return empty list if no dependencies in resolve.json', async () => {
      const file = stub().returns({
        download: () => Promise.resolve([Buffer.from('{}')]),
      })
      await expect(
        getModuleDependencies({bucket: {file} as any, path: 'path/prefix/'}),
      ).eventually.to.eqls({})
    })
  })

  describe('getDependenciesFromPackageJson', () => {
    afterEach(() => {
      restore()
    })

    it('should read dependencies from package.json', async () => {
      const readFile = stub(fsModule, 'readFile').resolves(
        '{"dependencies": {"depA": "1.0"}}',
      )

      await expect(
        getDependenciesFromPackageJson('/path/to/folder'),
      ).eventually.to.eqls({depA: '1.0'})
      assert.calledOnce(readFile)
      assert.calledWithExactly(
        readFile,
        path.join('/path/to/folder', 'package.json'),
        {encoding: 'utf-8'},
      )
    })
  })

  describe('parseMetadataDependencies', () => {
    it('should work', () => {
      expect(parseMetadataDependencies('{"depA": "1.0"}')).to.eqls({
        depA: '1.0',
      })
      // eslint-disable-next-line unicorn/no-useless-undefined
      expect(parseMetadataDependencies(undefined)).to.eqls({})
    })
  })

  describe('stringifyMetadataDependencies', () => {
    it('should work', () => {
      expect(stringifyMetadataDependencies({depA: '1.0'})).to.equal(
        '{"depA":"1.0"}',
      )
    })
  })

  describe('getDependenciesFromMetadata', () => {
    it('should work', () => {
      expect(
        getDependenciesFromMetadata({
          SERVER_DEPENDENCIES: '{"depA":"1.0"}',
          DEPENDENCIES: '{"depA":"1.0","depB":"1.1"}',
        }),
      ).to.eqls({
        serverDependencies: {depA: '1.0'},
        unitedDependencies: {depA: '1.0', depB: '1.1'},
      })
    })

    it('should work with undefined metadata', () => {
      expect(
        // eslint-disable-next-line unicorn/no-useless-undefined
        getDependenciesFromMetadata(undefined),
      ).to.eqls({
        serverDependencies: {},
        unitedDependencies: {},
      })
    })
  })

  describe('addDependenciesToMetadata', () => {
    it('should work', () => {
      expect(
        addDependenciesToMetadata({
          SERVER_DEPENDENCIES: 'prev_value',
          OTHER: 'some-value',
        }, {depA: '1.0'}, {depA: '1.0', depB: '1.1'}),
      ).to.eqls({
        OTHER: 'some-value',
        SERVER_DEPENDENCIES: '{"depA":"1.0"}',
        DEPENDENCIES: '{"depA":"1.0","depB":"1.1"}',
      })
    })
  })
})
