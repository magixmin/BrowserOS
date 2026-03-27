import { type ChildProcess, spawn } from 'node:child_process'
import { createServer } from 'node:net'
import type {
  BrowserOpsLaunchBundle,
  BrowserOpsLaunchDiagnostics,
  BrowserOpsLaunchExecution,
} from '@browseros/shared/browser-ops'
import { LAUNCHER_PORTS } from '@browseros/shared/constants/ports'
import {
  type BrowserOpsRuntimeLauncherPersistence,
  BrowserOpsRuntimeLauncherStore,
} from './runtime-launcher-store'

export interface BrowserOpsRuntimeLauncher {
  listExecutions(): Promise<BrowserOpsLaunchExecution[]>
  getDiagnostics(args: {
    activeSpecIds: string[]
    activeBundleIds: string[]
  }): Promise<BrowserOpsLaunchDiagnostics>
  launchBundle(
    bundle: BrowserOpsLaunchBundle,
    options?: { execute?: boolean },
  ): Promise<BrowserOpsLaunchExecution>
  stopExecution(executionId: string): Promise<BrowserOpsLaunchExecution | null>
  stopExecutionsForSpecs(
    specIds: string[],
  ): Promise<BrowserOpsLaunchExecution[]>
  cleanupExecution(
    executionId: string,
  ): Promise<BrowserOpsLaunchExecution | null>
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

  private async isPortAvailable(port: number): Promise<boolean> {
    return await new Promise<boolean>((resolve) => {
      const server = createServer()
      server.unref()
      server.once('error', () => resolve(false))
      server.listen(port, () => {
        server.close(() => resolve(true))
      })
    })
  }

  private async findAvailablePort(
    startPort: number,
    reserved: Set<number>,
  ): Promise<number> {
    for (let port = startPort; port < startPort + 100; port++) {
      if (reserved.has(port)) continue
      if (await this.isPortAvailable(port)) {
        reserved.add(port)
        return port
      }
    }
    throw new Error(`Failed to find available port near ${startPort}`)
  }

  private async allocatePorts(): Promise<{
    cdp: number
    server: number
    extension: number
  }> {
    const reserved = new Set<number>()
    const cdp = await this.findAvailablePort(LAUNCHER_PORTS.cdp, reserved)
    const server = await this.findAvailablePort(LAUNCHER_PORTS.server, reserved)
    const extension = await this.findAvailablePort(
      LAUNCHER_PORTS.extension,
      reserved,
    )
    return { cdp, server, extension }
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

  async getDiagnostics(args: {
    activeSpecIds: string[]
    activeBundleIds: string[]
  }): Promise<BrowserOpsLaunchDiagnostics> {
    const executions = await this.listExecutions()
    const activeSpecIds = new Set(args.activeSpecIds)
    const activeBundleIds = new Set(args.activeBundleIds)

    const executionIdsWithoutSpecs = executions
      .filter((execution) => !activeSpecIds.has(execution.specId))
      .map((execution) => execution.executionId)
    const executionIdsWithoutBundles = executions
      .filter((execution) => !activeBundleIds.has(execution.bundleId))
      .map((execution) => execution.executionId)
    const launchedExecutionIds = executions
      .filter((execution) => execution.state === 'launched')
      .map((execution) => execution.executionId)
    const orphanLaunchedExecutionIds = executions
      .filter(
        (execution) =>
          execution.state === 'launched' &&
          (!activeSpecIds.has(execution.specId) ||
            !activeBundleIds.has(execution.bundleId)),
      )
      .map((execution) => execution.executionId)

    return {
      executionIdsWithoutSpecs,
      executionIdsWithoutBundles,
      launchedExecutionIds,
      orphanLaunchedExecutionIds,
    }
  }

  async launchBundle(
    bundle: BrowserOpsLaunchBundle,
    options?: { execute?: boolean },
  ): Promise<BrowserOpsLaunchExecution> {
    const execute = options?.execute === true
    const binaryPath = process.env.BROWSEROS_BINARY ?? null
    const executionId = crypto.randomUUID()
    const ports = await this.allocatePorts()
    const commandPreview = `${bundle.launcherCommandPreview} --remote-debugging-port=${ports.cdp} --browseros-mcp-port=${ports.server} --browseros-extension-port=${ports.extension}`

    if (!execute) {
      const prepared: BrowserOpsLaunchExecution = {
        executionId,
        bundleId: bundle.bundleId,
        specId: bundle.specId,
        profileId: bundle.profileId,
        createdAt: new Date().toISOString(),
        state: 'prepared',
        binaryPath,
        commandPreview,
        dryRun: true,
        pid: null,
        ports,
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
        commandPreview,
        dryRun: false,
        pid: null,
        ports,
        notes: ['BROWSEROS_BINARY is not configured.'],
      }
      this.executions.set(executionId, failed)
      await this.persistence.writeLaunchExecution(failed)
      return failed
    }

    try {
      const child = spawn(
        binaryPath,
        [
          ...bundle.chromiumArgs,
          `--remote-debugging-port=${ports.cdp}`,
          `--browseros-mcp-port=${ports.server}`,
          `--browseros-extension-port=${ports.extension}`,
        ],
        {
          env: {
            ...process.env,
            ...bundle.env,
          },
          detached: true,
          stdio: 'ignore',
        },
      )
      child.unref()

      const launched: BrowserOpsLaunchExecution = {
        executionId,
        bundleId: bundle.bundleId,
        specId: bundle.specId,
        profileId: bundle.profileId,
        createdAt: new Date().toISOString(),
        state: 'launched',
        binaryPath,
        commandPreview,
        dryRun: false,
        pid: child.pid ?? null,
        ports,
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
        commandPreview,
        dryRun: false,
        pid: null,
        ports,
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
    const existing =
      this.executions.get(executionId) ??
      (await this.persistence.readLaunchExecution(executionId))
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

  async stopExecutionsForSpecs(
    specIds: string[],
  ): Promise<BrowserOpsLaunchExecution[]> {
    const executions = await this.listExecutions()
    const relevant = executions.filter((execution) =>
      specIds.includes(execution.specId),
    )

    const stopped: BrowserOpsLaunchExecution[] = []
    for (const execution of relevant) {
      const result = await this.stopExecution(execution.executionId)
      if (result) stopped.push(result)
    }
    return stopped
  }

  async cleanupExecution(
    executionId: string,
  ): Promise<BrowserOpsLaunchExecution | null> {
    const stopped = await this.stopExecution(executionId)
    if (!stopped) return null

    this.executions.delete(executionId)
    this.processes.delete(executionId)
    await this.persistence.deleteLaunchExecution(executionId)
    return stopped
  }
}
