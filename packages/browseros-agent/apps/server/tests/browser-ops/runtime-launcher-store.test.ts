import { afterEach, beforeEach, describe, it, mock } from 'bun:test'
import assert from 'node:assert'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let rootDir: string
let launchExecutionsDir: string

beforeEach(async () => {
  rootDir = await mkdtemp(join(tmpdir(), 'browser-ops-launch-exec-'))
  launchExecutionsDir = join(rootDir, 'launch-executions')
  await mkdir(launchExecutionsDir, { recursive: true })
})

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true })
})

mock.module('../../src/lib/browseros-dir', () => ({
  getBrowserOpsLaunchExecutionsDir: () => launchExecutionsDir,
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
      notes: [],
    })

    const executions = await store.listLaunchExecutions()
    assert.strictEqual(executions.length, 1)
    assert.strictEqual(executions[0]?.specId, 'spec_1')
  })
})
