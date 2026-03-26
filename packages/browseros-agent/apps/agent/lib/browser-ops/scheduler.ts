import type {
  BrowserFingerprintProfile,
  BrowserOpsProfile,
  BrowserOpsProxy,
  BrowserOpsRouteDecision,
  BrowserOpsTaskTemplate,
  BrowserOpsWorkspace,
  ProxyIpType,
  ProxySessionMode,
} from './types'
import { getCountryPreset } from './types'

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

function getPreferredSessionMode(
  task: BrowserOpsTaskTemplate,
): ProxySessionMode {
  return task.preferredSessionMode
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

function evaluateProxyCandidate(args: {
  proxy: BrowserOpsProxy
  profile: BrowserOpsProfile
  task: BrowserOpsTaskTemplate
  targetCountry: string
  requiredIpTypes: ProxyIpType[]
  preferredSessionMode: ProxySessionMode
  workspace: BrowserOpsWorkspace
}) {
  const {
    proxy,
    profile,
    task,
    targetCountry,
    requiredIpTypes,
    preferredSessionMode,
    workspace,
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
    warnings.push(`Proxy country ${proxy.countries.join(', ')} does not match ${targetCountry}`)
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

  if (proxy.sessionMode === preferredSessionMode) {
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

  if (workspace.settings.enforceQualityGuard) {
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

  if (!workspace.settings.allowBringYourOwnProxy && proxy.sourceType === 'bring-your-own') {
    score -= 100
    warnings.push('Bring-your-own proxies are disabled in workspace settings')
  }

  if (!workspace.settings.useBuiltInProxyPool && proxy.builtInPool) {
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

export function resolveBrowserOpsRouteDecision(
  profile: BrowserOpsProfile,
  task: BrowserOpsTaskTemplate,
  workspace: BrowserOpsWorkspace,
): BrowserOpsRouteDecision {
  const targetCountry = getTargetCountry(profile, task)
  const requiredIpTypes = getRequiredIpTypes(profile, task)
  const preferredSessionMode = getPreferredSessionMode(task)
  const recommendedFingerprint = workspace.settings.autoAlignFingerprint
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

  if (!workspace.settings.autoRouteIp && profile.proxyMode === 'auto') {
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
      workspace.proxies.find((proxy) => proxy.id === profile.manualProxyId) || null

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
      preferredSessionMode,
      workspace,
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

  const activeProxies = workspace.proxies.filter((proxy) => proxy.status === 'active')

  const candidates = activeProxies
    .map((proxy) => ({
      proxy,
      ...evaluateProxyCandidate({
        proxy,
        profile,
        task,
        targetCountry,
        requiredIpTypes,
        preferredSessionMode,
        workspace,
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
