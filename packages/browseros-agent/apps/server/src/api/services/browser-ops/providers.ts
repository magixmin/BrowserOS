import type {
  BrowserOpsProviderCatalogEntry,
  BrowserOpsProviderId,
  BrowserOpsProviderRouteResolution,
  BrowserOpsProxy,
  BrowserOpsRouteDecision,
  ProxySourceType,
} from '@browseros/shared/browser-ops'

type ProviderMatchRule = {
  id: BrowserOpsProviderId
  aliases: string[]
}

const PROVIDER_MATCH_RULES: ProviderMatchRule[] = [
  {
    id: 'brightdata',
    aliases: ['bright data', 'brightdata', 'brd'],
  },
  {
    id: 'decodo',
    aliases: ['decodo', 'smartproxy', 'smart proxy'],
  },
  {
    id: 'webshare',
    aliases: ['webshare', 'web share'],
  },
]

const PROVIDER_CATALOG: BrowserOpsProviderCatalogEntry[] = [
  {
    id: 'brightdata',
    name: 'Bright Data',
    sourceType: 'managed',
    stage: 'skeleton',
    supportedIpTypes: ['residential', 'isp', 'mobile', 'datacenter'],
    supportedSessionModes: ['sticky', 'rotating'],
    supportsRotation: true,
    supportsHealthScoring: true,
    notes: [
      'Best suited for residential and mobile routing policies.',
      'Sticky session orchestration should be handled by the route allocator.',
    ],
  },
  {
    id: 'decodo',
    name: 'Decodo',
    sourceType: 'managed',
    stage: 'skeleton',
    supportedIpTypes: ['residential', 'isp', 'mobile'],
    supportedSessionModes: ['sticky', 'rotating'],
    supportsRotation: true,
    supportsHealthScoring: true,
    notes: [
      'Useful for seller operations and sticky login sessions.',
      'Route allocator should prefer ISP pools for Amazon-like workloads.',
    ],
  },
  {
    id: 'webshare',
    name: 'Webshare',
    sourceType: 'managed',
    stage: 'planned',
    supportedIpTypes: ['residential', 'datacenter'],
    supportedSessionModes: ['sticky', 'rotating'],
    supportsRotation: true,
    supportsHealthScoring: true,
    notes: [
      'Lower-cost pool option for scraping and monitoring tasks.',
      'Provider adapter is planned but not wired yet.',
    ],
  },
  {
    id: 'byo',
    name: 'Bring Your Own',
    sourceType: 'bring-your-own',
    stage: 'skeleton',
    supportedIpTypes: ['residential', 'isp', 'mobile', 'datacenter'],
    supportedSessionModes: ['sticky', 'rotating'],
    supportsRotation: true,
    supportsHealthScoring: false,
    notes: [
      'User-supplied proxy endpoint with no vendor-specific automation.',
      'Health scoring depends on observed runtime telemetry.',
    ],
  },
  {
    id: 'trial',
    name: 'Trial Pool',
    sourceType: 'trial',
    stage: 'skeleton',
    supportedIpTypes: ['residential'],
    supportedSessionModes: ['rotating'],
    supportsRotation: true,
    supportsHealthScoring: true,
    notes: [
      'Intended for trials and low-volume onboarding flows.',
      'Should be rate-limited and deprioritized for sensitive accounts.',
    ],
  },
]

function resolveSourceFallback(
  sourceType: ProxySourceType,
): BrowserOpsProviderId {
  switch (sourceType) {
    case 'bring-your-own':
      return 'byo'
    case 'trial':
      return 'trial'
    default:
      return 'webshare'
  }
}

export function listBrowserOpsProviders(): BrowserOpsProviderCatalogEntry[] {
  return structuredClone(PROVIDER_CATALOG)
}

export function matchBrowserOpsProvider(
  proxy: Pick<BrowserOpsProxy, 'providerName' | 'sourceType'>,
): BrowserOpsProviderCatalogEntry | null {
  const normalized = proxy.providerName.trim().toLowerCase()

  for (const rule of PROVIDER_MATCH_RULES) {
    if (rule.aliases.some((alias) => normalized.includes(alias))) {
      return (
        PROVIDER_CATALOG.find((provider) => provider.id === rule.id) ?? null
      )
    }
  }

  const fallbackId = resolveSourceFallback(proxy.sourceType)
  return PROVIDER_CATALOG.find((provider) => provider.id === fallbackId) ?? null
}

