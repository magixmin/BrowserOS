export const BROWSER_OPS_PLATFORMS = [
  'tiktok',
  'amazon',
  'walmart',
  'generic',
] as const

export const PROXY_SOURCE_TYPES = [
  'managed',
  'bring-your-own',
  'trial',
] as const

export const PROXY_IP_TYPES = [
  'residential',
  'isp',
  'mobile',
  'datacenter',
] as const

export const PROXY_SESSION_MODES = ['sticky', 'rotating'] as const

export const TASK_TYPES = [
  'publishing',
  'operations',
  'scraping',
  'research',
] as const

export const HUMANIZATION_LEVELS = ['balanced', 'strict'] as const

export const BROWSER_OPS_PROVIDER_IDS = [
  'brightdata',
  'decodo',
  'webshare',
  'byo',
  'trial',
] as const

export type BrowserOpsPlatform = (typeof BROWSER_OPS_PLATFORMS)[number]
export type ProxySourceType = (typeof PROXY_SOURCE_TYPES)[number]
export type ProxyIpType = (typeof PROXY_IP_TYPES)[number]
export type ProxySessionMode = (typeof PROXY_SESSION_MODES)[number]
export type BrowserOpsTaskType = (typeof TASK_TYPES)[number]
export type HumanizationLevel = (typeof HUMANIZATION_LEVELS)[number]
export type BrowserOpsProviderId = (typeof BROWSER_OPS_PROVIDER_IDS)[number]

export interface CountryPreset {
  countryCode: string
  label: string
  timezone: string
  language: string
  locale: string
}

export interface BrowserFingerprintProfile {
  userAgentPreset: string
  timezone: string
  language: string
  locale: string
  platform: 'macOS' | 'Windows'
  webglProfile: string
  canvasNoise: 'light' | 'medium'
  fontsPreset: string
}

export interface BrowserOpsProfile {
  id: string
  name: string
  accountLabel: string
  platform: BrowserOpsPlatform
  marketCountry: string
  proxyMode: 'auto' | 'manual'
  preferredIpTypes: ProxyIpType[]
  preferredRegion: string
  manualProxyId?: string
  sessionPartition: string
  cookieVaultKey: string
  status: 'ready' | 'warming' | 'cooldown'
  fingerprint: BrowserFingerprintProfile
  tags: string[]
}

export interface ProxyHealthStats {
  successRate: number
  banRate: number
  latencyMs: number
  lastCheckedAt: string
}

export interface BrowserOpsProxy {
  id: string
  name: string
  sourceType: ProxySourceType
  providerName: string
  endpoint: string
  builtInPool: boolean
  ipType: ProxyIpType
  sessionMode: ProxySessionMode
  countries: string[]
  rotationSupport: boolean
  stickySessionTtlMinutes?: number
  status: 'active' | 'paused'
  health: ProxyHealthStats
}

export interface BrowserOpsTaskTemplate {
  id: string
  name: string
  platform: BrowserOpsPlatform
  taskType: BrowserOpsTaskType
  goal: string
  targetCountry?: string
  requiredIpTypes: ProxyIpType[]
  preferredSessionMode: ProxySessionMode
  rotateIpOnEachRun: boolean
  humanizationLevel: HumanizationLevel
  skillKey: string
}

export interface BrowserOpsWorkspaceSettings {
  autoRouteIp: boolean
  autoAlignFingerprint: boolean
  allowBringYourOwnProxy: boolean
  useBuiltInProxyPool: boolean
  enforceQualityGuard: boolean
}

export interface BrowserOpsRouteDecision {
  targetCountry: string
  mode: 'auto' | 'manual' | 'unresolved'
  selectedProxy: BrowserOpsProxy | null
  recommendedFingerprint: BrowserFingerprintProfile
  rotationStrategy: 'sticky-session' | 'rotate-before-run' | 'rotate-on-failure'
  humanizationLevel: HumanizationLevel
  score: number
  reasons: string[]
  warnings: string[]
}

export interface BrowserOpsProviderCatalogEntry {
  id: BrowserOpsProviderId
  name: string
  sourceType: ProxySourceType
  stage: 'skeleton' | 'planned'
  supportedIpTypes: ProxyIpType[]
  supportedSessionModes: ProxySessionMode[]
  supportsRotation: boolean
  supportsHealthScoring: boolean
  notes: string[]
}

