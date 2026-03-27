import type {
  BrowserOpsPlatform,
  BrowserOpsTaskType,
  ProxySourceType,
} from '@browseros/shared/browser-ops'

export {
  assessBrowserOpsProxyHealth,
  BROWSER_OPS_PLATFORMS,
  BROWSER_OPS_PROVIDER_IDS,
  type BrowserFingerprintProfile,
  type BrowserOpsBrowserWindowSnapshot,
  type BrowserOpsControllerWindowOwnership,
  type BrowserOpsCookieVaultDocument,
  type BrowserOpsCookieVaultSummary,
  type BrowserOpsInstanceDiagnostics,
  type BrowserOpsInstanceEvent,
  type BrowserOpsLaunchBundle,
  type BrowserOpsLaunchDiagnostics,
  type BrowserOpsLaunchExecution,
  type BrowserOpsManagedInstance,
  type BrowserOpsPlatform,
  type BrowserOpsPreviewInput,
  type BrowserOpsPreviewResult,
  type BrowserOpsProfile,
  type BrowserOpsProviderCatalogEntry,
  type BrowserOpsProviderId,
  type BrowserOpsProviderRouteResolution,
  type BrowserOpsProxy,
  type BrowserOpsProxyHealthAssessment,
  type BrowserOpsRouteAllocation,
  type BrowserOpsRouteDecision,
  type BrowserOpsSkillResolution,
  type BrowserOpsRuntimeAssetManifest,
  type BrowserOpsRuntimeBinding,
  type BrowserOpsRuntimeDiagnostics,
  type BrowserOpsRuntimeSessionSpec,
  type BrowserOpsTaskTemplate,
  type BrowserOpsTaskType,
  type BrowserOpsAutomationBrief,
  type BrowserOpsAutomationChatDraft,
  type BrowserOpsWorkspaceSettings,
  COUNTRY_PRESETS,
  type CountryPreset,
  getCountryPreset,
  HUMANIZATION_LEVELS,
  type HumanizationLevel,
  PROXY_IP_TYPES,
  PROXY_SESSION_MODES,
  PROXY_SOURCE_TYPES,
  type ProxyHealthStats,
  type ProxyIpType,
  type ProxySessionMode,
  type ProxySourceType,
  resolveBrowserOpsRouteDecision,
  TASK_TYPES,
} from '@browseros/shared/browser-ops'

export interface BrowserOpsWorkspace {
  profiles: import('@browseros/shared/browser-ops').BrowserOpsProfile[]
  proxies: import('@browseros/shared/browser-ops').BrowserOpsProxy[]
  tasks: import('@browseros/shared/browser-ops').BrowserOpsTaskTemplate[]
  settings: import('@browseros/shared/browser-ops').BrowserOpsWorkspaceSettings
  updatedAt: string
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
