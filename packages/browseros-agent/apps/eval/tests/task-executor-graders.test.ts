import { afterEach, describe, expect, it, mock } from 'bun:test'
import { access, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { AgentResult } from '../src/agents/types'
import { TrajectorySaver } from '../src/capture/trajectory-saver'
import {
  cleanupOutputDir,
  createOrchestratorEvalConfig,
  createOutputDir,
  createTask,
  TINY_PNG_BASE64,
} from './helpers'

const TASK_EXECUTOR_MODULE_URL = new URL(
  '../src/runner/task-executor.ts',
  import.meta.url,
)
const FARA_MULTIMODAL_MODULE_URL = new URL(
  '../src/graders/fara/multimodal.ts',
  import.meta.url,
)

describe('TaskExecutor graders', () => {
  let outputDir: string | null = null

  afterEach(async () => {
    mock.restore()
    await cleanupOutputDir(outputDir)
    outputDir = null
  })

  it('passes orchestrator-executor output to multimodal grader without no_screenshots failure', async () => {
    outputDir = await createOutputDir()
    const task = createTask({
      query_id: 'grader-task',
      query: 'Find the title on example.com',
      graders: ['fara_multimodal'],
    })

    const saver = new TrajectorySaver(outputDir, task.query_id)
    const taskOutputDir = await saver.init()
    await writeFile(
      join(taskOutputDir, 'screenshots', '1.png'),
      Buffer.from(TINY_PNG_BASE64, 'base64'),
    )

    const agentResult: AgentResult = {
      metadata: {
        query_id: task.query_id,
        dataset: task.dataset,
        query: task.query,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        total_duration_ms: 100,
        total_steps: 1,
        termination_reason: 'completed',
        final_answer: 'The title is Example Domain',
        errors: [],
        warnings: [],
        agent_config: {
          type: 'orchestrator-executor',
          model: 'fake-orchestrator/fake-executor',
        },
        grader_results: {},
      },
      messages: [
        {
          type: 'user',
          timestamp: new Date().toISOString(),
          content: task.query,
        },
        {
          type: 'tool-input-available',
          timestamp: new Date().toISOString(),
          toolCallId: 'delegate-1',
          toolName: 'delegate',
          input: { instruction: 'Inspect example.com' },
        },
        {
          type: 'tool-output-available',
          timestamp: new Date().toISOString(),
          toolCallId: 'executor-tool-1',
          output: { ok: true },
          screenshot: 1,
        },
        {
          type: 'text-start',
          timestamp: new Date().toISOString(),
          id: 'assistant-1',
        },
        {
          type: 'text-delta',
          timestamp: new Date().toISOString(),
          id: 'assistant-1',
          delta: 'The title is Example Domain',
        },
        {
          type: 'text-end',
          timestamp: new Date().toISOString(),
          id: 'assistant-1',
        },
      ],
      finalAnswer: 'The title is Example Domain',
    }

    await saver.saveMetadata(agentResult.metadata)

    const gradeSpy = mock(
      async (input: {
        screenshotCount: number
        outputDir: string
      }) => {
        if (input.screenshotCount <= 0) {
          return {
            score: 0,
            pass: false,
            reasoning: 'No screenshots available for multimodal verification',
            details: { verifier: 'multimodal', error: 'no_screenshots' },
          }
        }

        try {
          await access(join(input.outputDir, 'screenshots', '1.png'))
        } catch {
          return {
            score: 0,
            pass: false,
            reasoning: 'No screenshots available for multimodal verification',
            details: { verifier: 'multimodal', error: 'no_screenshots' },
          }
        }

        return {
          score: 1,
          pass: true,
          reasoning: 'Visual evidence confirms the answer.',
          details: {
            verifier: 'multimodal',
            totalScreenshots: input.screenshotCount,
            relevantScreenshots: 1,
          },
        }
      },
    )

    mock.module(FARA_MULTIMODAL_MODULE_URL.href, () => ({
      FaraMultimodalGrader: class {
        name = 'fara_multimodal'

        async grade(input: { screenshotCount: number; outputDir: string }) {
          return gradeSpy(input)
        }
      },
    }))

    const config = {
      ...createOrchestratorEvalConfig(),
      graders: ['fara_multimodal'],
    }

    const { TaskExecutor } = await import(
      `${TASK_EXECUTOR_MODULE_URL.href}?t=${Date.now()}`
    )
    const executor = new TaskExecutor(config, outputDir, {
      graderOptions: {
        apiKey: 'fake-key',
        model: 'fake-model',
      },
    })

    const graderResults = await (
      executor as unknown as {
        runGraders: (
          taskArg: typeof task,
          agentResultArg: AgentResult,
        ) => Promise<Record<string, { pass: boolean; details?: unknown }>>
      }
    ).runGraders(task, agentResult)

    const multimodal = graderResults.fara_multimodal
    expect(multimodal).toBeDefined()
    expect(multimodal.pass).toBe(true)
    expect(multimodal.details).not.toEqual(
      expect.objectContaining({ error: 'no_screenshots' }),
    )
    expect(gradeSpy).toHaveBeenCalledTimes(1)

    const persisted = await saver.loadMetadata()
    expect(persisted.grader_results.fara_multimodal?.pass).toBe(true)
  })
})
