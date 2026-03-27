import { mkdir, readdir, rm, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { PATHS } from '@browseros/shared/constants/paths'
import { logger } from './logger'

export function getBrowserosDir(): string {
  return join(homedir(), PATHS.BROWSEROS_DIR_NAME)
}

export function getMemoryDir(): string {
  return join(getBrowserosDir(), PATHS.MEMORY_DIR_NAME)
}

export function getSessionsDir(): string {
  return join(getBrowserosDir(), PATHS.SESSIONS_DIR_NAME)
}

export function getBrowserOpsDir(): string {
  return join(getBrowserosDir(), PATHS.BROWSER_OPS_DIR_NAME)
}

export function getBrowserOpsProfilesDir(): string {
  return join(getBrowserOpsDir(), PATHS.BROWSER_OPS_PROFILES_DIR_NAME)
}

export function getBrowserOpsCookieVaultsDir(): string {
  return join(getBrowserOpsDir(), PATHS.BROWSER_OPS_COOKIE_VAULTS_DIR_NAME)
}

export function getBrowserOpsRuntimeSpecsDir(): string {
  return join(getBrowserOpsDir(), PATHS.BROWSER_OPS_RUNTIME_SPECS_DIR_NAME)
}

export function getBrowserOpsRuntimeAssetsDir(): string {
  return join(getBrowserOpsDir(), PATHS.BROWSER_OPS_RUNTIME_ASSETS_DIR_NAME)
}

export function getBrowserOpsLaunchBundlesDir(): string {
  return join(getBrowserOpsDir(), PATHS.BROWSER_OPS_LAUNCH_BUNDLES_DIR_NAME)
}

export function getBrowserOpsLaunchExecutionsDir(): string {
  return join(getBrowserOpsDir(), PATHS.BROWSER_OPS_LAUNCH_EXECUTIONS_DIR_NAME)
}

export function getBrowserOpsInstancesDir(): string {
  return join(getBrowserOpsDir(), PATHS.BROWSER_OPS_INSTANCES_DIR_NAME)
}

export function getBrowserOpsInstanceEventsDir(): string {
  return join(getBrowserOpsDir(), PATHS.BROWSER_OPS_INSTANCE_EVENTS_DIR_NAME)
}

export function getSoulPath(): string {
  return join(getBrowserosDir(), PATHS.SOUL_FILE_NAME)
}

export function getCoreMemoryPath(): string {
  return join(getMemoryDir(), PATHS.CORE_MEMORY_FILE_NAME)
}

export function getSkillsDir(): string {
  return join(getBrowserosDir(), PATHS.SKILLS_DIR_NAME)
}

export function getBuiltinSkillsDir(): string {
  return join(getSkillsDir(), PATHS.BUILTIN_DIR_NAME)
}

export async function ensureBrowserosDir(): Promise<void> {
  await mkdir(getMemoryDir(), { recursive: true })
  await mkdir(getSkillsDir(), { recursive: true })
  await mkdir(getBuiltinSkillsDir(), { recursive: true })
  await mkdir(getSessionsDir(), { recursive: true })
  await mkdir(getBrowserOpsProfilesDir(), { recursive: true })
  await mkdir(getBrowserOpsCookieVaultsDir(), { recursive: true })
  await mkdir(getBrowserOpsRuntimeSpecsDir(), { recursive: true })
  await mkdir(getBrowserOpsRuntimeAssetsDir(), { recursive: true })
  await mkdir(getBrowserOpsLaunchBundlesDir(), { recursive: true })
  await mkdir(getBrowserOpsLaunchExecutionsDir(), { recursive: true })
  await mkdir(getBrowserOpsInstancesDir(), { recursive: true })
  await mkdir(getBrowserOpsInstanceEventsDir(), { recursive: true })
}

export async function cleanOldSessions(): Promise<void> {
  const sessionsDir = getSessionsDir()
  let entries: string[]
  try {
    entries = await readdir(sessionsDir)
  } catch {
    return
  }

  const cutoff = Date.now() - PATHS.SESSION_RETENTION_DAYS * 24 * 60 * 60 * 1000
  let removed = 0

  for (const entry of entries) {
    const entryPath = join(sessionsDir, entry)
    try {
      const info = await stat(entryPath)
      if (info.isDirectory() && info.mtimeMs < cutoff) {
        await rm(entryPath, { recursive: true })
        removed++
      }
    } catch {
      // skip entries that were already removed or inaccessible
    }
  }

  if (removed > 0) {
    logger.info(`Cleaned ${removed} stale session directories`)
  }
}
