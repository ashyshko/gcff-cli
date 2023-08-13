import {expect, test} from '@oclif/test'

describe.skip('client:push:express', () => {
  test
  .stdout()
  .command(['client:push:express'])
  .it('runs hello', ctx => {
    expect(ctx.stdout).to.contain('hello world')
  })

  test
  .stdout()
  .command(['client:push:express', '--name', 'jeff'])
  .it('runs hello --name jeff', ctx => {
    expect(ctx.stdout).to.contain('hello jeff')
  })
})
