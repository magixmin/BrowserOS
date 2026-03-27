import type {
  BrowserOpsSkillCandidate,
  BrowserOpsSkillResolution,
  BrowserOpsTaskTemplate,
} from '@browseros/shared/browser-ops'
import { getSkill } from '../../../skills/service'

type SkillBridgeCandidate = {
  skillId: string
  reason: string
}

const TASK_SKILL_BRIDGES: Record<string, SkillBridgeCandidate[]> = {
  post_tiktok_video: [
    {
      skillId: 'fill-form',
      reason: 'TikTok publish flows map best to structured multi-step form automation.',
    },
    {
      skillId: 'screenshot-walkthrough',
      reason: 'Useful when operators need a visual publish walkthrough and checkpoints.',
    },
  ],
  inspect_amazon_listing: [
    {
      skillId: 'extract-data',
      reason: 'Listing inspection maps to structured extraction of listing and account signals.',
    },
    {
      skillId: 'monitor-page',
      reason: 'Recurring listing health checks often become monitor workflows.',
    },
  ],
  scrape_walmart_prices: [
    {
      skillId: 'extract-data',
      reason: 'Walmart price scraping maps directly to structured extraction/export.',
    },
    {
      skillId: 'compare-prices',
      reason: 'Price workflows often end in cross-retailer comparison reports.',
    },
  ],
}

function normalizeSkillKey(skillKey: string): string {
  return skillKey.trim().toLowerCase().replace(/_/g, '-')
}

function getMappedCandidates(task: BrowserOpsTaskTemplate): SkillBridgeCandidate[] {
  const directMapping =
    TASK_SKILL_BRIDGES[task.skillKey] ??
    TASK_SKILL_BRIDGES[normalizeSkillKey(task.skillKey)] ??
    null

  if (directMapping) return directMapping

  switch (task.taskType) {
    case 'publishing':
      return [
        {
          skillId: 'fill-form',
          reason: 'Publishing tasks typically end in filling and submitting structured forms.',
        },
      ]
    case 'scraping':
      return [
        {
          skillId: 'extract-data',
          reason: 'Scraping tasks map to structured extraction and export.',
        },
      ]
    case 'operations':
      return [
        {
          skillId: 'extract-data',
          reason: 'Operational audits usually start with extracting structured page state.',
        },
        {
          skillId: 'monitor-page',
          reason: 'Operational checks often graduate into monitorable workflows.',
        },
      ]
    default:
      return []
  }
}

async function buildCandidate(
  candidate: SkillBridgeCandidate,
): Promise<BrowserOpsSkillCandidate> {
  const skill = await getSkill(candidate.skillId)
  return {
    skillId: candidate.skillId,
    reason: candidate.reason,
    exists: Boolean(skill),
    builtIn: skill?.builtIn,
    name: skill?.name,
    description: skill?.description,
  }
}

export async function resolveBrowserOpsSkill(
  task: BrowserOpsTaskTemplate,
): Promise<BrowserOpsSkillResolution> {
  const normalizedSkillKey = normalizeSkillKey(task.skillKey)
  const directCandidates = [...new Set([task.skillKey, normalizedSkillKey])]

  for (const directSkillId of directCandidates) {
    const skill = await getSkill(directSkillId)
    if (!skill) continue

    return {
      taskSkillKey: task.skillKey,
      normalizedSkillKey,
      matchType: 'direct',
      resolvedSkillId: skill.id,
      resolvedSkillName: skill.name,
      builtIn: skill.builtIn,
      notes: [
        `Task skill key resolved directly to installed skill "${skill.id}".`,
      ],
      candidates: [
        {
          skillId: skill.id,
          reason: 'Direct skillKey match.',
          exists: true,
          builtIn: skill.builtIn,
          name: skill.name,
          description: skill.description,
        },
      ],
    }
  }

  const mappedCandidates = await Promise.all(
    getMappedCandidates(task).map((candidate) => buildCandidate(candidate)),
  )
  const resolved = mappedCandidates.find((candidate) => candidate.exists) ?? null

  if (resolved) {
    return {
      taskSkillKey: task.skillKey,
      normalizedSkillKey,
      matchType: 'mapped',
      resolvedSkillId: resolved.skillId,
      resolvedSkillName: resolved.name,
      builtIn: resolved.builtIn,
      notes: [
        `Task skill key "${task.skillKey}" does not exist directly; mapped to "${resolved.skillId}".`,
      ],
      candidates: mappedCandidates,
    }
  }

  return {
    taskSkillKey: task.skillKey,
    normalizedSkillKey,
    matchType: 'missing',
    resolvedSkillId: null,
    notes: [
      `No installed or built-in skill matched "${task.skillKey}".`,
      'Create a dedicated skill or map the task template to an existing built-in skill.',
    ],
    candidates: mappedCandidates,
  }
}
