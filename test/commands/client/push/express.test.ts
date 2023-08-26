import {expect, test} from '@oclif/test'
import * as pushClientModule from '../../../../src/utils/push-client'
import * as fs from 'node:fs/promises'
import {assert, match, stub} from 'sinon'

describe('client:push:express', () => {
  test
  .stdout()
  .stub(pushClientModule, 'pushClient', stub().resolves())
  .stub(
    fs,
    'readFile',
    (() => {
      const res = stub()
      res.onFirstCall().resolves('{"dependencies":{"depA":"1.0"}}')
      res.onSecondCall().resolves(Buffer.from([0x30, 0x31]))
      return res
    })(),
  )
  .command([
    'client:push:express',
    'my-function/path',
    '.gitignore',
    '--manifest=package.json',
    '--yes',
  ])
  .it('should use pushClient', ctx => {
    const pushClient = pushClientModule.pushClient as any
    assert.calledOnceWithExactly(pushClient, {
      flags: match.any,
      args: {
        functionPath: {
          functionName: 'my-function',
          destination: 'path/',
          combined: 'my-function/path',
        },
      },
      files: {
        'index.js': Buffer.from([0x30, 0x31]),
      },
      dependencies: {
        depA: '1.0',
      },
      rules: [
        {path: '.', type: 'express', src: 'index.js'},
        {path: '**', type: 'express', src: 'index.js'},
      ],
      command: match.any,
    })
  })
})