export interface BrowserOpsPreviewInput {
  profile: BrowserOpsProfile
  task: BrowserOpsTaskTemplate
  proxies: BrowserOpsProxy[]
  settings: BrowserOpsWorkspaceSettings
}

export interface BrowserOpsPreviewResult {
  decision: BrowserOpsRouteDecision
  evaluatedProxyCount: number
  matchedProvider: BrowserOpsProviderCatalogEntry | null
  providerCatalog: BrowserOpsProviderCatalogEntry[]
  routeResolution: BrowserOpsProviderRouteResolution | null
  engine: 'browser-ops-v1'
}

export interface BrowserOpsSkillCandidate {
  skillId: string
  reason: string
  exists: boolean
  builtIn?: boolean
  name?: string
  description?: string
}

export interface BrowserOpsSkillResolution {
  taskSkillKey: string
  normalizedSkillKey: string
  matchType: 'direct' | 'mapped' | 'missing'
  resolvedSkillId: string | null
  resolvedSkillName?: string
  builtIn?: boolean
  notes: string[]
  candidates: BrowserOpsSkillCandidate[]
}

export interface BrowserOpsAutomationBrief {
  profileId: string
  taskId: string
  readiness: 'ready' | 'needs-setup'
  recommendedStartUrl: string
  launchMode: 'attached-current-window' | 'managed-window'
  resolvedSkillId: string | null
  resolvedSkillName?: string
  routePreview: BrowserOpsPreviewResult
  skillResolution: BrowserOpsSkillResolution
  missingRequirements: string[]
  notes: string[]
  executionPrompt: string
}

export interface BrowserOpsAutomationChatDraft {
  mode: 'agent' | 'lobster'
  query: string
  browserContext: {
    windowId?: number
    activeTab?: {
      id: number
      url?: string
      title?: string
      pageId?: number
    }
  }
}

export interface BrowserOpsRouteAllocation {
  allocationId: string
  profileId: string
  taskId: string
  createdAt: string
  expiresAt: string
  state: 'active' | 'released'
  decision: BrowserOpsRouteDecision
  matchedProvider: BrowserOpsProviderCatalogEntry | null
  routeResolution: BrowserOpsProviderRouteResolution | null
}

export interface BrowserOpsRuntimeBinding {
  bindingId: string
  allocationId: string
  profileId: string
  taskId: string
  runtimeSpecId: string | null
  controllerClientId: string | null
  windowId: number | null
  tabId: number
  pageId: number
  pageUrl: string
  pageTitle: string
  createdAt: string
  state: 'active' | 'released'
}

export interface BrowserOpsRuntimeSessionSpec {
  specId: string
  bindingId: string
  allocationId: string
  profileId: string
  taskId: string
  createdAt: string
  state: 'active' | 'released'
  browserContextId: string | null
  ownership: {
    controllerClientId: string | null
    windowId: number | null
    tabId: number
    pageId: number
    pageUrl: string
    pageTitle: string
  }
  sessionPartition: string
  cookieVaultKey: string
  profileDirectoryName: string
  launchContextId: string
  fingerprint: BrowserFingerprintProfile
  proxyResolution: BrowserOpsProviderRouteResolution | null
  warmupPolicy: 'strict-warmup' | 'standard-warmup' | 'fast-start'
  riskLevel: 'low' | 'medium' | 'high'
}

export interface BrowserOpsRuntimeAssetManifest {
  manifestId: string
  specId: string
  bindingId: string
  allocationId: string
  profileId: string
  createdAt: string
  state: 'active' | 'released'
  profileDirectoryPath: string
  cookieVaultPath: string
  runtimeSpecPath: string
}

export interface BrowserOpsLaunchBundle {
  bundleId: string
  specId: string
  profileId: string
  createdAt: string
  state: 'active' | 'released'
  startupUrl: string
  userDataDir: string
  cookieVaultPath: string
  runtimeSpecPath: string
  browserContextId: string | null
  launcherScriptPath: string
  launcherCommandPreview: string
  chromiumArgs: string[]
  env: Record<string, string>
  fingerprint: {
    timezone: string
    language: string
    locale: string
    userAgentPreset: string
  }
  proxy: {
    providerName: string
    maskedUrl: string
    serverArg: string | null
    country: string
    authMode: string
    credentialSource:
      | 'embedded'
      | 'env'
      | 'managed-internal'
      | 'none'
    credentialEnv: {
      username?: string
      password?: string
    } | null
    credentialStatus: 'configured' | 'missing' | 'not-required'
    missingCredentialEnv: string[]
    usernameTemplate?: string
    passwordRequired: boolean
    sessionId: string | null
  } | null
}

