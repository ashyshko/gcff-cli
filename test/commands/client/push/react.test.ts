import {expect, test} from '@oclif/test'

describe.skip('client:push:react', () => {
  test
  .stdout()
  .command(['client:push:react'])
  .it('runs hello', ctx => {
    expect(ctx.stdout).to.contain('hello world')
  })

  test
  .stdout()
  .command(['client:push:react', '--name', 'jeff'])
  .it('runs hello --name jeff', ctx => {
    expect(ctx.stdout).to.contain('hello jeff')
  })
})
