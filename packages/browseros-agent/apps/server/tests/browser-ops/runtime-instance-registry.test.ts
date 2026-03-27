import { describe, it } from 'bun:test'
import assert from 'node:assert'
import type {
  BrowserOpsInstanceDiagnostics,
  BrowserOpsLaunchBundle,
  BrowserOpsLaunchExecution,
  BrowserOpsManagedInstance,
} from '@browseros/shared/browser-ops'
import { BrowserOpsRuntimeInstanceRegistryService } from '../../src/api/services/browser-ops/runtime-instance-registry'
import type { BrowserOpsRuntimeInstancePersistence } from '../../src/api/services/browser-ops/runtime-instance-store'

class MemoryInstancePersistence
  implements BrowserOpsRuntimeInstancePersistence
{
  instances = new Map<string, BrowserOpsManagedInstance>()

  async listInstances(): Promise<BrowserOpsManagedInstance[]> {
    return [...this.instances.values()]
  }

  async readInstance(
    instanceId: string,
  ): Promise<BrowserOpsManagedInstance | null> {
    return this.instances.get(instanceId) ?? null
  }

  async writeInstance(instance: BrowserOpsManagedInstance): Promise<void> {
    this.instances.set(instance.instanceId, instance)
  }

  async deleteInstance(instanceId: string): Promise<void> {
    this.instances.delete(instanceId)
  }
}

class FixedProbe {
  constructor(
    private readonly result: {
      cdpReachable: boolean
      serverReachable: boolean
      extensionReachable: boolean
      proxyAuthBootstrapConfigured: boolean
      observedContext: {
        profileId: string | null
        sessionPartition: string | null
        launchContextId: string | null
        profileDir: string | null
      }
    },
  ) {}

  async probePorts() {
    return this.result
  }
}

function createBundle(): BrowserOpsLaunchBundle {
  return {
    bundleId: 'bundle-1',
    specId: 'spec-1',
    profileId: 'profile-1',
    createdAt: new Date().toISOString(),
    state: 'active',
    startupUrl: 'https://sellercentral.amazon.com',
    userDataDir: '/tmp/profile-1',
    cookieVaultPath: '/tmp/vault-1.json',
    runtimeSpecPath: '/tmp/spec-1.json',
    browserContextId: 'context-1',
    launcherScriptPath: '/tmp/spec-1.sh',
    launcherCommandPreview: 'BrowserOS --user-data-dir=/tmp/profile-1',
    chromiumArgs: ['--user-data-dir=/tmp/profile-1'],
    env: {
      BROWSEROS_SESSION_PARTITION: 'persist:profile-1',
      BROWSER_OPS_LAUNCH_CONTEXT_ID: 'profile-1:window-1',
    },
    fingerprint: {
      timezone: 'America/New_York',
      language: 'en-US',
      locale: 'en-US',
      userAgentPreset: 'Chrome 137 / Desktop',
    },
    proxy: null,
  }
}

function createExecution(): BrowserOpsLaunchExecution {
  return {
    executionId: 'execution-1',
    bundleId: 'bundle-1',
    specId: 'spec-1',
    profileId: 'profile-1',
    createdAt: new Date().toISOString(),
    state: 'launched',
    binaryPath: '/Applications/BrowserOS.app/Contents/MacOS/BrowserOS',
    commandPreview: 'BrowserOS --user-data-dir=/tmp/profile-1',
    dryRun: false,
    pid: 1234,
    ports: {
      cdp: 9501,
      server: 9601,
      extension: 9801,
    },
    notes: [],
  }
}

