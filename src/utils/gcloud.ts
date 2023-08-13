import {Command, Flags, ux} from '@oclif/core'
import chalk = require('chalk');
import {gcloudAccessToken, gcloudProject} from './run-cmd'
import {sleep} from './sleep'

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

  ux.action.start('Authorizing...')

  const accessToken =
    flags.accessToken ?? (await gcloudAccessToken(msg => cmd.log(msg)))
  const project = flags.project ?? (await gcloudProject(msg => cmd.log(msg)))

  ux.action.stop(chalk.green('Successful'))
  return {
    accessToken,
    project,
  }
}

export type GcloudFunction = {
  name: string;
  buildConfig: {
    build: string;
    runtime: string;
    entryPoint: string;
    source: {
      storageSource: {
        bucket: string;
        object: string;
      };
    };
    sourceProvenance: {
      resolvedStorageSource: {
        bucket: string;
        object: string;
        generation: string;
      };
    };
  };
  serviceConfig: {
    service: string;
    timeoutSeconds: number;
    environmentVariables: {
      [key: string]: string;
    };
    maxInstanceCount: number;
    ingressSettings: string;
    uri: string;
    serviceAccountEmail: string;
    availableMemory: string;
    allTrafficOnLatestRevision: boolean;
    revision: string;
    maxInstanceRequestConcurrency: number;
    availableCpu: string;
  };
  state: string;
  updateTime: string;
  labels: {
    [key: string]: string;
  };
  environment: string;
  url: string;
};

export async function gcloudFunctionDescribe({
  functionName,
  region,
  auth,
}: {
  functionName: string;
  region: string;
  auth: GcloudAuth;
}): Promise<GcloudFunction | undefined> {
  const res = await fetch(
    `https://cloudfunctions.googleapis.com/v2/projects/${auth.project}/locations/${region}/functions/${functionName}?access_token=${auth.accessToken}`,
  )
  if (!res.ok) {
    if (res.status === 404) {
      return undefined
    }

    throw new Error(`HTTP error ${res.status} ${res.statusText}`)
  }

  return (await res.json()) as GcloudFunction
}

type GcloudFunctionOperation = {
    name: string
    metadata: {
        '@type': 'type.googleapis.com/google.cloud.functions.v2.OperationMetadata',
        stages?: Array<{
            name: string,
            message: string,
            state: 'STATE_UNSPECIFIED'|'NOT_STARTED'|'IN_PROGRESS'|'COMPLETE'
        }>
    },
    done: boolean,

    response?: unknown
    error?: {
        code: number,
        message: string,
        details: unknown
    }
}

export async function gcloudFunctionWaitOperationCompletion({name, currentState, accessToken}: {
  name: string
  accessToken: string;
  currentState: GcloudFunctionOperation,
}): Promise<unknown> {
  let operationState = currentState

  ux.action.start(name, chalk.gray('Initializing...'))

  try {
    for (;;) {
      if (operationState.metadata['@type'] === 'type.googleapis.com/google.cloud.functions.v2.OperationMetadata' && Array.isArray(operationState.metadata.stages)) {
        const current = operationState.metadata.stages.find(v => v.state === 'IN_PROGRESS')
        if (current !== undefined) {
          ux.action.status = chalk.gray(`[${current.name}] ${current.message}...`)
        }
      }

      if (operationState.done) {
        break
      }

      // eslint-disable-next-line no-await-in-loop
      await sleep(1000)

      // eslint-disable-next-line no-await-in-loop
      const res = await fetch(
        `https://cloudfunctions.googleapis.com/v2/${operationState.name}?access_token=${accessToken}`,
      )

      if (!res.ok) {
        throw new Error(
          `can't get patch google cloud function status: ${res.status} ${res.statusText}`,
        )
      }

      // eslint-disable-next-line no-await-in-loop
      operationState = await res.json()
    }

    if (operationState.error !== undefined) {
      throw new Error(`operation failed with error ${operationState.error.code} ${operationState.error.message}`)
    }

    ux.action.stop(chalk.green('Successful'))
    return operationState.response
  } catch (error) {
    ux.action.stop(chalk.red('Failed'))
    throw error
  }
}