export interface BrowserOpsLaunchExecution {
  executionId: string
  bundleId: string
  specId: string
  profileId: string
  createdAt: string
  state: 'prepared' | 'launched' | 'stopped' | 'failed'
  binaryPath: string | null
  commandPreview: string
  dryRun: boolean
  pid: number | null
  ports: {
    cdp: number
    server: number
    extension: number
  }
  notes: string[]
}

export interface BrowserOpsLaunchDiagnostics {
  executionIdsWithoutSpecs: string[]
  executionIdsWithoutBundles: string[]
  launchedExecutionIds: string[]
  orphanLaunchedExecutionIds: string[]
}

export interface BrowserOpsManagedInstance {
  instanceId: string
  executionId: string
  bundleId: string
  specId: string
  profileId: string
  createdAt: string
  state: 'prepared' | 'running' | 'stopped' | 'unreachable' | 'failed'
  binaryPath: string | null
  pid: number | null
  ports: {
    cdp: number
    server: number
    extension: number
  }
  lastHealthCheckAt: string | null
  health: {
    cdpReachable: boolean
    serverReachable: boolean
    extensionReachable: boolean
    proxyAuthBootstrapConfigured: boolean
    proxyEgressVerified: boolean
    proxySessionConsistent: boolean
  }
  proxy: {
    providerName: string
    country: string
    authMode: string
    credentialSource: 'embedded' | 'env' | 'managed-internal' | 'none'
    serverArg: string | null
    sessionId: string | null
  } | null
  lastProxyVerification: BrowserOpsProxyVerification | null
  notes: string[]
}

export interface BrowserOpsInstanceDiagnostics {
  instanceIdsWithoutExecutions: string[]
  executionIdsWithoutInstances: string[]
  runningInstanceIds: string[]
  unreachableInstanceIds: string[]
}

export interface BrowserOpsProxyVerification {
  instanceId: string
  checkedAt: string
  targetUrl: string
  status: 'verified' | 'failed'
  verdict: 'verified' | 'inconclusive' | 'failed'
  observedText: string | null
  detectedIp: string | null
  detectedCountry: string | null
  sessionVerdict: 'consistent' | 'changed' | 'not-applicable' | 'unknown'
  expectedProxy: {
    providerName: string
    serverArg: string | null
    sessionId: string | null
    country: string
  } | null
  bootstrapConfigured: boolean
  notes: string[]
}

export interface BrowserOpsInstanceEvent {
  eventId: string
  createdAt: string
  scope: 'instance' | 'execution' | 'system'
  action:
    | 'launch_prepared'
    | 'launch_started'
    | 'launch_stopped'
    | 'instance_registered'
    | 'instance_refreshed'
    | 'instances_refreshed'
    | 'instances_reconciled'
    | 'instance_restarted'
    | 'instance_cleaned'
    | 'launches_reconciled'
  message: string
  instanceId?: string
  executionId?: string
  specId?: string
  profileId?: string
  metadata?: Record<string, string | number | boolean | null>
}

export interface BrowserOpsCookieVaultDocument {
  vaultKey: string
  cookies: unknown[]
  updatedAt: string
  capturedFromUrls?: string[]
}

export interface BrowserOpsCookieVaultSummary {
  bindingId: string
  vaultKey: string
  cookieCount: number
  updatedAt: string
  capturedFromUrls?: string[]
}

export interface BrowserOpsControllerWindowOwnership {
  clientId: string
  windowId: number
  isPrimaryClient: boolean
  isFocusedWindow: boolean
}

export interface BrowserOpsBrowserWindowSnapshot {
  windowId: number
  isActive: boolean
  tabCount: number
  windowType: string
}

