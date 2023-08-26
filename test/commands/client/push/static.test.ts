import {expect, test} from '@oclif/test'
import * as pushClientModule from '../../../../src/utils/push-client'
import {assert, match, stub} from 'sinon'
import * as path from 'node:path'

describe('client:push:static', () => {
  test
  .stdout()
  .stub(pushClientModule, 'pushClient', stub().resolves())
  .stub(
    pushClientModule,
    'getFiles',
    stub().callsFake(async function * () {
      yield 'file.txt'
    }),
  )
  .stub(
    pushClientModule,
    'readFiles',
    stub().resolves({'file.txt': Buffer.from([0x30])}),
  )
  .command(['client:push:static', 'my-function/path', './test', '--yes'])
  .it('should use pushClient', ctx => {
    const pushClient = pushClientModule.pushClient as any
    assert.calledOnceWithExactly(pushClient, {
      flags: {
        region: 'us-central1',
        force: false,
        yes: true,
      },
      args: {
        functionPath: {
          functionName: 'my-function',
          destination: 'path/',
          combined: 'my-function/path',
        },
      },
      files: {
        'file.txt': Buffer.from([0x30]),
      },
      dependencies: {},
      rules: [
        {
          path: 'file.txt',
          type: 'static',
          name: 'file.txt',
        },
      ],
      command: match.any,
    })
  })

  test
  .stdout()
  .stub(pushClientModule, 'pushClient', stub().resolves())
  .stub(
    pushClientModule,
    'getFiles',
    stub().callsFake(async function * () {
      yield 'resolve.json'
      yield 'file.txt'
    }),
  )
  .stub(
    pushClientModule,
    'readFiles',
    stub().resolves({'file.txt': Buffer.from([0x30])}),
  )
  .command(['client:push:static', 'my-function/path', './test', '--yes'])
  .it('should ignore resolve.json', ctx => {
    const pushClient = pushClientModule.pushClient as any
    assert.calledOnceWithExactly(pushClient, {
      flags: {
        region: 'us-central1',
        force: false,
        yes: true,
      },
      args: {
        functionPath: {
          functionName: 'my-function',
          destination: 'path/',
          combined: 'my-function/path',
        },
      },
      files: {
        'file.txt': Buffer.from([0x30]),
      },
      dependencies: {},
      rules: [
        {
          path: 'file.txt',
          type: 'static',
          name: 'file.txt',
        },
      ],
      command: match.any,
    })
    const readFiles = pushClientModule.readFiles as any
    assert.calledOnceWithExactly(
      readFiles,
      ['file.txt'],
      path.resolve('./test'),
    )
  })

  test
  .stdout()
  .stub(pushClientModule, 'pushClient', stub().resolves())
  .stub(
    pushClientModule,
    'getFiles',
    stub().callsFake(async function * () {
      yield 'file1.txt'
      yield 'file2.txt'
    }),
  )
  .stub(
    pushClientModule,
    'readFiles',
    stub().resolves({
      'file1.txt': Buffer.from([0x30]),
      'file2.txt': Buffer.from([0x31]),
    }),
  )
  .command([
    'client:push:static',
    'my-function/path',
    './test',
    '--index=file1.txt',
    '--default=file2.txt',
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
        'file1.txt': Buffer.from([0x30]),
        'file2.txt': Buffer.from([0x31]),
      },
      dependencies: {},
      rules: [
        {
          path: 'file1.txt',
          type: 'static',
          name: 'file1.txt',
        },
        {
          path: 'file2.txt',
          type: 'static',
          name: 'file2.txt',
        },
        {
          path: '.',
          type: 'static',
          name: 'file1.txt',
        },
        {
          path: '**',
          type: 'static',
          name: 'file2.txt',
        },
      ],
      command: match.any,
    })
  })
})
