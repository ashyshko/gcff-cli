import {expect, test} from '@oclif/test'
import * as gitUtilsModule from '../../../../src/utils/git-utils'
import * as npmUtilsModule from '../../../../src/utils/npm-utils'
import * as stageModule from '../../../../src/utils/stage'
import * as fs from 'node:fs'
import {assert, stub} from 'sinon'
import * as path from 'node:path'

describe('client:init:express', () => {
  test
  .stdout()
  .stub(
    stageModule,
    'stage',
    stub().callsFake((_name, callback) => callback(stub())),
  )
  .stub(gitUtilsModule, 'gitCmd', stub())
  .stub(npmUtilsModule, 'npmCmd', stub())
  .stub(
    fs.promises,
    'readFile',
    stub().resolves(
      '{"name": "<PACKAGE_NAME>","function": "<FUNCTION_NAME>"}',
    ),
  )
  .stub(fs.promises, 'writeFile', stub())
  .command(['client:init:express', 'my-function', '--out=/out/path', '--name=my-name'])
  .it('works properly', ctx => {
    const writeFile = fs.promises.writeFile as any
    assert.calledOnceWithExactly(
      writeFile,
      path.join('/out/path', 'package.json'),
      '{"name": "my-name","function": "my-function"}',
      {encoding: 'utf-8'},
    )
  })

  test
  .stdout()
  .stub(
    stageModule,
    'stage',
    stub().callsFake((_name, callback) => callback(stub())),
  )
  .command(['client:init:express', 'my-function', '--out=src'])
  .catch('out path src already exists', {raiseIfNotThrown: true})
  .it('should fail if out dir exists', _ctx => {})
})
