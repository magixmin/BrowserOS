import { afterEach, beforeEach, describe, it, mock } from 'bun:test'
import assert from 'node:assert'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let rootDir: string
let launchExecutionsDir: string
let instancesDir: string

beforeEach(async () => {
  rootDir = await mkdtemp(join(tmpdir(), 'browser-ops-launch-exec-'))
  launchExecutionsDir = join(rootDir, 'launch-executions')
  instancesDir = join(rootDir, 'instances')
  await mkdir(launchExecutionsDir, { recursive: true })
  await mkdir(instancesDir, { recursive: true })
})

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true })
})

mock.module('../../src/lib/browseros-dir', () => ({
  getBrowserOpsDir: () => rootDir,
  getBrowserOpsLaunchExecutionsDir: () => launchExecutionsDir,
  getBrowserOpsInstancesDir: () => instancesDir,
  getBrowserOpsLaunchBundlesDir: () => join(rootDir, 'launch-bundles'),
  getBrowserOpsProfilesDir: () => join(rootDir, 'profiles'),
  getBrowserOpsCookieVaultsDir: () => join(rootDir, 'cookie-vaults'),
  getBrowserOpsRuntimeSpecsDir: () => join(rootDir, 'runtime-specs'),
  getBrowserOpsRuntimeAssetsDir: () => join(rootDir, 'runtime-assets'),
  getBrowserOpsAutomationRunsDir: () => join(rootDir, 'automation-runs'),
}))

const { BrowserOpsRuntimeLauncherStore } = await import(
  '../../src/api/services/browser-ops/runtime-launcher-store'
)

describe('BrowserOpsRuntimeLauncherStore', () => {
  it('writes and lists launch executions', async () => {
    const store = new BrowserOpsRuntimeLauncherStore()

    await store.writeLaunchExecution({
      executionId: '00000000-0000-4000-8000-000000000001',
      bundleId: 'bundle-spec_1',
      specId: 'spec_1',
      profileId: 'profile_1',
      createdAt: new Date().toISOString(),
      state: 'prepared',
      binaryPath: null,
      commandPreview: 'BrowserOS --user-data-dir=/tmp/profile',
      dryRun: true,
      pid: null,
      ports: {
        cdp: 9501,
        server: 9601,
        extension: 9801,
      },
      notes: [],
    })

    const executions = await store.listLaunchExecutions()
    assert.strictEqual(executions.length, 1)
    assert.strictEqual(executions[0]?.specId, 'spec_1')
  })
})
