import { mkdir, readdir, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import type { BrowserOpsInstanceEvent } from '@browseros/shared/browser-ops'
import { getBrowserOpsInstanceEventsDir } from '../../../lib/browseros-dir'

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_')
}

async function ensureEventDir(): Promise<void> {
  await mkdir(getBrowserOpsInstanceEventsDir(), { recursive: true })
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  const file = Bun.file(filePath)
  if (!(await file.exists())) return null
  return (await file.json()) as T
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await Bun.write(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

export interface BrowserOpsRuntimeInstanceEventStore {
  listEvents(limit?: number): Promise<BrowserOpsInstanceEvent[]>
  appendEvent(event: BrowserOpsInstanceEvent): Promise<void>
  clearEvents(): Promise<void>
}

export class BrowserOpsRuntimeInstanceEventStoreService
  implements BrowserOpsRuntimeInstanceEventStore
{
  async listEvents(limit = 100): Promise<BrowserOpsInstanceEvent[]> {
    await ensureEventDir()

    let entries: string[]
    try {
      entries = await readdir(getBrowserOpsInstanceEventsDir())
    } catch {
      return []
    }

    const events: BrowserOpsInstanceEvent[] = []
    for (const entry of entries) {
      if (!entry.endsWith('.json')) continue
      const filePath = join(getBrowserOpsInstanceEventsDir(), entry)
      const event = await readJsonFile<BrowserOpsInstanceEvent>(filePath)
      if (event) events.push(event)
    }

    return events
      .sort((left, right) => (left.createdAt < right.createdAt ? 1 : -1))
      .slice(0, limit)
  }

  async appendEvent(event: BrowserOpsInstanceEvent): Promise<void> {
    await ensureEventDir()
    const filePath = join(
      getBrowserOpsInstanceEventsDir(),
      `${sanitizeFileName(event.createdAt)}-${sanitizeFileName(event.eventId)}.json`,
    )
    await writeJsonFile(filePath, event)
  }

  async clearEvents(): Promise<void> {
    await ensureEventDir()
    const entries = await readdir(getBrowserOpsInstanceEventsDir())
    await Promise.all(
      entries
        .filter((entry) => entry.endsWith('.json'))
        .map(async (entry) => {
          try {
            await unlink(join(getBrowserOpsInstanceEventsDir(), entry))
          } catch {
            // ignore
          }
        }),
    )
  }
}
