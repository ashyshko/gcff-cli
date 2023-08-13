import {expect, test} from '@oclif/test'

describe.skip('client:push:static', () => {
  test
  .stdout()
  .command(['client:push:static'])
  .it('runs hello', ctx => {
    expect(ctx.stdout).to.contain('hello world')
  })

  test
  .stdout()
  .command(['client:push:static', '--name', 'jeff'])
  .it('runs hello --name jeff', ctx => {
    expect(ctx.stdout).to.contain('hello jeff')
  })
})
