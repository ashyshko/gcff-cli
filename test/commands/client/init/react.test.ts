import {expect, test} from '@oclif/test'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import {assert, match, stub} from 'sinon'

describe('client:init:react', () => {
  test
  .stdout()
  .stub(
    fs,
    'readFile',
    stub().resolves(JSON.stringify({scripts: {run: 'dummy'}})),
  )
  .stub(fs, 'writeFile', stub().resolves())
  .command(['client:init:react', 'my-function/path', 'test'])
  .it('should patch package.json', ctx => {
    const readFile = fs.readFile as any
    assert.calledOnceWithExactly(
      readFile,
      path.join('test', 'package.json'),
      {encoding: 'utf-8'},
    )

    const writeFile = fs.writeFile as any
    assert.calledOnceWithExactly(
      writeFile,
      path.join('test', 'package.json'),
      match.any,
      {encoding: 'utf-8'},
    )
    expect(JSON.parse(writeFile.firstCall.args[1])).to.eqls({
      scripts: {
        run: 'dummy',
        deploy:
            'PUBLIC_URL=__REACT_APP_PUBLIC_URL_PLACEHOLDER__ npm run build && gcff client push react my-function/path ./build',
      },
    })
  })
})
