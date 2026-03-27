import {
  BROWSER_OPS_PLATFORMS,
  HUMANIZATION_LEVELS,
  PROXY_IP_TYPES,
  PROXY_SESSION_MODES,
  PROXY_SOURCE_TYPES,
  TASK_TYPES,
} from '@browseros/shared/browser-ops'
import { z } from 'zod'

export const BrowserFingerprintProfileSchema = z.object({
  userAgentPreset: z.string().min(1),
  timezone: z.string().min(1),
  language: z.string().min(1),
  locale: z.string().min(1),
  platform: z.enum(['macOS', 'Windows']),
  webglProfile: z.string().min(1),
  canvasNoise: z.enum(['light', 'medium']),
  fontsPreset: z.string().min(1),
})

export const BrowserOpsProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  accountLabel: z.string().min(1),
  platform: z.enum(BROWSER_OPS_PLATFORMS),
  marketCountry: z.string().min(2).max(3),
  proxyMode: z.enum(['auto', 'manual']),
  preferredIpTypes: z.array(z.enum(PROXY_IP_TYPES)).min(1),
  preferredRegion: z.string().min(1),
  manualProxyId: z.string().optional(),
  sessionPartition: z.string().min(1),
  cookieVaultKey: z.string().min(1),
  status: z.enum(['ready', 'warming', 'cooldown']),
  fingerprint: BrowserFingerprintProfileSchema,
  tags: z.array(z.string()),
})

export const ProxyHealthStatsSchema = z.object({
  successRate: z.number().min(0).max(1),
  banRate: z.number().min(0).max(1),
  latencyMs: z.number().min(0),
  lastCheckedAt: z.string().min(1),
})

export const BrowserOpsProxySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sourceType: z.enum(PROXY_SOURCE_TYPES),
  providerName: z.string().min(1),
  endpoint: z.string().min(1),
  builtInPool: z.boolean(),
  ipType: z.enum(PROXY_IP_TYPES),
  sessionMode: z.enum(PROXY_SESSION_MODES),
  countries: z.array(z.string().min(2).max(3)).min(1),
  rotationSupport: z.boolean(),
  stickySessionTtlMinutes: z.number().min(1).optional(),
  status: z.enum(['active', 'paused']),
  health: ProxyHealthStatsSchema,
})

export const BrowserOpsTaskTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  platform: z.enum(BROWSER_OPS_PLATFORMS),
  taskType: z.enum(TASK_TYPES),
  goal: z.string().min(1),
  targetCountry: z.string().min(2).max(3).optional(),
  requiredIpTypes: z.array(z.enum(PROXY_IP_TYPES)).min(1),
  preferredSessionMode: z.enum(PROXY_SESSION_MODES),
  rotateIpOnEachRun: z.boolean(),
  humanizationLevel: z.enum(HUMANIZATION_LEVELS),
  skillKey: z.string().min(1),
})

export const BrowserOpsWorkspaceSettingsSchema = z.object({
  autoRouteIp: z.boolean(),
  autoAlignFingerprint: z.boolean(),
  allowBringYourOwnProxy: z.boolean(),
  useBuiltInProxyPool: z.boolean(),
  enforceQualityGuard: z.boolean(),
})

export const BrowserOpsPreviewRequestSchema = z.object({
  profile: BrowserOpsProfileSchema,
  task: BrowserOpsTaskTemplateSchema,
  proxies: z.array(BrowserOpsProxySchema),
  settings: BrowserOpsWorkspaceSettingsSchema,
})

export const BrowserOpsReleaseAllocationSchema = z.object({
  allocationId: z.string().uuid(),
})

export const BrowserOpsBindAllocationSchema = z.object({
  allocationId: z.string().uuid(),
})

export const BrowserOpsUnbindRuntimeSchema = z.object({
  bindingId: z.string().uuid(),
})

export const BrowserOpsOpenManagedWindowSchema = z.object({
  allocationId: z.string().uuid(),
  url: z.string().optional().default('about:blank'),
  hidden: z.boolean().optional().default(false),
  restoreCookieVault: z.boolean().optional().default(true),
})

export const BrowserOpsCookieVaultBindingSchema = z.object({
  bindingId: z.string().uuid(),
})

export const BrowserOpsReconcileRuntimeSchema = z.object({
  disposeOrphanContexts: z.boolean().optional().default(true),
  recreateMissingContexts: z.boolean().optional().default(true),
})

export const BrowserOpsLaunchBundleSchema = z.object({
  specId: z.string().min(1),
})

export const BrowserOpsLaunchExecutionSchema = z.object({
  specId: z.string().min(1),
  execute: z.boolean().optional().default(false),
})

export const BrowserOpsStopLaunchExecutionSchema = z.object({
  executionId: z.string().uuid(),
})
