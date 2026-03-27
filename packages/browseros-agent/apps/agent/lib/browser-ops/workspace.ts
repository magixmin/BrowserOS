import { storage } from '@wxt-dev/storage'
import { useCallback, useEffect, useState } from 'react'
import type {
  BrowserFingerprintProfile,
  BrowserOpsPlatform,
  BrowserOpsProfile,
  BrowserOpsProxy,
  BrowserOpsTaskTemplate,
  BrowserOpsTaskType,
  BrowserOpsWorkspace,
  BrowserOpsWorkspaceSettings,
  HumanizationLevel,
  ProxyIpType,
  ProxySessionMode,
  ProxySourceType,
} from './types'
import { getCountryPreset } from './types'

function createFingerprint(countryCode: string): BrowserFingerprintProfile {
  const preset = getCountryPreset(countryCode)

  return {
    userAgentPreset: 'Chrome 137 / Desktop',
    timezone: preset.timezone,
    language: preset.language,
    locale: preset.locale,
    platform: 'Windows',
    webglProfile: 'Intel Iris Xe',
    canvasNoise: 'light',
    fontsPreset: 'office-desktop',
  }
}

function createSeedProfile(
  id: string,
  config: {
    name: string
    accountLabel: string
    platform: BrowserOpsPlatform
    marketCountry: string
    proxyMode: 'auto' | 'manual'
    preferredIpTypes: ProxyIpType[]
    preferredRegion: string
    manualProxyId?: string
    status: BrowserOpsProfile['status']
    tags: string[]
  },
): BrowserOpsProfile {
  return {
    id,
    name: config.name,
    accountLabel: config.accountLabel,
    platform: config.platform,
    marketCountry: config.marketCountry,
    proxyMode: config.proxyMode,
    preferredIpTypes: config.preferredIpTypes,
    preferredRegion: config.preferredRegion,
    manualProxyId: config.manualProxyId,
    sessionPartition: `persist:${id}`,
    cookieVaultKey: `vault:${id}`,
    status: config.status,
    fingerprint: createFingerprint(config.marketCountry),
    tags: config.tags,
  }
}

function createSeedProxy(
  id: string,
  config: {
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
    status: BrowserOpsProxy['status']
    successRate: number
    banRate: number
    latencyMs: number
  },
): BrowserOpsProxy {
  return {
    id,
    name: config.name,
    sourceType: config.sourceType,
    providerName: config.providerName,
    endpoint: config.endpoint,
    builtInPool: config.builtInPool,
    ipType: config.ipType,
    sessionMode: config.sessionMode,
    countries: config.countries,
    rotationSupport: config.rotationSupport,
    stickySessionTtlMinutes: config.stickySessionTtlMinutes,
    status: config.status,
    health: {
      successRate: config.successRate,
      banRate: config.banRate,
      latencyMs: config.latencyMs,
      lastCheckedAt: new Date().toISOString(),
    },
  }
}

function createSeedTask(
  id: string,
  config: {
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
  },
): BrowserOpsTaskTemplate {
  return {
    id,
    name: config.name,
    platform: config.platform,
    taskType: config.taskType,
    goal: config.goal,
    targetCountry: config.targetCountry,
    requiredIpTypes: config.requiredIpTypes,
    preferredSessionMode: config.preferredSessionMode,
    rotateIpOnEachRun: config.rotateIpOnEachRun,
    humanizationLevel: config.humanizationLevel,
    skillKey: config.skillKey,
  }
}

function createDefaultSettings(): BrowserOpsWorkspaceSettings {
  return {
    autoRouteIp: true,
    autoAlignFingerprint: true,
    allowBringYourOwnProxy: true,
    useBuiltInProxyPool: true,
    enforceQualityGuard: true,
  }
}

