import { afterEach, beforeEach, describe, it, mock } from 'bun:test'
import assert from 'node:assert'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let rootDir: string
let profilesDir: string
let cookieVaultsDir: string
let specsDir: string
let assetsDir: string
let launchBundlesDir: string
let launchExecutionsDir: string

beforeEach(async () => {
  rootDir = await mkdtemp(join(tmpdir(), 'browser-ops-runtime-'))
  profilesDir = join(rootDir, 'profiles')
  cookieVaultsDir = join(rootDir, 'cookie-vaults')
  specsDir = join(rootDir, 'runtime-specs')
  assetsDir = join(rootDir, 'runtime-assets')
  launchBundlesDir = join(rootDir, 'launch-bundles')
  launchExecutionsDir = join(rootDir, 'launch-executions')

  await mkdir(profilesDir, { recursive: true })
  await mkdir(cookieVaultsDir, { recursive: true })
  await mkdir(specsDir, { recursive: true })
  await mkdir(assetsDir, { recursive: true })
  await mkdir(launchBundlesDir, { recursive: true })
  await mkdir(launchExecutionsDir, { recursive: true })
})

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true })
})

mock.module('../../src/lib/browseros-dir', () => ({
  getBrowserOpsProfilesDir: () => profilesDir,
  getBrowserOpsCookieVaultsDir: () => cookieVaultsDir,
  getBrowserOpsRuntimeSpecsDir: () => specsDir,
  getBrowserOpsRuntimeAssetsDir: () => assetsDir,
  getBrowserOpsLaunchBundlesDir: () => launchBundlesDir,
  getBrowserOpsLaunchExecutionsDir: () => launchExecutionsDir,
}))

const { BrowserOpsRuntimePersistenceService } = await import(
  '../../src/api/services/browser-ops/runtime-store'
)

function createRuntimeSpec() {
  return {
    specId: 'spec_1',
    bindingId: 'binding_1',
    allocationId: 'allocation_1',
    profileId: 'profile_1',
    taskId: 'task_1',
    createdAt: new Date().toISOString(),
    state: 'active' as const,
    browserContextId: null,
    ownership: {
      controllerClientId: 'client_1',
      windowId: 4,
      tabId: 12,
      pageId: 31,
      pageUrl: 'https://www.tiktok.com/upload',
      pageTitle: 'TikTok Upload',
    },
    sessionPartition: 'persist:profile_1',
    cookieVaultKey: 'vault:profile_1',
    profileDirectoryName: 'profile-profile_1',
    launchContextId: 'profile_1:4',
    fingerprint: {
      userAgentPreset: 'Chrome 137 / Desktop',
      timezone: 'America/New_York',
      language: 'en-US',
      locale: 'en-US',
      platform: 'Windows' as const,
      webglProfile: 'Intel Iris Xe',
      canvasNoise: 'light' as const,
      fontsPreset: 'office-desktop',
    },
    proxyResolution: null,
    warmupPolicy: 'strict-warmup' as const,
    riskLevel: 'low' as const,
  }
}

describe('BrowserOpsRuntimePersistenceService', () => {
  it('materializes runtime assets to disk', async () => {
    const service = new BrowserOpsRuntimePersistenceService()
    const asset = await service.materializeRuntimeSessionSpec(
      createRuntimeSpec(),
    )

    assert.strictEqual(asset.specId, 'spec_1')

    const cookieVault = await Bun.file(asset.cookieVaultPath).json()
    assert.strictEqual(cookieVault.vaultKey, 'vault:profile_1')

    const runtimeSpec = await Bun.file(asset.runtimeSpecPath).json()
    assert.strictEqual(runtimeSpec.specId, 'spec_1')

    const assets = await service.listRuntimeAssets()
    assert.strictEqual(assets.length, 1)
    assert.strictEqual(assets[0]?.state, 'active')

    const vaults = await service.listCookieVaults()
    assert.strictEqual(vaults.length, 1)
    assert.strictEqual(vaults[0]?.cookieCount, 0)

    const bundle = await service.materializeLaunchBundle('spec_1')
    assert.ok(bundle)
    assert.strictEqual(bundle?.specId, 'spec_1')
    assert.ok(bundle?.launcherScriptPath.endsWith('spec_1.sh'))
    assert.ok(bundle?.launcherCommandPreview.includes('--user-data-dir='))

    const bundles = await service.listLaunchBundles()
    assert.strictEqual(bundles.length, 1)
    assert.strictEqual(bundles[0]?.specId, 'spec_1')
  })

  it('marks assets as released by binding or allocation', async () => {
    const service = new BrowserOpsRuntimePersistenceService()
    await service.materializeRuntimeSessionSpec(createRuntimeSpec())

    await service.markAssetsReleasedForBinding('binding_1')
    let assets = await service.listRuntimeAssets()
    assert.strictEqual(assets[0]?.state, 'released')
    let spec = await service.readRuntimeSessionSpec('spec_1')
    assert.strictEqual(spec?.state, 'released')

    await service.materializeRuntimeSessionSpec({
      ...createRuntimeSpec(),
      specId: 'spec_2',
      bindingId: 'binding_2',
      allocationId: 'allocation_2',
    })
    await service.markAssetsReleasedForAllocation('allocation_2')

    assets = await service.listRuntimeAssets()
    const released = assets.find((asset) => asset.specId === 'spec_2')
    assert.strictEqual(released?.state, 'released')
    spec = await service.readRuntimeSessionSpec('spec_2')
    assert.strictEqual(spec?.state, 'released')
  })

  it('reads, writes, and clears cookie vaults', async () => {
    const service = new BrowserOpsRuntimePersistenceService()
    await service.materializeRuntimeSessionSpec(createRuntimeSpec())

    const written = await service.writeCookieVault('binding_1', [
      { name: 'sessionid', value: 'cookie-1' },
    ])
    assert.ok(written)
    assert.strictEqual(written?.cookies.length, 1)

    const read = await service.readCookieVault('binding_1')
    assert.strictEqual(read?.cookies.length, 1)

    const cleared = await service.clearCookieVault('binding_1')
    assert.strictEqual(cleared?.cookies.length, 0)
  })
})
