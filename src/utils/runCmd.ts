import {spawn} from 'node:child_process'
import * as chalk from 'chalk'

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
    return e instanceof RunCmdError && e.isENOENT()
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
      if (code !== 0) {
        reject(new RunCmdError(error, code, signal))
        return
      }

      resolve()
    })
  })
}

export class GcloudError extends Error {
  public constructor(
    public readonly endpoint: string,
    public readonly statusCode: number,
    public readonly statusText: string,
    public readonly response: string,
  ) {
    super(
      `gcloud error: endpoint ${endpoint} returned error '${response}' (HTTP code ${statusCode})`,
    )
    this.name = 'GcloudError'
  }
}

export async function gcloudBinaryOutput(
  args: string[],
  {
    project,
    extFlags,
    onStderr,
  }: {
    project?: string;
    extFlags?: Record<string, string | true>;
    onStderr?: (message: string) => void;
  },
): Promise<Buffer> {
  args = [...args]
  const addArg = (name: string, value: string | true | undefined) => {
    if (value !== undefined) {
      if (value === true) {
        args.push(`--${name}`)
      } else {
        args.push(`--${name}=${value}`)
      }
    }
  }

  addArg('project', project)
  addArg('quiet', true)

  if (extFlags !== undefined) {
    for (const [name, value] of Object.entries(extFlags)) {
      addArg(name, value)
    }
  }

  const stdoutBuffers: Buffer[] = []
  let stderr = ''
  const stderrDecoder = new TextDecoder()

  try {
    onStderr?.(chalk.gray(['gcloud', ...args].join(' ')))

    await runCmd('gcloud', args, {
      onStdout: buf => {
        stdoutBuffers.push(buf)
      },
      onStderr: buf => {
        const msg = stderrDecoder.decode(buf, {stream: true})
        stderr += msg
        onStderr?.(chalk.gray(msg))
      },
    })

    return Buffer.concat(stdoutBuffers)
  } catch (error) {
    if (RunCmdError.isENOENT(error)) {
      throw new Error(
        "'gcloud' command is not found. Ensure that Google Cloud SDK is installed",
      )
    }

    const exitCode = RunCmdError.processExitCode(error)
    if (exitCode === null) {
      throw error
    }

    if (exitCode !== 1) {
      throw new Error(`'gcloud' command exited with code ${exitCode}`)
    }

    const httpError = stderr.match(
      /^ERROR: \((.*)\) ResponseError: status=\[(\d+)], code=\[(.*)], message=\[(.*)]$/m,
    )
    if (!httpError) {
      throw error
    }

    const [_, endpoint, statusCode, statusText, message] = httpError

    throw new GcloudError(
      endpoint,
      Number.parseInt(statusCode, 10),
      statusText,
      message,
    )
  }
}

export async function gcloud(
  args: string[],
  {
    project,
    extFlags,
    onStderr,
  }: {
    project?: string;
    extFlags?: Record<string, string | true>;
    onStderr?: (message: string) => void;
  },
): Promise<Record<string, unknown>> {
  const output = await gcloudBinaryOutput(args, {
    project,
    extFlags: {format: 'json', ...extFlags},
    onStderr,
  })
  return JSON.parse(new TextDecoder().decode(output))
}
