import type {
  BrowserOpsBrowserWindowSnapshot,
  BrowserOpsControllerWindowOwnership,
  BrowserOpsPreviewInput,
  BrowserOpsPreviewResult,
  BrowserOpsProviderCatalogEntry,
  BrowserOpsProviderRouteResolution,
  BrowserOpsRouteAllocation,
  BrowserOpsRuntimeBinding,
  BrowserOpsRuntimeDiagnostics,
  BrowserOpsRuntimeSessionSpec,
} from '@browseros/shared/browser-ops'
import {
  assessBrowserOpsProxyHealth,
  resolveBrowserOpsRouteDecision,
} from '@browseros/shared/browser-ops'
import {
  listBrowserOpsProviders,
  matchBrowserOpsProvider,
  resolveBrowserOpsProviderRoute,
} from './providers'

export class BrowserOpsService {
  private allocations = new Map<string, BrowserOpsRouteAllocation>()
  private allocationInputs = new Map<string, BrowserOpsPreviewInput>()
  private runtimeBindings = new Map<string, BrowserOpsRuntimeBinding>()
  private runtimeSessionSpecs = new Map<string, BrowserOpsRuntimeSessionSpec>()

  listProviders(): BrowserOpsProviderCatalogEntry[] {
    return listBrowserOpsProviders()
  }

  listAllocations(): BrowserOpsRouteAllocation[] {
    this.pruneExpiredAllocations()

    return [...this.allocations.values()].sort((left, right) =>
      left.createdAt < right.createdAt ? 1 : -1,
    )
  }

  listRuntimeBindings(): BrowserOpsRuntimeBinding[] {
    return [...this.runtimeBindings.values()].sort((left, right) =>
      left.createdAt < right.createdAt ? 1 : -1,
    )
  }

  listRuntimeSessionSpecs(): BrowserOpsRuntimeSessionSpec[] {
    return [...this.runtimeSessionSpecs.values()].sort((left, right) =>
      left.createdAt < right.createdAt ? 1 : -1,
    )
  }

  getRuntimeBinding(bindingId: string): BrowserOpsRuntimeBinding | null {
    return this.runtimeBindings.get(bindingId) ?? null
  }

  getRuntimeSessionSpec(specId: string): BrowserOpsRuntimeSessionSpec | null {
    return this.runtimeSessionSpecs.get(specId) ?? null
  }

  updateRuntimeSessionBrowserContext(
    specId: string,
    browserContextId: string | null,
  ): BrowserOpsRuntimeSessionSpec | null {
    const existing = this.runtimeSessionSpecs.get(specId)
    if (!existing) return null

    const updated: BrowserOpsRuntimeSessionSpec = {
      ...existing,
      browserContextId,
    }
    this.runtimeSessionSpecs.set(specId, updated)
    return updated
  }

  getRuntimeDiagnostics(args: {
    browserWindows: BrowserOpsBrowserWindowSnapshot[]
    liveBrowserContextIds: string[]
    controllerOwnership: BrowserOpsControllerWindowOwnership[]
  }): BrowserOpsRuntimeDiagnostics {
    const browserWindowIds = new Set(
      args.browserWindows.map((window) => window.windowId),
    )
    const liveBrowserContextIds = new Set(args.liveBrowserContextIds)
    const ownershipByWindowId = new Map(
      args.controllerOwnership.map((ownership) => [
        ownership.windowId,
        ownership,
      ]),
    )
    const bindingIds = new Set(this.runtimeBindings.keys())
    const boundAllocationIds = new Set(
      [...this.runtimeBindings.values()].map((binding) => binding.allocationId),
    )

    const unboundAllocationIds = [...this.allocations.keys()].filter(
      (allocationId) => !boundAllocationIds.has(allocationId),
    )

    const bindingsWithoutBrowserWindow: string[] = []
    const bindingsWithoutControllerOwnership: string[] = []
    const controllerOwnershipDrift: string[] = []
    const specsWithoutBrowserContext: string[] = []

    for (const binding of this.runtimeBindings.values()) {
      if (
        typeof binding.windowId === 'number' &&
        !browserWindowIds.has(binding.windowId)
      ) {
        bindingsWithoutBrowserWindow.push(binding.bindingId)
      }

      if (binding.windowId === null) {
        bindingsWithoutControllerOwnership.push(binding.bindingId)
        continue
      }

      const ownership = ownershipByWindowId.get(binding.windowId)

      if (!ownership) {
        bindingsWithoutControllerOwnership.push(binding.bindingId)
        continue
      }

      if (
        binding.controllerClientId !== null &&
        ownership.clientId !== binding.controllerClientId
      ) {
        controllerOwnershipDrift.push(binding.bindingId)
      }
    }

    const specsWithoutBindings = [...this.runtimeSessionSpecs.values()]
      .filter((spec) => !bindingIds.has(spec.bindingId))
      .map((spec) => spec.specId)

    const specContextIds = new Set<string>()
    for (const spec of this.runtimeSessionSpecs.values()) {
      if (spec.browserContextId) {
        specContextIds.add(spec.browserContextId)
        if (!liveBrowserContextIds.has(spec.browserContextId)) {
          specsWithoutBrowserContext.push(spec.specId)
        }
      }
    }

    const browserContextsWithoutSpecs = [...liveBrowserContextIds].filter(
      (browserContextId) => !specContextIds.has(browserContextId),
    )

    return {
      browserWindows: args.browserWindows,
      liveBrowserContextIds: args.liveBrowserContextIds,
      controllerOwnership: args.controllerOwnership,
      unboundAllocationIds,
      bindingsWithoutBrowserWindow,
      bindingsWithoutControllerOwnership,
      controllerOwnershipDrift,
      specsWithoutBindings,
      specsWithoutBrowserContext,
      browserContextsWithoutSpecs,
    }
  }