function deriveSessionId(args: {
  profileId: string
  taskId: string
  decision: BrowserOpsRouteDecision
}): string | null {
  if (args.decision.rotationStrategy !== 'sticky-session') return null

  const profileSuffix = args.profileId.replace(/[^a-zA-Z0-9]/g, '').slice(-6)
  const taskSuffix = args.taskId.replace(/[^a-zA-Z0-9]/g, '').slice(-6)
  return `${profileSuffix || 'profile'}-${taskSuffix || 'task'}`
}

function parseProxyEndpoint(endpoint: string): {
  scheme: BrowserOpsProviderRouteResolution['endpointScheme']
  host: string
  port: number | null
  hasEmbeddedCredentials: boolean
  username?: string
  rawFormat: 'url' | 'colon-delimited' | 'host-port' | 'unknown'
} {
  const trimmed = endpoint.trim()

  if (trimmed.includes('://')) {
    try {
      const url = new URL(trimmed)
      const protocol = url.protocol.replace(':', '')
      const scheme =
        protocol === 'http' || protocol === 'https' || protocol === 'socks5'
          ? protocol
          : 'unknown'

      return {
        scheme,
        host: url.hostname,
        port: url.port ? Number(url.port) : null,
        hasEmbeddedCredentials: Boolean(url.username || url.password),
        username: url.username || undefined,
        rawFormat: 'url',
      }
    } catch {
      return {
        scheme: 'unknown',
        host: trimmed,
        port: null,
        hasEmbeddedCredentials: false,
        rawFormat: 'unknown',
      }
    }
  }

  const parts = trimmed.split(':')

  if (parts.length >= 4) {
    return {
      scheme: 'http',
      host: parts[0] || '',
      port: parts[1] ? Number(parts[1]) : null,
      hasEmbeddedCredentials: true,
      username: parts[2] || undefined,
      rawFormat: 'colon-delimited',
    }
  }

  if (parts.length >= 2) {
    return {
      scheme: 'http',
      host: parts[0] || '',
      port: parts[1] ? Number(parts[1]) : null,
      hasEmbeddedCredentials: false,
      rawFormat: 'host-port',
    }
  }

  return {
    scheme: 'unknown',
    host: trimmed,
    port: null,
    hasEmbeddedCredentials: false,
    rawFormat: 'unknown',
  }
}

function maskProxyEndpoint(endpoint: string): string {
  const trimmed = endpoint.trim()

  if (trimmed.includes('://')) {
    try {
      const url = new URL(trimmed)
      if (url.password) url.password = '***'
      return url.toString()
    } catch {
      return trimmed
    }
  }

  const parts = trimmed.split(':')
  if (parts.length >= 4) {
    return [parts[0], parts[1], parts[2], '***'].join(':')
  }

  return trimmed
}

function buildProxyServerArg(endpoint: string): string | null {
  const parsed = parseProxyEndpoint(endpoint)
  if (!parsed.host) return null

  const portSuffix = parsed.port ? `:${parsed.port}` : ''

  if (parsed.rawFormat === 'url') {
    const schemePrefix =
      parsed.scheme === 'http' ||
      parsed.scheme === 'https' ||
      parsed.scheme === 'socks5'
        ? `${parsed.scheme}://`
        : ''

    return `${schemePrefix}${parsed.host}${portSuffix}`
  }

  return `${parsed.host}${portSuffix}`
}

function buildCredentialEnv(providerId: BrowserOpsProviderId | 'unknown'): {
  username?: string
  password?: string
} | null {
  switch (providerId) {
    case 'brightdata':
      return {
        username: 'BROWSER_OPS_BRIGHTDATA_USERNAME',
        password: 'BROWSER_OPS_BRIGHTDATA_PASSWORD',
      }
    case 'decodo':
      return {
        username: 'BROWSER_OPS_DECODO_USERNAME',
        password: 'BROWSER_OPS_DECODO_PASSWORD',
      }
    case 'webshare':
      return {
        username: 'BROWSER_OPS_WEBSHARE_USERNAME',
        password: 'BROWSER_OPS_WEBSHARE_PASSWORD',
      }
    case 'byo':
      return {
        username: 'BROWSER_OPS_PROXY_USERNAME',
        password: 'BROWSER_OPS_PROXY_PASSWORD',
      }
    default:
      return null
  }
}

