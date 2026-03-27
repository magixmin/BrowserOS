import { mkdir, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import type {
  BrowserOpsCookieVaultDocument,
  BrowserOpsCookieVaultSummary,
  BrowserOpsLaunchBundle,
  BrowserOpsRuntimeAssetManifest,
  BrowserOpsRuntimeSessionSpec,
} from '@browseros/shared/browser-ops'
import {
  getBrowserOpsCookieVaultsDir,
  getBrowserOpsLaunchBundlesDir,
  getBrowserOpsProfilesDir,
  getBrowserOpsRuntimeAssetsDir,
  getBrowserOpsRuntimeSpecsDir,
} from '../../../lib/browseros-dir'

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_')
}

async function ensureRuntimeDirs(): Promise<void> {
  await mkdir(getBrowserOpsProfilesDir(), { recursive: true })
  await mkdir(getBrowserOpsCookieVaultsDir(), { recursive: true })
  await mkdir(getBrowserOpsRuntimeSpecsDir(), { recursive: true })
  await mkdir(getBrowserOpsRuntimeAssetsDir(), { recursive: true })
  await mkdir(getBrowserOpsLaunchBundlesDir(), { recursive: true })
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  const file = Bun.file(filePath)
  if (!(await file.exists())) return null
  return (await file.json()) as T
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await Bun.write(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

function shellEscape(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`
}

export interface BrowserOpsRuntimePersistence {
  materializeRuntimeSessionSpec(
    spec: BrowserOpsRuntimeSessionSpec,
  ): Promise<BrowserOpsRuntimeAssetManifest>
  listRuntimeAssets(): Promise<BrowserOpsRuntimeAssetManifest[]>
  readRuntimeSessionSpec(
    specId: string,
  ): Promise<BrowserOpsRuntimeSessionSpec | null>
  getRuntimeAssetByBindingId(
    bindingId: string,
  ): Promise<BrowserOpsRuntimeAssetManifest | null>
  listLaunchBundles(): Promise<BrowserOpsLaunchBundle[]>
  readLaunchBundle(specId: string): Promise<BrowserOpsLaunchBundle | null>
  materializeLaunchBundle(
    specId: string,
  ): Promise<BrowserOpsLaunchBundle | null>
  listCookieVaults(): Promise<BrowserOpsCookieVaultSummary[]>
  readCookieVault(
    bindingId: string,
  ): Promise<BrowserOpsCookieVaultDocument | null>
  writeCookieVault(
    bindingId: string,
    cookies: unknown[],
    capturedFromUrls?: string[],
  ): Promise<BrowserOpsCookieVaultDocument | null>
  clearCookieVault(
    bindingId: string,
  ): Promise<BrowserOpsCookieVaultDocument | null>
  markAssetsReleasedForBinding(bindingId: string): Promise<void>
  markAssetsReleasedForAllocation(allocationId: string): Promise<void>
}

export class BrowserOpsRuntimePersistenceService
  implements BrowserOpsRuntimePersistence
{
  async materializeRuntimeSessionSpec(
    spec: BrowserOpsRuntimeSessionSpec,
  ): Promise<BrowserOpsRuntimeAssetManifest> {
    await ensureRuntimeDirs()

    const profileDirectoryPath = join(
      getBrowserOpsProfilesDir(),
      sanitizeFileName(spec.profileDirectoryName),
    )
    const cookieVaultPath = join(
      getBrowserOpsCookieVaultsDir(),
      `${sanitizeFileName(spec.cookieVaultKey)}.json`,
    )
    const runtimeSpecPath = join(
      getBrowserOpsRuntimeSpecsDir(),
      `${sanitizeFileName(spec.specId)}.json`,
    )
    const manifestPath = join(
      getBrowserOpsRuntimeAssetsDir(),
      `${sanitizeFileName(spec.specId)}.json`,
    )

    await mkdir(profileDirectoryPath, { recursive: true })

    const existingVault =
      await readJsonFile<BrowserOpsCookieVaultDocument>(cookieVaultPath)

    if (!existingVault) {
      await writeJsonFile(cookieVaultPath, {
        vaultKey: spec.cookieVaultKey,
        cookies: [],
        updatedAt: new Date().toISOString(),
      } satisfies BrowserOpsCookieVaultDocument)
    }

    await writeJsonFile(runtimeSpecPath, spec)

    const existingManifest =
      await readJsonFile<BrowserOpsRuntimeAssetManifest>(manifestPath)
    const manifest: BrowserOpsRuntimeAssetManifest = {
      manifestId: existingManifest?.manifestId ?? crypto.randomUUID(),
      specId: spec.specId,
      bindingId: spec.bindingId,
      allocationId: spec.allocationId,
      profileId: spec.profileId,
      createdAt: existingManifest?.createdAt ?? new Date().toISOString(),
      state: 'active',
      profileDirectoryPath,
      cookieVaultPath,
      runtimeSpecPath,
    }

    await writeJsonFile(manifestPath, manifest)
    return manifest
  }

  async listRuntimeAssets(): Promise<BrowserOpsRuntimeAssetManifest[]> {
    await ensureRuntimeDirs()

    let entries: string[]
    try {
      entries = await readdir(getBrowserOpsRuntimeAssetsDir())
    } catch {
      return []
    }

    const assets: BrowserOpsRuntimeAssetManifest[] = []
    for (const entry of entries) {
      if (!entry.endsWith('.json')) continue
      const filePath = join(getBrowserOpsRuntimeAssetsDir(), entry)
      const manifest =
        await readJsonFile<BrowserOpsRuntimeAssetManifest>(filePath)
      if (manifest) assets.push(manifest)
    }

    return assets.sort((left, right) =>
      left.createdAt < right.createdAt ? 1 : -1,
    )
  }

  async readRuntimeSessionSpec(
    specId: string,
  ): Promise<BrowserOpsRuntimeSessionSpec | null> {
    await ensureRuntimeDirs()
    const specPath = join(
      getBrowserOpsRuntimeSpecsDir(),
      `${sanitizeFileName(specId)}.json`,
    )
    return await readJsonFile<BrowserOpsRuntimeSessionSpec>(specPath)
  }

  async getRuntimeAssetByBindingId(
    bindingId: string,
  ): Promise<BrowserOpsRuntimeAssetManifest | null> {
    const assets = await this.listRuntimeAssets()
    return assets.find((asset) => asset.bindingId === bindingId) ?? null
  }

  async listLaunchBundles(): Promise<BrowserOpsLaunchBundle[]> {
    await ensureRuntimeDirs()

    let entries: string[]
    try {
      entries = await readdir(getBrowserOpsLaunchBundlesDir())
    } catch {
      return []
    }

    const bundles: BrowserOpsLaunchBundle[] = []
    for (const entry of entries) {
      if (!entry.endsWith('.json')) continue
      const filePath = join(getBrowserOpsLaunchBundlesDir(), entry)
      const bundle = await readJsonFile<BrowserOpsLaunchBundle>(filePath)
      if (bundle) bundles.push(bundle)
    }

    return bundles.sort((left, right) =>
      left.createdAt < right.createdAt ? 1 : -1,
    )
  }

  async readLaunchBundle(
    specId: string,
  ): Promise<BrowserOpsLaunchBundle | null> {
    await ensureRuntimeDirs()
    const bundlePath = join(
      getBrowserOpsLaunchBundlesDir(),
      `${sanitizeFileName(specId)}.json`,
    )
    return await readJsonFile<BrowserOpsLaunchBundle>(bundlePath)
  }

  async materializeLaunchBundle(
    specId: string,
  ): Promise<BrowserOpsLaunchBundle | null> {
    const spec = await this.readRuntimeSessionSpec(specId)
    if (!spec) return null

    const assets = await this.listRuntimeAssets()
    const asset = assets.find((candidate) => candidate.specId === specId)
    if (!asset) return null

    const bundlePath = join(
      getBrowserOpsLaunchBundlesDir(),
      `${sanitizeFileName(specId)}.json`,
    )
    const launcherScriptPath = join(
      getBrowserOpsLaunchBundlesDir(),
      `${sanitizeFileName(specId)}.sh`,
    )
    const bundle: BrowserOpsLaunchBundle = {
      bundleId: `bundle-${specId}`,
      specId: spec.specId,
      profileId: spec.profileId,
      createdAt: new Date().toISOString(),
      state: spec.state,
      startupUrl: spec.ownership.pageUrl,
      userDataDir: asset.profileDirectoryPath,
      cookieVaultPath: asset.cookieVaultPath,
      runtimeSpecPath: asset.runtimeSpecPath,
      browserContextId: spec.browserContextId,
      launcherScriptPath,
      launcherCommandPreview: '',
      chromiumArgs: [
        `--user-data-dir=${asset.profileDirectoryPath}`,
        `--lang=${spec.fingerprint.language}`,
      ],
      env: {
        BROWSEROS_PROFILE_ID: spec.profileId,
        BROWSEROS_SESSION_PARTITION: spec.sessionPartition,
        BROWSEROS_COOKIE_VAULT_KEY: spec.cookieVaultKey,
      },
      fingerprint: {
        timezone: spec.fingerprint.timezone,
        language: spec.fingerprint.language,
        locale: spec.fingerprint.locale,
        userAgentPreset: spec.fingerprint.userAgentPreset,
      },
      proxy: spec.proxyResolution
        ? {
            providerName: spec.proxyResolution.providerName,
            maskedUrl: spec.proxyResolution.proxyUrlMasked,
            authMode: spec.proxyResolution.authMode,
            sessionId: spec.proxyResolution.sessionId,
          }
        : null,
    }

    if (spec.proxyResolution?.proxyUrlMasked) {
      bundle.chromiumArgs.push(
        `--proxy-server=${spec.proxyResolution.proxyUrlMasked}`,
      )
    }

    const envAssignments = Object.entries(bundle.env)
      .map(([key, value]) => `${key}=${shellEscape(value)}`)
      .join(' ')
    bundle.launcherCommandPreview =
      `${envAssignments} BrowserOS ${bundle.chromiumArgs.join(' ')}`.trim()

    const launcherScript = [
      '#!/usr/bin/env bash',
      'set -euo pipefail',
      '',
      ...Object.entries(bundle.env).map(
        ([key, value]) => `export ${key}=${shellEscape(value)}`,
      ),
      '',
      '# Replace BrowserOS with your actual browser binary path if needed.',
      `exec BrowserOS ${bundle.chromiumArgs.join(' ')}`,
      '',
    ].join('\n')

    await writeJsonFile(bundlePath, bundle)
    await Bun.write(launcherScriptPath, launcherScript)
    return bundle
  }

  async listCookieVaults(): Promise<BrowserOpsCookieVaultSummary[]> {
    const assets = await this.listRuntimeAssets()
    const vaults: BrowserOpsCookieVaultSummary[] = []

    for (const asset of assets) {
      const vault = await readJsonFile<BrowserOpsCookieVaultDocument>(
        asset.cookieVaultPath,
      )
      if (!vault) continue
      vaults.push({
        bindingId: asset.bindingId,
        vaultKey: vault.vaultKey,
        cookieCount: Array.isArray(vault.cookies) ? vault.cookies.length : 0,
        updatedAt: vault.updatedAt,
        capturedFromUrls: vault.capturedFromUrls,
      })
    }

    return vaults.sort((left, right) =>
      left.updatedAt < right.updatedAt ? 1 : -1,
    )
  }

  async readCookieVault(
    bindingId: string,
  ): Promise<BrowserOpsCookieVaultDocument | null> {
    const asset = await this.getRuntimeAssetByBindingId(bindingId)
    if (!asset) return null
    return await readJsonFile<BrowserOpsCookieVaultDocument>(
      asset.cookieVaultPath,
    )
  }

  async writeCookieVault(
    bindingId: string,
    cookies: unknown[],
    capturedFromUrls?: string[],
  ): Promise<BrowserOpsCookieVaultDocument | null> {
    const asset = await this.getRuntimeAssetByBindingId(bindingId)
    if (!asset) return null

    const existing = await readJsonFile<BrowserOpsCookieVaultDocument>(
      asset.cookieVaultPath,
    )
    const next: BrowserOpsCookieVaultDocument = {
      vaultKey: existing?.vaultKey ?? asset.bindingId,
      cookies,
      updatedAt: new Date().toISOString(),
      capturedFromUrls,
    }

    await writeJsonFile(asset.cookieVaultPath, next)
    return next
  }

  async clearCookieVault(
    bindingId: string,
  ): Promise<BrowserOpsCookieVaultDocument | null> {
    return await this.writeCookieVault(bindingId, [])
  }

  async markAssetsReleasedForBinding(bindingId: string): Promise<void> {
    const assets = await this.listRuntimeAssets()
    await Promise.all(
      assets
        .filter((asset) => asset.bindingId === bindingId)
        .map(async (asset) => {
          await this.updateManifestState(asset.specId, {
            ...asset,
            state: 'released',
          })
          await this.updateRuntimeSpecState(asset.specId, 'released')
          await this.updateLaunchBundleState(asset.specId, 'released')
        }),
    )
  }

  async markAssetsReleasedForAllocation(allocationId: string): Promise<void> {
    const assets = await this.listRuntimeAssets()
    await Promise.all(
      assets
        .filter((asset) => asset.allocationId === allocationId)
        .map(async (asset) => {
          await this.updateManifestState(asset.specId, {
            ...asset,
            state: 'released',
          })
          await this.updateRuntimeSpecState(asset.specId, 'released')
          await this.updateLaunchBundleState(asset.specId, 'released')
        }),
    )
  }

  private async updateManifestState(
    specId: string,
    manifest: BrowserOpsRuntimeAssetManifest,
  ): Promise<void> {
    const manifestPath = join(
      getBrowserOpsRuntimeAssetsDir(),
      `${sanitizeFileName(specId)}.json`,
    )
    await writeJsonFile(manifestPath, manifest)
  }

  private async updateRuntimeSpecState(
    specId: string,
    state: BrowserOpsRuntimeSessionSpec['state'],
  ): Promise<void> {
    const specPath = join(
      getBrowserOpsRuntimeSpecsDir(),
      `${sanitizeFileName(specId)}.json`,
    )
    const spec = await readJsonFile<BrowserOpsRuntimeSessionSpec>(specPath)
    if (!spec) return
    await writeJsonFile(specPath, {
      ...spec,
      state,
    } satisfies BrowserOpsRuntimeSessionSpec)
  }

  private async updateLaunchBundleState(
    specId: string,
    state: BrowserOpsLaunchBundle['state'],
  ): Promise<void> {
    const bundlePath = join(
      getBrowserOpsLaunchBundlesDir(),
      `${sanitizeFileName(specId)}.json`,
    )
    const bundle = await readJsonFile<BrowserOpsLaunchBundle>(bundlePath)
    if (!bundle) return
    await writeJsonFile(bundlePath, {
      ...bundle,
      state,
    } satisfies BrowserOpsLaunchBundle)
  }
}
