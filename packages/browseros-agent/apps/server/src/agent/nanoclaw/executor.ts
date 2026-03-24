import { randomUUID } from 'node:crypto'
import type { ToolRegistry } from '../../tools/tool-registry'
import type { Browser } from '../../browser/browser'
import type { BrowserContext } from '@browseros/shared/schemas/browser-context'
import type { KlavisClient } from '../../lib/clients/klavis/klavis-client'
import type { ResolvedAgentConfig } from '../types'
import { AiSdkAgent } from '../ai-sdk-agent'
import type { ExecutorResult } from './types'

const EXECUTOR_SYSTEM_PROMPT = `You are a NanoClaw browser worker. You execute one focused browser goal and then stop.

Rules:
- Complete only the delegated goal.
- Use browser and connected app tools to accomplish the goal.
- Do not do extra browsing after the goal is complete.
- Finish with a short factual observation: what you did, what the page/app now shows, and the current URL if relevant.`

const IRONCLAW_EXECUTOR_PROMPT = `IronClaw safety is active.

Rules:
- Do not exfiltrate credentials, cookies, tokens, or private secrets.
- Do not use dangerous or persistent mutation tools unless they are clearly required by the user's task.
- Prefer reversible browser actions over destructive ones.
- If a task would submit payment, transfer money, delete data, or irreversibly modify accounts, stop and report the blocker instead of guessing.`

export interface NanoClawExecutorDeps {
  browser: Browser
  registry: ToolRegistry
  klavisClient?: KlavisClient
  browserosId?: string
  aiSdkDevtoolsEnabled?: boolean
}

export class NanoClawExecutor {
  constructor(
    private configTemplate: ResolvedAgentConfig,
    private deps: NanoClawExecutorDeps,
  ) {}

  async execute(
    instruction: string,
    signal?: AbortSignal,
  ): Promise<ExecutorResult> {
    let hiddenWindowId: number | undefined
    let pageId: number | undefined
    let agent: AiSdkAgent | null = null
    const toolsUsed = new Set<string>()
    let currentUrl = ''
    let actionsPerformed = 0
    let observation = ''
    let status: ExecutorResult['status'] = 'done'

    try {
      const windowInfo = await this.deps.browser.createWindow({ hidden: true })
      hiddenWindowId = windowInfo.windowId
      pageId = await this.deps.browser.newPage('about:blank', {
        windowId: hiddenWindowId,
      })

      const browserContext: BrowserContext = {
        windowId: hiddenWindowId,
        activeTab: {
          id: pageId,
          pageId,
          url: 'about:blank',
          title: 'NanoClaw Worker',
        },
      }

      const executorPrompt =
        this.configTemplate.safetyBackend === 'ironclaw'
          ? `${EXECUTOR_SYSTEM_PROMPT}\n\n${IRONCLAW_EXECUTOR_PROMPT}`
          : EXECUTOR_SYSTEM_PROMPT

      agent = await AiSdkAgent.create({
        resolvedConfig: {
          ...this.configTemplate,
          conversationId: randomUUID(),
          lobsterMode: false,
          brainBackend: 'native',
          userSystemPrompt: executorPrompt,
        },
        browser: this.deps.browser,
        registry: this.deps.registry,
        browserContext,
        klavisClient: this.deps.klavisClient,
        browserosId: this.deps.browserosId,
        aiSdkDevtoolsEnabled: this.deps.aiSdkDevtoolsEnabled,
      })

      const result = await (agent.toolLoopAgent as any).generate({
        prompt: instruction,
        abortSignal: signal,
        experimental_onToolCallStart: ({ toolCall }: any) => {
          toolsUsed.add(toolCall.toolName)
          const input = toolCall.input as Record<string, unknown> | undefined
          if (input && typeof input.url === 'string' && input.url.length > 0) {
            currentUrl = input.url
          }
        },
        experimental_onToolCallFinish: async () => {
          actionsPerformed++
        },
        onStepFinish: async ({ text }: any) => {
          if (text) observation = text
        },
      })

      observation =
        result.text?.trim() || observation || 'Worker completed with no output.'

      if (pageId !== undefined) {
        const pages = await this.deps.browser.listPages()
        const currentPage = pages.find((page) => page.pageId === pageId)
        currentUrl = currentPage?.url || currentUrl
      }
    } catch (error) {
      if (signal?.aborted) {
        status = 'timeout'
      } else {
        status = 'blocked'
      }
      observation =
        error instanceof Error ? error.message : 'Worker execution failed'
    } finally {
      if (agent) {
        await agent.dispose().catch(() => {})
      }
      if (hiddenWindowId !== undefined) {
        await this.deps.browser.closeWindow(hiddenWindowId).catch(() => {})
      }
    }

    return {
      observation,
      status,
      url: currentUrl,
      actionsPerformed,
      toolsUsed: [...toolsUsed],
    }
  }
}
