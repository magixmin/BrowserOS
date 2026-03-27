import { afterEach, beforeEach, describe, it } from 'bun:test'
import assert from 'node:assert'
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type {
  BrowserOpsLaunchBundle,
  BrowserOpsLaunchExecution,
} from '@browseros/shared/browser-ops'
import { BrowserOpsRuntimeLauncherService } from '../../src/api/services/browser-ops/runtime-launcher'
import type { BrowserOpsRuntimeLauncherPersistence } from '../../src/api/services/browser-ops/runtime-launcher-store'

let originalBinary: string | undefined
let tempDir: string

function createBundle(): BrowserOpsLaunchBundle {
  return {
    bundleId: 'bundle-spec_1',
    specId: 'spec_1',
    profileId: 'profile_1',
    createdAt: new Date().toISOString(),
    state: 'active',
    startupUrl: 'https://sellercentral.amazon.com',
    userDataDir: '/tmp/profile_1',
    cookieVaultPath: '/tmp/vault_1.json',
    runtimeSpecPath: '/tmp/spec_1.json',
    browserContextId: 'context-1',
    launcherScriptPath: '/tmp/spec_1.sh',
    launcherCommandPreview: 'BrowserOS --user-data-dir=/tmp/profile_1',
    chromiumArgs: ['-e', 'setTimeout(() => {}, 10000)'],
    env: {
      BROWSEROS_PROFILE_ID: 'profile_1',
    },
    fingerprint: {
      timezone: 'America/New_York',
      language: 'en-US',
      locale: 'en-US',
      userAgentPreset: 'Chrome 137 / Desktop',
    },
    proxy: null,
  }
}

function createBundleWithEnvProxy(): BrowserOpsLaunchBundle {
  return {
    ...createBundle(),
    proxy: {
      providerName: 'Decodo',
      maskedUrl: 'gate.decodo.com:10000',
      serverArg: 'gate.decodo.com:10000',
      authMode: 'provider-template',
      credentialSource: 'env',
      credentialEnv: {
        username: 'BROWSER_OPS_DECODO_USERNAME',
        password: 'BROWSER_OPS_DECODO_PASSWORD',
      },
      usernameTemplate: 'user-<account>-country-us-session-abc123',
      passwordRequired: true,
      sessionId: 'abc123',
    },
    chromiumArgs: ['--proxy-server=gate.decodo.com:10000'],
    env: {
      ...createBundle().env,
      BROWSER_OPS_PROXY_SERVER: 'gate.decodo.com:10000',
      BROWSER_OPS_PROXY_AUTH_MODE: 'provider-template',
      BROWSER_OPS_PROXY_CREDENTIAL_SOURCE: 'env',
      BROWSER_OPS_PROXY_USERNAME_ENV: 'BROWSER_OPS_DECODO_USERNAME',
      BROWSER_OPS_PROXY_PASSWORD_ENV: 'BROWSER_OPS_DECODO_PASSWORD',
      BROWSER_OPS_PROXY_USERNAME_TEMPLATE:
        'user-<account>-country-us-session-abc123',
    },
  }
}

class MemoryLauncherPersistence
  implements BrowserOpsRuntimeLauncherPersistence
{
  executions = new Map<string, BrowserOpsLaunchExecution>()

  async listLaunchExecutions(): Promise<BrowserOpsLaunchExecution[]> {
    return [...this.executions.values()]
  }

  async readLaunchExecution(
    executionId: string,
  ): Promise<BrowserOpsLaunchExecution | null> {
    return this.executions.get(executionId) ?? null
  }

  async writeLaunchExecution(
    execution: BrowserOpsLaunchExecution,
  ): Promise<void> {
    this.executions.set(execution.executionId, execution)
  }

  async deleteLaunchExecution(executionId: string): Promise<void> {
    this.executions.delete(executionId)
  }
}

beforeEach(async () => {
  originalBinary = process.env.BROWSEROS_BINARY
  tempDir = await mkdtemp(join(tmpdir(), 'browser-ops-launcher-'))
})

