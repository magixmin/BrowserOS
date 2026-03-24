import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawn } from 'node:child_process'
import matter from 'gray-matter'
import { logger } from '../lib/logger'
import { fetchRemoteCatalog } from './remote-sync'
import { safeBuiltinSkillDir, safeSkillDir } from './service'
import { isValidFrontmatter, loadAllSkills } from './loader'
import type {
  CatalogSkillEntry,
  CatalogSkillSource,
  CompatibilityTier,
  RemoteSkillCatalog,
  SkillFrontmatter,
} from './types'

const OPENAI_SKILLS_REPO = 'openai/skills'
const OPENAI_SKILLS_REF = 'main'
const OPENAI_CURATED_PATH = 'skills/.curated'
const CLAWHUB_BASE = 'https://clawhub.ai'
const GITHUB_API_BASE = 'https://api.github.com/repos'
const CLAWHUB_PAGE_LIMIT = 100
const CLAWHUB_MAX_ITEMS = 500
const OPENCLAW_RECOMMENDED_SKILLS = [
  {
    slug: 'google-drive',
    displayName: 'Google Drive',
    summary:
      'Google Drive API integration with managed OAuth. List, search, create, and manage files and folders.',
  },
  {
    slug: 'slack',
    displayName: 'Slack',
    summary:
      'Use Slack from ClawHub/OpenClaw workflows for message and channel operations.',
  },
  {
    slug: 'browser-automation',
    displayName: 'Browser Automation',
    summary:
      'Automate browser interactions using natural language, navigation, clicks, and extraction steps.',
  },
  {
    slug: 'google-search',
    displayName: 'Google Search',
    summary:
      'Search the web using Google when live information or documentation lookup is needed.',
  },
  {
    slug: 'porteden-drive',
    displayName: 'Secure Google Drive Access',
    summary:
      'Secure Google Drive management skill from PortEden with stronger operational controls.',
  },
] as const

type ClawHubPackage = {
  name: string
  displayName: string
  summary?: string | null
  latestVersion?: string | null
  ownerHandle?: string | null
  executesCode?: boolean
  isOfficial?: boolean
  capabilityTags?: string[]
  verificationTier?: string | null
  channel?: string | null
}

type ClawHubPackageListResponse = {
  items?: ClawHubPackage[]
  nextCursor?: string | null
}

type GitHubEntry = {
  name: string
  path: string
  type: 'file' | 'dir'
  content?: string
  encoding?: string
  download_url?: string | null
}

function extractContentPreview(content: string): string[] {
  return content
    .split(/\n\s*\n/)
    .map((section) => section.trim())
    .filter((section) => section.length > 0)
    .filter((section) => !section.startsWith('#'))
    .slice(0, 3)
}

function extractOutline(content: string): string[] {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^#{1,6}\s+/.test(line))
    .map((line) => line.replace(/^#{1,6}\s+/, ''))
    .slice(0, 10)
}

function buildFrontmatterPreview(data: Record<string, unknown>): Record<string, unknown> {
  const preview: Record<string, unknown> = {
    name: data.name,
    description: data.description,
  }

  if (data.compatibility) preview.compatibility = data.compatibility
  if (data.license) preview.license = data.license
  if (data['allowed-tools']) preview['allowed-tools'] = data['allowed-tools']
  if (data.metadata) preview.metadata = data.metadata

  return preview
}

function getCompatibilityTier(score: number): CompatibilityTier {
  if (score >= 80) return 'high'
  if (score >= 60) return 'medium'
  return 'low'
}

function githubContentsUrl(repo: string, ref: string, path: string): string {
  const encodedPath = path
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/')
  return `${GITHUB_API_BASE}/${repo}/contents/${encodedPath}?ref=${ref}`
}

async function fetchGitHubJson(
  repo: string,
  ref: string,
  path: string,
): Promise<unknown> {
  const response = await fetch(githubContentsUrl(repo, ref, path), {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'BrowserOS Skills Marketplace',
    },
  })
  if (!response.ok) {
    throw new Error(`GitHub API request failed: ${response.status}`)
  }
  return response.json()
}

async function fetchGitHubDirectory(
  repo: string,
  ref: string,
  path: string,
): Promise<GitHubEntry[]> {
  const data = await fetchGitHubJson(repo, ref, path)
  if (!Array.isArray(data)) {
    throw new Error(`Expected directory listing for ${path}`)
  }
  return data as GitHubEntry[]
}

async function fetchGitHubFile(
  repo: string,
  ref: string,
  path: string,
): Promise<string> {
  const data = (await fetchGitHubJson(repo, ref, path)) as GitHubEntry
  if (data.type !== 'file') {
    throw new Error(`Expected file for ${path}`)
  }
  if (data.content && data.encoding === 'base64') {
    return Buffer.from(data.content, 'base64').toString('utf-8')
  }
  if (data.download_url) {
    const response = await fetch(data.download_url)
    if (!response.ok) {
      throw new Error(`Failed to download ${path}`)
    }
    return response.text()
  }
  throw new Error(`No content available for ${path}`)
}

async function extractZipToDir(zipBytes: Uint8Array, destinationDir: string) {
  const tempDir = await mkdtemp(join(tmpdir(), 'clawhub-skill-'))
  const zipPath = join(tempDir, 'skill.zip')
  await writeFile(zipPath, zipBytes)

  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn('unzip', ['-oq', zipPath, '-d', destinationDir], {
        stdio: 'inherit',
      })
      child.on('close', (code) => {
        if (code === 0) resolve()
        else reject(new Error(`unzip failed with code ${code}`))
      })
      child.on('error', reject)
    })
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

