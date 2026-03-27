import { afterEach, describe, expect, it, mock } from 'bun:test'
import {
  cleanupOutputDir,
  createAgentContext,
  createOrchestratorEvalConfig,
  createOutputDir,
  createTask,
  DEFAULT_PAGE,
  readMessages,
  readMetadata,
  screenshotExists,
  TINY_PNG_BASE64,
} from './helpers'

const ORCHESTRATOR_MODULE_URL = new URL(
  '../src/agents/orchestrator-executor/index.ts',
  import.meta.url,
)
const ORCHESTRATOR_AGENT_MODULE_URL = new URL(
  '../src/agents/orchestrator-executor/orchestrator-agent.ts',
  import.meta.url,
)
const RESOLVE_PROVIDER_CONFIG_URL = new URL(
  '../src/utils/resolve-provider-config.ts',
  import.meta.url,
)

describe('OrchestratorExecutorEvaluator', () => {
  let outputDir: string | null = null

  afterEach(async () => {
    mock.restore()
    await cleanupOutputDir(outputDir)
    outputDir = null
  })

  it('captures delegation, executor events, screenshots, metadata, and final answer', async () => {
    mock.module('@browseros/server/agent/tool-loop', () => ({
      AiSdkAgent: class {
        static async create() {
          return {
            toolLoopAgent: {
              generate: async (params: {
                experimental_onToolCallStart?: (args: {
                  toolCall: {
                    toolCallId: string
                    toolName: string
                    input: Record<string, unknown>
                  }
                }) => void
                experimental_onToolCallFinish?: () => Promise<void>
                onStepFinish?: (step: {
                  toolCalls: Array<{
                    toolCallId: string
                    toolName: string
                    input: unknown
                  }>
                  toolResults: Array<{
                    toolCallId: string
                    toolName: string
                    output: unknown
                  }>
                  text: string
                }) => Promise<void>
              }) => {
                const toolCall = {
                  toolCallId: 'executor-tool-1',
                  toolName: 'navigate_page',
                  input: { page: 1, url: 'https://example.com' },
                }
                params.experimental_onToolCallStart?.({ toolCall })
                await params.experimental_onToolCallFinish?.()
                await params.onStepFinish?.({
                  toolCalls: [toolCall],
                  toolResults: [
                    {
                      toolCallId: 'executor-tool-1',
                      toolName: 'navigate_page',
                      output: { ok: true },
                    },
                  ],
                  text: 'executor observation',
                })
                return { text: 'executor final text' }
              },
            },
            dispose: async () => {},
          }
        }
      },
    }))

    mock.module('@browseros/server/browser/backends/cdp', () => ({
      CdpBackend: class {
        async connect() {}
        async disconnect() {}
      },
    }))

    mock.module('@browseros/server/browser', () => ({
      Browser: class {
        async listPages() {
          return [DEFAULT_PAGE]
        }

        async screenshot() {
          return {
            data: TINY_PNG_BASE64,
            mimeType: 'image/png',
            devicePixelRatio: 1.5,
          }
        }
      },
    }))

    mock.module('@browseros/server/tools/registry', () => ({
      registry: {},
    }))

    mock.module(RESOLVE_PROVIDER_CONFIG_URL.href, () => ({
      resolveProviderConfig: async (config: { model?: string }) => ({
        provider: 'openai',
        model: config.model ?? 'fake-model',
        apiKey: 'fake-key',
      }),
    }))

    mock.module(ORCHESTRATOR_AGENT_MODULE_URL.href, () => ({
      OrchestratorAgent: class {
        static create(
          _config: unknown,
          options: {
            executorFactory: (
              instruction: string,
              signal: AbortSignal,
            ) => Promise<{ observation: string; actionsPerformed: number }>
          },
        ) {
          return {
            run: async (_query: string, signal?: AbortSignal) => {
              const executorResult = await options.executorFactory(
                'inspect example.com',
                signal ?? new AbortController().signal,
              )
              return {
                success: true,
                answer: `final orchestrator answer: ${executorResult.observation}`,
                reason: null,
                delegationCount: 1,
                totalExecutorSteps: executorResult.actionsPerformed,
                turns: 1,
              }
            },
          }
        }
      },
    }))

    outputDir = await createOutputDir()
    const config = createOrchestratorEvalConfig()
    const task = createTask()
    const context = await createAgentContext(config, task, outputDir)
    context.capture.addWarning('agent_execution', 'orchestrator warning')

    const { OrchestratorExecutorEvaluator } = await import(
      `${ORCHESTRATOR_MODULE_URL.href}?t=${Date.now()}`
    )
    const evaluator = new OrchestratorExecutorEvaluator(context)
    const result = await evaluator.execute()

    const messages = await readMessages(context.taskOutputDir)
    const metadata = await readMetadata(context.taskOutputDir)

    expect(result.finalAnswer).toContain('final orchestrator answer')
    expect(metadata.total_steps).toBe(1)
    expect(metadata.device_pixel_ratio).toBe(1.5)
    expect(metadata.warnings[0]?.message).toBe('orchestrator warning')
    expect(await screenshotExists(context.taskOutputDir, 1)).toBe(true)

    const delegateInput = messages.find(
      (message) =>
        message.type === 'tool-input-available' &&
        message.toolName === 'delegate',
    )
    expect(delegateInput).toBeDefined()

    const executorToolOutput = messages.find(
      (message) =>
        message.type === 'tool-output-available' &&
        message.toolCallId === 'executor-tool-1',
    ) as { screenshot?: number } | undefined
    expect(executorToolOutput?.screenshot).toBe(1)

    const textDeltas = messages
      .filter(
        (message): message is { type: 'text-delta'; delta: string } =>
          message.type === 'text-delta',
      )
      .map((message) => message.delta)
    expect(textDeltas).toContain('executor observation')
    expect(textDeltas.at(-1)).toContain('final orchestrator answer')
  })
})
