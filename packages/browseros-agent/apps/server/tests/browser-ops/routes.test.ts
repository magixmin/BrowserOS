import { dirname, resolve } from 'node:path'
import { describe, it, mock } from 'bun:test'
import assert from 'node:assert'
import type {
  BrowserOpsInstanceDiagnostics,
  BrowserOpsInstanceEvent,
  BrowserOpsLaunchBundle,
  BrowserOpsLaunchExecution,
  BrowserOpsManagedInstance,
  BrowserOpsRuntimeAssetManifest,
  BrowserOpsRuntimeSessionSpec,
} from '@browseros/shared/browser-ops'
import { createBrowserOpsRoutes } from '../../src/api/routes/browser-ops'

const SERVER_SRC_DIR = resolve(dirname(import.meta.path), '../../src')

mock.module('../../src/lib/browseros-dir', () => {
  const browserosDir = resolve(SERVER_SRC_DIR, '..')
  return {
    getBrowserosDir: () => browserosDir,
    getSkillsDir: () => resolve(browserosDir, 'skills'),
    getBuiltinSkillsDir: () => resolve(SERVER_SRC_DIR, 'skills/defaults'),
  }
})

function createPreviewPayload() {
  return {
    profile: {
      id: 'profile_tiktok_us_01',
      name: 'TikTok US Creator',
      accountLabel: '@nova_us_creator',
      platform: 'tiktok',
      marketCountry: 'US',
      proxyMode: 'auto',
      preferredIpTypes: ['residential', 'mobile'],
      preferredRegion: 'US',
      sessionPartition: 'persist:profile_tiktok_us_01',
      cookieVaultKey: 'vault:profile_tiktok_us_01',
      status: 'ready',
      fingerprint: {
        userAgentPreset: 'Chrome 137 / Desktop',
        timezone: 'America/New_York',
        language: 'en-US',
        locale: 'en-US',
        platform: 'Windows',
        webglProfile: 'Intel Iris Xe',
        canvasNoise: 'light',
        fontsPreset: 'office-desktop',
      },
      tags: ['creator', 'publishing'],
    },
    task: {
      id: 'task_tiktok_publish_video',
      name: 'TikTok Publish Video',
      platform: 'tiktok',
      taskType: 'publishing',
      goal: 'Upload a prepared video and publish it.',
      targetCountry: 'US',
      requiredIpTypes: ['residential', 'mobile'],
      preferredSessionMode: 'sticky',
      rotateIpOnEachRun: false,
      humanizationLevel: 'strict',
      skillKey: 'post_tiktok_video',
    },
    proxies: [
      {
        id: 'proxy_brightdata_us_resi_01',
        name: 'BrightData US Residential',
        sourceType: 'managed',
        providerName: 'Bright Data',
        endpoint: 'brd.superproxy.io:33335',
        builtInPool: true,
        ipType: 'residential',
        sessionMode: 'sticky',
        countries: ['US'],
        rotationSupport: true,
        stickySessionTtlMinutes: 30,
        status: 'active',
        health: {
          successRate: 0.96,
          banRate: 0.02,
          latencyMs: 420,
          lastCheckedAt: new Date().toISOString(),
        },
      },
    ],
    settings: {
      autoRouteIp: true,
      autoAlignFingerprint: true,
      allowBringYourOwnProxy: true,
      useBuiltInProxyPool: true,
      enforceQualityGuard: true,
    },
  }
}

