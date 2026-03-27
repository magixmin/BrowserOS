import { afterEach, beforeEach, describe, it, mock } from 'bun:test'
import assert from 'node:assert'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let rootDir: string
let instancesDir: string

beforeEach(async () => {
  rootDir = await mkdtemp(join(tmpdir(), 'browser-ops-instance-'))
  instancesDir = join(rootDir, 'instances')
  await mkdir(instancesDir, { recursive: true })
})

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true })
})

mock.module('../../src/lib/browseros-dir', () => ({
  getBrowserOpsDir: () => rootDir,
  getBrowserOpsInstancesDir: () => instancesDir,
  getBrowserOpsLaunchExecutionsDir: () => join(rootDir, 'launch-executions'),
  getBrowserOpsLaunchBundlesDir: () => join(rootDir, 'launch-bundles'),
  getBrowserOpsProfilesDir: () => join(rootDir, 'profiles'),
  getBrowserOpsCookieVaultsDir: () => join(rootDir, 'cookie-vaults'),
  getBrowserOpsRuntimeSpecsDir: () => join(rootDir, 'runtime-specs'),
  getBrowserOpsRuntimeAssetsDir: () => join(rootDir, 'runtime-assets'),
}))

const { BrowserOpsRuntimeInstanceStore } = await import(
  '../../src/api/services/browser-ops/runtime-instance-store'
)

describe('BrowserOpsRuntimeInstanceStore', () => {
  it('writes and lists managed instances', async () => {
    const store = new BrowserOpsRuntimeInstanceStore()

    await store.writeInstance({
      instanceId: 'instance-1',
      executionId: 'execution-1',
      bundleId: 'bundle-1',
      specId: 'spec-1',
      profileId: 'profile-1',
      createdAt: new Date().toISOString(),
      state: 'running',
      binaryPath: '/Applications/BrowserOS.app/Contents/MacOS/BrowserOS',
      pid: 1234,
      ports: {
        cdp: 9501,
        server: 9601,
        extension: 9801,
      },
      lastHealthCheckAt: null,
      health: {
        cdpReachable: true,
        serverReachable: true,
        extensionReachable: true,
        proxyAuthBootstrapConfigured: false,
        proxyEgressVerified: false,
        proxySessionConsistent: true,
      },
      proxy: null,
      lastProxyVerification: null,
      notes: [],
    })

    const instances = await store.listInstances()
    assert.strictEqual(instances.length, 1)
    assert.strictEqual(instances[0]?.specId, 'spec-1')
  })
})
