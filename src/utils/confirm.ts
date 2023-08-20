import {ux} from '@oclif/core'
import chalk = require('chalk');

export async function confirm(
  prompt: string,
  autoConfirm = false,
): Promise<void> {
  if (autoConfirm) {
    return
  }

  if (
    !(await ux.confirm(
      `${prompt.endsWith('.') ? prompt : prompt + '.'} Confirm? ${chalk.gray(
        '(yes/no)',
      )}`,
    ))
  ) {
    throw new Error('Canceled')
  }
}