export interface BrowserOpsRuntimeDiagnostics {
  browserWindows: BrowserOpsBrowserWindowSnapshot[]
  liveBrowserContextIds: string[]
  controllerOwnership: BrowserOpsControllerWindowOwnership[]
  unboundAllocationIds: string[]
  bindingsWithoutBrowserWindow: string[]
  bindingsWithoutControllerOwnership: string[]
  controllerOwnershipDrift: string[]
  specsWithoutBindings: string[]
  specsWithoutBrowserContext: string[]
  browserContextsWithoutSpecs: string[]
}

export interface BrowserOpsProviderRouteResolution {
  providerId: BrowserOpsProviderId | 'unknown'
  providerName: string
  endpointHost: string
  endpointPort: number | null
  endpointScheme: 'http' | 'https' | 'socks5' | 'unknown'
  proxyServerArg: string | null
  authMode:
    | 'embedded-credentials'
    | 'basic-auth'
    | 'provider-template'
    | 'managed-internal'
    | 'none'
  credentialSource: 'embedded' | 'env' | 'managed-internal' | 'none'
  credentialEnv: {
    username?: string
    password?: string
  } | null
  credentialStatus: 'configured' | 'missing' | 'not-required'
  missingCredentialEnv: string[]
  proxyUrlMasked: string
  sessionId: string | null
  country: string
  routeMode: ProxySessionMode
  passwordRequired: boolean
  usernameTemplate?: string
  notes: string[]
  warnings: string[]
}

export interface BrowserOpsProxyHealthAssessment {
  proxyId: string
  score: number
  tier: 'excellent' | 'good' | 'risky' | 'blocked'
  reasons: string[]
}

export const COUNTRY_PRESETS: Record<string, CountryPreset> = {
  US: {
    countryCode: 'US',
    label: 'United States',
    timezone: 'America/New_York',
    language: 'en-US',
    locale: 'en-US',
  },
  UK: {
    countryCode: 'UK',
    label: 'United Kingdom',
    timezone: 'Europe/London',
    language: 'en-GB',
    locale: 'en-GB',
  },
  CA: {
    countryCode: 'CA',
    label: 'Canada',
    timezone: 'America/Toronto',
    language: 'en-CA',
    locale: 'en-CA',
  },
  JP: {
    countryCode: 'JP',
    label: 'Japan',
    timezone: 'Asia/Tokyo',
    language: 'ja-JP',
    locale: 'ja-JP',
  },
  DE: {
    countryCode: 'DE',
    label: 'Germany',
    timezone: 'Europe/Berlin',
    language: 'de-DE',
    locale: 'de-DE',
  },
}

export function getCountryPreset(countryCode: string): CountryPreset {
  return COUNTRY_PRESETS[countryCode] ?? COUNTRY_PRESETS.US
}

export function assessBrowserOpsProxyHealth(
  proxy: BrowserOpsProxy,
): BrowserOpsProxyHealthAssessment {
  const reasons: string[] = []
  let score =
    proxy.health.successRate * 100 -
    proxy.health.banRate * 120 -
    proxy.health.latencyMs / 80

  if (proxy.health.successRate >= 0.95) {
    score += 8
    reasons.push('High success rate')
  } else if (proxy.health.successRate < 0.85) {
    score -= 10
    reasons.push('Low success rate')
  }

  if (proxy.health.banRate <= 0.02) {
    score += 8
    reasons.push('Low ban rate')
  } else if (proxy.health.banRate >= 0.08) {
    score -= 12
    reasons.push('High ban rate')
  }

  if (proxy.health.latencyMs <= 450) {
    score += 6
    reasons.push('Low latency')
  } else if (proxy.health.latencyMs >= 900) {
    score -= 8
    reasons.push('High latency')
  }

  let tier: BrowserOpsProxyHealthAssessment['tier'] = 'blocked'

  if (score >= 90) tier = 'excellent'
  else if (score >= 75) tier = 'good'
  else if (score >= 55) tier = 'risky'

  return {
    proxyId: proxy.id,
    score: Math.round(score),
    tier,
    reasons,
  }
}

function getTargetCountry(
  profile: BrowserOpsProfile,
  task: BrowserOpsTaskTemplate,
): string {
  return task.targetCountry || profile.marketCountry || 'US'
}