function createRouteApp() {
  const controllerMessages: Array<{
    action: string
    payload?: Record<string, unknown>
  }> = []
  const assets = new Map<string, BrowserOpsRuntimeAssetManifest>()
  const bundles = new Map<string, BrowserOpsLaunchBundle>()
  const executions = new Map<string, BrowserOpsLaunchExecution>()
  const instances = new Map<string, BrowserOpsManagedInstance>()
  const events: BrowserOpsInstanceEvent[] = []
  const vaults = new Map<
    string,
    {
      vaultKey: string
      cookies: unknown[]
      updatedAt: string
      capturedFromUrls?: string[]
    }
  >()
  const dynamicPages = [
    {
      pageId: 31,
      targetId: 'target-31',
      tabId: 12,
      url: 'https://www.tiktok.com/upload',
      title: 'TikTok Upload',
      isActive: true,
      isLoading: false,
      loadProgress: 1,
      isPinned: false,
      isHidden: false,
      windowId: 4,
    },
  ]
  const liveBrowserContexts = ['orphan-context']
  const disposedBrowserContexts: string[] = []
  let nextBrowserContextId = 5

  const app = createBrowserOpsRoutes({
    browser: {
      getActivePage: async () => ({
        ...dynamicPages[0],
      }),
      listWindows: async () => [
        {
          windowId: 4,
          windowType: 'normal',
          bounds: {},
          isActive: true,
          isVisible: true,
          tabCount: 2,
          activeTabId: 12,
        },
        {
          windowId: 5,
          windowType: 'normal',
          bounds: {},
          isActive: false,
          isVisible: true,
          tabCount: 1,
          activeTabId: 21,
        },
      ],
      createWindow: async () => ({
        windowId: 5,
        windowType: 'normal',
        bounds: {},
        isActive: false,
        isVisible: true,
        tabCount: 1,
        activeTabId: 21,
      }),
      createBrowserContext: async () => {
        const browserContextId = `context-${nextBrowserContextId++}`
        liveBrowserContexts.push(browserContextId)
        return browserContextId
      },
      getBrowserContexts: async () => [...liveBrowserContexts],
      disposeBrowserContext: async (browserContextId: string) => {
        disposedBrowserContexts.push(browserContextId)
        const index = liveBrowserContexts.indexOf(browserContextId)
        if (index >= 0) {
          liveBrowserContexts.splice(index, 1)
        }
      },
      newPage: async (url: string) => {
        dynamicPages.push({
          pageId: 88,
          targetId: 'target-88',
          tabId: 21,
          url,
          title: url.includes('amazon')
            ? 'Amazon Seller Central'
            : 'Managed Window',
          isActive: true,
          isLoading: false,
          loadProgress: 1,
          isPinned: false,
          isHidden: false,
          windowId: 5,
        })
        return 88
      },
      goto: async (pageId: number, url: string) => {
        const page = dynamicPages.find(
          (candidate) => candidate.pageId === pageId,
        )
        if (!page) return
        page.url = url
        page.title = url.includes('amazon')
          ? 'Amazon Seller Central'
          : url.includes('tiktok')
            ? 'TikTok Upload'
            : 'Managed Window'
      },
      listPages: async () => dynamicPages,
      getCookies: async (urls?: string[]) =>
        [
          {
            name: 'sessionid',
            value: 'cookie-1',
            domain: '.tiktok.com',
            path: '/',
            expires: Date.now() / 1000 + 3600,
            size: 10,
            httpOnly: true,
            secure: true,
            session: false,
            priority: 'Medium',
            sameParty: false,
            sourceScheme: 'Secure',
            sourcePort: 443,
          },
        ].filter(() => (urls ? urls.length > 0 : true)),
      setCookies: async () => undefined,
      clearCookies: async () => undefined,
    } as never,
    controller: {
      isConnected: () => true,
      send: async (action: string, payload?: Record<string, unknown>) => {
        controllerMessages.push({ action, payload })
        return {}
      },
      getWindowOwnerClientId: (windowId: number) =>
        windowId === 4
          ? 'client-owner-4'
          : windowId === 5
            ? 'client-owner-5'
            : null,
      listOwnedWindows: () => [
        {
          clientId: 'client-owner-4',
          windowId: 4,
          isPrimaryClient: true,
          isFocusedWindow: true,
        },
        {
          clientId: 'client-owner-5',
          windowId: 5,
          isPrimaryClient: false,
          isFocusedWindow: false,
        },
      ],
    } as never,
    runtimePersistence: {
      async materializeRuntimeSessionSpec(
        spec: BrowserOpsRuntimeSessionSpec,
      ): Promise<BrowserOpsRuntimeAssetManifest> {
        const asset: BrowserOpsRuntimeAssetManifest = {
          manifestId: `manifest-${spec.specId}`,
          specId: spec.specId,
          bindingId: spec.bindingId,
          allocationId: spec.allocationId,
          profileId: spec.profileId,
          createdAt: spec.createdAt,
          state: 'active',
          profileDirectoryPath: `/tmp/profiles/${spec.profileDirectoryName}`,
          cookieVaultPath: `/tmp/vaults/${spec.cookieVaultKey}.json`,
          runtimeSpecPath: `/tmp/specs/${spec.specId}.json`,
        }
        assets.set(asset.specId, asset)
        return asset
      },
      async listLaunchBundles() {
        return [...bundles.values()]
      },
      async readLaunchBundle(specId: string) {
        return bundles.get(specId) ?? null
      },
      async materializeLaunchBundle(specId: string) {
        const asset = assets.get(specId)
        if (!asset) return null
        const bundle: BrowserOpsLaunchBundle = {
          bundleId: `bundle-${specId}`,
          specId,
          profileId: asset.profileId,
          createdAt: asset.createdAt,
          state: asset.state,
          startupUrl: 'https://sellercentral.amazon.com',
          userDataDir: asset.profileDirectoryPath,
          cookieVaultPath: asset.cookieVaultPath,
          runtimeSpecPath: asset.runtimeSpecPath,
          browserContextId:
            liveBrowserContexts.find((contextId) =>
              contextId.startsWith('context-'),
            ) ?? null,
          launcherScriptPath: `/tmp/launch-bundles/${specId}.sh`,
          launcherCommandPreview: `BrowserOS --user-data-dir=${asset.profileDirectoryPath}`,
          chromiumArgs: [`--user-data-dir=${asset.profileDirectoryPath}`],
          env: {
            BROWSEROS_PROFILE_ID: asset.profileId,
          },
          fingerprint: {
            timezone: 'America/New_York',
            language: 'en-US',
            locale: 'en-US',
            userAgentPreset: 'Chrome 137 / Desktop',
          },
          proxy: null,
        }
        bundles.set(specId, bundle)
        return bundle
      },
      async listRuntimeAssets() {
        return [...assets.values()]
      },
      async readRuntimeSessionSpec(specId: string) {
        const asset = assets.get(specId)
        if (!asset) return null
        return {
          specId,
          bindingId: asset.bindingId,
          allocationId: asset.allocationId,
          profileId: asset.profileId,
          taskId: 'task_tiktok_publish_video',
          createdAt: asset.createdAt,
          state: asset.state,
          browserContextId:
            liveBrowserContexts.find((contextId) =>
              contextId.startsWith('context-'),
            ) ?? null,
          ownership: {
            controllerClientId: 'client-owner-5',
            windowId: 5,
            tabId: 21,
            pageId: 88,
            pageUrl: 'https://sellercentral.amazon.com',
            pageTitle: 'Amazon Seller Central',
          },
          sessionPartition: 'persist:profile_tiktok_us_01',
          cookieVaultKey: 'vault:profile_tiktok_us_01',
          profileDirectoryName: 'profile-profile_tiktok_us_01',
          launchContextId: 'profile_tiktok_us_01:5',
          fingerprint: createPreviewPayload().profile.fingerprint,
          proxyResolution: null,
          warmupPolicy: 'strict-warmup' as const,
          riskLevel: 'low' as const,
        }
      },
      async getRuntimeAssetByBindingId(bindingId: string) {
        return (
          [...assets.values()].find((asset) => asset.bindingId === bindingId) ??
          null
        )
      },
      async listCookieVaults() {
        return [...vaults.entries()].map(([vaultKey, vault]) => {
          const asset = [...assets.values()].find(
            (candidate) =>
              candidate.cookieVaultPath === `/tmp/vaults/${vaultKey}.json`,
          )
          return {
            bindingId: asset?.bindingId ?? 'unknown',
            vaultKey: vault.vaultKey,
            cookieCount: vault.cookies.length,
            updatedAt: vault.updatedAt,
            capturedFromUrls: vault.capturedFromUrls,
          }
        })
      },
      async readCookieVault(bindingId: string) {
        const asset = [...assets.values()].find(
          (candidate) => candidate.bindingId === bindingId,
        )
        if (!asset) return null
        const vaultKey = asset.cookieVaultPath
          .split('/')
          .pop()
          ?.replace('.json', '')
        if (!vaultKey) return null
        return vaults.get(vaultKey) ?? null
      },
      async writeCookieVault(
        bindingId: string,
        cookies: unknown[],
        capturedFromUrls?: string[],
      ) {
        const asset = [...assets.values()].find(
          (candidate) => candidate.bindingId === bindingId,
        )
        if (!asset) return null
        const vaultKey = asset.cookieVaultPath
          .split('/')
          .pop()
          ?.replace('.json', '')
        if (!vaultKey) return null
        const existing = vaults.get(vaultKey)
        const next = {
          vaultKey: existing?.vaultKey ?? vaultKey,
          cookies,
          updatedAt: new Date().toISOString(),
          capturedFromUrls,
        }
        vaults.set(vaultKey, next)
        return next
      },
      async clearCookieVault(bindingId: string) {
        const asset = [...assets.values()].find(
          (candidate) => candidate.bindingId === bindingId,
        )
        if (!asset) return null
        const vaultKey = asset.cookieVaultPath
          .split('/')
          .pop()
          ?.replace('.json', '')
        if (!vaultKey) return null
        const existing = vaults.get(vaultKey)
        if (!existing) return null
        const next = {
          ...existing,
          cookies: [],
          updatedAt: new Date().toISOString(),
        }
        vaults.set(vaultKey, next)
        return next
      },
      async markAssetsReleasedForBinding(bindingId: string) {
        for (const [specId, asset] of assets.entries()) {
          if (asset.bindingId === bindingId) {
            assets.set(specId, { ...asset, state: 'released' })
          }
        }
      },
      async markAssetsReleasedForAllocation(allocationId: string) {
        for (const [specId, asset] of assets.entries()) {
          if (asset.allocationId === allocationId) {
            assets.set(specId, { ...asset, state: 'released' })
          }
        }
      },
    },
    runtimeLauncher: {
      async listExecutions() {
        return [...executions.values()]
      },
      async getDiagnostics(args) {
        const currentExecutions = [...executions.values()]
        return {
          executionIdsWithoutSpecs: currentExecutions
            .filter(
              (execution) => !args.activeSpecIds.includes(execution.specId),
            )
            .map((execution) => execution.executionId),
          executionIdsWithoutBundles: currentExecutions
            .filter(
              (execution) => !args.activeBundleIds.includes(execution.bundleId),
            )
            .map((execution) => execution.executionId),
          launchedExecutionIds: currentExecutions
            .filter((execution) => execution.state === 'launched')
            .map((execution) => execution.executionId),
          orphanLaunchedExecutionIds: currentExecutions
            .filter(
              (execution) =>
                execution.state === 'launched' &&
                (!args.activeSpecIds.includes(execution.specId) ||
                  !args.activeBundleIds.includes(execution.bundleId)),
            )
            .map((execution) => execution.executionId),
        }
      },
      async launchBundle(bundle, options) {
        const executionId =
          options?.execute === true
            ? '00000000-0000-4000-8000-000000000002'
            : '00000000-0000-4000-8000-000000000001'
        const execution: BrowserOpsLaunchExecution = {
          executionId,
          bundleId: bundle.bundleId,
          specId: bundle.specId,
          profileId: bundle.profileId,
          createdAt: new Date().toISOString(),
          state: options?.execute ? 'launched' : 'prepared',
          binaryPath: options?.execute
            ? '/Applications/BrowserOS.app/Contents/MacOS/BrowserOS'
            : null,
          commandPreview: bundle.launcherCommandPreview,
          dryRun: options?.execute !== true,
          pid: options?.execute ? 4242 : null,
          ports: {
            cdp: 9501,
            server: 9601,
            extension: 9801,
          },
          notes: [],
        }
        executions.set(execution.executionId, execution)
        return execution
      },
      async stopExecution(executionId) {
        const existing = executions.get(executionId)
        if (!existing) return null
        const stopped = {
          ...existing,
          state:
            existing.state === 'prepared' || existing.state === 'failed'
              ? existing.state
              : 'stopped',
        } satisfies BrowserOpsLaunchExecution
        executions.set(executionId, stopped)
        return stopped
      },
      async cleanupExecution(executionId) {
        const existing = executions.get(executionId)
        if (!existing) return null
        executions.delete(executionId)
        return existing
      },
      async stopExecutionsForSpecs(specIds) {
        const stopped: BrowserOpsLaunchExecution[] = []
        for (const execution of executions.values()) {
          if (!specIds.includes(execution.specId)) continue
          const next = {
            ...execution,
            state:
              execution.state === 'prepared' || execution.state === 'failed'
                ? execution.state
                : 'stopped',
          } satisfies BrowserOpsLaunchExecution
          executions.set(execution.executionId, next)
          stopped.push(next)
        }
        return stopped
      },
    },
    runtimeInstanceRegistry: {
      async listInstances() {
        return [...instances.values()]
      },
      async getInstance(instanceId) {
        return instances.get(instanceId) ?? null
      },
      async refreshInstanceHealth(instanceId) {
        const existing = instances.get(instanceId)
        if (!existing) return null
        const next = {
          ...existing,
          lastHealthCheckAt: new Date().toISOString(),
        } satisfies BrowserOpsManagedInstance
        instances.set(instanceId, next)
        return next
      },
      async refreshAllInstanceHealth() {
        const refreshed: BrowserOpsManagedInstance[] = []
        for (const instance of instances.values()) {
          const next = {
            ...instance,
            lastHealthCheckAt: new Date().toISOString(),
          } satisfies BrowserOpsManagedInstance
          instances.set(instance.instanceId, next)
          refreshed.push(next)
        }
        return refreshed
      },
      async refreshInstances(instanceIds) {
        const refreshed: BrowserOpsManagedInstance[] = []
        for (const instanceId of instanceIds) {
          const existing = instances.get(instanceId)
          if (!existing) continue
          const next = {
            ...existing,
            lastHealthCheckAt: new Date().toISOString(),
          } satisfies BrowserOpsManagedInstance
          instances.set(instanceId, next)
          refreshed.push(next)
        }
        return refreshed
      },
      async registerExecution(bundle, execution) {
        const instance: BrowserOpsManagedInstance = {
          instanceId: `instance-${execution.executionId}`,
          executionId: execution.executionId,
          bundleId: bundle.bundleId,
          specId: bundle.specId,
          profileId: bundle.profileId,
          createdAt: new Date().toISOString(),
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
          health: {
            cdpReachable: execution.state === 'launched',
            serverReachable: execution.state === 'launched',
            extensionReachable: execution.state === 'launched',
          },
          notes: [],
        }
        instances.set(instance.instanceId, instance)
        return instance
      },
      async markExecutionState(execution) {
        const existing = [...instances.values()].find(
          (instance) => instance.executionId === execution.executionId,
        )
        if (!existing) return null
        const next = {
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
        } satisfies BrowserOpsManagedInstance
        instances.set(existing.instanceId, next)
        return next
      },
      async getDiagnostics(args) {
        const current = [...instances.values()]
        return {
          instanceIdsWithoutExecutions: current
            .filter(
              (instance) => !args.executionIds.includes(instance.executionId),
            )
            .map((instance) => instance.instanceId),
          executionIdsWithoutInstances: args.executionIds.filter(
            (executionId) =>
              !current.some((instance) => instance.executionId === executionId),
          ),
          runningInstanceIds: current
            .filter((instance) => instance.state === 'running')
            .map((instance) => instance.instanceId),
          unreachableInstanceIds: current
            .filter((instance) => instance.state === 'unreachable')
            .map((instance) => instance.instanceId),
        } satisfies BrowserOpsInstanceDiagnostics
      },
      async stopInstancesForExecutions(executionIds) {
        const stopped: BrowserOpsManagedInstance[] = []
        for (const instance of instances.values()) {
          if (!executionIds.includes(instance.executionId)) continue
          const next = {
            ...instance,
            state: instance.state === 'failed' ? 'failed' : 'stopped',
          } satisfies BrowserOpsManagedInstance
          instances.set(instance.instanceId, next)
          stopped.push(next)
        }
        return stopped
      },
      async reconcileInstances(args) {
        const current = [...instances.values()]
        const stoppedInstanceIds: string[] = []
        const refreshedInstanceIds: string[] = []

        if (args.refreshHealth !== false) {
          for (const instance of current) {
            const next = {
              ...instance,
              lastHealthCheckAt: new Date().toISOString(),
            } satisfies BrowserOpsManagedInstance
            instances.set(instance.instanceId, next)
            refreshedInstanceIds.push(instance.instanceId)
          }
        }

        if (args.stopOrphanInstances !== false) {
          for (const instance of current) {
            if (args.executionIds.includes(instance.executionId)) continue
            const next = {
              ...instance,
              state: instance.state === 'failed' ? 'failed' : 'stopped',
            } satisfies BrowserOpsManagedInstance
            instances.set(instance.instanceId, next)
            stoppedInstanceIds.push(instance.instanceId)
          }
        }

        return {
          stoppedInstanceIds,
          refreshedInstanceIds,
          diagnostics: {
            instanceIdsWithoutExecutions: [...instances.values()]
              .filter(
                (instance) => !args.executionIds.includes(instance.executionId),
              )
              .map((instance) => instance.instanceId),
            executionIdsWithoutInstances: args.executionIds.filter(
              (executionId) =>
                ![...instances.values()].some(
                  (instance) => instance.executionId === executionId,
                ),
            ),
            runningInstanceIds: [...instances.values()]
              .filter((instance) => instance.state === 'running')
              .map((instance) => instance.instanceId),
            unreachableInstanceIds: [...instances.values()]
              .filter((instance) => instance.state === 'unreachable')
              .map((instance) => instance.instanceId),
          } satisfies BrowserOpsInstanceDiagnostics,
        }
      },
      async cleanupInstances(args) {
        const removed: string[] = []
        const current = [...instances.values()]
        for (const instance of current) {
          const isOrphan = !((args.executionIds ?? []) as string[]).includes(
            instance.executionId,
          )
          const shouldRemove =
            ((args.removeStopped ?? true) && instance.state === 'stopped') ||
            ((args.removeFailed ?? true) && instance.state === 'failed') ||
            ((args.removeOrphan ?? true) && isOrphan)
          if (!shouldRemove) continue
          instances.delete(instance.instanceId)
          removed.push(instance.instanceId)
        }
        return removed
      },
      async cleanupInstance(instanceId) {
        const existing = instances.get(instanceId)
        if (!existing) return null
        instances.delete(instanceId)
        return existing
      },
    },
    runtimeInstanceEventStore: {
      async listEvents() {
        return [...events]
      },
      async appendEvent(event) {
        events.unshift(event)
      },
      async clearEvents() {
        events.length = 0
      },
    },
  })

  return Object.assign(app, {
    __testState: {
      controllerMessages,
      liveBrowserContexts,
      disposedBrowserContexts,
    },
  })
}