  previewRoute(input: BrowserOpsPreviewInput): BrowserOpsPreviewResult {
    const providerCatalog = this.listProviders()
    const baseDecision = resolveBrowserOpsRouteDecision(input)
    const matchedProvider = baseDecision.selectedProxy
      ? matchBrowserOpsProvider(baseDecision.selectedProxy)
      : null
    const routeResolution = baseDecision.selectedProxy
      ? resolveBrowserOpsProviderRoute({
          proxy: baseDecision.selectedProxy,
          decision: baseDecision,
          profileId: input.profile.id,
          taskId: input.task.id,
        })
      : null

    const reasons = [...baseDecision.reasons]
    const warnings = [...baseDecision.warnings]

    if (matchedProvider) {
      reasons.push(
        `Provider adapter recognized: ${matchedProvider.name} (${matchedProvider.stage})`,
      )

      if (matchedProvider.stage === 'planned') {
        warnings.push(
          `${matchedProvider.name} adapter is planned and not fully wired yet`,
        )
      }
    } else if (baseDecision.selectedProxy) {
      warnings.push(
        `No provider adapter matched ${baseDecision.selectedProxy.providerName}`,
      )
    }

    if (baseDecision.selectedProxy) {
      const health = assessBrowserOpsProxyHealth(baseDecision.selectedProxy)
      reasons.push(`Health tier: ${health.tier} (${health.score})`)

      if (health.tier === 'blocked') {
        warnings.push(
          'Selected proxy health is below the preferred operating threshold.',
        )
      } else if (health.tier === 'risky') {
        warnings.push(
          'Selected proxy health is risky and should be monitored closely.',
        )
      }
    }

    return {
      engine: 'browser-ops-v1',
      evaluatedProxyCount: input.proxies.filter(
        (proxy) => proxy.status === 'active',
      ).length,
      matchedProvider,
      providerCatalog,
      routeResolution,
      decision: {
        ...baseDecision,
        reasons,
        warnings,
      },
    }
  }

  resolveProviderRoute(
    input: BrowserOpsPreviewInput,
  ): BrowserOpsProviderRouteResolution | null {
    const preview = this.previewRoute(input)
    return preview.routeResolution
  }

  allocateRoute(input: BrowserOpsPreviewInput): BrowserOpsRouteAllocation {
    const preview = this.previewRoute(input)
    const now = new Date()
    const ttlMinutes =
      preview.decision.selectedProxy?.stickySessionTtlMinutes ??
      (preview.decision.rotationStrategy === 'sticky-session' ? 30 : 10)
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60_000)

    const allocation: BrowserOpsRouteAllocation = {
      allocationId: crypto.randomUUID(),
      profileId: input.profile.id,
      taskId: input.task.id,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      state: 'active',
      decision: preview.decision,
      matchedProvider: preview.matchedProvider,
      routeResolution: preview.routeResolution,
    }