async function fetchClawHubSkill(slug: string): Promise<{
  slug: string
  displayName: string
  summary: string | null
  version?: string
}> {
  const response = await fetch(
    `${CLAWHUB_BASE}/api/v1/skills/${encodeURIComponent(slug)}`,
    {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'BrowserOS Skills Marketplace',
      },
    },
  )
  if (!response.ok) {
    throw new Error(`ClawHub skill lookup failed: ${response.status}`)
  }
  const data = (await response.json()) as {
    skill?: { slug: string; displayName: string; summary?: string | null }
    latestVersion?: { version?: string }
  }
  if (!data.skill) {
    throw new Error(`ClawHub skill "${slug}" not found`)
  }
  return {
    slug: data.skill.slug,
    displayName: data.skill.displayName,
    summary: data.skill.summary ?? null,
    version: data.latestVersion?.version,
  }
}

async function ensureClawHubSkillFrontmatter(
  dir: string,
  skill: {
    slug: string
    displayName: string
    summary: string | null
    version?: string
  },
) {
  const skillMdPath = join(dir, 'SKILL.md')
  const raw = await readFile(skillMdPath, 'utf-8')
  const parsed = matter(raw)

  if (isValidFrontmatter(parsed.data)) return

  const frontmatter: SkillFrontmatter = {
    name: skill.slug,
    description:
      skill.summary?.trim() || `${skill.displayName} imported from ClawHub.`,
    compatibility: 'openclaw',
    metadata: {
      'display-name': skill.displayName,
      enabled: 'true',
      ...(skill.version ? { version: skill.version } : {}),
    },
  }

  await writeFile(skillMdPath, matter.stringify(parsed.content.trim(), frontmatter))
}

async function fetchClawHubPackagesPage(
  cursor?: string,
  limit = CLAWHUB_PAGE_LIMIT,
): Promise<ClawHubPackageListResponse> {
  const url = new URL('/api/v1/packages', CLAWHUB_BASE)
  url.searchParams.set('family', 'skill')
  url.searchParams.set('limit', String(limit))
  if (cursor) url.searchParams.set('cursor', cursor)

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'BrowserOS Skills Marketplace',
    },
  })
  if (!response.ok) {
    throw new Error(`ClawHub packages request failed: ${response.status}`)
  }

  return (await response.json()) as ClawHubPackageListResponse
}

async function fetchClawHubCatalogSkills(): Promise<ClawHubPackage[]> {
  const items: ClawHubPackage[] = []
  let cursor: string | null | undefined

  while (items.length < CLAWHUB_MAX_ITEMS) {
    const page = await fetchClawHubPackagesPage(
      cursor ?? undefined,
      Math.min(CLAWHUB_PAGE_LIMIT, CLAWHUB_MAX_ITEMS - items.length),
    )

    if (!Array.isArray(page.items) || page.items.length === 0) break
    items.push(...page.items)

    cursor = page.nextCursor
    if (!cursor) break
  }

  return items
}

function buildClawHubCatalogEntry(
  skill: ClawHubPackage,
  installedMap: Map<string, { builtIn: boolean }>,
): CatalogSkillEntry {
  const installed = installedMap.get(skill.name)
  const reasons = [
    'published from OpenClaw ClawHub source',
    'published via OpenClaw ClawHub registry',
    'install path uses official ClawHub registry download API',
  ]
  let compatibilityScore = 82

  if (skill.isOfficial) {
    compatibilityScore += 5
  }
  if (skill.executesCode === false) {
    compatibilityScore += 3
  }

  compatibilityScore = Math.max(0, Math.min(100, compatibilityScore))

  return {
    source: 'openclaw-clawhub',
    id: skill.name,
    name: skill.displayName,
    description: skill.summary ?? 'No summary provided.',
    version: skill.latestVersion ?? undefined,
    installed: !!installed,
    builtIn: installed?.builtIn ?? false,
    openClawCompatible: true,
    compatibilityScore,
    compatibilityTier: getCompatibilityTier(compatibilityScore),
    compatibilityReasons: reasons,
    frontmatterPreview: {
      name: skill.name,
      description: skill.summary ?? null,
      compatibility: 'openclaw',
      metadata: {
        owner: skill.ownerHandle ?? 'community',
        channel: skill.channel ?? 'community',
        verificationTier: skill.verificationTier ?? 'none',
      },
      'allowed-tools':
        skill.executesCode === false ? 'not required' : 'runtime-defined',
    },
    contentPreview: [
      skill.summary ?? 'No summary provided.',
      `Published by ${skill.ownerHandle ?? 'community'} on ClawHub.`,
    ],
    outline: ['Overview', 'Install from ClawHub', 'Review before enabling'],
  }
}

