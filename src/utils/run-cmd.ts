import {spawn} from 'node:child_process'

export class RunCmdError extends Error {
  public constructor(
    public readonly error: Error | null,
    public readonly exitCode: number | null,
    public readonly signal: string | null,
  ) {
    const messages = []
    if (error === null) {
      if (exitCode !== null) {
        messages.push(`Process exited with code ${exitCode}`)
      }

      if (signal !== null) {
        messages.push(`Process killed by signal ${signal}`)
      }
    } else {
      messages.push(`Process error: ${error.message}`)
    }

    if (messages.length === 0) {
      messages.push('Unknown error')
    }

    super(messages.join('. '))
    this.name = 'RunCmdError'
  }

  protected errorCode(): string | null {
    if (this.error === null) {
      return null
    }

    const code = (this.error as Error & { code: unknown }).code
    if (typeof code !== 'string') {
      return null
    }

    return code
  }

  public isENOENT(): boolean {
    return this.errorCode() === 'ENOENT'
  }

  public static isENOENT(e: unknown): boolean {
    return (e instanceof RunCmdError) && e.isENOENT()
  }

  public static processExitCode(e: unknown): number | null {
    return e instanceof RunCmdError && e.error === null && e.signal === null ?
      e.exitCode :
      null
  }
}

export async function runCmd(
  command: string,
  args: string[],
  options: {
    onStdout?: (buf: Buffer) => void;
    onStderr?: (buf: Buffer) => void;
  } = {},
): Promise<void> {
  return new Promise((resolve: () => void, reject: (e: Error) => void) => {
    const cmd = spawn(command, args)

    cmd.stdout.on('data', (chunk: Buffer) => {
      options.onStdout?.(chunk)
    })

    cmd.stderr.on('data', (chunk: Buffer) => {
      options.onStderr?.(chunk)
    })

    let error: Error | null = null
    cmd.on('error', (e: Error) => {
      error = e
    })

    cmd.on('close', (code, signal) => {
      if (code !== 0 || error !== null) {
        reject(new RunCmdError(error, code, signal))
        return
      }

      resolve()
    })
  })
}