function evaluateCredentialStatus(args: {
  credentialSource: 'embedded' | 'env' | 'managed-internal' | 'none'
  credentialEnv: { username?: string; password?: string } | null
}): {
  credentialStatus: 'configured' | 'missing' | 'not-required'
  missingCredentialEnv: string[]
} {
  if (args.credentialSource !== 'env' || !args.credentialEnv) {
    return {
      credentialStatus: 'not-required',
      missingCredentialEnv: [],
    }
  }

  const requiredEnv = [
    args.credentialEnv.username,
    args.credentialEnv.password,
  ].filter((value): value is string => typeof value === 'string' && value.length > 0)

  const missingCredentialEnv = requiredEnv.filter(
    (envName) => !process.env[envName],
  )

  return {
    credentialStatus:
      missingCredentialEnv.length > 0 ? 'missing' : 'configured',
    missingCredentialEnv,
  }
}

export function resolveBrowserOpsProviderRoute(args: {
  proxy: BrowserOpsProxy
  decision: BrowserOpsRouteDecision
  profileId: string
  taskId: string
}): BrowserOpsProviderRouteResolution {
  const provider = matchBrowserOpsProvider(args.proxy)
  const parsed = parseProxyEndpoint(args.proxy.endpoint)
  const proxyUrlMasked = maskProxyEndpoint(args.proxy.endpoint)
  const proxyServerArg = buildProxyServerArg(args.proxy.endpoint)
  const sessionId = deriveSessionId({
    profileId: args.profileId,
    taskId: args.taskId,
    decision: args.decision,
  })
  const notes: string[] = []
  const warnings: string[] = []

  let authMode: BrowserOpsProviderRouteResolution['authMode'] = 'none'
  let credentialSource: BrowserOpsProviderRouteResolution['credentialSource'] =
    'none'
  let credentialEnv: BrowserOpsProviderRouteResolution['credentialEnv'] = null
  let usernameTemplate: string | undefined
  let passwordRequired = false

  switch (provider?.id) {
    case 'brightdata':
      authMode = 'provider-template'
      credentialSource = 'env'
      credentialEnv = buildCredentialEnv('brightdata')
      usernameTemplate =
        sessionId === null
          ? `brd-customer-<id>-zone-<zone>-country-${args.decision.targetCountry.toLowerCase()}`
          : `brd-customer-<id>-zone-<zone>-country-${args.decision.targetCountry.toLowerCase()}-session-${sessionId}`
      passwordRequired = true
      notes.push(
        'Use Bright Data zone credentials with country and session hints.',
      )
      notes.push(
        `Read credentials from ${credentialEnv?.username} / ${credentialEnv?.password}.`,
      )
      break
    case 'decodo':
      authMode = 'provider-template'
      credentialSource = 'env'
      credentialEnv = buildCredentialEnv('decodo')
      usernameTemplate =
        sessionId === null
          ? `user-<account>-country-${args.decision.targetCountry.toLowerCase()}`
          : `user-<account>-country-${args.decision.targetCountry.toLowerCase()}-session-${sessionId}`
      passwordRequired = true
      notes.push('Use Decodo account credentials with country-scoped routing.')
      notes.push(
        `Read credentials from ${credentialEnv?.username} / ${credentialEnv?.password}.`,
      )
      break
    case 'webshare':
      authMode = 'provider-template'
      credentialSource = 'env'
      credentialEnv = buildCredentialEnv('webshare')
      usernameTemplate =
        sessionId === null
          ? `<username>-country-${args.decision.targetCountry.toLowerCase()}`
          : `<username>-country-${args.decision.targetCountry.toLowerCase()}-session-${sessionId}`
      passwordRequired = true
      notes.push(
        'Webshare should be treated as a lower-cost rotating or sticky pool.',
      )
      notes.push(
        `Read credentials from ${credentialEnv?.username} / ${credentialEnv?.password}.`,
      )
      break
    case 'trial':
      authMode = 'managed-internal'
      credentialSource = 'managed-internal'
      notes.push(
        'Trial pool credentials are managed internally by Browser Ops.',
      )
      break
    case 'byo':
      authMode = parsed.hasEmbeddedCredentials
        ? 'embedded-credentials'
        : 'basic-auth'
      credentialSource = parsed.hasEmbeddedCredentials ? 'embedded' : 'env'
      credentialEnv = parsed.hasEmbeddedCredentials
        ? null
        : buildCredentialEnv('byo')
      usernameTemplate = parsed.username
      passwordRequired = parsed.hasEmbeddedCredentials
      notes.push(
        'Bring-your-own endpoint is used directly without vendor transforms.',
      )
      if (!parsed.hasEmbeddedCredentials && credentialEnv) {
        notes.push(
          `Read BYO credentials from ${credentialEnv.username} / ${credentialEnv.password}.`,
        )
      }
      break
    default:
      authMode = parsed.hasEmbeddedCredentials
        ? 'embedded-credentials'
        : 'basic-auth'
      credentialSource = parsed.hasEmbeddedCredentials ? 'embedded' : 'none'
      warnings.push(
        `Proxy provider ${args.proxy.providerName} is not recognized by the adapter catalog.`,
      )
  }

  if (!parsed.host) {
    warnings.push(
      'Proxy endpoint host could not be parsed from the current endpoint string.',
    )
  }

  if (parsed.rawFormat === 'unknown') {
    warnings.push(
      'Endpoint format is not recognized. Expected URL or host:port:user:pass.',
    )
  }

  if (
    args.decision.rotationStrategy === 'rotate-before-run' &&
    args.proxy.sessionMode === 'sticky'
  ) {
    warnings.push(
      'Task prefers pre-run rotation but proxy is configured as sticky.',
    )
  }

  const { credentialStatus, missingCredentialEnv } = evaluateCredentialStatus({
    credentialSource,
    credentialEnv,
  })

  if (credentialStatus === 'missing') {
    warnings.push(
      `Missing required credential env vars: ${missingCredentialEnv.join(', ')}`,
    )
  }

  return {
    providerId: provider?.id ?? 'unknown',
    providerName: provider?.name ?? args.proxy.providerName,
    endpointHost: parsed.host,
    endpointPort: parsed.port,
    endpointScheme: parsed.scheme,
    proxyServerArg,
    authMode,
    credentialSource,
    credentialEnv,
    credentialStatus,
    missingCredentialEnv,
    proxyUrlMasked,
    sessionId,
    country: args.decision.targetCountry,
    routeMode: args.proxy.sessionMode,
    passwordRequired,
    usernameTemplate,
    notes,
    warnings,
  }
}

