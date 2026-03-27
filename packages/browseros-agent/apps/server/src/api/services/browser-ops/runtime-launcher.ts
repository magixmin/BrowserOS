import { type ChildProcess, spawn } from 'node:child_process'
import type {
  BrowserOpsLaunchBundle,
  BrowserOpsLaunchExecution,
} from '@browseros/shared/browser-ops'
import {
  type BrowserOpsRuntimeLauncherPersistence,
  BrowserOpsRuntimeLauncherStore,
} from './runtime-launcher-store'

export interface BrowserOpsRuntimeLauncher {
  listExecutions(): Promise<BrowserOpsLaunchExecution[]>
  launchBundle(
    bundle: BrowserOpsLaunchBundle,
    options?: { execute?: boolean },
  ): Promise<BrowserOpsLaunchExecution>
  stopExecution(executionId: string): Promise<BrowserOpsLaunchExecution | null>
}

export class BrowserOpsRuntimeLauncherService
  implements BrowserOpsRuntimeLauncher
{
  private executions = new Map<string, BrowserOpsLaunchExecution>()
  private processes = new Map<string, ChildProcess>()
  private persistence: BrowserOpsRuntimeLauncherPersistence

  constructor(persistence?: BrowserOpsRuntimeLauncherPersistence) {
    this.persistence = persistence ?? new BrowserOpsRuntimeLauncherStore()
  }

  async listExecutions(): Promise<BrowserOpsLaunchExecution[]> {
    const persisted = await this.persistence.listLaunchExecutions()
    const merged = new Map<string, BrowserOpsLaunchExecution>()

    for (const execution of persisted) {
      merged.set(execution.executionId, execution)
    }

    for (const execution of this.executions.values()) {
      merged.set(execution.executionId, execution)
    }

    return [...merged.values()].sort((left, right) =>
      left.createdAt < right.createdAt ? 1 : -1,
    )
  }

  async launchBundle(
    bundle: BrowserOpsLaunchBundle,
    options?: { execute?: boolean },
  ): Promise<BrowserOpsLaunchExecution> {
    const execute = options?.execute === true
    const binaryPath = process.env.BROWSEROS_BINARY ?? null
    const executionId = crypto.randomUUID()

    if (!execute) {
      const prepared: BrowserOpsLaunchExecution = {
        executionId,
        bundleId: bundle.bundleId,
        specId: bundle.specId,
        profileId: bundle.profileId,
        createdAt: new Date().toISOString(),
        state: 'prepared',
        binaryPath,
        commandPreview: bundle.launcherCommandPreview,
        dryRun: true,
        pid: null,
        notes: ['Prepared launch bundle without starting a browser process.'],
      }
      this.executions.set(executionId, prepared)
      await this.persistence.writeLaunchExecution(prepared)
      return prepared
    }

    if (!binaryPath) {
      const failed: BrowserOpsLaunchExecution = {
        executionId,
        bundleId: bundle.bundleId,
        specId: bundle.specId,
        profileId: bundle.profileId,
        createdAt: new Date().toISOString(),
        state: 'failed',
        binaryPath: null,
        commandPreview: bundle.launcherCommandPreview,
        dryRun: false,
        pid: null,
        notes: ['BROWSEROS_BINARY is not configured.'],
      }
      this.executions.set(executionId, failed)
      await this.persistence.writeLaunchExecution(failed)
      return failed
    }

    try {
      const child = spawn(binaryPath, bundle.chromiumArgs, {
        env: {
          ...process.env,
          ...bundle.env,
        },
        detached: true,
        stdio: 'ignore',
      })
      child.unref()

      const launched: BrowserOpsLaunchExecution = {
        executionId,
        bundleId: bundle.bundleId,
        specId: bundle.specId,
        profileId: bundle.profileId,
        createdAt: new Date().toISOString(),
        state: 'launched',
        binaryPath,
        commandPreview: bundle.launcherCommandPreview,
        dryRun: false,
        pid: child.pid ?? null,
        notes: ['Spawned BrowserOS process from launch bundle.'],
      }

      this.executions.set(executionId, launched)
      this.processes.set(executionId, child)
      await this.persistence.writeLaunchExecution(launched)

      child.once('exit', async () => {
        const current = this.executions.get(executionId)
        if (!current || current.state !== 'launched') return

        const updated: BrowserOpsLaunchExecution = {
          ...current,
          state: 'stopped',
          notes: [...current.notes, 'Browser process exited.'],
        }
        this.executions.set(executionId, updated)
        this.processes.delete(executionId)
        await this.persistence.writeLaunchExecution(updated)
      })
      return launched
    } catch (error) {
      const failed: BrowserOpsLaunchExecution = {
        executionId,
        bundleId: bundle.bundleId,
        specId: bundle.specId,
        profileId: bundle.profileId,
        createdAt: new Date().toISOString(),
        state: 'failed',
        binaryPath,
        commandPreview: bundle.launcherCommandPreview,
        dryRun: false,
        pid: null,
        notes: [
          error instanceof Error ? error.message : 'Failed to spawn browser',
        ],
      }
      this.executions.set(executionId, failed)
      await this.persistence.writeLaunchExecution(failed)
      return failed
    }
  }

  async stopExecution(
    executionId: string,
  ): Promise<BrowserOpsLaunchExecution | null> {
    const existing = this.executions.get(executionId)
    if (!existing) return null

    const child = this.processes.get(executionId)
    if (child?.pid) {
      try {
        process.kill(child.pid)
      } catch {
        // ignore missing process
      }
    }
    this.processes.delete(executionId)

    const stopped: BrowserOpsLaunchExecution = {
      ...existing,
      state:
        existing.state === 'failed' || existing.state === 'prepared'
          ? existing.state
          : 'stopped',
      notes: [...existing.notes, 'Execution stop requested.'],
    }
    this.executions.set(executionId, stopped)
    await this.persistence.writeLaunchExecution(stopped)
    return stopped
  }
}