async function downloadClawHubSkillZip(slug: string, version?: string) {
  const url = new URL('/api/v1/download', CLAWHUB_BASE)
  url.searchParams.set('slug', slug)
  if (version) url.searchParams.set('version', version)

  const response = await fetch(url, {
    headers: {
      Accept: 'application/zip',
      'User-Agent': 'BrowserOS Skills Marketplace',
    },
  })
  if (!response.ok) {
    throw new Error(`ClawHub download failed: ${response.status}`)
  }
  return new Uint8Array(await response.arrayBuffer())
}

function parseCatalogSkill(
  source: CatalogSkillSource,
  id: string,
  version: string | undefined,
  content: string,
  installedMap: Map<string, { builtIn: boolean }>,
): CatalogSkillEntry | null {
  const parsed = matter(content)
  if (!isValidFrontmatter(parsed.data)) {
    logger.warn('Catalog skill has invalid frontmatter', { source, id })
    return null
  }

  const installed = installedMap.get(id)
  const compatibility = parsed.data.compatibility?.toLowerCase() ?? ''
  const allowedTools = parsed.data['allowed-tools']?.toLowerCase() ?? ''
  const reasons: string[] = []
  let score = 35

  if (compatibility.includes('openclaw')) {
    score += 30
    reasons.push('compatibility metadata mentions openclaw')
  }
  if (compatibility.includes('agentskills')) {
    score += 25
    reasons.push('compatibility metadata mentions AgentSkills')
  }
  if (allowedTools.length > 0) {
    score += 10
    reasons.push('declares allowed-tools')
  }
  if (parsed.data.license) {
    score += 5
    reasons.push('declares license metadata')
  }
  if (/browser|tab|page|navigate|click|extract|research/i.test(content)) {
    score += 10
    reasons.push('instructions match browser-agent workflows')
  }
  if (/python|bash|pip install|docker|kubernetes|terraform/i.test(content)) {
    score -= 10
    reasons.push('contains runtime/tooling requirements that may need adaptation')
  }
  if (source === 'browseros-remote') {
    score += 10
    reasons.push('first-party BrowserOS catalog source')
  }
  if (source === 'openclaw-clawhub') {
    score += 10
    reasons.push('published from OpenClaw ClawHub source')
  }

  score = Math.max(0, Math.min(100, score))
  const compatibilityTier = getCompatibilityTier(score)
  const openClawCompatible = score >= 60

  return {
    source,
    id,
    name: parsed.data.metadata?.['display-name'] || parsed.data.name,
    description: parsed.data.description,
    version,
    installed: !!installed,
    builtIn: installed?.builtIn ?? false,
    openClawCompatible,
    compatibilityScore: score,
    compatibilityTier,
    compatibilityReasons: reasons,
    frontmatterPreview: buildFrontmatterPreview(
      parsed.data as Record<string, unknown>,
    ),
    contentPreview: extractContentPreview(parsed.content),
    outline: extractOutline(parsed.content),
  }
}

