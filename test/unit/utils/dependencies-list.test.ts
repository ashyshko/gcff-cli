import {assert, restore, stub} from 'sinon'
import * as dependenciesModule from '../../../src/utils/dependencies'
import * as chaiAsPromised from 'chai-as-promised'
import * as findModulesModule from '../../../src/utils/find-modules'
import {expect, use} from 'chai'
import {
  getAllDependencies,
  unitedDependencies,
} from '../../../src/utils/dependencies-list'

use(chaiAsPromised)

describe('utils/dependencies-list', () => {
  describe('getAllDependencies', () => {
    afterEach(() => {
      restore()
    })

    it('should use cached versions', async () => {
      const getDependenciesFromMetadata = stub(
        dependenciesModule,
        'getDependenciesFromMetadata',
      )
      const getModuleDependencies = stub(
        dependenciesModule,
        'getModuleDependencies',
      )
      await expect(
        getAllDependencies({
          bucket: {} as any,
          moduleNamePrefix: 'unused',
          modules: ['module1'],
          buildConfig: {} as any,
          knownDependencies: {
            server: {
              depA: '1.0',
            },
            united: {
              depB: '1.1',
            },
            modules: {
              module1: {
                depC: '1.2',
              },
            },
          },
        }),
      ).eventually.to.eqls({
        server: {
          depA: '1.0',
        },
        united: {
          depB: '1.1',
        },
        modules: {
          module1: {
            depC: '1.2',
          },
        },
      })

      assert.notCalled(getDependenciesFromMetadata)
      assert.notCalled(getModuleDependencies)
    })

    it('should check metadata', async () => {
      const getDependenciesFromMetadata = stub(
        dependenciesModule,
        'getDependenciesFromMetadata',
      ).returns({
        serverDependencies: {depA: '1.0'},
        unitedDependencies: {depB: '1.1'},
      })
      const getModuleDependencies = stub(
        dependenciesModule,
        'getModuleDependencies',
      )
      await expect(
        getAllDependencies({
          bucket: {} as any,
          moduleNamePrefix: 'unused',
          modules: [],
          buildConfig: {environmentVariables: 'env-vars'} as any,
        }),
      ).eventually.to.eqls({
        server: {
          depA: '1.0',
        },
        united: {
          depB: '1.1',
        },
        modules: {},
      })

      assert.calledOnceWithExactly(
        getDependenciesFromMetadata,
        'env-vars' as any,
      )
      assert.notCalled(getModuleDependencies)
    })

    it('should check modules', async () => {
      const getDependenciesFromMetadata = stub(
        dependenciesModule,
        'getDependenciesFromMetadata',
      )
      const getModuleDependencies = stub(
        dependenciesModule,
        'getModuleDependencies',
      ).resolves({
        depA: '1.1',
      })
      await expect(
        getAllDependencies({
          bucket: 'bucket' as any,
          moduleNamePrefix: 'prefix/',
          modules: ['moduleA/'],
          buildConfig: {} as any,
          knownDependencies: {
            server: {},
            united: {},
          },
        }),
      ).eventually.to.eqls({
        server: {},
        united: {},
        modules: {
          'moduleA/': {
            depA: '1.1',
          },
        },
      })

      assert.notCalled(getDependenciesFromMetadata)
      assert.calledOnceWithExactly(getModuleDependencies, {
        bucket: 'bucket' as any,
        path: 'prefix/moduleA/',
      })
    })

    it('should work without knownDependencies', async () => {
      stub(dependenciesModule, 'getDependenciesFromMetadata').returns({
        serverDependencies: {depA: '1.0'},
        unitedDependencies: {depB: '1.1'},
      })

      stub(dependenciesModule, 'getModuleDependencies').resolves({
        depA: '1.1',
      })
      await expect(
        getAllDependencies({
          bucket: 'bucket' as any,
          moduleNamePrefix: 'prefix/',
          modules: ['moduleA/'],
          buildConfig: {} as any,
        }),
      ).eventually.to.eqls({
        server: {
          depA: '1.0',
        },
        united: {
          depB: '1.1',
        },
        modules: {
          'moduleA/': {
            depA: '1.1',
          },
        },
      })
    })

    it('should use findModules if no modules provided', async () => {
      const getDependenciesFromMetadata = stub(
        dependenciesModule,
        'getDependenciesFromMetadata',
      )
      const getModuleDependencies = stub(
        dependenciesModule,
        'getModuleDependencies',
      )

      const findModules = stub(findModulesModule, 'findModules').resolves([
        'module1',
      ])

      await expect(
        getAllDependencies({
          bucket: 'bucket-stub' as any,
          moduleNamePrefix: 'module/name/prefix',
          buildConfig: {} as any,
          knownDependencies: {
            server: {
              depA: '1.0',
            },
            united: {
              depB: '1.1',
            },
            modules: {
              module1: {
                depC: '1.2',
              },
            },
          },
        }),
      ).eventually.to.eqls({
        server: {
          depA: '1.0',
        },
        united: {
          depB: '1.1',
        },
        modules: {
          module1: {
            depC: '1.2',
          },
        },
      })

      assert.calledOnceWithExactly(findModules, {
        bucket: 'bucket-stub' as any,
        namePrefix: 'module/name/prefix',
      })
      assert.notCalled(getDependenciesFromMetadata)
      assert.notCalled(getModuleDependencies)
    })
  })

  describe('unitedDependencies', () => {
    afterEach(() => {
      restore()
    })

    it('should work', () => {
      const mergeDependencies = stub(
        dependenciesModule,
        'mergeDependencies',
      ).returns('merge-res' as any)

      expect(
        unitedDependencies({
          server: {
            depA: '1.0',
          },
          modules: {
            module1: {
              depB: '1.1',
            },
          },
        }),
      ).to.equal('merge-res')

      assert.calledOnceWithExactly(mergeDependencies, [
        {sourceName: '<SERVER>', dependencies: {depA: '1.0'}},
        {sourceName: 'module1', dependencies: {depB: '1.1'}},
      ])
    })

    it('should allow server module name customization', () => {
      const mergeDependencies = stub(
        dependenciesModule,
        'mergeDependencies',
      ).returns('merge-res' as any)

      expect(
        unitedDependencies({
          server: {
            depA: '1.0',
          },
          modules: {
            module1: {
              depB: '1.1',
            },
          },
          serverName: 'MY_SERVER',
        }),
      ).to.equal('merge-res')

      assert.calledOnceWithExactly(mergeDependencies, [
        {sourceName: 'MY_SERVER', dependencies: {depA: '1.0'}},
        {sourceName: 'module1', dependencies: {depB: '1.1'}},
      ])
    })
  })
})
