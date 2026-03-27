import { createConnection } from 'node:net'
import type {
  BrowserOpsInstanceDiagnostics,
  BrowserOpsLaunchBundle,
  BrowserOpsLaunchExecution,
  BrowserOpsManagedInstance,
  BrowserOpsProxyVerification,
} from '@browseros/shared/browser-ops'
import {
  type BrowserOpsRuntimeInstancePersistence,
  BrowserOpsRuntimeInstanceStore,
} from './runtime-instance-store'

interface BrowserOpsInstanceProbe {
  probePorts(ports: {
    cdp: number
    server: number
    extension: number
  }): Promise<{
    cdpReachable: boolean
    serverReachable: boolean
    extensionReachable: boolean
    proxyAuthBootstrapConfigured: boolean
  }>
}

class DefaultInstanceProbe implements BrowserOpsInstanceProbe {
  private async probeHttp(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(1000),
      })
      return response.ok
    } catch {
      return false
    }
  }

  private async probeTcp(port: number): Promise<boolean> {
    return await new Promise<boolean>((resolve) => {
      const socket = createConnection({ port, host: '127.0.0.1' })

      const finalize = (value: boolean) => {
        socket.removeAllListeners()
        try {
          socket.destroy()
        } catch {
          // ignore
        }
        resolve(value)
      }

      socket.setTimeout(1000)
      socket.once('connect', () => finalize(true))
      socket.once('error', () => finalize(false))
      socket.once('timeout', () => finalize(false))
    })
  }

  async probePorts(ports: {
    cdp: number
    server: number
    extension: number
  }): Promise<{
    cdpReachable: boolean
    serverReachable: boolean
    extensionReachable: boolean
    proxyAuthBootstrapConfigured: boolean
  }> {
    const [cdpReachable, serverHealth, extensionReachable] =
      await Promise.all([
        this.probeHttp(`http://127.0.0.1:${ports.cdp}/json/version`),
        fetch(`http://127.0.0.1:${ports.server}/status`, {
          signal: AbortSignal.timeout(1000),
        })
          .then(async (response) => {
            if (!response.ok) {
              return {
                serverReachable: false,
                proxyAuthBootstrapConfigured: false,
              }
            }
            const json = (await response.json()) as {
              status?: string
              proxyAuthBootstrapConfigured?: boolean
            }
            return {
              serverReachable: json.status === 'ok',
              proxyAuthBootstrapConfigured:
                json.proxyAuthBootstrapConfigured === true,
            }
          })
          .catch(() => ({
            serverReachable: false,
            proxyAuthBootstrapConfigured: false,
          })),
        this.probeTcp(ports.extension),
      ])

    return {
      cdpReachable,
      serverReachable: serverHealth.serverReachable,
      extensionReachable,
      proxyAuthBootstrapConfigured: serverHealth.proxyAuthBootstrapConfigured,
    }
  }
}

export interface BrowserOpsRuntimeInstanceRegistry {
  listInstances(): Promise<BrowserOpsManagedInstance[]>
  getInstance(instanceId: string): Promise<BrowserOpsManagedInstance | null>
  registerExecution(
    bundle: BrowserOpsLaunchBundle,
    execution: BrowserOpsLaunchExecution,
  ): Promise<BrowserOpsManagedInstance>
  markExecutionState(
    execution: BrowserOpsLaunchExecution,
  ): Promise<BrowserOpsManagedInstance | null>
  refreshInstanceHealth(
    instanceId: string,
  ): Promise<BrowserOpsManagedInstance | null>
  refreshAllInstanceHealth(): Promise<BrowserOpsManagedInstance[]>
  refreshInstances(instanceIds: string[]): Promise<BrowserOpsManagedInstance[]>
  getDiagnostics(args: {
    executionIds: string[]
  }): Promise<BrowserOpsInstanceDiagnostics>
  stopInstancesForExecutions(
    executionIds: string[],
  ): Promise<BrowserOpsManagedInstance[]>
  reconcileInstances(args: {
    executionIds: string[]
    stopOrphanInstances?: boolean
    refreshHealth?: boolean
  }): Promise<{
    stoppedInstanceIds: string[]
    refreshedInstanceIds: string[]
    diagnostics: BrowserOpsInstanceDiagnostics
  }>
  cleanupInstances(args?: {
    removeStopped?: boolean
    removeFailed?: boolean
    removeOrphan?: boolean
    executionIds?: string[]
  }): Promise<string[]>
  cleanupInstance(instanceId: string): Promise<BrowserOpsManagedInstance | null>
  recordProxyVerification(
    instanceId: string,
    verification: BrowserOpsProxyVerification,
  ): Promise<BrowserOpsManagedInstance | null>
}

