import type { Cookie } from '@browseros/cdp-protocol/domains/network'
import type {
  BrowserOpsAutomationRun,
  BrowserOpsAutomationTargetPage,
  BrowserOpsAutomationToolCall,
  BrowserOpsLaunchBundle,
  BrowserOpsRuntimeAssetManifest,
  BrowserOpsRuntimeBinding,
} from '@browseros/shared/browser-ops'
import type { BrowserContext } from '@browseros/shared/schemas/browser-context'
import type { UIMessageStreamEvent } from '@browseros/shared/schemas/ui-stream'
import { createParser, type EventSourceMessage } from 'eventsource-parser'
import type { Browser } from '../../../browser/browser'
import { logger } from '../../../lib/logger'
import type { BrowserOpsRuntimePersistence } from './runtime-store'
import {
  type BrowserOpsAutomationRunStore,
  BrowserOpsAutomationRunStoreService,
} from './automation-run-store'

export interface BrowserOpsAutomationLlmConfig {
  provider: string
  providerName?: string
  model: string
  apiKey?: string
  baseUrl?: string
  resourceName?: string
  accessKeyId?: string
  secretAccessKey?: string
  region?: string
  sessionToken?: string
  contextWindowSize?: number
  supportsImages?: boolean
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high'
  reasoningSummary?: 'auto' | 'concise' | 'detailed'
}

export interface BrowserOpsAutomationPreparation {
  brief: BrowserOpsAutomationRun['brief']
  allocation: { allocationId: string }
  binding: BrowserOpsRuntimeBinding
  asset: BrowserOpsRuntimeAssetManifest | null
  bundle: BrowserOpsLaunchBundle | null
  page: BrowserOpsAutomationTargetPage
  restoredCookies: number
  mode: 'agent' | 'lobster'
}

export interface BrowserOpsAutomationChatClient {
  run(args: {
    conversationId: string
    message: string
    mode: 'agent' | 'lobster'
    browserContext: BrowserContext
    llm: BrowserOpsAutomationLlmConfig
    signal: AbortSignal
    onEvent: (event: UIMessageStreamEvent) => Promise<void>
  }): Promise<void>
  deleteSession(conversationId: string): Promise<void>
}

export class BrowserOpsAutomationHttpChatClient
  implements BrowserOpsAutomationChatClient
{
  private chatUrl: string

  constructor(port: number) {
    this.chatUrl = `http://127.0.0.1:${port}/chat`
  }

  async run(args: {
    conversationId: string
    message: string
    mode: 'agent' | 'lobster'
    browserContext: BrowserContext
    llm: BrowserOpsAutomationLlmConfig
    signal: AbortSignal
    onEvent: (event: UIMessageStreamEvent) => Promise<void>
  }): Promise<void> {
    const response = await fetch(this.chatUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: args.signal,
      body: JSON.stringify({
        conversationId: args.conversationId,
        message: args.message,
        provider: args.llm.provider,
        model: args.llm.model,
        apiKey: args.llm.apiKey,
        baseUrl: args.llm.baseUrl,
        resourceName: args.llm.resourceName,
        accessKeyId: args.llm.accessKeyId,
        secretAccessKey: args.llm.secretAccessKey,
        region: args.llm.region,
        sessionToken: args.llm.sessionToken,
        contextWindowSize: args.llm.contextWindowSize,
        supportsImages: args.llm.supportsImages ?? true,
        reasoningEffort: args.llm.reasoningEffort,
        reasoningSummary: args.llm.reasoningSummary,
        browserContext: args.browserContext,
        mode: args.mode,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText || `Chat request failed with ${response.status}`)
    }

    if (!response.body) {
      throw new Error('Chat response body is not readable')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    const pendingEvents: UIMessageStreamEvent[] = []
    const parser = createParser({
      onEvent: (event: EventSourceMessage) => {
        if (event.data === '[DONE]') return
        try {
          pendingEvents.push(JSON.parse(event.data) as UIMessageStreamEvent)
        } catch {
          // ignore malformed events
        }
      },
    })

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        parser.feed(decoder.decode(value, { stream: true }))

        let pending = pendingEvents.shift()
        while (pending) {
          await args.onEvent(pending)
          pending = pendingEvents.shift()
        }
      }

      let pending = pendingEvents.shift()
      while (pending) {
        await args.onEvent(pending)
        pending = pendingEvents.shift()
      }
    } finally {
      reader.releaseLock()
    }
  }

  async deleteSession(conversationId: string): Promise<void> {
    await fetch(`${this.chatUrl}/${conversationId}`, {
      method: 'DELETE',
    }).catch(() => {})
  }
}

