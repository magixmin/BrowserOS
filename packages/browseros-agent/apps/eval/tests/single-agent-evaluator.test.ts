import { afterEach, describe, expect, it, mock } from 'bun:test'
import {
  cleanupOutputDir,
  createAgentContext,
  createOutputDir,
  createSingleEvalConfig,
  createTask,
  DEFAULT_PAGE,
  readMessages,
  readMetadata,
  screenshotExists,
  TINY_PNG_BASE64,
} from './helpers'

const SINGLE_AGENT_MODULE_URL = new URL(
  '../src/agents/single-agent.ts',
  import.meta.url,
)
const RESOLVE_PROVIDER_CONFIG_URL = new URL(
  '../src/utils/resolve-provider-config.ts',
  import.meta.url,
)

describe('SingleAgentEvaluator', () => {
  let outputDir: string | null = null

  afterEach(async () => {
    mock.restore()
    await cleanupOutputDir(outputDir)
    outputDir = null
  })

  it('captures screenshots, messages.jsonl, metadata, and final assistant text', async () => {
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
                  toolCallId: 'tool-1',
                  toolName: 'navigate_page',
                  input: { page: 1, url: 'https://example.com' },
                }
                params.experimental_onToolCallStart?.({ toolCall })
                await params.experimental_onToolCallFinish?.()
                await params.onStepFinish?.({
                  toolCalls: [toolCall],
                  toolResults: [
                    {
                      toolCallId: 'tool-1',
                      toolName: 'navigate_page',
                      output: { ok: true },
                    },
                  ],
                  text: 'step-level summary',
                })
                return { text: 'final single answer' }
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
            devicePixelRatio: 2,
          }
        }
      },
    }))

    mock.module('@browseros/server/tools/registry', () => ({
      registry: {},
    }))

    mock.module(RESOLVE_PROVIDER_CONFIG_URL.href, () => ({
      resolveProviderConfig: async () => ({
        provider: 'openai',
        model: 'fake-model',
        apiKey: 'fake-key',
      }),
    }))

    outputDir = await createOutputDir()
    const config = createSingleEvalConfig()
    const task = createTask()
    const context = await createAgentContext(config, task, outputDir)
    context.capture.addWarning('agent_execution', 'single warning')

    const { SingleAgentEvaluator } = await import(
      `${SINGLE_AGENT_MODULE_URL.href}?t=${Date.now()}`
    )
    const evaluator = new SingleAgentEvaluator(context)
    const result = await evaluator.execute()

    const messages = await readMessages(context.taskOutputDir)
    const metadata = await readMetadata(context.taskOutputDir)

    expect(result.finalAnswer).toBe('final single answer')
    expect(metadata.total_steps).toBe(1)
    expect(metadata.device_pixel_ratio).toBe(2)
    expect(metadata.warnings[0]?.message).toBe('single warning')
    expect(await screenshotExists(context.taskOutputDir, 1)).toBe(true)

    expect(messages[0]?.type).toBe('user')
    const toolOutput = messages.find(
      (message) => message.type === 'tool-output-available',
    ) as { screenshot?: number } | undefined
    expect(toolOutput?.screenshot).toBe(1)

    const textDeltas = messages
      .filter(
        (message): message is { type: 'text-delta'; delta: string } =>
          message.type === 'text-delta',
      )
      .map((message) => message.delta)
    expect(textDeltas).toContain('step-level summary')
    expect(textDeltas.at(-1)).toBe('final single answer')
  })
})