export class BrowserOpsRuntimeInstanceRegistryService
  implements BrowserOpsRuntimeInstanceRegistry
{
  private persistence: BrowserOpsRuntimeInstancePersistence
  private probe: BrowserOpsInstanceProbe

  constructor(
    persistence?: BrowserOpsRuntimeInstancePersistence,
    probe?: BrowserOpsInstanceProbe,
  ) {
    this.persistence = persistence ?? new BrowserOpsRuntimeInstanceStore()
    this.probe = probe ?? new DefaultInstanceProbe()
  }

  async listInstances(): Promise<BrowserOpsManagedInstance[]> {
    return await this.persistence.listInstances()
  }

  async getInstance(
    instanceId: string,
  ): Promise<BrowserOpsManagedInstance | null> {
    return await this.persistence.readInstance(instanceId)
  }

  async registerExecution(
    bundle: BrowserOpsLaunchBundle,
    execution: BrowserOpsLaunchExecution,
  ): Promise<BrowserOpsManagedInstance> {
    const existingInstances = await this.persistence.listInstances()
    const existing = existingInstances.find(
      (instance) => instance.executionId === execution.executionId,
    )

    const next: BrowserOpsManagedInstance = {
      instanceId: existing?.instanceId ?? crypto.randomUUID(),
      executionId: execution.executionId,
      bundleId: execution.bundleId,
      specId: execution.specId,
      profileId: execution.profileId,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      state:
        execution.state === 'launched'
          ? 'running'
          : execution.state === 'failed'
            ? 'failed'
            : execution.state === 'stopped'
              ? 'stopped'
              : 'prepared',
      binaryPath: execution.binaryPath,
      pid: execution.pid,
      ports: execution.ports,
      lastHealthCheckAt: null,
      health: existing?.health ?? {
        cdpReachable: false,
        serverReachable: false,
        extensionReachable: false,
        proxyAuthBootstrapConfigured: false,
        proxyEgressVerified: false,
        proxySessionConsistent: true,
      },
      proxy: bundle.proxy
        ? {
            providerName: bundle.proxy.providerName,
            country: bundle.proxy.country,
            authMode: bundle.proxy.authMode,
            credentialSource: bundle.proxy.credentialSource,
            serverArg: bundle.proxy.serverArg,
            sessionId: bundle.proxy.sessionId,
          }
        : null,
      lastProxyVerification: existing?.lastProxyVerification ?? null,
      notes: [
        ...(existing?.notes ?? []),
        `Execution ${execution.executionId} registered for bundle ${bundle.bundleId}.`,
      ],
    }

    await this.persistence.writeInstance(next)
    return next
  }

  async markExecutionState(
    execution: BrowserOpsLaunchExecution,
  ): Promise<BrowserOpsManagedInstance | null> {
    const instances = await this.persistence.listInstances()
    const existing = instances.find(
      (instance) => instance.executionId === execution.executionId,
    )
    if (!existing) return null

    const updated: BrowserOpsManagedInstance = {
      ...existing,
      state:
        execution.state === 'launched'
          ? 'running'
          : execution.state === 'failed'
            ? 'failed'
            : execution.state === 'stopped'
              ? 'stopped'
              : 'prepared',
      pid: execution.pid,
      notes: [
        ...existing.notes,
        `Execution state updated to ${execution.state}.`,
      ],
    }
    await this.persistence.writeInstance(updated)
    return updated
  }

  async refreshInstanceHealth(
    instanceId: string,
  ): Promise<BrowserOpsManagedInstance | null> {
    const instance = await this.persistence.readInstance(instanceId)
    if (!instance) return null

    const health = await this.probe.probePorts(instance.ports)
    const updated: BrowserOpsManagedInstance = {
      ...instance,
      lastHealthCheckAt: new Date().toISOString(),
      health: {
        ...health,
        proxyEgressVerified: instance.health.proxyEgressVerified,
        proxySessionConsistent: instance.health.proxySessionConsistent,
      },
      state:
        instance.state === 'failed' || instance.state === 'stopped'
          ? instance.state
          : health.cdpReachable ||
              health.serverReachable ||
              health.extensionReachable
            ? 'running'
            : 'unreachable',
    }
    await this.persistence.writeInstance(updated)
    return updated
  }

  async refreshAllInstanceHealth(): Promise<BrowserOpsManagedInstance[]> {
    const instances = await this.persistence.listInstances()
    const refreshed: BrowserOpsManagedInstance[] = []

    for (const instance of instances) {
      const updated = await this.refreshInstanceHealth(instance.instanceId)
      if (updated) refreshed.push(updated)
    }

    return refreshed
  }

  async refreshInstances(
    instanceIds: string[],
  ): Promise<BrowserOpsManagedInstance[]> {
    const refreshed: BrowserOpsManagedInstance[] = []

    for (const instanceId of instanceIds) {
      const updated = await this.refreshInstanceHealth(instanceId)
      if (updated) refreshed.push(updated)
    }

    return refreshed
  }

  async getDiagnostics(args: {
    executionIds: string[]
  }): Promise<BrowserOpsInstanceDiagnostics> {
    const instances = await this.persistence.listInstances()
    const executionIds = new Set(args.executionIds)

    return {
      instanceIdsWithoutExecutions: instances
        .filter((instance) => !executionIds.has(instance.executionId))
        .map((instance) => instance.instanceId),
      executionIdsWithoutInstances: args.executionIds.filter(
        (executionId) =>
          !instances.some((instance) => instance.executionId === executionId),
      ),
      runningInstanceIds: instances
        .filter((instance) => instance.state === 'running')
        .map((instance) => instance.instanceId),
      unreachableInstanceIds: instances
        .filter((instance) => instance.state === 'unreachable')
        .map((instance) => instance.instanceId),
    }
  }

  async stopInstancesForExecutions(
    executionIds: string[],
  ): Promise<BrowserOpsManagedInstance[]> {
    const instances = await this.persistence.listInstances()
    const updated: BrowserOpsManagedInstance[] = []

    for (const instance of instances) {
      if (!executionIds.includes(instance.executionId)) continue
      const next: BrowserOpsManagedInstance = {
        ...instance,
        state: instance.state === 'failed' ? 'failed' : 'stopped',
        notes: [
          ...instance.notes,
          'Instance stopped because execution was stopped.',
        ],
      }
      await this.persistence.writeInstance(next)
      updated.push(next)
    }

    return updated
  }

  async reconcileInstances(args: {
    executionIds: string[]
    stopOrphanInstances?: boolean
    refreshHealth?: boolean
  }): Promise<{
    stoppedInstanceIds: string[]
    refreshedInstanceIds: string[]
    diagnostics: BrowserOpsInstanceDiagnostics
  }> {
    const stoppedInstanceIds: string[] = []
    const refreshedInstanceIds: string[] = []

    if (args.refreshHealth !== false) {
      const refreshed = await this.refreshAllInstanceHealth()
      refreshedInstanceIds.push(
        ...refreshed.map((instance) => instance.instanceId),
      )
    }

    const diagnostics = await this.getDiagnostics({
      executionIds: args.executionIds,
    })

    if (args.stopOrphanInstances !== false) {
      const instances = await this.persistence.listInstances()
      for (const instance of instances) {
        if (
          !diagnostics.instanceIdsWithoutExecutions.includes(
            instance.instanceId,
          )
        ) {
          continue
        }
        const updated: BrowserOpsManagedInstance = {
          ...instance,
          state: instance.state === 'failed' ? 'failed' : 'stopped',
          notes: [
            ...instance.notes,
            'Instance reconciled because execution record is missing.',
          ],
        }
        await this.persistence.writeInstance(updated)
        stoppedInstanceIds.push(updated.instanceId)
      }
    }

    return {
      stoppedInstanceIds,
      refreshedInstanceIds,
      diagnostics: await this.getDiagnostics({
        executionIds: args.executionIds,
      }),
    }
  }

  async cleanupInstances(args?: {
    removeStopped?: boolean
    removeFailed?: boolean
    removeOrphan?: boolean
    executionIds?: string[]
  }): Promise<string[]> {
    const instances = await this.persistence.listInstances()
    const executionIds = new Set(args?.executionIds ?? [])
    const removed: string[] = []

    for (const instance of instances) {
      const isOrphan = !executionIds.has(instance.executionId)
      const remove =
        (args?.removeStopped !== false && instance.state === 'stopped') ||
        (args?.removeFailed !== false && instance.state === 'failed') ||
        (args?.removeOrphan !== false && isOrphan)

      if (!remove) continue
      await this.persistence.deleteInstance(instance.instanceId)
      removed.push(instance.instanceId)
    }

    return removed
  }

  async cleanupInstance(
    instanceId: string,
  ): Promise<BrowserOpsManagedInstance | null> {
    const instance = await this.persistence.readInstance(instanceId)
    if (!instance) return null
    await this.persistence.deleteInstance(instanceId)
    return instance
  }

  async recordProxyVerification(
    instanceId: string,
    verification: BrowserOpsProxyVerification,
  ): Promise<BrowserOpsManagedInstance | null> {
    const instance = await this.persistence.readInstance(instanceId)
    if (!instance) return null

    const updated: BrowserOpsManagedInstance = {
      ...instance,
      health: {
        ...instance.health,
        proxyEgressVerified: verification.verdict === 'verified',
        proxySessionConsistent: verification.sessionVerdict !== 'changed',
      },
      lastProxyVerification: verification,
      notes: [
        ...instance.notes,
        `Proxy verification ${verification.status} at ${verification.checkedAt}.`,
      ],
    }
    await this.persistence.writeInstance(updated)
    return updated
  }
}
