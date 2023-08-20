import {ux} from '@oclif/core'
import * as chalk from 'chalk'

export function stage<T>(name: string, func: (updateStatus: (status: string) => void) => T): T;
export function stage<T>(name: string, func: (updateStatus: (status: string) => void) => Promise<T>): Promise<T>;
export function stage<T>(name: string, func: (updateStatus: (status: string) => void) => T|Promise<T>): T|Promise<T> {
  try {
    ux.action.start(name)
    const res = func(status => {
      ux.action.status = status
    })

    if (typeof res === 'object' && typeof (res as Promise<T>).then === 'function') {
      return (res as Promise<T>).then(value => {
        ux.action.stop(chalk.bold.green('Done!'))
        return Promise.resolve(value)
      }, error => {
        ux.action.stop(chalk.bold.red(errorMessage(error)))
        return Promise.reject(error)
      })
    }

    ux.action.stop(chalk.bold.green('Done!'))
    return res
  } catch (error) {
    ux.action.stop(chalk.bold.red(errorMessage(error)))
    throw error
  }
}

function errorMessage(error: unknown) {
  /* istanbul ignore next */
  return ((typeof error === 'object' && typeof (error as Error).message === 'string' ? (error as Error).message : undefined) ?? 'unknown error')
}