export interface BrowserOpsProxyAuthRule {
  ruleId: string
  host: string
  port: number | null
  username: string
  password: string
  tabId?: number
}

function extractEmbeddedCredentials(endpoint: string): {
  username: string
  password: string
} | null {
  const trimmed = endpoint.trim()

  if (trimmed.includes('://')) {
    try {
      const url = new URL(trimmed)
      if (!url.username || !url.password) return null
      return {
        username: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
      }
    } catch {
      return null
    }
  }

  const parts = trimmed.split(':')
  if (parts.length >= 4 && parts[2] && parts[3]) {
    return {
      username: parts[2],
      password: parts[3],
    }
  }

  return null
}

export function resolveBrowserOpsProxyAuthRule(args: {
  ruleId: string
  tabId?: number
  proxy: BrowserOpsProxy
  routeResolution: BrowserOpsProviderRouteResolution
}): BrowserOpsProxyAuthRule | null {
  if (!args.routeResolution.endpointHost) return null

  if (args.routeResolution.credentialSource === 'embedded') {
    const credentials = extractEmbeddedCredentials(args.proxy.endpoint)
    if (!credentials) return null
    return {
      ruleId: args.ruleId,
      host: args.routeResolution.endpointHost,
      port: args.routeResolution.endpointPort,
      username: credentials.username,
      password: credentials.password,
      ...(typeof args.tabId === 'number' ? { tabId: args.tabId } : {}),
    }
  }

  if (args.routeResolution.credentialSource === 'env') {
    const usernameEnv = args.routeResolution.credentialEnv?.username
    const passwordEnv = args.routeResolution.credentialEnv?.password
    const username = usernameEnv ? process.env[usernameEnv] : undefined
    const password = passwordEnv ? process.env[passwordEnv] : undefined
    if (!username || !password) return null
    return {
      ruleId: args.ruleId,
      host: args.routeResolution.endpointHost,
      port: args.routeResolution.endpointPort,
      username,
      password,
      ...(typeof args.tabId === 'number' ? { tabId: args.tabId } : {}),
    }
  }

  return null
}
