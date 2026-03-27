import { mkdir, readdir, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import type { BrowserOpsManagedInstance } from '@browseros/shared/browser-ops'
import { getBrowserOpsInstancesDir } from '../../../lib/browseros-dir'

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_')
}

async function ensureInstancesDir(): Promise<void> {
  await mkdir(getBrowserOpsInstancesDir(), { recursive: true })
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  const file = Bun.file(filePath)
  if (!(await file.exists())) return null
  return (await file.json()) as T
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await Bun.write(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

export interface BrowserOpsRuntimeInstancePersistence {
  listInstances(): Promise<BrowserOpsManagedInstance[]>
  readInstance(instanceId: string): Promise<BrowserOpsManagedInstance | null>
  writeInstance(instance: BrowserOpsManagedInstance): Promise<void>
  deleteInstance(instanceId: string): Promise<void>
}

export class BrowserOpsRuntimeInstanceStore
  implements BrowserOpsRuntimeInstancePersistence
{
  async listInstances(): Promise<BrowserOpsManagedInstance[]> {
    await ensureInstancesDir()

    let entries: string[]
    try {
      entries = await readdir(getBrowserOpsInstancesDir())
    } catch {
      return []
    }

    const instances: BrowserOpsManagedInstance[] = []
    for (const entry of entries) {
      if (!entry.endsWith('.json')) continue
      const filePath = join(getBrowserOpsInstancesDir(), entry)
      const instance = await readJsonFile<BrowserOpsManagedInstance>(filePath)
      if (instance) instances.push(instance)
    }

    return instances.sort((left, right) =>
      left.createdAt < right.createdAt ? 1 : -1,
    )
  }

  async readInstance(
    instanceId: string,
  ): Promise<BrowserOpsManagedInstance | null> {
    await ensureInstancesDir()
    const filePath = join(
      getBrowserOpsInstancesDir(),
      `${sanitizeFileName(instanceId)}.json`,
    )
    return await readJsonFile<BrowserOpsManagedInstance>(filePath)
  }

  async writeInstance(instance: BrowserOpsManagedInstance): Promise<void> {
    await ensureInstancesDir()
    const filePath = join(
      getBrowserOpsInstancesDir(),
      `${sanitizeFileName(instance.instanceId)}.json`,
    )
    await writeJsonFile(filePath, instance)
  }

  async deleteInstance(instanceId: string): Promise<void> {
    await ensureInstancesDir()
    const filePath = join(
      getBrowserOpsInstancesDir(),
      `${sanitizeFileName(instanceId)}.json`,
    )
    try {
      await unlink(filePath)
    } catch {
      // ignore missing files
    }
  }
}