function getRequiredIpTypes(
  profile: BrowserOpsProfile,
  task: BrowserOpsTaskTemplate,
): ProxyIpType[] {
  const combined = [...task.requiredIpTypes, ...profile.preferredIpTypes]
  return [...new Set(combined)]
}

function alignFingerprint(
  profile: BrowserOpsProfile,
  targetCountry: string,
): BrowserFingerprintProfile {
  const preset = getCountryPreset(targetCountry)

  return {
    ...profile.fingerprint,
    timezone: preset.timezone,
    language: preset.language,
    locale: preset.locale,
  }
}

function getFingerprintWarnings(
  profile: BrowserOpsProfile,
  targetCountry: string,
): string[] {
  const preset = getCountryPreset(targetCountry)
  const warnings: string[] = []

  if (profile.fingerprint.timezone !== preset.timezone) {
    warnings.push(
      `Profile timezone ${profile.fingerprint.timezone} should align with ${preset.timezone}`,
    )
  }

  if (profile.fingerprint.language !== preset.language) {
    warnings.push(
      `Profile language ${profile.fingerprint.language} should align with ${preset.language}`,
    )
  }

  if (profile.marketCountry !== targetCountry) {
    warnings.push(
      `Profile market ${profile.marketCountry} differs from task country ${targetCountry}`,
    )
  }

  return warnings
}

function evaluateProxyCandidate(args: {
  proxy: BrowserOpsProxy
  profile: BrowserOpsProfile
  task: BrowserOpsTaskTemplate
  targetCountry: string
  requiredIpTypes: ProxyIpType[]
  workspaceSettings: BrowserOpsWorkspaceSettings
}) {
  const {
    proxy,
    profile,
    task,
    targetCountry,
    requiredIpTypes,
    workspaceSettings,
  } = args

  const reasons: string[] = []
  const warnings: string[] = []
  let score =
    proxy.health.successRate * 100 -
    proxy.health.banRate * 140 -
    proxy.health.latencyMs / 70

  if (proxy.countries.includes(targetCountry)) {
    score += 22
    reasons.push(`Country match: ${targetCountry}`)
  } else {
    warnings.push(
      `Proxy country ${proxy.countries.join(', ')} does not match ${targetCountry}`,
    )
  }

  if (requiredIpTypes.includes(proxy.ipType)) {
    score += 18
    reasons.push(`IP type ${proxy.ipType} matches task requirements`)
  } else {
    warnings.push(`IP type ${proxy.ipType} is not ideal for this task`)
  }

  if (profile.preferredIpTypes.includes(proxy.ipType)) {
    score += 10
    reasons.push(`Profile prefers ${proxy.ipType} routes`)
  }

  if (proxy.sessionMode === task.preferredSessionMode) {
    score += 12
    reasons.push(`Session mode ${proxy.sessionMode} matches task policy`)
  }

  if (task.rotateIpOnEachRun && proxy.rotationSupport) {
    score += 8
    reasons.push('Supports rotation for scraping-style workloads')
  }

  if (!task.rotateIpOnEachRun && proxy.sessionMode === 'sticky') {
    score += 8
    reasons.push('Sticky session suits login and publishing flows')
  }

  if (workspaceSettings.enforceQualityGuard) {
    if (proxy.health.banRate <= 0.03) {
      score += 8
      reasons.push('Low ban rate')
    } else {
      warnings.push('Ban rate is above preferred threshold')
    }

    if (proxy.health.successRate < 0.9) {
      warnings.push('Success rate is below preferred threshold')
    }
  }

  if (
    !workspaceSettings.allowBringYourOwnProxy &&
    proxy.sourceType === 'bring-your-own'
  ) {
    score -= 100
    warnings.push('Bring-your-own proxies are disabled in workspace settings')
  }

  if (!workspaceSettings.useBuiltInProxyPool && proxy.builtInPool) {
    score -= 100
    warnings.push('Built-in proxy pool is disabled in workspace settings')
  }

  return { score, reasons, warnings }
}

function deriveRotationStrategy(
  task: BrowserOpsTaskTemplate,
  proxy: BrowserOpsProxy | null,
): BrowserOpsRouteDecision['rotationStrategy'] {
  if (task.rotateIpOnEachRun) return 'rotate-before-run'
  if (proxy?.sessionMode === 'rotating') return 'rotate-on-failure'
  return 'sticky-session'
}