type ActiveRun = {
  abortController: AbortController
  conversationId: string
}

export interface BrowserOpsAutomationRunner {
  listRuns(limit?: number): Promise<BrowserOpsAutomationRun[]>
  getRun(runId: string): Promise<BrowserOpsAutomationRun | null>
  startRun(args: {
    preparation: BrowserOpsAutomationPreparation
    llm: BrowserOpsAutomationLlmConfig
  }): Promise<BrowserOpsAutomationRun>
  cancelRun(runId: string): Promise<BrowserOpsAutomationRun | null>
}

type RunStreamState = {
  fullText: string
  currentStepText: string
  executionSteps: string[]
  toolCalls: Map<string, BrowserOpsAutomationToolCall>
  error: string | null
  finishReason: string | null
}

function buildBrowserContext(
  page: BrowserOpsAutomationTargetPage,
): BrowserContext {
  return {
    ...(typeof page.windowId === 'number' ? { windowId: page.windowId } : {}),
    activeTab: {
      id: page.tabId,
      pageId: page.pageId,
      url: page.url,
      title: page.title,
    },
  }
}

function applyEventToRun(
  run: BrowserOpsAutomationRun,
  state: RunStreamState,
  event: UIMessageStreamEvent,
): boolean {
  switch (event.type) {
    case 'text-delta':
      state.fullText += event.delta
      state.currentStepText += event.delta
      run.fullText = state.fullText
      return false
    case 'tool-input-available': {
      state.toolCalls.set(event.toolCallId, {
        id: event.toolCallId,
        name: event.toolName,
        input: event.input,
        timestamp: new Date().toISOString(),
      })
      if (state.currentStepText.trim()) {
        state.executionSteps.push(state.currentStepText.trim())
        state.currentStepText = ''
      }
      run.toolCalls = [...state.toolCalls.values()]
      run.executionLog = state.executionSteps.join('\n\n')
      return true
    }
    case 'tool-output-available': {
      const existing = state.toolCalls.get(event.toolCallId)
      if (existing) {
        existing.output = event.output
        run.toolCalls = [...state.toolCalls.values()]
        return true
      }
      return false
    }
    case 'tool-output-error': {
      const existing = state.toolCalls.get(event.toolCallId)
      if (existing) {
        existing.error = event.errorText
        run.toolCalls = [...state.toolCalls.values()]
        return true
      }
      return false
    }
    case 'error':
      state.error = event.errorText
      run.error = event.errorText
      return true
    case 'abort':
      state.finishReason = 'abort'
      run.finishReason = 'abort'
      return true
    case 'finish':
      state.finishReason = event.finishReason
      run.finishReason = event.finishReason
      return true
    default:
      return false
  }
}

