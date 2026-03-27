import { mkdir, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { BrowserOpsLaunchExecution } from '@browseros/shared/browser-ops'
import { getBrowserOpsLaunchExecutionsDir } from '../../../lib/browseros-dir'

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_')
}

async function ensureLaunchExecutionDir(): Promise<void> {
  await mkdir(getBrowserOpsLaunchExecutionsDir(), { recursive: true })
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  const file = Bun.file(filePath)
  if (!(await file.exists())) return null
  return (await file.json()) as T
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await Bun.write(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

export interface BrowserOpsRuntimeLauncherPersistence {
  listLaunchExecutions(): Promise<BrowserOpsLaunchExecution[]>
  readLaunchExecution(
    executionId: string,
  ): Promise<BrowserOpsLaunchExecution | null>
  writeLaunchExecution(execution: BrowserOpsLaunchExecution): Promise<void>
}

export class BrowserOpsRuntimeLauncherStore
  implements BrowserOpsRuntimeLauncherPersistence
{
  async listLaunchExecutions(): Promise<BrowserOpsLaunchExecution[]> {
    await ensureLaunchExecutionDir()

    let entries: string[]
    try {
      entries = await readdir(getBrowserOpsLaunchExecutionsDir())
    } catch {
      return []
    }

    const executions: BrowserOpsLaunchExecution[] = []
    for (const entry of entries) {
      if (!entry.endsWith('.json')) continue
      const filePath = join(getBrowserOpsLaunchExecutionsDir(), entry)
      const execution = await readJsonFile<BrowserOpsLaunchExecution>(filePath)
      if (execution) executions.push(execution)
    }

    return executions.sort((left, right) =>
      left.createdAt < right.createdAt ? 1 : -1,
    )
  }

  async readLaunchExecution(
    executionId: string,
  ): Promise<BrowserOpsLaunchExecution | null> {
    await ensureLaunchExecutionDir()
    const filePath = join(
      getBrowserOpsLaunchExecutionsDir(),
      `${sanitizeFileName(executionId)}.json`,
    )
    return await readJsonFile<BrowserOpsLaunchExecution>(filePath)
  }

  async writeLaunchExecution(
    execution: BrowserOpsLaunchExecution,
  ): Promise<void> {
    await ensureLaunchExecutionDir()
    const filePath = join(
      getBrowserOpsLaunchExecutionsDir(),
      `${sanitizeFileName(execution.executionId)}.json`,
    )
    await writeJsonFile(filePath, execution)
  }
}