export function resolveBrowserOpsRouteDecision(
  input: BrowserOpsPreviewInput,
): BrowserOpsRouteDecision {
  const { profile, task, proxies, settings } = input
  const targetCountry = getTargetCountry(profile, task)
  const requiredIpTypes = getRequiredIpTypes(profile, task)
  const recommendedFingerprint = settings.autoAlignFingerprint
    ? alignFingerprint(profile, targetCountry)
    : profile.fingerprint
  const warnings = getFingerprintWarnings(profile, targetCountry)

  if (
    task.platform !== 'generic' &&
    profile.platform !== 'generic' &&
    task.platform !== profile.platform
  ) {
    warnings.push(
      `Task platform ${task.platform} does not match profile platform ${profile.platform}`,
    )
  }

  if (!settings.autoRouteIp && profile.proxyMode === 'auto') {
    return {
      targetCountry,
      mode: 'unresolved',
      selectedProxy: null,
      recommendedFingerprint,
      rotationStrategy: deriveRotationStrategy(task, null),
      humanizationLevel: task.humanizationLevel,
      score: 0,
      reasons: ['Automatic IP routing is disabled in workspace settings'],
      warnings: [
        ...warnings,
        'Enable Auto-route IP or switch this profile to manual proxy mode',
      ],
    }
  }

  if (profile.proxyMode === 'manual') {
    const manualProxy =
      proxies.find((proxy) => proxy.id === profile.manualProxyId) || null

    if (!manualProxy) {
      return {
        targetCountry,
        mode: 'unresolved',
        selectedProxy: null,
        recommendedFingerprint,
        rotationStrategy: deriveRotationStrategy(task, null),
        humanizationLevel: task.humanizationLevel,
        score: 0,
        reasons: ['Profile requires a manually assigned proxy'],
        warnings: [...warnings, 'Manual proxy was not found'],
      }
    }

    if (manualProxy.status !== 'active') {
      return {
        targetCountry,
        mode: 'unresolved',
        selectedProxy: null,
        recommendedFingerprint,
        rotationStrategy: deriveRotationStrategy(task, null),
        humanizationLevel: task.humanizationLevel,
        score: 0,
        reasons: ['Profile requires a manually assigned proxy'],
        warnings: [...warnings, 'Manual proxy is paused and cannot be used'],
      }
    }

    const candidate = evaluateProxyCandidate({
      proxy: manualProxy,
      profile,
      task,
      targetCountry,
      requiredIpTypes,
      workspaceSettings: settings,
    })

    return {
      targetCountry,
      mode: 'manual',
      selectedProxy: manualProxy,
      recommendedFingerprint,
      rotationStrategy: deriveRotationStrategy(task, manualProxy),
      humanizationLevel: task.humanizationLevel,
      score: Math.round(candidate.score),
      reasons: ['Manual proxy selected by profile', ...candidate.reasons],
      warnings: [...warnings, ...candidate.warnings],
    }
  }

  const activeProxies = proxies.filter((proxy) => proxy.status === 'active')

  const candidates = activeProxies
    .map((proxy) => ({
      proxy,
      ...evaluateProxyCandidate({
        proxy,
        profile,
        task,
        targetCountry,
        requiredIpTypes,
        workspaceSettings: settings,
      }),
    }))
    .filter((candidate) => candidate.score > -20)
    .sort((left, right) => right.score - left.score)

  const winner = candidates[0]

  if (!winner) {
    return {
      targetCountry,
      mode: 'unresolved',
      selectedProxy: null,
      recommendedFingerprint,
      rotationStrategy: deriveRotationStrategy(task, null),
      humanizationLevel: task.humanizationLevel,
      score: 0,
      reasons: ['No proxy candidate met the current policy filters'],
      warnings: [
        ...warnings,
        'Enable more proxy pools or relax the workspace constraints',
      ],
    }
  }

  return {
    targetCountry,
    mode: 'auto',
    selectedProxy: winner.proxy,
    recommendedFingerprint,
    rotationStrategy: deriveRotationStrategy(task, winner.proxy),
    humanizationLevel: task.humanizationLevel,
    score: Math.round(winner.score),
    reasons: winner.reasons,
    warnings: [...warnings, ...winner.warnings],
  }
}