    this.allocations.set(allocation.allocationId, allocation)
    this.allocationInputs.set(allocation.allocationId, structuredClone(input))
    return allocation
  }

  releaseAllocation(allocationId: string): BrowserOpsRouteAllocation | null {
    const existing = this.allocations.get(allocationId)
    if (!existing) return null

    const released: BrowserOpsRouteAllocation = {
      ...existing,
      state: 'released',
      expiresAt: new Date().toISOString(),
    }

    this.allocations.delete(allocationId)
    this.allocationInputs.delete(allocationId)
    this.removeBindingsForAllocation(allocationId)
    return released
  }

  bindAllocationToPage(args: {
    allocationId: string
    controllerClientId: string | null
    browserContextId?: string | null
    page: {
      pageId: number
      tabId: number
      windowId?: number
      url: string
      title: string
    }
  }): BrowserOpsRuntimeBinding | null {
    const allocation = this.allocations.get(args.allocationId)
    const allocationInput = this.allocationInputs.get(args.allocationId)
    if (!allocation) return null

    for (const [bindingId, binding] of this.runtimeBindings.entries()) {
      if (
        binding.allocationId === args.allocationId ||
        binding.windowId === (args.page.windowId ?? null)
      ) {
        if (binding.runtimeSpecId) {
          this.runtimeSessionSpecs.delete(binding.runtimeSpecId)
        }
        this.runtimeBindings.delete(bindingId)
      }
    }

    const binding: BrowserOpsRuntimeBinding = {
      bindingId: crypto.randomUUID(),
      allocationId: allocation.allocationId,
      profileId: allocation.profileId,
      taskId: allocation.taskId,
      runtimeSpecId: null,
      controllerClientId: args.controllerClientId,
      windowId: args.page.windowId ?? null,
      tabId: args.page.tabId,
      pageId: args.page.pageId,
      pageUrl: args.page.url,
      pageTitle: args.page.title,
      createdAt: new Date().toISOString(),
      state: 'active',
    }

    if (allocationInput) {
      const spec = this.createRuntimeSessionSpec({
        binding,
        allocation,
        input: allocationInput,
        browserContextId: args.browserContextId ?? null,
      })
      binding.runtimeSpecId = spec.specId
      this.runtimeSessionSpecs.set(spec.specId, spec)
    }

    this.runtimeBindings.set(binding.bindingId, binding)
    return binding
  }

  unbindRuntime(bindingId: string): BrowserOpsRuntimeBinding | null {
    const existing = this.runtimeBindings.get(bindingId)
    if (!existing) return null

    this.runtimeBindings.delete(bindingId)
    if (existing.runtimeSpecId) {
      this.runtimeSessionSpecs.delete(existing.runtimeSpecId)
    }
    return {
      ...existing,
      state: 'released',
    }
  }

  private pruneExpiredAllocations(): void {
    const now = Date.now()

    for (const [allocationId, allocation] of this.allocations.entries()) {
      if (Date.parse(allocation.expiresAt) <= now) {
        this.allocations.delete(allocationId)
        this.allocationInputs.delete(allocationId)
        this.removeBindingsForAllocation(allocationId)
      }
    }
  }

  private removeBindingsForAllocation(allocationId: string): void {
    for (const [bindingId, binding] of this.runtimeBindings.entries()) {
      if (binding.allocationId === allocationId) {
        if (binding.runtimeSpecId) {
          this.runtimeSessionSpecs.delete(binding.runtimeSpecId)
        }
        this.runtimeBindings.delete(bindingId)
      }
    }
  }

  private createRuntimeSessionSpec(args: {
    binding: BrowserOpsRuntimeBinding
    allocation: BrowserOpsRouteAllocation
    input: BrowserOpsPreviewInput
    browserContextId: string | null
  }): BrowserOpsRuntimeSessionSpec {
    const { binding, allocation, input, browserContextId } = args
    const riskLevel = allocation.decision.warnings.length
      ? allocation.decision.warnings.length >= 3
        ? 'high'
        : 'medium'
      : 'low'
    const warmupPolicy =
      allocation.decision.humanizationLevel === 'strict'
        ? 'strict-warmup'
        : allocation.decision.rotationStrategy === 'sticky-session'
          ? 'standard-warmup'
          : 'fast-start'

    return {
      specId: crypto.randomUUID(),
      bindingId: binding.bindingId,
      allocationId: allocation.allocationId,
      profileId: allocation.profileId,
      taskId: allocation.taskId,
      createdAt: new Date().toISOString(),
      state: 'active',
      browserContextId,
      ownership: {
        windowId: binding.windowId,
        tabId: binding.tabId,
        pageId: binding.pageId,
        pageUrl: binding.pageUrl,
        pageTitle: binding.pageTitle,
        controllerClientId: binding.controllerClientId,
      },
      sessionPartition: input.profile.sessionPartition,
      cookieVaultKey: input.profile.cookieVaultKey,
      profileDirectoryName: `profile-${input.profile.id}`,
      launchContextId: `${input.profile.id}:${binding.windowId ?? binding.tabId}`,
      fingerprint: allocation.decision.recommendedFingerprint,
      proxyResolution: allocation.routeResolution,
      warmupPolicy,
      riskLevel,
    }
  }
}
