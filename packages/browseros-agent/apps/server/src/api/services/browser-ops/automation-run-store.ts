import { mkdir, readdir, rename } from 'node:fs/promises'
import { join } from 'node:path'
import type { BrowserOpsAutomationRun } from '@browseros/shared/browser-ops'
import { getBrowserOpsAutomationRunsDir } from '../../../lib/browseros-dir'

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_')
}

async function ensureAutomationRunsDir(): Promise<void> {
  await mkdir(getBrowserOpsAutomationRunsDir(), { recursive: true })
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  const file = Bun.file(filePath)
  if (!(await file.exists())) return null
  return (await file.json()) as T
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  const tempPath = `${filePath}.${crypto.randomUUID()}.tmp`
  await Bun.write(tempPath, `${JSON.stringify(value, null, 2)}\n`)
  await rename(tempPath, filePath)
}

export interface BrowserOpsAutomationRunStore {
  listRuns(limit?: number): Promise<BrowserOpsAutomationRun[]>
  readRun(runId: string): Promise<BrowserOpsAutomationRun | null>
  writeRun(run: BrowserOpsAutomationRun): Promise<void>
}

export class BrowserOpsAutomationRunStoreService
  implements BrowserOpsAutomationRunStore
{
  async listRuns(limit = 50): Promise<BrowserOpsAutomationRun[]> {
    await ensureAutomationRunsDir()

    let entries: string[]
    try {
      entries = await readdir(getBrowserOpsAutomationRunsDir())
    } catch {
      return []
    }

    const runs: BrowserOpsAutomationRun[] = []
    for (const entry of entries) {
      if (!entry.endsWith('.json')) continue
      const filePath = join(getBrowserOpsAutomationRunsDir(), entry)
      const run = await readJsonFile<BrowserOpsAutomationRun>(filePath)
      if (run) runs.push(run)
    }

    return runs
      .sort((left, right) => (left.updatedAt < right.updatedAt ? 1 : -1))
      .slice(0, limit)
  }

  async readRun(runId: string): Promise<BrowserOpsAutomationRun | null> {
    await ensureAutomationRunsDir()
    return await readJsonFile<BrowserOpsAutomationRun>(
      join(getBrowserOpsAutomationRunsDir(), `${sanitizeFileName(runId)}.json`),
    )
  }

  async writeRun(run: BrowserOpsAutomationRun): Promise<void> {
    await ensureAutomationRunsDir()
    await writeJsonFile(
      join(getBrowserOpsAutomationRunsDir(), `${sanitizeFileName(run.runId)}.json`),
      run,
    )
  }
}