export class BrowserOpsAutomationRunnerService
  implements BrowserOpsAutomationRunner
{
  private readonly store: BrowserOpsAutomationRunStore
  private readonly activeRuns = new Map<string, ActiveRun>()
  private readonly initPromise: Promise<void>

  constructor(args: {
    browser: Browser
    runtimePersistence: BrowserOpsRuntimePersistence
    chatClient: BrowserOpsAutomationChatClient
    store?: BrowserOpsAutomationRunStore
  }) {
    this.browser = args.browser
    this.runtimePersistence = args.runtimePersistence
    this.chatClient = args.chatClient
    this.store = args.store ?? new BrowserOpsAutomationRunStoreService()
    this.initPromise = this.recoverInterruptedRuns()
  }

  private readonly browser: Browser
  private readonly runtimePersistence: BrowserOpsRuntimePersistence
  private readonly chatClient: BrowserOpsAutomationChatClient

  private async ensureInitialized(): Promise<void> {
    await this.initPromise
  }

  async listRuns(limit = 20): Promise<BrowserOpsAutomationRun[]> {
    await this.ensureInitialized()
    return await this.store.listRuns(limit)
  }

  async getRun(runId: string): Promise<BrowserOpsAutomationRun | null> {
    await this.ensureInitialized()
    return await this.store.readRun(runId)
  }

  async startRun(args: {
    preparation: BrowserOpsAutomationPreparation
    llm: BrowserOpsAutomationLlmConfig
  }): Promise<BrowserOpsAutomationRun> {
    await this.ensureInitialized()

    const conversationId = crypto.randomUUID()
    const runId = crypto.randomUUID()
    const now = new Date().toISOString()
    const browserContext = buildBrowserContext(args.preparation.page)

    const run: BrowserOpsAutomationRun = {
      runId,
      conversationId,
      profileId: args.preparation.brief.profileId,
      taskId: args.preparation.brief.taskId,
      allocationId: args.preparation.allocation.allocationId,
      bindingId: args.preparation.binding.bindingId,
      runtimeSpecId: args.preparation.binding.runtimeSpecId,
      mode: args.preparation.mode,
      status: 'queued',
      provider: {
        provider: args.llm.provider,
        providerName: args.llm.providerName,
        model: args.llm.model,
        supportsImages: args.llm.supportsImages ?? true,
        reasoningEffort: args.llm.reasoningEffort,
        reasoningSummary: args.llm.reasoningSummary,
      },
      brief: args.preparation.brief,
      page: args.preparation.page,
      browserContext,
      prompt: args.preparation.brief.executionPrompt,
      createdAt: now,
      startedAt: null,
      updatedAt: now,
      completedAt: null,
      restoredCookies: args.preparation.restoredCookies,
      capturedCookies: 0,
      fullText: '',
      finalResult: '',
      executionLog: '',
      toolCalls: [],
      finishReason: null,
      error: null,
    }

    await this.store.writeRun(run)

    const abortController = new AbortController()
    this.activeRuns.set(run.runId, {
      abortController,
      conversationId,
    })

    void this.executeRun(run, args.preparation, args.llm, abortController.signal)

    return run
  }

  async cancelRun(runId: string): Promise<BrowserOpsAutomationRun | null> {
    await this.ensureInitialized()

    const active = this.activeRuns.get(runId)
    if (active) {
      active.abortController.abort()
    }

    const existing = await this.store.readRun(runId)
    if (!existing) return null
    if (existing.status !== 'queued' && existing.status !== 'running') {
      return existing
    }

    const now = new Date().toISOString()
    const next: BrowserOpsAutomationRun = {
      ...existing,
      status: 'cancelled',
      error: existing.error ?? 'Run cancelled by user.',
      updatedAt: now,
      completedAt: now,
    }
    await this.store.writeRun(next)
    return next
  }

  private async executeRun(
    initialRun: BrowserOpsAutomationRun,
    preparation: BrowserOpsAutomationPreparation,
    llm: BrowserOpsAutomationLlmConfig,
    signal: AbortSignal,
  ): Promise<void> {
    let run: BrowserOpsAutomationRun = {
      ...initialRun,
      status: 'running',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await this.store.writeRun(run)

    const streamState: RunStreamState = {
      fullText: '',
      currentStepText: '',
      executionSteps: [],
      toolCalls: new Map(),
      error: null,
      finishReason: null,
    }
    let lastPersistAt = Date.now()

    try {
      await this.chatClient.run({
        conversationId: run.conversationId,
        message: run.prompt,
        mode: run.mode,
        browserContext: run.browserContext,
        llm,
        signal,
        onEvent: async (event) => {
          const shouldPersistImmediately = applyEventToRun(run, streamState, event)
          const now = Date.now()
          if (shouldPersistImmediately || now - lastPersistAt >= 250) {
            run = {
              ...run,
              updatedAt: new Date().toISOString(),
              fullText: streamState.fullText,
              executionLog: streamState.executionSteps.join('\n\n'),
              toolCalls: [...streamState.toolCalls.values()],
              error: streamState.error,
              finishReason: streamState.finishReason,
            }
            await this.store.writeRun(run)
            lastPersistAt = now
          }
        },
      })

      if (signal.aborted) {
        run = {
          ...run,
          status: 'cancelled',
          error: run.error ?? 'Run cancelled by user.',
        }
      } else if (streamState.error) {
        run = {
          ...run,
          status: 'failed',
          error: streamState.error,
        }
      } else {
        if (streamState.currentStepText.trim()) {
          streamState.executionSteps.push(streamState.currentStepText.trim())
        }
        run = {
          ...run,
          status: 'succeeded',
          finalResult: streamState.fullText.trim(),
          executionLog: streamState.executionSteps.join('\n\n'),
          toolCalls: [...streamState.toolCalls.values()],
          finishReason: streamState.finishReason ?? 'stop',
        }
      }
    } catch (error) {
      const isAbort = signal.aborted
      run = {
        ...run,
        status: isAbort ? 'cancelled' : 'failed',
        error:
          isAbort
            ? run.error ?? 'Run cancelled by user.'
            : error instanceof Error
              ? error.message
              : String(error),
      }
    } finally {
      this.activeRuns.delete(run.runId)
      run = await this.finalizeRun(run, preparation)
      await this.store.writeRun(run)
      await this.chatClient.deleteSession(run.conversationId)
      logger.info('Browser Ops automation run finished', {
        runId: run.runId,
        status: run.status,
        conversationId: run.conversationId,
      })
    }
  }

  private async finalizeRun(
    run: BrowserOpsAutomationRun,
    preparation: BrowserOpsAutomationPreparation,
  ): Promise<BrowserOpsAutomationRun> {
    let capturedCookies = 0

    try {
      const cookies = await this.captureCookies(preparation)
      if (cookies.length > 0) {
        await this.runtimePersistence.writeCookieVault(
          preparation.binding.bindingId,
          cookies,
          [preparation.page.url],
        )
        capturedCookies = cookies.length
      }
    } catch (error) {
      run = {
        ...run,
        error:
          run.error ??
          (error instanceof Error ? error.message : 'Failed to capture cookies'),
      }
    }

    const now = new Date().toISOString()
    return {
      ...run,
      finalResult: run.finalResult || run.fullText.trim(),
      capturedCookies,
      updatedAt: now,
      completedAt: now,
    }
  }

  private async captureCookies(
    preparation: BrowserOpsAutomationPreparation,
  ): Promise<Cookie[]> {
    if (preparation.bundle?.browserContextId) {
      return await this.browser.getCookies(
        undefined,
        preparation.bundle.browserContextId,
      )
    }
    return await this.browser.getCookies([preparation.page.url])
  }

  private async recoverInterruptedRuns(): Promise<void> {
    const runs = await this.store.listRuns(200)
    const staleRuns = runs.filter(
      (run) => run.status === 'queued' || run.status === 'running',
    )
    const now = new Date().toISOString()

    await Promise.all(
      staleRuns.map(async (run) => {
        await this.store.writeRun({
          ...run,
          status: 'failed',
          error:
            run.error ??
            'BrowserOS server restarted before the automation run completed.',
          updatedAt: now,
          completedAt: now,
        })
      }),
    )
  }
}
