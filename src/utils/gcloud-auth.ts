import {Command, Flags} from '@oclif/core'
import {stage} from './stage'
import {runCmd} from './run-cmd'

export const gcloudFlags = {
  accessToken: Flags.string({
    description:
        'Specifies the access token used to authenticate and authorize access to Google Cloud services.',
    dependsOn: ['project'],
  }),
  project: Flags.string({
    description:
        'Specifies the ID of the Google Cloud project to associate with provided gcsUrl.',
  }),
}

export type GcloudAuth = {
    accessToken: string;
    project: string;
  };

export async function gcloudAuth(
  flags: { accessToken?: string; project?: string },
  cmd: Command,
): Promise<GcloudAuth> {
  if (flags.accessToken !== undefined && flags.project !== undefined) {
    return {
      accessToken: flags.accessToken,
      project: flags.project,
    }
  }

  return stage('Authorizing', async () => {
    const accessToken =
    flags.accessToken ?? (await gcloudAccessToken(msg => cmd.log(msg)))
    const project = flags.project ?? (await gcloudProject(msg => cmd.log(msg)))

    return {
      accessToken,
      project,
    }
  })
}

async function gcloudAccessToken(onStderr: (message: string) => void): Promise<string> {
  const stdoutTextDecoder = new TextDecoder()
  let stdoutText = ''
  const onStdout = (buf: Buffer) => {
    stdoutText += stdoutTextDecoder.decode(buf, {stream: true})
  }

  const stderrTextDecoder = new TextDecoder()
  const onStderrImpl = (buf: Buffer) => {
    onStderr(stderrTextDecoder.decode(buf, {stream: true}))
  }

  await runCmd('gcloud', ['auth', 'print-access-token', '--quiet', '--format=json'], {
    onStderr: onStderrImpl,
    onStdout,
  })

  stdoutText += stdoutTextDecoder.decode(undefined, {stream: false})

  const resp = JSON.parse(stdoutText)
  if (typeof resp !== 'object' || typeof resp.token !== 'string') {
    throw new TypeError('incorrect response, no token received from gcloud auth print-access-token')
  }

  return resp.token
}

async function gcloudProject(onStderr: (message: string) => void): Promise<string> {
  const stdoutTextDecoder = new TextDecoder()
  let stdoutText = ''
  const onStdout = (buf: Buffer) => {
    stdoutText += stdoutTextDecoder.decode(buf, {stream: true})
  }

  const stderrTextDecoder = new TextDecoder()
  const onStderrImpl = (buf: Buffer) => {
    onStderr(stderrTextDecoder.decode(buf, {stream: true}))
  }

  await runCmd('gcloud', ['config', 'get-value', 'project', '--quiet', '--format=json'], {
    onStderr: onStderrImpl,
    onStdout,
  })

  stdoutText += stdoutTextDecoder.decode(undefined, {stream: false})

  const resp = JSON.parse(stdoutText)
  if (typeof resp !== 'string') {
    throw new TypeError('incorrect response, no project received from gcloud config get-value project')
  }

  return resp
}

