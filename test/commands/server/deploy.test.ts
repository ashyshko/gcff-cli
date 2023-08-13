import {expect, test} from '@oclif/test'

describe.skip('server:deploy', () => {
  test
  .stdout()
  .command(['server:deploy'])
  .it('runs hello', ctx => {
    expect(ctx.stdout).to.contain('hello world')
  })

  test
  .stdout()
  .command(['server:deploy', '--name', 'jeff'])
  .it('runs hello --name jeff', ctx => {
    expect(ctx.stdout).to.contain('hello jeff')
  })
})