export function createDefaultBrowserOpsWorkspace(): BrowserOpsWorkspace {
  return {
    profiles: [
      createSeedProfile('profile_tiktok_us_01', {
        name: 'TikTok US Creator',
        accountLabel: '@nova_us_creator',
        platform: 'tiktok',
        marketCountry: 'US',
        proxyMode: 'auto',
        preferredIpTypes: ['residential', 'mobile'],
        preferredRegion: 'US',
        status: 'ready',
        tags: ['creator', 'publishing'],
      }),
      createSeedProfile('profile_amazon_us_01', {
        name: 'Amazon Seller US',
        accountLabel: 'seller-central-us',
        platform: 'amazon',
        marketCountry: 'US',
        proxyMode: 'manual',
        preferredIpTypes: ['isp', 'residential'],
        preferredRegion: 'US',
        manualProxyId: 'proxy_decodo_us_isp_01',
        status: 'ready',
        tags: ['seller', 'ops'],
      }),
      createSeedProfile('profile_walmart_ca_01', {
        name: 'Walmart CA Monitor',
        accountLabel: 'wm-ca-watch',
        platform: 'walmart',
        marketCountry: 'CA',
        proxyMode: 'auto',
        preferredIpTypes: ['isp', 'residential'],
        preferredRegion: 'CA',
        status: 'warming',
        tags: ['monitoring'],
      }),
    ],
    proxies: [
      createSeedProxy('proxy_brightdata_us_resi_01', {
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
        successRate: 0.96,
        banRate: 0.02,
        latencyMs: 480,
      }),
      createSeedProxy('proxy_decodo_us_isp_01', {
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
        successRate: 0.97,
        banRate: 0.01,
        latencyMs: 360,
      }),
      createSeedProxy('proxy_byo_uk_resi_01', {
        name: 'Customer UK Residential',
        sourceType: 'bring-your-own',
        providerName: 'Customer Supplied',
        endpoint: 'uk.example.net:9000',
        builtInPool: false,
        ipType: 'residential',
        sessionMode: 'rotating',
        countries: ['UK'],
        rotationSupport: true,
        status: 'active',
        successRate: 0.91,
        banRate: 0.04,
        latencyMs: 620,
      }),
      createSeedProxy('proxy_trial_us_resi_01', {
        name: 'Trial US Pool',
        sourceType: 'trial',
        providerName: 'BrowserOS Trial',
        endpoint: 'trial.browseros.local:8080',
        builtInPool: true,
        ipType: 'residential',
        sessionMode: 'rotating',
        countries: ['US', 'CA'],
        rotationSupport: true,
        status: 'paused',
        successRate: 0.82,
        banRate: 0.09,
        latencyMs: 910,
      }),
    ],
    tasks: [
      createSeedTask('task_tiktok_publish_video', {
        name: 'TikTok Publish Video',
        platform: 'tiktok',
        taskType: 'publishing',
        goal: 'Open upload page, upload a prepared video, set caption, publish.',
        targetCountry: 'US',
        requiredIpTypes: ['residential', 'mobile'],
        preferredSessionMode: 'sticky',
        rotateIpOnEachRun: false,
        humanizationLevel: 'strict',
        skillKey: 'post_tiktok_video',
      }),
      createSeedTask('task_amazon_listing_check', {
        name: 'Amazon Listing Monitor',
        platform: 'amazon',
        taskType: 'operations',
        goal: 'Open Seller Central, inspect listing health, report inventory and buy box issues.',
        targetCountry: 'US',
        requiredIpTypes: ['isp', 'residential'],
        preferredSessionMode: 'sticky',
        rotateIpOnEachRun: false,
        humanizationLevel: 'balanced',
        skillKey: 'inspect_amazon_listing',
      }),
      createSeedTask('task_walmart_price_scrape', {
        name: 'Walmart Price Scrape',
        platform: 'walmart',
        taskType: 'scraping',
        goal: 'Collect price snapshots across product pages and export normalized data.',
        targetCountry: 'CA',
        requiredIpTypes: ['residential', 'datacenter'],
        preferredSessionMode: 'rotating',
        rotateIpOnEachRun: true,
        humanizationLevel: 'balanced',
        skillKey: 'scrape_walmart_prices',
      }),
    ],
    settings: createDefaultSettings(),
    updatedAt: new Date().toISOString(),
  }
}

