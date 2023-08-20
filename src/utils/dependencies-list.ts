import {Bucket} from '@google-cloud/storage'
import {GcloudFunction} from './gcloud-function'
import {
  getDependenciesFromMetadata,
  getModuleDependencies,
  mergeDependencies,
} from './dependencies'
import {findModules} from './find-modules'

export async function getAllDependencies({
  bucket,
  moduleNamePrefix,
  modules,
  buildConfig,
  knownDependencies,
}: {
  bucket: Bucket;
  moduleNamePrefix: string;
  modules?: string[];
  buildConfig: GcloudFunction['buildConfig'];
  knownDependencies?: {
    server?: Record<string, string>;
    modules?: Record<string, Record<string, string>>;
    united?: Record<string, string>;
  };
}): Promise<{
  server: Record<string, string>;
  modules: Record<string, Record<string, string>>;
  united: Record<string, string>;
}> {
  modules = modules ?? await findModules({bucket, namePrefix: moduleNamePrefix})

  let metadataCached: ReturnType<typeof getDependenciesFromMetadata>
  const fromMetadata = () => {
    if (metadataCached !== undefined) {
      return metadataCached
    }

    metadataCached = getDependenciesFromMetadata(
      buildConfig.environmentVariables,
    )
    return metadataCached
  }

  const res = {
    server: knownDependencies?.server ?? fromMetadata().serverDependencies,
    united: knownDependencies?.united ?? fromMetadata().unitedDependencies,
  }

  const moduleDependencies = await Promise.all(
    modules.map(
      async v =>
        [
          v,
          knownDependencies?.modules?.[v] ??
            (await getModuleDependencies({
              bucket,
              path: moduleNamePrefix + v,
            })),
        ] as const,
    ),
  )

  return {
    ...res,
    modules: {
      ...knownDependencies?.modules,
      ...Object.fromEntries(moduleDependencies),
    },
  }
}

export function unitedDependencies({
  server,
  modules,
  serverName,
}: {
  server: Record<string, string>;
  modules: Record<string, Record<string, string>>;
  serverName?: string;
}): ReturnType<typeof mergeDependencies> {
  const sources: Array<{
    sourceName: string;
    dependencies: Record<string, string>;
  }> = [
    {sourceName: serverName ?? '<SERVER>', dependencies: server},
    ...[...Object.entries(modules)].map(v => ({
      sourceName: v[0],
      dependencies: v[1],
    })),
  ]
  return mergeDependencies(sources)
}
