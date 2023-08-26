import {expect, test} from '@oclif/test'
import * as pushClientModule from '../../../../src/utils/push-client'
import {assert, match, stub} from 'sinon'
import * as path from 'node:path'

describe('client:push:react', () => {
  test
  .stdout()
  .stub(pushClientModule, 'pushClient', stub().resolves())
  .stub(
    pushClientModule,
    'getFiles',
    stub().callsFake(async function * () {
      yield 'file.js'
      yield 'index.html'
    }),
  )
  .stub(
    pushClientModule,
    'readFiles',
    stub().resolves({
      'file.js': Buffer.from([0x30, 0x31]),
      'index.html': Buffer.from([0x30, 0x31, 0x32]),
    }),
  )
  .command([
    'client:push:react',
    'my-function/path',
    './test',
    '--publicUrlPlaceholder=0',
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
        'file.js': Buffer.from([0x30, 0x31]),
        'index.html': Buffer.from([0x30, 0x31, 0x32]),
      },
      dependencies: {},
      rules: [
        {
          path: 'file.js',
          type: 'react',
          publicUrlPlaceholder: '0',
          name: 'file.js',
        },
        {
          path: 'index.html',
          type: 'react',
          publicUrlPlaceholder: '0',
          name: 'index.html',
        },
        {
          path: '.',
          type: 'react',
          publicUrlPlaceholder: '0',
          name: 'index.html',
        },
        {
          path: '**',
          type: 'react',
          publicUrlPlaceholder: '0',
          name: 'index.html',
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
      yield 'file.js'
    }),
  )
  .stub(
    pushClientModule,
    'readFiles',
    stub().resolves({
      'file.js': Buffer.from([0x30, 0x31]),
    }),
  )
  .command([
    'client:push:react',
    'my-function/path',
    './test',
    '--publicUrlPlaceholder=0',
    '--yes',
  ])
  .catch('no index.html provided in folder', {raiseIfNotThrown: true})
  .it('should return error if no index.html provided', () => {
    /* noop */
  })

  test
  .stdout()
  .stub(pushClientModule, 'pushClient', stub().resolves())
  .stub(
    pushClientModule,
    'getFiles',
    stub().callsFake(async function * () {
      yield 'file.js'
      yield 'index.html'
      yield 'resolve.json'
      yield 'robots.txt'
    }),
  )
  .stub(
    pushClientModule,
    'readFiles',
    stub().resolves({
      'file.js': Buffer.from([0x30, 0x31]),
      'index.html': Buffer.from([0x30, 0x31, 0x32]),
      'robots.txt': Buffer.from([0x32]),
    }),
  )
  .command([
    'client:push:react',
    'my-function/path',
    './test',
    '--publicUrlPlaceholder=0',
    '--yes',
  ])
  .it('should serve unknown files as static', ctx => {
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
        'file.js': Buffer.from([0x30, 0x31]),
        'index.html': Buffer.from([0x30, 0x31, 0x32]),
        'robots.txt': Buffer.from([0x32]),
      },
      dependencies: {},
      rules: [
        {
          path: 'file.js',
          type: 'react',
          publicUrlPlaceholder: '0',
          name: 'file.js',
        },
        {
          path: 'index.html',
          type: 'react',
          publicUrlPlaceholder: '0',
          name: 'index.html',
        },
        {
          path: 'robots.txt',
          type: 'static',
          name: 'robots.txt',
        },
        {
          path: '.',
          type: 'react',
          publicUrlPlaceholder: '0',
          name: 'index.html',
        },
        {
          path: '**',
          type: 'react',
          publicUrlPlaceholder: '0',
          name: 'index.html',
        },
      ],
      command: match.any,
    })
    const readFiles = pushClientModule.readFiles as any
    assert.calledOnceWithExactly(
      readFiles,
      ['file.js', 'index.html', 'robots.txt'],
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
      yield 'file.js'
      yield 'index.html'
    }),
  )
  .stub(
    pushClientModule,
    'readFiles',
    stub().resolves({
      'file.js': Buffer.from([0x30, 0x31]),
      'index.html': Buffer.from([0x30, 0x31, 0x32]),
    }),
  )
  .command([
    'client:push:react',
    'my-function/path',
    './test',
    '--yes',
  ])
  .catch('publicUrlPlaceholder(__REACT_APP_PUBLIC_URL_PLACEHOLDER__) is not found in provided sources. ensure that environment variable PUBLIC_URL=__REACT_APP_PUBLIC_URL_PLACEHOLDER__ was set during npm run build', {raiseIfNotThrown: true})
  .it('should use pushClient', () => {/* noop */})
})
