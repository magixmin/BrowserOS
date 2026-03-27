import type {
  BrowserOpsAutomationBrief,
  BrowserOpsPreviewInput,
  BrowserOpsPreviewResult,
  BrowserOpsTaskTemplate,
} from '@browseros/shared/browser-ops'
import { resolveBrowserOpsSkill } from './skills'

function getRecommendedStartUrl(task: BrowserOpsTaskTemplate): string {
  if (task.platform === 'tiktok') return 'https://www.tiktok.com/upload'
  if (task.platform === 'amazon') return 'https://sellercentral.amazon.com'
  if (task.platform === 'walmart') return 'https://www.walmart.com'
  return 'about:blank'
}

function getRecommendedMode(
  task: BrowserOpsTaskTemplate,
): 'agent' | 'lobster' {
  switch (task.taskType) {
    case 'scraping':
    case 'research':
      return 'lobster'
    default:
      return 'agent'
  }
}

function buildExecutionPrompt(args: {
  input: BrowserOpsPreviewInput
  routePreview: BrowserOpsPreviewResult
  skillResolution: Awaited<ReturnType<typeof resolveBrowserOpsSkill>>
  recommendedStartUrl: string
}): string {
  const { input, routePreview, skillResolution, recommendedStartUrl } = args
  const route = routePreview.routeResolution
  const reasons = routePreview.decision.reasons.map((reason) => `- ${reason}`)
  const warnings = [
    ...routePreview.decision.warnings,
    ...skillResolution.notes,
  ].map((warning) => `- ${warning}`)

  const skillLine = skillResolution.resolvedSkillId
    ? `Resolved skill: ${skillResolution.resolvedSkillId}${skillResolution.resolvedSkillName ? ` (${skillResolution.resolvedSkillName})` : ''}`
    : `Resolved skill: none. Fall back to the task goal and the mapped candidate notes.`

  const proxyLine = route
    ? `Proxy route: ${route.providerName} via ${route.proxyServerArg ?? route.endpointHost} (${route.authMode}, credential source=${route.credentialSource}, status=${route.credentialStatus})`
    : 'Proxy route: unresolved'

  return [
    `Browser Ops execution brief`,
    ``,
    `Profile: ${input.profile.name} (${input.profile.platform}/${input.profile.marketCountry})`,
    `Task: ${input.task.name}`,
    `Goal: ${input.task.goal}`,
    `Recommended start URL: ${recommendedStartUrl}`,
    skillLine,
    proxyLine,
    `Session strategy: ${routePreview.decision.rotationStrategy}`,
    `Humanization: ${routePreview.decision.humanizationLevel}`,
    ``,
    `Execution guidance:`,
    `1. Start at the recommended URL and keep actions scoped to this task.`,
    `2. Use the resolved skill if available before improvising your own flow.`,
    `3. Preserve the selected profile/session context and do not switch proxies mid-run unless the route policy says so.`,
    `4. If the task requires login or publish actions, verify page state before submitting.`,
    ``,
    `Why this route was chosen:`,
    ...(reasons.length ? reasons : ['- No route reasons available.']),
    ``,
    `Warnings and setup notes:`,
    ...(warnings.length ? warnings : ['- No additional warnings.']),
  ].join('\n')
}

export async function buildBrowserOpsAutomationBrief(
  input: BrowserOpsPreviewInput,
  routePreview: BrowserOpsPreviewResult,
): Promise<BrowserOpsAutomationBrief> {
  const skillResolution = await resolveBrowserOpsSkill(input.task)
  const recommendedStartUrl = getRecommendedStartUrl(input.task)

  const missingRequirements = [
    ...(routePreview.routeResolution?.credentialStatus === 'missing'
      ? routePreview.routeResolution.missingCredentialEnv.map(
          (envName) => `Missing proxy credential env: ${envName}`,
        )
      : []),
    ...(skillResolution.matchType === 'missing'
      ? [`No installed skill mapped to task skill key "${input.task.skillKey}".`]
      : []),
  ]

  const readiness = missingRequirements.length > 0 ? 'needs-setup' : 'ready'
  const launchMode =
    input.task.taskType === 'publishing' || input.task.platform !== 'generic'
      ? 'managed-window'
      : 'attached-current-window'
  const recommendedMode = getRecommendedMode(input.task)

  return {
    profileId: input.profile.id,
    taskId: input.task.id,
    readiness,
    recommendedMode,
    recommendedStartUrl,
    launchMode,
    resolvedSkillId: skillResolution.resolvedSkillId,
    resolvedSkillName: skillResolution.resolvedSkillName,
    routePreview,
    skillResolution,
    missingRequirements,
    notes: [
      `Task skill key: ${input.task.skillKey}`,
      `Recommended launch mode: ${launchMode}`,
    ],
    executionPrompt: buildExecutionPrompt({
      input,
      routePreview,
      skillResolution,
      recommendedStartUrl,
    }),
  }
}
