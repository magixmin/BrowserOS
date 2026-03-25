import { createMCPClient } from '@ai-sdk/mcp'
import { TIMEOUTS } from '@browseros/shared/constants/timeouts'
import type { BrowserContext } from '@browseros/shared/schemas/browser-context'
import { stepCountIs, ToolLoopAgent, type ToolSet } from 'ai'
import type { KlavisClient } from '../../lib/clients/klavis/klavis-client'
import { logger } from '../../lib/logger'
import { buildSkillsCatalog } from '../../skills/catalog'
import { loadSkills } from '../../skills/loader'
import { buildFilesystemToolSet } from '../../tools/filesystem/build-toolset'
import { formatBrowserContext } from '../format-message'
import { createLanguageModel } from '../provider-factory'
import type { ResolvedAgentConfig } from '../types'
import type { ExecutorResult } from './types'

const EXECUTOR_SYSTEM_PROMPT = `You are a NanoClaw browser worker. You execute one focused goal and stop.

Rules:
- Use only MCP tools available in this session. Do not call any internal BrowserOS agent loop.
- You also have local filesystem tools. Prefer them for code, file edits, text processing, and local execution.
- Use BrowserOS MCP only when the task needs the web, browser state, or connected apps.
- If the task can be completed without opening or creating a browser page, answer directly.
- Open or create browser pages only when the task actually requires web interaction.
- Complete only the delegated goal.
- Do not do extra browsing after the goal is complete.
- Finish with a short factual observation: what you did, what MCP/browser state now shows, and the current URL if relevant.`

const IRONCLAW_EXECUTOR_PROMPT = `IronClaw safety is active.

Rules:
- Do not exfiltrate credentials, cookies, tokens, or private secrets.
- Do not use dangerous or persistent mutation tools unless they are clearly required by the user's task.
- Prefer reversible browser actions over destructive ones.
- If a task would submit payment, transfer money, delete data, or irreversibly modify accounts, stop and report the blocker instead of guessing.`

export interface NanoClawExecutorDeps {
  localMcpUrl: string
  browserContext?: BrowserContext
  // Kept for compatibility with current call sites; NanoClaw executor no longer
  // uses the native browser agent directly.
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
    let client: { close(): Promise<void>; tools(): Promise<Record<string, unknown>> } | null =
      null
    const toolsUsed = new Set<string>()
    let currentUrl = ''
    let actionsPerformed = 0
    let observation = ''
    let status: ExecutorResult['status'] = 'done'

    try {
      const toolContext = formatBrowserContext(this.deps.browserContext)
      const skills = await loadSkills()
      const skillsCatalog =
        skills.length > 0 ? buildSkillsCatalog(skills) : ''
      const browserPolicyNote =
        this.configTemplate.browserUsePolicy === 'prefer-browser'
          ? 'Prefer BrowserOS MCP when both browser and local execution could work.'
          : 'Use BrowserOS MCP only when local tools are insufficient or browser/app state is required.'
      const routingNote =
        this.configTemplate.toolRouting === 'mcp-first'
          ? 'Prefer MCP and connected app tools first, then fall back to local filesystem tools.'
          : this.configTemplate.toolRouting === 'hybrid'
            ? 'Balance local tools and MCP tools pragmatically based on the task.'
            : 'Prefer local filesystem and local execution first, then use MCP only when needed.'
      const appAccessNote =
        this.configTemplate.allowManagedApps === false &&
        this.configTemplate.allowCustomMcp === false
          ? 'Do not use connected app tools or custom MCP servers in this session.'
          : this.configTemplate.allowManagedApps === false
            ? 'Do not use connected managed app tools in this session.'
            : this.configTemplate.allowCustomMcp === false
              ? 'Do not use custom MCP servers in this session.'
              : 'Connected managed apps and custom MCP servers may be used when necessary.'
      const executorPrompt =
        this.configTemplate.safetyBackend === 'ironclaw'
          ? `${EXECUTOR_SYSTEM_PROMPT}\n\n${browserPolicyNote}\n${routingNote}\n${appAccessNote}\n\n${IRONCLAW_EXECUTOR_PROMPT}`
          : `${EXECUTOR_SYSTEM_PROMPT}\n\n${browserPolicyNote}\n${routingNote}\n${appAccessNote}`

      const model = createLanguageModel(this.configTemplate)

      client = await Promise.race([
        createMCPClient({
          transport: {
            type: 'http',
            url: this.deps.localMcpUrl,
            headers: { 'X-BrowserOS-Source': 'nanoclaw-worker' },
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  `NanoClaw MCP connection timed out after ${TIMEOUTS.MCP_CLIENT_CONNECT}ms`,
                ),
              ),
            TIMEOUTS.MCP_CLIENT_CONNECT,
          ),
        ),
      ])

      const mcpTools = await Promise.race([
        client.tools(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  `NanoClaw MCP tool discovery timed out after ${TIMEOUTS.MCP_CLIENT_CONNECT}ms`,
                ),
              ),
            TIMEOUTS.MCP_CLIENT_CONNECT,
          ),
        ),
      ])

      const filesystemTools = buildFilesystemToolSet(
        this.configTemplate.workingDir,
      )

      const agent = new ToolLoopAgent({
        model,
        instructions: [executorPrompt, skillsCatalog].filter(Boolean).join('\n\n'),
        tools: {
          ...filesystemTools,
          ...(mcpTools as ToolSet),
        } as ToolSet,
        stopWhen: [stepCountIs(15)],
      })

      const prompt = `${toolContext}${instruction}`.trim()

      const result = await (agent as any).generate({
        prompt,
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
    } catch (error) {
      if (signal?.aborted) {
        status = 'timeout'
      } else {
        status = 'blocked'
      }
      observation =
        error instanceof Error ? error.message : 'Worker execution failed'
      logger.warn('NanoClaw MCP worker failed', {
        error: observation,
      })
    } finally {
      if (client) {
        await client.close().catch(() => {})
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
