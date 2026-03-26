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

export type BrowserOpsPlatform = (typeof BROWSER_OPS_PLATFORMS)[number]
export type ProxySourceType = (typeof PROXY_SOURCE_TYPES)[number]
export type ProxyIpType = (typeof PROXY_IP_TYPES)[number]
export type ProxySessionMode = (typeof PROXY_SESSION_MODES)[number]
export type BrowserOpsTaskType = (typeof TASK_TYPES)[number]
export type HumanizationLevel = (typeof HUMANIZATION_LEVELS)[number]

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

export interface BrowserOpsWorkspace {
  profiles: BrowserOpsProfile[]
  proxies: BrowserOpsProxy[]
  tasks: BrowserOpsTaskTemplate[]
  settings: BrowserOpsWorkspaceSettings
  updatedAt: string
}

export interface BrowserOpsRouteDecision {
  targetCountry: string
  mode: 'auto' | 'manual' | 'unresolved'
  selectedProxy: BrowserOpsProxy | null
  recommendedFingerprint: BrowserFingerprintProfile
  rotationStrategy:
    | 'sticky-session'
    | 'rotate-before-run'
    | 'rotate-on-failure'
  humanizationLevel: HumanizationLevel
  score: number
  reasons: string[]
  warnings: string[]
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

export function getPlatformLabel(platform: BrowserOpsPlatform): string {
  switch (platform) {
    case 'tiktok':
      return 'TikTok'
    case 'amazon':
      return 'Amazon'
    case 'walmart':
      return 'Walmart'
    default:
      return 'Generic'
  }
}

export function getTaskTypeLabel(taskType: BrowserOpsTaskType): string {
  switch (taskType) {
    case 'publishing':
      return 'Publishing'
    case 'operations':
      return 'Operations'
    case 'scraping':
      return 'Scraping'
    default:
      return 'Research'
  }
}

export function getProxySourceLabel(sourceType: ProxySourceType): string {
  switch (sourceType) {
    case 'managed':
      return 'Managed'
    case 'bring-your-own':
      return 'Bring Your Own'
    default:
      return 'Trial'
  }
}
