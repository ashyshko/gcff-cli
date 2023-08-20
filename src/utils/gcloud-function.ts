import chalk = require('chalk');
import {GcloudAuth} from './gcloud-auth'
import {stage} from './stage'
import {sleep} from './sleep'

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
    environmentVariables?: {
      [key: string]: string;
    };
  };
  serviceConfig: {
    service: string;
    timeoutSeconds: number;
    environmentVariables?: {
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

type DeepPartial<T> = T extends Record<string, unknown>
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

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
  name: string;
  metadata: {
    '@type': 'type.googleapis.com/google.cloud.functions.v2.OperationMetadata';
    stages?: Array<{
      name: string;
      message: string;
      state: 'STATE_UNSPECIFIED' | 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE';
    }>;
  };
  done: boolean;

  response?: unknown;
  error?: {
    code: number;
    message: string;
    details: unknown;
  };
};

export async function gcloudFunctionPatch({
  functionName,
  region,
  auth,
  updateFields,
  payload,
}: {
  functionName: string;
  region: string;
  auth: GcloudAuth;
  updateFields: string[];
  payload: DeepPartial<GcloudFunction>;
}): Promise<GcloudFunctionOperation> {
  const res = await fetch(
    `https://cloudfunctions.googleapis.com/v2/projects/${
      auth.project
    }/locations/${region}/functions/${functionName}?updateMask=${updateFields.join(
      ',',
    )}&access_token=${auth.accessToken}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  )

  if (!res.ok) {
    throw new Error(
      `can't patch google cloud function: ${res.status} ${res.statusText}`,
    )
  }

  return res.json()
}

export async function gcloudFunctionWaitOperationCompletion({
  name,
  currentState,
  accessToken,
}: {
  name: string;
  accessToken: string;
  currentState: GcloudFunctionOperation;
}): Promise<unknown> {
  let operationState = currentState

  return stage(name, async updateStatus => {
    updateStatus(chalk.gray('Initializing...'))

    while (!operationState.done) {
      if (
        operationState.metadata['@type'] ===
          'type.googleapis.com/google.cloud.functions.v2.OperationMetadata' &&
        Array.isArray(operationState.metadata.stages)
      ) {
        const current = operationState.metadata.stages.find(
          v => v.state === 'IN_PROGRESS',
        )
        if (current !== undefined) {
          updateStatus(chalk.gray(`[${current.name}] ${current.message}...`))
        }
      }

      // eslint-disable-next-line no-await-in-loop
      await sleep(1000)

      // eslint-disable-next-line no-await-in-loop
      const res = await fetch(
        `https://cloudfunctions.googleapis.com/v2/${operationState.name}?access_token=${accessToken}`,
      )

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status} ${res.statusText}`)
      }

      // eslint-disable-next-line no-await-in-loop
      operationState = await res.json()
    }

    if (operationState.error !== undefined) {
      throw new Error(
        `Error ${operationState.error.code} ${operationState.error.message}`,
      )
    }

    return operationState.response
  })
}

export async function gcloudFunctionDownloadSources({
  functionName,
  region,
  auth,
}: {
  functionName: string;
  region: string;
  auth: GcloudAuth;
}): Promise<Buffer> {
  const res = await fetch(
    `https://cloudfunctions.googleapis.com/v2/projects/${auth.project}/locations/${region}/functions/${functionName}:generateDownloadUrl?access_token=${auth.accessToken}`,
    {
      method: 'POST',
    },
  )

  if (!res.ok) {
    throw new Error(
      `can't get function download url: ${res.status} ${res.statusText}`,
    )
  }

  const url = (await res.json()).downloadUrl
  const body = await fetch(url)
  if (!body.ok) {
    throw new Error(
      `can't download function source: ${body.status} ${body.statusText}`,
    )
  }

  return Buffer.from(await body.arrayBuffer())
}

export async function gcloudFunctionUploadSources({
  region,
  auth,
  body,
}: {
  region: string;
  auth: GcloudAuth;
  body: Buffer;
}): Promise<GcloudFunction['buildConfig']['source']['storageSource']> {
  const res = await fetch(
    `https://cloudfunctions.googleapis.com/v2/projects/${auth.project}/locations/${region}/functions:generateUploadUrl?access_token=${auth.accessToken}`,
    {
      method: 'POST',
    },
  )

  if (!res.ok) {
    throw new Error(
      `can't get function upload url: ${res.status} ${res.statusText}`,
    )
  }

  const payload = (await res.json()) as {
    uploadUrl: string;
    storageSource: GcloudFunction['buildConfig']['source']['storageSource'];
  }

  const uploadRes = await fetch(payload.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/zip',
    },
    body,
  })

  if (!uploadRes.ok) {
    throw new Error(
      `can't upload function source: ${uploadRes.status} ${uploadRes.statusText}`,
    )
  }

  return payload.storageSource
}