afterEach(async () => {
  if (originalBinary === undefined) delete process.env.BROWSEROS_BINARY
  else process.env.BROWSEROS_BINARY = originalBinary
  await rm(tempDir, { recursive: true, force: true })
})

describe('BrowserOpsRuntimeLauncherService', () => {
  it('prepares launch execution without spawning', async () => {
    const persistence = new MemoryLauncherPersistence()
    const service = new BrowserOpsRuntimeLauncherService(persistence)

    const execution = await service.launchBundle(createBundle(), {
      execute: false,
    })

    assert.strictEqual(execution.state, 'prepared')
    assert.strictEqual(execution.dryRun, true)
    assert.ok(execution.ports.cdp > 0)
    assert.ok(execution.commandPreview.includes('--remote-debugging-port='))

    const persisted = await persistence.listLaunchExecutions()
    assert.strictEqual(persisted.length, 1)
  })

  it('fails launch when binary is missing', async () => {
    delete process.env.BROWSEROS_BINARY
    const persistence = new MemoryLauncherPersistence()
    const service = new BrowserOpsRuntimeLauncherService(persistence)

    const execution = await service.launchBundle(createBundle(), {
      execute: true,
    })

    assert.strictEqual(execution.state, 'failed')
    assert.strictEqual(execution.pid, null)
    assert.ok(execution.ports.server > 0)
  })

  it('records missing proxy credential env vars during dry-run preparation', async () => {
    delete process.env.BROWSER_OPS_DECODO_USERNAME
    delete process.env.BROWSER_OPS_DECODO_PASSWORD

    const persistence = new MemoryLauncherPersistence()
    const service = new BrowserOpsRuntimeLauncherService(persistence)

    const execution = await service.launchBundle(createBundleWithEnvProxy(), {
      execute: false,
    })

    assert.strictEqual(execution.state, 'prepared')
    assert.ok(
      execution.notes.some((note) =>
        note.includes('Missing required proxy credential env vars'),
      ),
    )
  })

  it('fails execute=true launch when required proxy credential env vars are missing', async () => {
    const scriptPath = join(tempDir, 'fake-browser.sh')
    await writeFile(scriptPath, '#!/usr/bin/env bash\nsleep 30\n')
    await chmod(scriptPath, 0o755)
    process.env.BROWSEROS_BINARY = scriptPath
    delete process.env.BROWSER_OPS_DECODO_USERNAME
    delete process.env.BROWSER_OPS_DECODO_PASSWORD

    const persistence = new MemoryLauncherPersistence()
    const service = new BrowserOpsRuntimeLauncherService(persistence)

    const execution = await service.launchBundle(createBundleWithEnvProxy(), {
      execute: true,
    })

    assert.strictEqual(execution.state, 'failed')
    assert.strictEqual(execution.pid, null)
    assert.ok(
      execution.notes.some((note) =>
        note.includes('Missing required proxy credential env vars'),
      ),
    )
  })

  it('launches and stops a process when binary is configured', async () => {
    const scriptPath = join(tempDir, 'fake-browser.sh')
    await writeFile(scriptPath, '#!/usr/bin/env bash\nsleep 30\n')
    await chmod(scriptPath, 0o755)
    process.env.BROWSEROS_BINARY = scriptPath

    const persistence = new MemoryLauncherPersistence()
    const service = new BrowserOpsRuntimeLauncherService(persistence)

    const execution = await service.launchBundle(
      {
        ...createBundle(),
        chromiumArgs: [],
        launcherCommandPreview: `${scriptPath}`,
      },
      {
        execute: true,
      },
    )

    assert.strictEqual(execution.state, 'launched')
    assert.ok(execution.pid)
    assert.ok(execution.ports.extension > 0)

    const stopped = await service.stopExecution(execution.executionId)
    assert.strictEqual(stopped?.state, 'stopped')
  })
})