const DEFAULT_BROWSER_OPS_WORKSPACE = createDefaultBrowserOpsWorkspace()

export const browserOpsWorkspaceStorage =
  storage.defineItem<BrowserOpsWorkspace>('local:browser-ops-workspace', {
    fallback: DEFAULT_BROWSER_OPS_WORKSPACE,
  })

function cloneWorkspace(workspace: BrowserOpsWorkspace): BrowserOpsWorkspace {
  return structuredClone(workspace)
}

function ensureWorkspace(
  workspace?: BrowserOpsWorkspace | null,
): BrowserOpsWorkspace {
  return cloneWorkspace(workspace ?? DEFAULT_BROWSER_OPS_WORKSPACE)
}

export function createProfileDraft(
  platform: BrowserOpsPlatform = 'tiktok',
): BrowserOpsProfile {
  const defaultCountry =
    platform === 'walmart' ? 'CA' : platform === 'generic' ? 'US' : 'US'
  const id = `profile_${platform}_${crypto.randomUUID()}`
  const fingerprint = createFingerprint(defaultCountry)

  return {
    id,
    name: `${platform.toUpperCase()} Profile`,
    accountLabel: `${platform}-account`,
    platform,
    marketCountry: defaultCountry,
    proxyMode: 'auto',
    preferredIpTypes:
      platform === 'tiktok'
        ? ['residential', 'mobile']
        : ['isp', 'residential'],
    preferredRegion: defaultCountry,
    sessionPartition: `persist:${id}`,
    cookieVaultKey: `vault:${id}`,
    status: 'warming',
    fingerprint,
    tags: [platform, 'new'],
  }
}

export function createProxyDraft(
  sourceType: ProxySourceType = 'bring-your-own',
): BrowserOpsProxy {
  const id = `proxy_${sourceType}_${crypto.randomUUID()}`

  return {
    id,
    name:
      sourceType === 'bring-your-own'
        ? 'Custom Proxy'
        : sourceType === 'managed'
          ? 'Managed Proxy'
          : 'Trial Proxy',
    sourceType,
    providerName:
      sourceType === 'bring-your-own'
        ? 'Customer Supplied'
        : sourceType === 'managed'
          ? 'Managed Provider'
          : 'BrowserOS Trial',
    endpoint: 'host:port:user:pass',
    builtInPool: sourceType !== 'bring-your-own',
    ipType: sourceType === 'trial' ? 'residential' : 'isp',
    sessionMode: sourceType === 'bring-your-own' ? 'sticky' : 'rotating',
    countries: ['US'],
    rotationSupport: true,
    stickySessionTtlMinutes: 20,
    status: 'active',
    health: {
      successRate: 0.88,
      banRate: 0.05,
      latencyMs: 650,
      lastCheckedAt: new Date().toISOString(),
    },
  }
}

export function createTaskDraft(
  platform: BrowserOpsPlatform = 'tiktok',
): BrowserOpsTaskTemplate {
  const id = `task_${platform}_${crypto.randomUUID()}`

  return {
    id,
    name: `${platform.toUpperCase()} Task`,
    platform,
    taskType: platform === 'walmart' ? 'scraping' : 'operations',
    goal: 'Describe the browser steps for this platform task.',
    targetCountry: 'US',
    requiredIpTypes:
      platform === 'tiktok'
        ? ['residential', 'mobile']
        : ['isp', 'residential'],
    preferredSessionMode: platform === 'walmart' ? 'rotating' : 'sticky',
    rotateIpOnEachRun: platform === 'walmart',
    humanizationLevel: platform === 'tiktok' ? 'strict' : 'balanced',
    skillKey: `skill_${platform}`,
  }
}

