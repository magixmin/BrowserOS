import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Cookie } from '@browseros/cdp-protocol/domains/network'
import type {
  BrowserOpsAutomationBrief,
  BrowserOpsPreviewResult,
  BrowserOpsRuntimeBinding,
} from '@browseros/shared/browser-ops'

let rootDir: string

beforeEach(async () => {
  rootDir = await mkdtemp(join(tmpdir(), 'browser-ops-automation-runs-'))
})

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true })
})

mock.module('../../src/lib/browseros-dir', () => ({
  getBrowserosDir: () => rootDir,
  getBrowserOpsDir: () => rootDir,
  getBrowserOpsAutomationRunsDir: () => join(rootDir, 'automation-runs'),
  getBrowserOpsProfilesDir: () => join(rootDir, 'profiles'),
  getBrowserOpsCookieVaultsDir: () => join(rootDir, 'cookie-vaults'),
  getBrowserOpsRuntimeSpecsDir: () => join(rootDir, 'runtime-specs'),
  getBrowserOpsRuntimeAssetsDir: () => join(rootDir, 'runtime-assets'),
  getBrowserOpsLaunchBundlesDir: () => join(rootDir, 'launch-bundles'),
  getBrowserOpsLaunchExecutionsDir: () => join(rootDir, 'launch-executions'),
  getBrowserOpsInstancesDir: () => join(rootDir, 'instances'),
  getBrowserOpsInstanceEventsDir: () => join(rootDir, 'instance-events'),
  getSkillsDir: () => join(rootDir, 'skills'),
  getBuiltinSkillsDir: () => join(rootDir, 'skills', 'builtin'),
}))

const { BrowserOpsAutomationRunnerService } = await import(
  '../../src/api/services/browser-ops/automation-runner'
)

function createRoutePreview(): BrowserOpsPreviewResult {
  return {
    engine: 'browser-ops-v1',
    evaluatedProxyCount: 1,
    matchedProvider: null,
    providerCatalog: [],
    routeResolution: null,
    decision: {
      targetCountry: 'US',
      mode: 'auto',
      selectedProxy: null,
      recommendedFingerprint: {
        userAgentPreset: 'Chrome 137 / Desktop',
        timezone: 'America/New_York',
        language: 'en-US',
        locale: 'en-US',
        platform: 'Windows',
        webglProfile: 'Intel Iris Xe',
        canvasNoise: 'light',
        fontsPreset: 'office-desktop',
      },
      rotationStrategy: 'sticky-session',
      humanizationLevel: 'strict',
      score: 92,
      reasons: ['Matched profile country and task requirements.'],
      warnings: [],
    },
  }
}

function createBrief(): BrowserOpsAutomationBrief {
  return {
    profileId: 'profile-1',
    taskId: 'task-1',
    readiness: 'ready',
    recommendedMode: 'agent',
    recommendedStartUrl: 'https://www.tiktok.com/upload',
    launchMode: 'managed-window',
    resolvedSkillId: 'fill-form',
    resolvedSkillName: 'Fill Form',
    routePreview: createRoutePreview(),
    skillResolution: {
      taskSkillKey: 'post_tiktok_video',
      normalizedSkillKey: 'post-tiktok-video',
      matchType: 'mapped',
      resolvedSkillId: 'fill-form',
      resolvedSkillName: 'Fill Form',
      builtIn: true,
      notes: [],
      candidates: [],
    },
    missingRequirements: [],
    notes: ['Task skill key: post_tiktok_video'],
    executionPrompt: 'Open TikTok upload and publish the prepared video.',
  }
}

function createBinding(): BrowserOpsRuntimeBinding {
  return {
    bindingId: 'binding-1',
    allocationId: 'allocation-1',
    profileId: 'profile-1',
    taskId: 'task-1',
    runtimeSpecId: 'spec-1',
    controllerClientId: 'client-1',
    windowId: 4,
    tabId: 12,
    pageId: 31,
    pageUrl: 'https://www.tiktok.com/upload',
    pageTitle: 'TikTok Upload',
    createdAt: new Date().toISOString(),
    state: 'active',
  }
}

async function waitForRunStatus(args: {
  runner: InstanceType<typeof BrowserOpsAutomationRunnerService>
  runId: string
  predicate: (status: string) => boolean
}) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const run = await args.runner.getRun(args.runId)
    if (run && args.predicate(run.status)) return run
    await Bun.sleep(20)
  }
  throw new Error(`Timed out waiting for run ${args.runId}`)
}

