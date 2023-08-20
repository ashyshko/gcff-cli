import {Bucket} from '@google-cloud/storage'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

export function mergeDependencies(
  sources: Array<{
    sourceName: string;
    dependencies: Record<string, string>;
  }>,
): {
  dependencies: Record<string, string>;
  conflicts: Array<{
    dependencyName: string;
    versions: Record<string, string[]>; // key - version string, values - sources for this version
  }>;
} {
  // res.first - dependency name
  // res.second.first - dependency version
  // res.second.second - sourceNames for that dependency name @ dependency version
  const res = new Map<string, Map<string, string[]>>()

  for (const source of sources) {
    for (const [dependencyName, dependencyVersion] of Object.entries(
      source.dependencies,
    )) {
      const dependencyObj =
        res.get(dependencyName) ?? new Map<string, string[]>()
      const versionObj = dependencyObj.get(dependencyVersion) ?? []
      versionObj.push(source.sourceName)
      dependencyObj.set(dependencyVersion, versionObj)
      res.set(dependencyName, dependencyObj)
    }
  }

  const dependencies: Record<string, string> = {}
  const conflicts: ReturnType<typeof mergeDependencies>['conflicts'] = []

  for (const [dependencyName, versions] of res) {
    const versionsArr = [...versions.keys()]
    if (versionsArr.length === 1) {
      dependencies[dependencyName] = versionsArr[0]
    } else {
      conflicts.push({
        dependencyName,
        versions: Object.fromEntries(versions.entries()),
      })
    }
  }

  return {
    dependencies,
    conflicts,
  }
}

export function diffDependencies(
  from: Record<string, string>,
  to: Record<string, string>,
): {
  added: Array<[string, string]>;
  removed: Array<[string, string]>;
  changed: Array<[string, { fromVersion: string; toVersion: string }]>;
  equals: boolean;
} {
  const added: Array<[string, string]> = []
  const removed: Array<[string, string]> = []
  const changed: Array<[string, { fromVersion: string; toVersion: string }]> =
    []

  for (const [name, toVersion] of Object.entries(to)) {
    const fromVersion = from[name]
    if (fromVersion === undefined) {
      added.push([name, toVersion])
    } else if (fromVersion !== toVersion) {
      changed.push([name, {fromVersion, toVersion}])
    }
  }

  for (const [name, fromVersion] of Object.entries(from)) {
    const toVersion = to[name]
    if (toVersion === undefined) {
      removed.push([name, fromVersion])
    }
  }

  return {
    added,
    removed,
    changed,
    equals: added.length === 0 && removed.length === 0 && changed.length === 0,
  }
}

export async function getModuleDependencies({
  bucket,
  path,
}: {
  bucket: Bucket;
  path: string;
}): Promise<Record<string, string>> {
  const content = JSON.parse(
    new TextDecoder().decode(
      (await bucket.file(`${path}resolve.json`).download())[0],
    ),
  )

  if (typeof content.dependencies !== 'object') {
    return {}
  }

  return content.dependencies
}

export async function getDependenciesFromPackageJson(
  folderPath: string,
): Promise<Record<string, string>> {
  return JSON.parse(
    await fs.readFile(path.join(folderPath, 'package.json'), {
      encoding: 'utf-8',
    }),
  ).dependencies
}

export function parseMetadataDependencies(
  value: string | undefined,
): Record<string, string> {
  return value ? JSON.parse(value) : {}
}

export function stringifyMetadataDependencies(
  dependencies: Record<string, string>,
): string {
  return JSON.stringify(dependencies)
}

export function getDependenciesFromMetadata(
  metadata: Record<string, string> | undefined,
): {
  serverDependencies: Record<string, string>;
  unitedDependencies: Record<string, string>;
} {
  if (!metadata) {
    return {
      serverDependencies: {},
      unitedDependencies: {},
    }
  }

  return {
    serverDependencies: parseMetadataDependencies(metadata.SERVER_DEPENDENCIES),
    unitedDependencies: parseMetadataDependencies(metadata.DEPENDENCIES),
  }
}

export function addDependenciesToMetadata(
  metadata: Record<string, string> | undefined,
  serverDependencies: Record<string, string>,
  unitedDependencies: Record<string, string>,
): Record<string, string> {
  return {
    ...metadata,
    SERVER_DEPENDENCIES: stringifyMetadataDependencies(serverDependencies),
    DEPENDENCIES: stringifyMetadataDependencies(unitedDependencies),
  }
}

export function addUnitedDependenciesToMetadata(
  metadata: Record<string, string> | undefined,
  unitedDependencies: Record<string, string>,
): Record<string, string> {
  return {
    ...metadata,
    DEPENDENCIES: stringifyMetadataDependencies(unitedDependencies),
  }
}