describe('BrowserOpsRuntimeInstanceRegistryService', () => {
  it('registers and updates an instance from launch execution', async () => {
    const persistence = new MemoryInstancePersistence()
    const service = new BrowserOpsRuntimeInstanceRegistryService(
      persistence,
      new FixedProbe({
        cdpReachable: true,
        serverReachable: true,
        extensionReachable: true,
        proxyAuthBootstrapConfigured: true,
        observedContext: {
          profileId: null,
          sessionPartition: 'persist:profile-1',
          launchContextId: null,
          profileDir: '/tmp/profile-1',
        },
      }),
    )

    const instance = await service.registerExecution(
      createBundle(),
      createExecution(),
    )
    assert.strictEqual(instance.state, 'running')

    const refreshed = await service.refreshInstanceHealth(instance.instanceId)
    assert.strictEqual(refreshed?.state, 'running')
    assert.strictEqual(refreshed?.health.serverReachable, true)
    assert.strictEqual(refreshed?.health.proxyAuthBootstrapConfigured, true)
    assert.strictEqual(refreshed?.health.proxyEgressVerified, false)
    assert.strictEqual(refreshed?.health.proxySessionConsistent, true)
    assert.strictEqual(refreshed?.health.isolationContextMatches, true)
  })

  it('computes instance diagnostics', async () => {
    const persistence = new MemoryInstancePersistence()
    const service = new BrowserOpsRuntimeInstanceRegistryService(
      persistence,
      new FixedProbe({
        cdpReachable: false,
        serverReachable: false,
        extensionReachable: false,
        proxyAuthBootstrapConfigured: false,
        observedContext: {
          profileId: null,
          sessionPartition: null,
          launchContextId: null,
          profileDir: null,
        },
      }),
    )

    const instance = await service.registerExecution(
      createBundle(),
      createExecution(),
    )
    await service.refreshInstanceHealth(instance.instanceId)

    const diagnostics = (await service.getDiagnostics({
      executionIds: ['execution-1', 'execution-2'],
    })) as BrowserOpsInstanceDiagnostics

    assert.strictEqual(diagnostics.unreachableInstanceIds.length, 1)
    assert.strictEqual(diagnostics.executionIdsWithoutInstances.length, 1)
    assert.strictEqual(diagnostics.instancesWithoutProxyBootstrap.length, 1)
    assert.strictEqual(diagnostics.instancesWithFailedProxyVerification.length, 1)
  })

  it('refreshes and reconciles instances', async () => {
    const persistence = new MemoryInstancePersistence()
    const service = new BrowserOpsRuntimeInstanceRegistryService(
      persistence,
      new FixedProbe({
        cdpReachable: false,
        serverReachable: false,
        extensionReachable: false,
        proxyAuthBootstrapConfigured: false,
        observedContext: {
          profileId: null,
          sessionPartition: null,
          launchContextId: null,
          profileDir: null,
        },
      }),
    )

    await service.registerExecution(createBundle(), createExecution())

    const refreshed = await service.refreshAllInstanceHealth()
    assert.strictEqual(refreshed.length, 1)
    assert.strictEqual(refreshed[0]?.state, 'unreachable')

    const reconciled = await service.reconcileInstances({
      executionIds: [],
      stopOrphanInstances: true,
      refreshHealth: false,
    })
    assert.strictEqual(reconciled.stoppedInstanceIds.length, 1)
    assert.strictEqual(
      reconciled.diagnostics.instanceIdsWithoutExecutions.length,
      1,
    )
  })

  it('cleans up stopped or orphan instances', async () => {
    const persistence = new MemoryInstancePersistence()
    const service = new BrowserOpsRuntimeInstanceRegistryService(
      persistence,
      new FixedProbe({
        cdpReachable: true,
        serverReachable: true,
        extensionReachable: true,
        proxyAuthBootstrapConfigured: false,
        observedContext: {
          profileId: null,
          sessionPartition: null,
          launchContextId: null,
          profileDir: null,
        },
      }),
    )

    const instance = await service.registerExecution(
      createBundle(),
      createExecution(),
    )
    await service.markExecutionState({
      ...createExecution(),
      state: 'stopped',
    })

    const removed = await service.cleanupInstances({
      removeStopped: true,
      removeFailed: true,
      removeOrphan: true,
      executionIds: [],
    })
    assert.strictEqual(removed.length, 1)
    assert.strictEqual(await service.getInstance(instance.instanceId), null)
  })

  it('records proxy verification results on the instance', async () => {
    const persistence = new MemoryInstancePersistence()
    const service = new BrowserOpsRuntimeInstanceRegistryService(
      persistence,
      new FixedProbe({
        cdpReachable: true,
        serverReachable: true,
        extensionReachable: true,
        proxyAuthBootstrapConfigured: true,
      }),
    )

    const instance = await service.registerExecution(
      createBundle(),
      createExecution(),
    )

    const updated = await service.recordProxyVerification(instance.instanceId, {
      instanceId: instance.instanceId,
      checkedAt: new Date().toISOString(),
      targetUrl: 'https://ifconfig.co/json',
      status: 'verified',
      verdict: 'verified',
      observedText: '{"ip":"203.0.113.10","country":"US"}',
      detectedIp: '203.0.113.10',
      detectedCountry: 'US',
      sessionVerdict: 'consistent',
      expectedProxy: null,
      bootstrapConfigured: true,
      notes: ['Observed public egress IP from launched managed instance.'],
    })

    assert.strictEqual(updated?.lastProxyVerification?.status, 'verified')
    assert.strictEqual(
      updated?.lastProxyVerification?.detectedIp,
      '203.0.113.10',
    )
    assert.strictEqual(updated?.health.proxyEgressVerified, true)
    assert.strictEqual(updated?.health.proxySessionConsistent, true)
  })
})