export async function listMarketplaceSkills(): Promise<CatalogSkillEntry[]> {
  const installedSkills = await loadAllSkills()
  const installedMap = new Map(
    installedSkills.map((skill) => [skill.id, { builtIn: skill.builtIn }]),
  )

  const entries: CatalogSkillEntry[] = []

  const browserosCatalog = await fetchRemoteCatalog().catch(() => null)
  if (browserosCatalog) {
    for (const skill of browserosCatalog.skills) {
      const parsed = parseCatalogSkill(
        'browseros-remote',
        skill.id,
        skill.version,
        skill.content,
        installedMap,
      )
      if (parsed) entries.push(parsed)
    }
  }

  const curatedDirs = await fetchGitHubDirectory(
    OPENAI_SKILLS_REPO,
    OPENAI_SKILLS_REF,
    OPENAI_CURATED_PATH,
  ).catch(() => [])
  const curatedSkills = await Promise.all(
    curatedDirs
      .filter((entry) => entry.type === 'dir')
      .map(async (entry) => {
        try {
          const content = await fetchGitHubFile(
            OPENAI_SKILLS_REPO,
            OPENAI_SKILLS_REF,
            `${entry.path}/SKILL.md`,
          )
          return parseCatalogSkill(
            'openai-curated',
            entry.name,
            undefined,
            content,
            installedMap,
          )
        } catch {
          return null
        }
      }),
  )

  for (const skill of curatedSkills) {
    if (skill) entries.push(skill)
  }

  const clawHubSkills = await fetchClawHubCatalogSkills().catch((error) => {
    logger.warn('Failed to fetch ClawHub catalog, using fallback list', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  })

  if (clawHubSkills?.length) {
    for (const skill of clawHubSkills) {
      entries.push(buildClawHubCatalogEntry(skill, installedMap))
    }
  } else {
    for (const skill of OPENCLAW_RECOMMENDED_SKILLS) {
      const installed = installedMap.get(skill.slug)
      entries.push({
        source: 'openclaw-clawhub',
        id: skill.slug,
        name: skill.displayName,
        description: skill.summary,
        installed: !!installed,
        builtIn: installed?.builtIn ?? false,
        openClawCompatible: true,
        compatibilityScore: 82,
        compatibilityTier: 'high',
        compatibilityReasons: [
          'published via OpenClaw ClawHub registry',
          'recommended starter slug for ClawHub installation',
          'install path uses official ClawHub registry download API',
        ],
        frontmatterPreview: {
          name: skill.slug,
          description: skill.summary,
          compatibility: 'openclaw',
        },
        contentPreview: [
          skill.summary,
          'This listing comes from the OpenClaw registry recommendation set. Install uses the ClawHub registry download endpoint.',
        ],
        outline: ['Overview', 'Install from ClawHub', 'Review before enabling'],
      })
    }
  }

  return entries.sort((a, b) => a.name.localeCompare(b.name))
}

async function ensureSkillIsInstallable(id: string): Promise<void> {
  const existing = await loadAllSkills()
  if (existing.some((skill) => skill.id === id)) {
    throw new Error(`Skill "${id}" is already installed`)
  }

  // Safety check for path traversal via service helpers.
  safeSkillDir(id)
  safeBuiltinSkillDir(id)
}

async function installBrowserOSCatalogSkill(
  id: string,
  catalog: RemoteSkillCatalog,
): Promise<void> {
  const skill = catalog.skills.find((entry) => entry.id === id)
  if (!skill) throw new Error(`Marketplace skill "${id}" not found`)
  const dir = safeSkillDir(id)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'SKILL.md'), skill.content)
}

async function installOpenAICuratedSkill(id: string): Promise<void> {
  const rootPath = `${OPENAI_CURATED_PATH}/${id}`
  const dir = safeSkillDir(id)

  async function copyDirectory(
    repo: string,
    ref: string,
    remotePath: string,
    localDir: string,
  ) {
    await mkdir(localDir, { recursive: true })
    const entries = await fetchGitHubDirectory(repo, ref, remotePath)
    for (const entry of entries) {
      if (entry.type === 'dir') {
        await copyDirectory(repo, ref, entry.path, join(localDir, entry.name))
      } else {
        const content = await fetchGitHubFile(repo, ref, entry.path)
        await writeFile(join(localDir, entry.name), content)
      }
    }
  }

  await copyDirectory(OPENAI_SKILLS_REPO, OPENAI_SKILLS_REF, rootPath, dir)
}

async function installOpenClawSkill(id: string): Promise<void> {
  const skill = await fetchClawHubSkill(id)
  const dir = safeSkillDir(id)
  await rm(dir, { recursive: true, force: true })
  await mkdir(dir, { recursive: true })
  const zip = await downloadClawHubSkillZip(skill.slug, skill.version)
  try {
    await extractZipToDir(zip, dir)
    await ensureClawHubSkillFrontmatter(dir, skill)
  } catch (error) {
    await rm(dir, { recursive: true, force: true })
    throw error
  }
}

export async function installMarketplaceSkill(input: {
  source: CatalogSkillSource
  id: string
}): Promise<void> {
  await ensureSkillIsInstallable(input.id)

  if (input.source === 'browseros-remote') {
    const catalog = await fetchRemoteCatalog()
    if (!catalog) throw new Error('BrowserOS skills catalog unavailable')
    await installBrowserOSCatalogSkill(input.id, catalog)
    return
  }

  if (input.source === 'openai-curated') {
    await installOpenAICuratedSkill(input.id)
    return
  }

  if (input.source === 'openclaw-clawhub') {
    await installOpenClawSkill(input.id)
    return
  }

  throw new Error(`Unsupported marketplace source: ${input.source}`)
}