describe('BrowserOpsAutomationRunnerService', () => {
  it('executes a run, records tool calls, and captures cookies', async () => {
    const capturedVaultWrites: Array<{ bindingId: string; cookies: unknown[] }> = []
    const browserCookies: Cookie[] = [
      {
        name: 'sessionid',
        value: 'cookie-1',
        domain: '.tiktok.com',
        path: '/',
        expires: Date.now() / 1000 + 3600,
        size: 10,
        httpOnly: true,
        secure: true,
        session: false,
        priority: 'Medium',
        sameParty: false,
        sourceScheme: 'Secure',
        sourcePort: 443,
      },
    ]

    const runner = new BrowserOpsAutomationRunnerService({
      browser: {
        getCookies: async () => browserCookies,
      } as never,
      runtimePersistence: {
        writeCookieVault: async (bindingId, cookies) => {
          capturedVaultWrites.push({ bindingId, cookies })
          return null
        },
      } as never,
      chatClient: {
        async run({ onEvent }) {
          await onEvent({
            type: 'text-delta',
            id: 'msg-1',
            delta: 'Step one complete.',
          })
          await onEvent({
            type: 'tool-input-available',
            toolCallId: 'tool-1',
            toolName: 'click',
            input: { selector: 'button.publish' },
          })
          await onEvent({
            type: 'tool-output-available',
            toolCallId: 'tool-1',
            output: { ok: true },
          })
          await onEvent({
            type: 'text-delta',
            id: 'msg-1',
            delta: ' Video published.',
          })
          await onEvent({
            type: 'finish',
            finishReason: 'stop',
          })
        },
        async deleteSession() {},
      },
    })

    const run = await runner.startRun({
      preparation: {
        brief: createBrief(),
        allocation: { allocationId: 'allocation-1' },
        binding: createBinding(),
        asset: null,
        bundle: null,
        page: {
          pageId: 31,
          tabId: 12,
          windowId: 4,
          url: 'https://www.tiktok.com/upload',
          title: 'TikTok Upload',
        },
        restoredCookies: 2,
        mode: 'agent',
      },
      llm: {
        provider: 'openai',
        providerName: 'OpenAI',
        model: 'gpt-4.1',
        apiKey: 'test-key',
        supportsImages: true,
      },
    })

    const completed = await waitForRunStatus({
      runner,
      runId: run.runId,
      predicate: (status) => status === 'succeeded',
    })

    expect(completed.status).toBe('succeeded')
    expect(completed.finalResult).toContain('Video published')
    expect(completed.toolCalls.length).toBe(1)
    expect(completed.toolCalls[0]?.name).toBe('click')
    expect(completed.capturedCookies).toBe(1)
    expect(capturedVaultWrites.length).toBe(1)
    expect(capturedVaultWrites[0]?.bindingId).toBe('binding-1')
  })

  it('cancels an in-flight run', async () => {
    let aborted = false
    const runner = new BrowserOpsAutomationRunnerService({
      browser: {
        getCookies: async () => [],
      } as never,
      runtimePersistence: {
        writeCookieVault: async () => null,
      } as never,
      chatClient: {
        async run({ signal }) {
          if (signal.aborted) {
            aborted = true
            throw new Error('aborted')
          }
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(resolve, 500)
            signal.addEventListener(
              'abort',
              () => {
                aborted = true
                clearTimeout(timeout)
                reject(new Error('aborted'))
              },
              { once: true },
            )
          })
        },
        async deleteSession() {},
      },
    })

    const run = await runner.startRun({
      preparation: {
        brief: createBrief(),
        allocation: { allocationId: 'allocation-1' },
        binding: createBinding(),
        asset: null,
        bundle: null,
        page: {
          pageId: 31,
          tabId: 12,
          windowId: 4,
          url: 'https://www.tiktok.com/upload',
          title: 'TikTok Upload',
        },
        restoredCookies: 0,
        mode: 'agent',
      },
      llm: {
        provider: 'openai',
        providerName: 'OpenAI',
        model: 'gpt-4.1',
        apiKey: 'test-key',
        supportsImages: true,
      },
    })

    await runner.cancelRun(run.runId)

    const cancelled = await waitForRunStatus({
      runner,
      runId: run.runId,
      predicate: (status) => status === 'cancelled',
    })

    expect(aborted).toBe(true)
    expect(cancelled.status).toBe('cancelled')
  })
})