export function useBrowserOpsWorkspace() {
  const [workspace, setWorkspace] = useState<BrowserOpsWorkspace>(
    DEFAULT_BROWSER_OPS_WORKSPACE,
  )

  useEffect(() => {
    browserOpsWorkspaceStorage.getValue().then((value) => {
      setWorkspace(ensureWorkspace(value))
    })

    const unwatch = browserOpsWorkspaceStorage.watch((newValue) => {
      setWorkspace(ensureWorkspace(newValue))
    })

    return unwatch
  }, [])

  const commitWorkspace = useCallback(
    async (
      updater: (current: BrowserOpsWorkspace) => BrowserOpsWorkspace,
    ): Promise<BrowserOpsWorkspace> => {
      const current = ensureWorkspace(
        await browserOpsWorkspaceStorage.getValue(),
      )
      const next = updater(current)
      const finalized = {
        ...next,
        updatedAt: new Date().toISOString(),
      }

      await browserOpsWorkspaceStorage.setValue(finalized)
      setWorkspace(finalized)
      return finalized
    },
    [],
  )

  const updateSettings = useCallback(
    async (patch: Partial<BrowserOpsWorkspaceSettings>) =>
      commitWorkspace((current) => ({
        ...current,
        settings: {
          ...current.settings,
          ...patch,
        },
      })),
    [commitWorkspace],
  )

  const addProfile = useCallback(
    async (profile: BrowserOpsProfile) =>
      commitWorkspace((current) => ({
        ...current,
        profiles: [...current.profiles, profile],
      })).then(() => profile),
    [commitWorkspace],
  )

  const updateProfile = useCallback(
    async (profileId: string, patch: Partial<BrowserOpsProfile>) =>
      commitWorkspace((current) => ({
        ...current,
        profiles: current.profiles.map((profile) =>
          profile.id === profileId ? { ...profile, ...patch } : profile,
        ),
      })),
    [commitWorkspace],
  )

  const removeProfile = useCallback(
    async (profileId: string) =>
      commitWorkspace((current) => ({
        ...current,
        profiles: current.profiles.filter(
          (profile) => profile.id !== profileId,
        ),
      })),
    [commitWorkspace],
  )

  const addProxy = useCallback(
    async (proxy: BrowserOpsProxy) =>
      commitWorkspace((current) => ({
        ...current,
        proxies: [...current.proxies, proxy],
      })).then(() => proxy),
    [commitWorkspace],
  )

  const toggleProxyStatus = useCallback(
    async (proxyId: string) =>
      commitWorkspace((current) => ({
        ...current,
        proxies: current.proxies.map((proxy) =>
          proxy.id === proxyId
            ? {
                ...proxy,
                status: proxy.status === 'active' ? 'paused' : 'active',
              }
            : proxy,
        ),
      })),
    [commitWorkspace],
  )

  const removeProxy = useCallback(
    async (proxyId: string) =>
      commitWorkspace((current) => ({
        ...current,
        proxies: current.proxies.filter((proxy) => proxy.id !== proxyId),
        profiles: current.profiles.map((profile) =>
          profile.manualProxyId === proxyId
            ? { ...profile, manualProxyId: undefined, proxyMode: 'auto' }
            : profile,
        ),
      })),
    [commitWorkspace],
  )

  const addTask = useCallback(
    async (task: BrowserOpsTaskTemplate) =>
      commitWorkspace((current) => ({
        ...current,
        tasks: [...current.tasks, task],
      })).then(() => task),
    [commitWorkspace],
  )

  const removeTask = useCallback(
    async (taskId: string) =>
      commitWorkspace((current) => ({
        ...current,
        tasks: current.tasks.filter((task) => task.id !== taskId),
      })),
    [commitWorkspace],
  )

  return {
    workspace,
    updateSettings,
    addProfile,
    updateProfile,
    removeProfile,
    addProxy,
    toggleProxyStatus,
    removeProxy,
    addTask,
    removeTask,
  }
}
