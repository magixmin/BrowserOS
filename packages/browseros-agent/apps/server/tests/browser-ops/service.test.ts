import { describe, it } from 'bun:test'
import assert from 'node:assert'
import type { BrowserOpsPreviewInput } from '@browseros/shared/browser-ops'
import { BrowserOpsService } from '../../src/api/services/browser-ops/service'

function createPreviewInput(): BrowserOpsPreviewInput {
  return {
    profile: {
      id: 'profile_amazon_us_01',
      name: 'Amazon Seller US',
      accountLabel: 'seller-central-us',
      platform: 'amazon',
      marketCountry: 'US',
      proxyMode: 'manual',
      preferredIpTypes: ['isp', 'residential'],
      preferredRegion: 'US',
      manualProxyId: 'proxy_decodo_us_isp_01',
      sessionPartition: 'persist:profile_amazon_us_01',
      cookieVaultKey: 'vault:profile_amazon_us_01',
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
      tags: ['seller', 'ops'],
    },
    task: {
      id: 'task_amazon_listing_check',
      name: 'Amazon Listing Monitor',
      platform: 'amazon',
      taskType: 'operations',
      goal: 'Inspect listing health and collect account signals.',
      targetCountry: 'US',
      requiredIpTypes: ['isp', 'residential'],
      preferredSessionMode: 'sticky',
      rotateIpOnEachRun: false,
      humanizationLevel: 'balanced',
      skillKey: 'inspect_amazon_listing',
    },
    proxies: [
      {
        id: 'proxy_decodo_us_isp_01',
        name: 'Decodo US ISP',
        sourceType: 'managed',
        providerName: 'Decodo',
        endpoint: 'gate.decodo.com:10000',
        builtInPool: true,
        ipType: 'isp',
        sessionMode: 'sticky',
        countries: ['US'],
        rotationSupport: false,
        stickySessionTtlMinutes: 45,
        status: 'active',
        health: {
          successRate: 0.97,
          banRate: 0.01,
          latencyMs: 320,
          lastCheckedAt: new Date().toISOString(),
        },
      },
      {
        id: 'proxy_trial_us_resi_01',
        name: 'Trial US Pool',
        sourceType: 'trial',
        providerName: 'BrowserOS Trial',
        endpoint: 'trial.browseros.local:8080',
        builtInPool: true,
        ipType: 'residential',
        sessionMode: 'rotating',
        countries: ['US'],
        rotationSupport: true,
        status: 'paused',
        health: {
          successRate: 0.8,
          banRate: 0.08,
          latencyMs: 850,
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

describe('BrowserOpsService', () => {
  it('lists provider catalog entries', () => {
    const service = new BrowserOpsService()
    const providers = service.listProviders()

    assert.ok(providers.length >= 5)
    assert.ok(providers.some((provider) => provider.id === 'brightdata'))
    assert.ok(providers.some((provider) => provider.id === 'byo'))
  })

  it('previews a manual route and matches the provider adapter', () => {
    const service = new BrowserOpsService()
    const result = service.previewRoute(createPreviewInput())

    assert.strictEqual(result.engine, 'browser-ops-v1')
    assert.strictEqual(result.decision.mode, 'manual')
    assert.strictEqual(
      result.decision.selectedProxy?.id,
      'proxy_decodo_us_isp_01',
    )
    assert.strictEqual(result.matchedProvider?.id, 'decodo')
    assert.strictEqual(result.routeResolution?.providerId, 'decodo')
    assert.strictEqual(result.routeResolution?.authMode, 'provider-template')
    assert.ok(
      result.decision.reasons.some((reason) =>
        reason.includes('Provider adapter recognized: Decodo'),
      ),
    )
    assert.ok(
      result.decision.reasons.some((reason) => reason.includes('Health tier:')),
    )
  })

  it('returns unresolved when automatic routing is disabled for an auto profile', () => {
    const service = new BrowserOpsService()
    const input = createPreviewInput()
    input.profile.proxyMode = 'auto'
    input.profile.manualProxyId = undefined
    input.settings.autoRouteIp = false

    const result = service.previewRoute(input)

    assert.strictEqual(result.decision.mode, 'unresolved')
    assert.strictEqual(result.decision.selectedProxy, null)
    assert.ok(
      result.decision.warnings.some((warning) =>
        warning.includes('Enable Auto-route IP'),
      ),
    )
  })

  it('allocates and releases a route', () => {
    const service = new BrowserOpsService()
    const allocation = service.allocateRoute(createPreviewInput())

    assert.strictEqual(allocation.profileId, 'profile_amazon_us_01')
    assert.strictEqual(allocation.taskId, 'task_amazon_listing_check')
    assert.strictEqual(allocation.state, 'active')
    assert.strictEqual(allocation.routeResolution?.providerId, 'decodo')
    assert.ok(
      service
        .listAllocations()
        .some((item) => item.allocationId === allocation.allocationId),
    )

    const released = service.releaseAllocation(allocation.allocationId)

    assert.ok(released)
    assert.strictEqual(released?.state, 'released')
    assert.strictEqual(service.listAllocations().length, 0)
  })

  it('binds an allocation to a browser page and can unbind it', () => {
    const service = new BrowserOpsService()
    const allocation = service.allocateRoute(createPreviewInput())

    const binding = service.bindAllocationToPage({
      allocationId: allocation.allocationId,
      controllerClientId: 'client-1',
      page: {
        pageId: 77,
        tabId: 15,
        windowId: 9,
        url: 'https://sellercentral.amazon.com',
        title: 'Amazon Seller Central',
      },
    })

    assert.ok(binding)
    assert.strictEqual(binding?.allocationId, allocation.allocationId)
    assert.strictEqual(binding?.controllerClientId, 'client-1')
    assert.strictEqual(binding?.windowId, 9)
    assert.ok(binding?.runtimeSpecId)
    assert.strictEqual(service.listRuntimeBindings().length, 1)
    assert.strictEqual(service.listRuntimeSessionSpecs().length, 1)
    assert.strictEqual(
      service.listRuntimeSessionSpecs()[0]?.sessionPartition,
      'persist:profile_amazon_us_01',
    )
    assert.strictEqual(
      service.listRuntimeSessionSpecs()[0]?.ownership.controllerClientId,
      'client-1',
    )

    const released = service.unbindRuntime(binding?.bindingId ?? '')

    assert.ok(released)
    assert.strictEqual(released?.state, 'released')
    assert.strictEqual(service.listRuntimeBindings().length, 0)
    assert.strictEqual(service.listRuntimeSessionSpecs().length, 0)
  })

  it('produces runtime diagnostics', () => {
    const service = new BrowserOpsService()
    const allocation = service.allocateRoute(createPreviewInput())
    service.bindAllocationToPage({
      allocationId: allocation.allocationId,
      controllerClientId: 'client-1',
      page: {
        pageId: 77,
        tabId: 15,
        windowId: 9,
        url: 'https://sellercentral.amazon.com',
        title: 'Amazon Seller Central',
      },
    })

    const diagnostics = service.getRuntimeDiagnostics({
      browserWindows: [
        {
          windowId: 9,
          isActive: true,
          tabCount: 3,
          windowType: 'normal',
        },
      ],
      controllerOwnership: [
        {
          clientId: 'client-1',
          windowId: 9,
          isPrimaryClient: true,
          isFocusedWindow: true,
        },
      ],
      liveBrowserContextIds: ['ctx-live-1'],
    })

    assert.strictEqual(diagnostics.unboundAllocationIds.length, 0)
    assert.strictEqual(diagnostics.bindingsWithoutBrowserWindow.length, 0)
    assert.strictEqual(diagnostics.bindingsWithoutControllerOwnership.length, 0)
    assert.strictEqual(diagnostics.controllerOwnershipDrift.length, 0)
    assert.strictEqual(diagnostics.specsWithoutBindings.length, 0)
    assert.strictEqual(diagnostics.browserContextsWithoutSpecs.length, 1)
    assert.strictEqual(diagnostics.browserContextsWithoutSpecs[0], 'ctx-live-1')
  })

  it('detects missing browser contexts for runtime specs', () => {
    const service = new BrowserOpsService()
    const allocation = service.allocateRoute(createPreviewInput())
    service.bindAllocationToPage({
      allocationId: allocation.allocationId,
      controllerClientId: 'client-1',
      browserContextId: 'ctx-missing',
      page: {
        pageId: 77,
        tabId: 15,
        windowId: 9,
        url: 'https://sellercentral.amazon.com',
        title: 'Amazon Seller Central',
      },
    })

    const diagnostics = service.getRuntimeDiagnostics({
      browserWindows: [
        {
          windowId: 9,
          isActive: true,
          tabCount: 3,
          windowType: 'normal',
        },
      ],
      controllerOwnership: [
        {
          clientId: 'client-1',
          windowId: 9,
          isPrimaryClient: true,
          isFocusedWindow: true,
        },
      ],
      liveBrowserContextIds: [],
    })

    assert.strictEqual(diagnostics.specsWithoutBrowserContext.length, 1)
  })
})