describe('Browser Ops routes', () => {
  it('returns provider catalog', async () => {
    const app = createRouteApp()
    const response = await app.request('/providers')

    assert.strictEqual(response.status, 200)
    const json = (await response.json()) as {
      providers: { id: string }[]
    }
    assert.ok(json.providers.length >= 5)
  })

  it('resolves a browser ops task skill into an installed skill', async () => {
    const app = createRouteApp()
    const payload = createPreviewPayload().task

    const response = await app.request('/skills/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    assert.strictEqual(response.status, 200)
    const json = (await response.json()) as {
      resolution: {
        matchType: string
        resolvedSkillId: string | null
        candidates: Array<{ skillId: string; exists: boolean }>
      }
    }
    assert.strictEqual(json.resolution.matchType, 'mapped')
    assert.strictEqual(json.resolution.resolvedSkillId, 'fill-form')
    assert.ok(
      json.resolution.candidates.some(
        (candidate) =>
          candidate.skillId === 'fill-form' && candidate.exists === true,
      ),
    )
  })

  it('builds an automation brief from task, route, and skill context', async () => {
    const originalUser = process.env.BROWSER_OPS_BRIGHTDATA_USERNAME
    const originalPass = process.env.BROWSER_OPS_BRIGHTDATA_PASSWORD
    process.env.BROWSER_OPS_BRIGHTDATA_USERNAME = 'brd-user'
    process.env.BROWSER_OPS_BRIGHTDATA_PASSWORD = 'brd-pass'

    const app = createRouteApp()
    const payload = createPreviewPayload()

    const response = await app.request('/automation/brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    assert.strictEqual(response.status, 200)
    const json = (await response.json()) as {
      brief: {
        readiness: string
        resolvedSkillId: string | null
        recommendedStartUrl: string
        launchMode: string
        executionPrompt: string
      }
    }
    assert.strictEqual(json.brief.readiness, 'ready')
    assert.strictEqual(json.brief.resolvedSkillId, 'fill-form')
    assert.strictEqual(
      json.brief.recommendedStartUrl,
      'https://www.tiktok.com/upload',
    )
    assert.strictEqual(json.brief.launchMode, 'managed-window')
    assert.ok(json.brief.executionPrompt.includes('Task: TikTok Publish Video'))
    assert.ok(json.brief.executionPrompt.includes('Resolved skill: fill-form'))

    if (originalUser === undefined) delete process.env.BROWSER_OPS_BRIGHTDATA_USERNAME
    else process.env.BROWSER_OPS_BRIGHTDATA_USERNAME = originalUser
    if (originalPass === undefined) delete process.env.BROWSER_OPS_BRIGHTDATA_PASSWORD
    else process.env.BROWSER_OPS_BRIGHTDATA_PASSWORD = originalPass
  })

  it('prepares an automation run draft with managed window binding and chat draft', async () => {
    const originalUser = process.env.BROWSER_OPS_BRIGHTDATA_USERNAME
    const originalPass = process.env.BROWSER_OPS_BRIGHTDATA_PASSWORD
    process.env.BROWSER_OPS_BRIGHTDATA_USERNAME = 'brd-user'
    process.env.BROWSER_OPS_BRIGHTDATA_PASSWORD = 'brd-pass'

    const app = createRouteApp()
    const payload = createPreviewPayload()

    const response = await app.request('/automation/run-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        mode: 'agent',
        forceManagedWindow: true,
        restoreCookieVault: true,
      }),
    })

    assert.strictEqual(response.status, 201)
    const json = (await response.json()) as {
      allocation: { allocationId: string }
      binding: { allocationId: string; tabId: number; pageId: number }
      brief: { readiness: string }
      chatDraft: {
        mode: string
        query: string
        browserContext: {
          windowId?: number
          activeTab?: { id: number; pageId?: number }
        }
      }
    }

    assert.strictEqual(json.brief.readiness, 'ready')
    assert.strictEqual(json.chatDraft.mode, 'agent')
    assert.ok(json.chatDraft.query.includes('Browser Ops execution brief'))
    assert.strictEqual(
      json.binding.allocationId,
      json.allocation.allocationId,
    )
    assert.strictEqual(
      json.chatDraft.browserContext.activeTab?.id,
      json.binding.tabId,
    )
    assert.strictEqual(
      json.chatDraft.browserContext.activeTab?.pageId,
      json.binding.pageId,
    )

    if (originalUser === undefined) delete process.env.BROWSER_OPS_BRIGHTDATA_USERNAME
    else process.env.BROWSER_OPS_BRIGHTDATA_USERNAME = originalUser
    if (originalPass === undefined) delete process.env.BROWSER_OPS_BRIGHTDATA_PASSWORD
    else process.env.BROWSER_OPS_BRIGHTDATA_PASSWORD = originalPass
  })

  it('previews and allocates a route', async () => {
    const app = createRouteApp()
    const payload = createPreviewPayload()

    const previewResponse = await app.request('/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    assert.strictEqual(previewResponse.status, 200)
    const previewJson = (await previewResponse.json()) as {
      decision: { mode: string; selectedProxy: { id: string } | null }
    }
    assert.strictEqual(previewJson.decision.mode, 'auto')
    assert.strictEqual(
      previewJson.decision.selectedProxy?.id,
      'proxy_brightdata_us_resi_01',
    )
    assert.strictEqual(previewJson.routeResolution?.providerId, 'brightdata')

    const allocateResponse = await app.request('/allocate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    assert.strictEqual(allocateResponse.status, 201)
    const allocateJson = (await allocateResponse.json()) as {
      allocation: { allocationId: string; state: string }
    }
    assert.strictEqual(allocateJson.allocation.state, 'active')
    assert.ok(allocateJson.allocation.allocationId)
    assert.strictEqual(
      allocateJson.allocation.routeResolution?.providerId,
      'brightdata',
    )
  })

  it('releases an allocated route', async () => {
    const app = createRouteApp()
    const payload = createPreviewPayload()

    const allocateResponse = await app.request('/allocate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const allocateJson = (await allocateResponse.json()) as {
      allocation: { allocationId: string }
    }

    const releaseResponse = await app.request('/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        allocationId: allocateJson.allocation.allocationId,
      }),
    })

    assert.strictEqual(releaseResponse.status, 200)
    const releaseJson = (await releaseResponse.json()) as {
      allocation: { state: string }
    }
    assert.strictEqual(releaseJson.allocation.state, 'released')

    const assetsResponse = await app.request('/runtime/assets')
    const assetsJson = (await assetsResponse.json()) as {
      assets: { state: string }[]
    }
    assert.strictEqual(assetsJson.assets.length, 0)
  })

  it('resolves provider route details directly', async () => {
    const app = createRouteApp()
    const payload = createPreviewPayload()

    const response = await app.request('/providers/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    assert.strictEqual(response.status, 200)
    const json = (await response.json()) as {
      resolution: { providerId: string; authMode: string }
    }
    assert.strictEqual(json.resolution.providerId, 'brightdata')
    assert.strictEqual(json.resolution.authMode, 'provider-template')
  })

  it('binds and unbinds the active runtime window', async () => {
    const app = createRouteApp()
    const payload = createPreviewPayload()

    const allocateResponse = await app.request('/allocate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const allocateJson = (await allocateResponse.json()) as {
      allocation: { allocationId: string }
    }

    const bindResponse = await app.request('/runtime/bind-active-window', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        allocationId: allocateJson.allocation.allocationId,
      }),
    })

    assert.strictEqual(bindResponse.status, 201)
    const bindJson = (await bindResponse.json()) as {
      binding: {
        bindingId: string
        windowId: number
        tabId: number
        controllerClientId: string
      }
      asset: { state: string; profileDirectoryPath: string }
      bundle: { bundleId: string } | null
    }
    assert.strictEqual(bindJson.binding.windowId, 4)
    assert.strictEqual(bindJson.binding.tabId, 12)
    assert.strictEqual(bindJson.binding.controllerClientId, 'client-owner-4')
    assert.strictEqual(bindJson.asset.state, 'active')
    assert.ok(bindJson.asset.profileDirectoryPath.includes('/tmp/profiles/'))
    assert.ok(bindJson.bundle?.bundleId)

    const listBindingsResponse = await app.request('/runtime-bindings')
    assert.strictEqual(listBindingsResponse.status, 200)
    const listBindingsJson = (await listBindingsResponse.json()) as {
      bindings: { bindingId: string }[]
    }
    assert.strictEqual(listBindingsJson.bindings.length, 1)

    const listSpecsResponse = await app.request('/runtime/specs')
    assert.strictEqual(listSpecsResponse.status, 200)
    const listSpecsJson = (await listSpecsResponse.json()) as {
      specs: { sessionPartition: string }[]
    }
    assert.strictEqual(listSpecsJson.specs.length, 1)
    assert.strictEqual(
      listSpecsJson.specs[0]?.sessionPartition,
      'persist:profile_tiktok_us_01',
    )
    assert.strictEqual(
      listSpecsJson.specs[0]?.ownership.controllerClientId,
      'client-owner-4',
    )
    assert.strictEqual(listSpecsJson.specs[0]?.browserContextId, null)

    const listAssetsResponse = await app.request('/runtime/assets')
    assert.strictEqual(listAssetsResponse.status, 200)
    const listAssetsJson = (await listAssetsResponse.json()) as {
      assets: { state: string }[]
    }
    assert.strictEqual(listAssetsJson.assets.length, 1)
    assert.strictEqual(listAssetsJson.assets[0]?.state, 'active')

    const unbindResponse = await app.request('/runtime/unbind', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bindingId: bindJson.binding.bindingId,
      }),
    })

    assert.strictEqual(unbindResponse.status, 200)
    const unbindJson = (await unbindResponse.json()) as {
      binding: { state: string }
    }
    assert.strictEqual(unbindJson.binding.state, 'released')

    const releasedAssetsResponse = await app.request('/runtime/assets')
    const releasedAssetsJson = (await releasedAssetsResponse.json()) as {
      assets: { state: string }[]
    }
    assert.strictEqual(releasedAssetsJson.assets[0]?.state, 'released')
  })

  it('pushes proxy auth rules to the controller when binding a managed route with configured env creds', async () => {
    const originalUser = process.env.BROWSER_OPS_BRIGHTDATA_USERNAME
    const originalPass = process.env.BROWSER_OPS_BRIGHTDATA_PASSWORD
    process.env.BROWSER_OPS_BRIGHTDATA_USERNAME = 'brd-user'
    process.env.BROWSER_OPS_BRIGHTDATA_PASSWORD = 'brd-pass'

    const app = createRouteApp()
    const payload = createPreviewPayload()

    const allocateResponse = await app.request('/allocate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const allocateJson = (await allocateResponse.json()) as {
      allocation: { allocationId: string }
    }

    const bindResponse = await app.request('/runtime/bind-active-window', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        allocationId: allocateJson.allocation.allocationId,
      }),
    })

    assert.strictEqual(bindResponse.status, 201)

    const controllerMessages = (
      app as typeof app & {
        __testState: {
          controllerMessages: Array<{
            action: string
            payload?: Record<string, unknown>
          }>
        }
      }
    ).__testState.controllerMessages
    const proxyAuthMessage = controllerMessages.find(
      (message) => message.action === 'setProxyAuthRule',
    )

    assert.ok(proxyAuthMessage)
    assert.strictEqual(proxyAuthMessage?.payload?.host, 'brd.superproxy.io')
    assert.strictEqual(proxyAuthMessage?.payload?.port, 33335)
    assert.strictEqual(proxyAuthMessage?.payload?.username, 'brd-user')
    assert.strictEqual(proxyAuthMessage?.payload?.password, 'brd-pass')
    assert.strictEqual(proxyAuthMessage?.payload?.tabId, 12)

    if (originalUser === undefined) delete process.env.BROWSER_OPS_BRIGHTDATA_USERNAME
    else process.env.BROWSER_OPS_BRIGHTDATA_USERNAME = originalUser
    if (originalPass === undefined) delete process.env.BROWSER_OPS_BRIGHTDATA_PASSWORD
    else process.env.BROWSER_OPS_BRIGHTDATA_PASSWORD = originalPass
  })

  it('clears proxy auth rules when a bound runtime is unbound', async () => {
    const originalUser = process.env.BROWSER_OPS_BRIGHTDATA_USERNAME
    const originalPass = process.env.BROWSER_OPS_BRIGHTDATA_PASSWORD
    process.env.BROWSER_OPS_BRIGHTDATA_USERNAME = 'brd-user'
    process.env.BROWSER_OPS_BRIGHTDATA_PASSWORD = 'brd-pass'

    const app = createRouteApp()
    const payload = createPreviewPayload()

    const allocateResponse = await app.request('/allocate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const allocateJson = (await allocateResponse.json()) as {
      allocation: { allocationId: string }
    }

    const bindResponse = await app.request('/runtime/bind-active-window', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        allocationId: allocateJson.allocation.allocationId,
      }),
    })
    const bindJson = (await bindResponse.json()) as {
      binding: { bindingId: string }
    }

    const unbindResponse = await app.request('/runtime/unbind', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bindingId: bindJson.binding.bindingId,
      }),
    })

    assert.strictEqual(unbindResponse.status, 200)

    const controllerMessages = (
      app as typeof app & {
        __testState: {
          controllerMessages: Array<{
            action: string
            payload?: Record<string, unknown>
          }>
        }
      }
    ).__testState.controllerMessages
    const clearMessage = controllerMessages.find(
      (message) => message.action === 'clearProxyAuthRule',
    )

    assert.ok(clearMessage)
    assert.strictEqual(clearMessage?.payload?.ruleId, bindJson.binding.bindingId)

    if (originalUser === undefined) delete process.env.BROWSER_OPS_BRIGHTDATA_USERNAME
    else process.env.BROWSER_OPS_BRIGHTDATA_USERNAME = originalUser
    if (originalPass === undefined) delete process.env.BROWSER_OPS_BRIGHTDATA_PASSWORD
    else process.env.BROWSER_OPS_BRIGHTDATA_PASSWORD = originalPass
  })

  it('clears proxy auth rules when an allocation is released', async () => {
    const originalUser = process.env.BROWSER_OPS_BRIGHTDATA_USERNAME
    const originalPass = process.env.BROWSER_OPS_BRIGHTDATA_PASSWORD
    process.env.BROWSER_OPS_BRIGHTDATA_USERNAME = 'brd-user'
    process.env.BROWSER_OPS_BRIGHTDATA_PASSWORD = 'brd-pass'

    const app = createRouteApp()
    const payload = createPreviewPayload()

    const allocateResponse = await app.request('/allocate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const allocateJson = (await allocateResponse.json()) as {
      allocation: { allocationId: string }
    }

    await app.request('/runtime/bind-active-window', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        allocationId: allocateJson.allocation.allocationId,
      }),
    })

    const releaseResponse = await app.request('/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        allocationId: allocateJson.allocation.allocationId,
      }),
    })

    assert.strictEqual(releaseResponse.status, 200)

    const controllerMessages = (
      app as typeof app & {
        __testState: {
          controllerMessages: Array<{
            action: string
            payload?: Record<string, unknown>
          }>
        }
      }
    ).__testState.controllerMessages
    const clearMessage = controllerMessages.find(
      (message) => message.action === 'clearProxyAuthRule',
    )

    assert.ok(clearMessage)

    if (originalUser === undefined) delete process.env.BROWSER_OPS_BRIGHTDATA_USERNAME
    else process.env.BROWSER_OPS_BRIGHTDATA_USERNAME = originalUser
    if (originalPass === undefined) delete process.env.BROWSER_OPS_BRIGHTDATA_PASSWORD
    else process.env.BROWSER_OPS_BRIGHTDATA_PASSWORD = originalPass
  })

  it('returns controller window ownership registry', async () => {
    const app = createRouteApp()
    const response = await app.request('/runtime/ownership')

    assert.strictEqual(response.status, 200)
    const json = (await response.json()) as {
      ownership: { clientId: string; windowId: number }[]
    }
    assert.strictEqual(json.ownership.length, 2)
    assert.strictEqual(json.ownership[0]?.clientId, 'client-owner-4')
    assert.strictEqual(json.ownership[0]?.windowId, 4)
  })

  it('registers and lists managed instances', async () => {
    const app = createRouteApp()
    const payload = createPreviewPayload()

    const allocateResponse = await app.request('/allocate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const allocateJson = (await allocateResponse.json()) as {
      allocation: { allocationId: string }
    }

    await app.request('/runtime/open-managed-window', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        allocationId: allocateJson.allocation.allocationId,
        url: 'https://sellercentral.amazon.com',
        hidden: false,
        restoreCookieVault: false,
      }),
    })

    const bundlesResponse = await app.request('/runtime/launch-bundles')
    const bundlesJson = (await bundlesResponse.json()) as {
      bundles: { specId: string }[]
    }
    const specId = bundlesJson.bundles[0]?.specId
    assert.ok(specId)

    await app.request('/runtime/launch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        specId,
        execute: true,
      }),
    })

    const instancesResponse = await app.request('/runtime/instances')
    assert.strictEqual(instancesResponse.status, 200)
    const instancesJson = (await instancesResponse.json()) as {
      instances: { instanceId: string; state: string; ports: { cdp: number } }[]
    }
    assert.strictEqual(instancesJson.instances.length, 1)
    assert.strictEqual(instancesJson.instances[0]?.state, 'running')
    assert.ok((instancesJson.instances[0]?.ports.cdp ?? 0) > 0)

    const refreshResponse = await app.request('/runtime/instances/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instanceId: instancesJson.instances[0]?.instanceId,
      }),
    })
    assert.strictEqual(refreshResponse.status, 200)

    const refreshAllResponse = await app.request(
      '/runtime/instances/refresh-all',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
    )
    assert.strictEqual(refreshAllResponse.status, 200)

    const eventsResponse = await app.request('/runtime/instance-events')
    assert.strictEqual(eventsResponse.status, 200)
    const eventsJson = (await eventsResponse.json()) as {
      events: { action: string }[]
    }
    assert.ok(eventsJson.events.length >= 2)
  })

  it('returns runtime diagnostics', async () => {
    const app = createRouteApp()
    const payload = createPreviewPayload()

    const allocateResponse = await app.request('/allocate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const allocateJson = (await allocateResponse.json()) as {
      allocation: { allocationId: string }
    }

    await app.request('/runtime/bind-active-window', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        allocationId: allocateJson.allocation.allocationId,
      }),
    })

    const response = await app.request('/runtime/diagnostics')

    assert.strictEqual(response.status, 200)
    const json = (await response.json()) as {
      diagnostics: {
        browserWindows: { windowId: number }[]
        liveBrowserContextIds: string[]
        unboundAllocationIds: string[]
        controllerOwnershipDrift: string[]
        browserContextsWithoutSpecs: string[]
      }
    }
    assert.strictEqual(json.diagnostics.browserWindows.length, 2)
    assert.strictEqual(json.diagnostics.liveBrowserContextIds.length, 1)
    assert.strictEqual(json.diagnostics.browserWindows[0]?.windowId, 4)
    assert.strictEqual(json.diagnostics.unboundAllocationIds.length, 0)
    assert.strictEqual(json.diagnostics.controllerOwnershipDrift.length, 0)
    assert.strictEqual(json.diagnostics.browserContextsWithoutSpecs.length, 1)
    assert.ok(
      json.diagnostics.browserContextsWithoutSpecs.includes('orphan-context'),
    )
  })

  it('opens a managed window and binds it', async () => {
    const app = createRouteApp()
    const payload = createPreviewPayload()

    const allocateResponse = await app.request('/allocate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const allocateJson = (await allocateResponse.json()) as {
      allocation: { allocationId: string }
    }

    const initialBindResponse = await app.request(
      '/runtime/bind-active-window',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allocationId: allocateJson.allocation.allocationId,
        }),
      },
    )
    const initialBindJson = (await initialBindResponse.json()) as {
      binding: { bindingId: string }
    }

    await app.request('/runtime/cookie-vault/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bindingId: initialBindJson.binding.bindingId,
      }),
    })

    const response = await app.request('/runtime/open-managed-window', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        allocationId: allocateJson.allocation.allocationId,
        url: 'https://sellercentral.amazon.com',
        hidden: false,
        restoreCookieVault: true,
      }),
    })

    assert.strictEqual(response.status, 201)
    const json = (await response.json()) as {
      window: { windowId: number }
      page: { pageId: number; windowId: number; url: string; title: string }
      binding: { windowId: number; controllerClientId: string | null }
      asset: { state: string }
      bundle: {
        bundleId: string
        userDataDir: string
        launcherScriptPath: string
      }
      restoredCookies: number
    }
    assert.strictEqual(json.window.windowId, 5)
    assert.strictEqual(json.page.pageId, 88)
    assert.strictEqual(json.page.windowId, 5)
    assert.strictEqual(json.page.url, 'https://sellercentral.amazon.com')
    assert.strictEqual(json.page.title, 'Amazon Seller Central')
    assert.strictEqual(json.binding.windowId, 5)
    assert.strictEqual(json.binding.controllerClientId, 'client-owner-5')
    assert.strictEqual(json.asset.state, 'active')
    assert.ok(json.bundle.bundleId)
    assert.ok(json.bundle.userDataDir.includes('/tmp/profiles/'))
    assert.ok(json.bundle.launcherScriptPath.endsWith('.sh'))
    assert.strictEqual(json.restoredCookies, 1)

    const specsResponse = await app.request('/runtime/specs')
    const specsJson = (await specsResponse.json()) as {
      specs: { browserContextId: string | null }[]
    }
    assert.strictEqual(specsJson.specs[0]?.browserContextId, 'context-5')

    const bundlesResponse = await app.request('/runtime/launch-bundles')
    assert.strictEqual(bundlesResponse.status, 200)
    const bundlesJson = (await bundlesResponse.json()) as {
      bundles: { specId: string }[]
    }
    assert.ok(bundlesJson.bundles.length >= 1)
    assert.ok(
      bundlesJson.bundles.some(
        (bundle) => bundle.specId === specsJson.specs[0]?.specId,
      ),
    )
  })

  it('reconciles orphan and missing browser contexts', async () => {
    const app = createRouteApp() as typeof createRouteApp extends () => infer T
      ? T & {
          __testState: {
            liveBrowserContexts: string[]
            disposedBrowserContexts: string[]
          }
        }
      : never
    const payload = createPreviewPayload()

    const allocateResponse = await app.request('/allocate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const allocateJson = (await allocateResponse.json()) as {
      allocation: { allocationId: string }
    }

    const bindResponse = await app.request('/runtime/bind-active-window', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        allocationId: allocateJson.allocation.allocationId,
      }),
    })
    const bindJson = (await bindResponse.json()) as {
      binding: { bindingId: string }
    }

    await app.request('/runtime/cookie-vault/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bindingId: bindJson.binding.bindingId,
      }),
    })

    await app.request('/runtime/open-managed-window', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        allocationId: allocateJson.allocation.allocationId,
        url: 'https://sellercentral.amazon.com',
        hidden: false,
        restoreCookieVault: true,
      }),
    })

    app.__testState.liveBrowserContexts.splice(
      app.__testState.liveBrowserContexts.indexOf('context-5'),
      1,
    )

    const response = await app.request('/runtime/reconcile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        disposeOrphanContexts: true,
        recreateMissingContexts: true,
      }),
    })

    assert.strictEqual(response.status, 200)
    const json = (await response.json()) as {
      disposedContextIds: string[]
      recreatedContexts: { browserContextId: string; restoredCookies: number }[]
      diagnostics: {
        specsWithoutBrowserContext: string[]
        browserContextsWithoutSpecs: string[]
      }
    }
    assert.ok(json.disposedContextIds.includes('orphan-context'))
    assert.strictEqual(json.recreatedContexts.length, 1)
    assert.strictEqual(json.recreatedContexts[0]?.browserContextId, 'context-6')
    assert.strictEqual(json.recreatedContexts[0]?.restoredCookies, 1)
    assert.strictEqual(json.diagnostics.specsWithoutBrowserContext.length, 0)
    assert.strictEqual(json.diagnostics.browserContextsWithoutSpecs.length, 0)
  })

  it('captures, restores, and clears cookie vaults', async () => {
    const app = createRouteApp()
    const payload = createPreviewPayload()

    const allocateResponse = await app.request('/allocate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const allocateJson = (await allocateResponse.json()) as {
      allocation: { allocationId: string }
    }

    const bindResponse = await app.request('/runtime/bind-active-window', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        allocationId: allocateJson.allocation.allocationId,
      }),
    })
    const bindJson = (await bindResponse.json()) as {
      binding: { bindingId: string }
    }

    const captureResponse = await app.request('/runtime/cookie-vault/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bindingId: bindJson.binding.bindingId }),
    })
    assert.strictEqual(captureResponse.status, 200)
    const captureJson = (await captureResponse.json()) as { captured: number }
    assert.strictEqual(captureJson.captured, 1)

    const vaultsResponse = await app.request('/runtime/cookie-vaults')
    const vaultsJson = (await vaultsResponse.json()) as {
      vaults: { cookieCount: number }[]
    }
    assert.strictEqual(vaultsJson.vaults[0]?.cookieCount, 1)

    const restoreResponse = await app.request('/runtime/cookie-vault/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bindingId: bindJson.binding.bindingId }),
    })
    assert.strictEqual(restoreResponse.status, 200)

    const clearResponse = await app.request('/runtime/cookie-vault/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bindingId: bindJson.binding.bindingId }),
    })
    assert.strictEqual(clearResponse.status, 200)

    const clearedVaultsResponse = await app.request('/runtime/cookie-vaults')
    const clearedVaultsJson = (await clearedVaultsResponse.json()) as {
      vaults: { cookieCount: number }[]
    }
    assert.strictEqual(clearedVaultsJson.vaults[0]?.cookieCount, 0)
  })

  it('prepares and starts launch executions from bundles', async () => {
    const app = createRouteApp()
    const payload = createPreviewPayload()

    const allocateResponse = await app.request('/allocate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const allocateJson = (await allocateResponse.json()) as {
      allocation: { allocationId: string }
    }

    await app.request('/runtime/open-managed-window', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        allocationId: allocateJson.allocation.allocationId,
        url: 'https://sellercentral.amazon.com',
        hidden: false,
        restoreCookieVault: false,
      }),
    })

    const bundlesResponse = await app.request('/runtime/launch-bundles')
    const bundlesJson = (await bundlesResponse.json()) as {
      bundles: { specId: string }[]
    }
    const specId = bundlesJson.bundles[0]?.specId
    assert.ok(specId)

    const prepareResponse = await app.request('/runtime/launch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        specId,
        execute: false,
      }),
    })
    assert.strictEqual(prepareResponse.status, 201)
    const prepareJson = (await prepareResponse.json()) as {
      execution: {
        state: string
        dryRun: boolean
        executionId: string
        ports: { cdp: number; server: number; extension: number }
      }
    }
    assert.strictEqual(prepareJson.execution.state, 'prepared')
    assert.strictEqual(prepareJson.execution.dryRun, true)
    assert.strictEqual(prepareJson.execution.ports.cdp, 9501)

    const launchResponse = await app.request('/runtime/launch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        specId,
        execute: true,
      }),
    })
    assert.strictEqual(launchResponse.status, 201)
    const launchJson = (await launchResponse.json()) as {
      execution: {
        state: string
        pid: number | null
        executionId: string
        ports: { cdp: number; server: number; extension: number }
      }
    }
    assert.strictEqual(launchJson.execution.state, 'launched')
    assert.strictEqual(launchJson.execution.pid, 4242)
    assert.strictEqual(launchJson.execution.ports.extension, 9801)

    const listExecutionsResponse = await app.request(
      '/runtime/launch-executions',
    )
    const listExecutionsJson = (await listExecutionsResponse.json()) as {
      executions: { executionId: string }[]
    }
    assert.strictEqual(listExecutionsJson.executions.length, 2)

    const stopResponse = await app.request('/runtime/launch/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        executionId: launchJson.execution.executionId,
      }),
    })
    assert.strictEqual(stopResponse.status, 200)
    const stopJson = (await stopResponse.json()) as {
      execution: { state: string }
    }
    assert.strictEqual(stopJson.execution.state, 'stopped')
  })

  it('returns launch diagnostics and reconciles orphan executions', async () => {
    const app = createRouteApp()
    const payload = createPreviewPayload()

    const allocateResponse = await app.request('/allocate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const allocateJson = (await allocateResponse.json()) as {
      allocation: { allocationId: string }
    }

    await app.request('/runtime/open-managed-window', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        allocationId: allocateJson.allocation.allocationId,
        url: 'https://sellercentral.amazon.com',
        hidden: false,
        restoreCookieVault: false,
      }),
    })

    const bundlesResponse = await app.request('/runtime/launch-bundles')
    const bundlesJson = (await bundlesResponse.json()) as {
      bundles: { specId: string }[]
    }
    const specId = bundlesJson.bundles[0]?.specId
    assert.ok(specId)

    await app.request('/runtime/launch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        specId,
        execute: true,
      }),
    })

    const diagnosticsResponse = await app.request('/runtime/launch-diagnostics')
    assert.strictEqual(diagnosticsResponse.status, 200)
    const diagnosticsJson = (await diagnosticsResponse.json()) as {
      diagnostics: {
        launchedExecutionIds: string[]
        orphanLaunchedExecutionIds: string[]
      }
    }
    assert.strictEqual(
      diagnosticsJson.diagnostics.launchedExecutionIds.length,
      1,
    )
    assert.strictEqual(
      diagnosticsJson.diagnostics.orphanLaunchedExecutionIds.length,
      0,
    )

    const instanceDiagnosticsResponse = await app.request(
      '/runtime/instance-diagnostics',
    )
    assert.strictEqual(instanceDiagnosticsResponse.status, 200)
    const instanceDiagnosticsJson =
      (await instanceDiagnosticsResponse.json()) as {
        diagnostics: { runningInstanceIds: string[] }
      }
    assert.strictEqual(
      instanceDiagnosticsJson.diagnostics.runningInstanceIds.length,
      1,
    )

    const releaseResponse = await app.request('/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        allocationId: allocateJson.allocation.allocationId,
      }),
    })
    assert.strictEqual(releaseResponse.status, 200)

    const afterReleaseDiagnosticsResponse = await app.request(
      '/runtime/launch-diagnostics',
    )
    const afterReleaseDiagnosticsJson =
      (await afterReleaseDiagnosticsResponse.json()) as {
        diagnostics: { orphanLaunchedExecutionIds: string[] }
      }
    assert.strictEqual(
      afterReleaseDiagnosticsJson.diagnostics.orphanLaunchedExecutionIds.length,
      0,
    )

    const executionsResponse = await app.request('/runtime/launch-executions')
    const executionsJson = (await executionsResponse.json()) as {
      executions: { state: string }[]
    }
    assert.ok(
      executionsJson.executions.some(
        (execution) => execution.state === 'stopped',
      ),
    )

    const reconcileResponse = await app.request('/runtime/launch/reconcile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stopOrphanLaunchedExecutions: true,
      }),
    })
    assert.strictEqual(reconcileResponse.status, 200)

    const instanceReconcileResponse = await app.request(
      '/runtime/instances/reconcile',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stopOrphanInstances: true,
          refreshHealth: true,
        }),
      },
    )
    assert.strictEqual(instanceReconcileResponse.status, 200)
  })

  it('restarts and cleans up managed instances', async () => {
    const app = createRouteApp()
    const payload = createPreviewPayload()

    const allocateResponse = await app.request('/allocate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const allocateJson = (await allocateResponse.json()) as {
      allocation: { allocationId: string }
    }

    await app.request('/runtime/open-managed-window', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        allocationId: allocateJson.allocation.allocationId,
        url: 'https://sellercentral.amazon.com',
        hidden: false,
        restoreCookieVault: false,
      }),
    })

    const bundlesResponse = await app.request('/runtime/launch-bundles')
    const bundlesJson = (await bundlesResponse.json()) as {
      bundles: { specId: string }[]
    }
    const specId = bundlesJson.bundles[0]?.specId
    assert.ok(specId)

    await app.request('/runtime/launch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        specId,
        execute: true,
      }),
    })

    const instancesResponse = await app.request('/runtime/instances')
    const instancesJson = (await instancesResponse.json()) as {
      instances: { instanceId: string }[]
    }
    const instanceId = instancesJson.instances[0]?.instanceId
    assert.ok(instanceId)

    const restartResponse = await app.request('/runtime/instances/restart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instanceId,
        execute: false,
      }),
    })
    assert.strictEqual(restartResponse.status, 201)

    const hardCleanupResponse = await app.request(
      '/runtime/instances/hard-cleanup',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId,
          removeExecution: true,
        }),
      },
    )
    assert.strictEqual(hardCleanupResponse.status, 200)

    const cleanupResponse = await app.request('/runtime/instances/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        removeStopped: true,
        removeFailed: true,
        removeOrphan: false,
      }),
    })
    assert.strictEqual(cleanupResponse.status, 200)
  })
})
