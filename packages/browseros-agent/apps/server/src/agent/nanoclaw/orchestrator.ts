import { stepCountIs, ToolLoopAgent, tool } from 'ai'
import { z } from 'zod'
import { createLanguageModel } from '../provider-factory'
import type { ResolvedAgentConfig } from '../types'
import type { NanoClawExecutor } from './executor'
import { NANOCLAW_DEFAULTS, type ExecutorResult } from './types'

export interface NanoClawOrchestratorDeps {
  executor: NanoClawExecutor
}

function buildPrompt(config: ResolvedAgentConfig): string {
  const swarmMaxAgents =
    config.swarmMaxAgents ?? NANOCLAW_DEFAULTS.swarmMaxAgents
  const safetyNote =
    config.safetyBackend === 'ironclaw'
      ? `IronClaw safety is active. Prefer low-risk actions, treat secrets as untouchable, and stop on destructive or financially sensitive operations unless the user was explicit.`
      : ''

  return `You are NanoClaw, the browser brain for BrowserOS.

Your job is to break the user's task into focused browser/app goals, send them to isolated workers, and then decide the next step until the task is actually complete.

Available worker tools:
- delegate(instruction): run one isolated worker
- delegate_batch(instructions): run multiple isolated workers in parallel when the subtasks are independent

Rules:
- Plan WHAT, workers handle HOW.
- Use one goal per worker instruction.
- Prefer delegate_batch only for independent search, comparison, or evidence-gathering subtasks.
- Maximum concurrent worker slots in this session: ${swarmMaxAgents}.
- Stop delegating once the user outcome is complete, then answer directly in plain text.
- If a blocker requires login, 2FA, payment, deletion, or irreversible action, explain the blocker instead of improvising.

${safetyNote}`.trim()
}

function formatExecutorResult(label: string, result: ExecutorResult): string {
  const statusNote = result.status === 'timeout' ? ' (TIMED OUT)' : ''
  return `${label}
- Status: ${result.status}${statusNote}
- Actions: ${result.actionsPerformed}
- URL: ${result.url || 'unknown'}
- Tools: ${result.toolsUsed.join(', ') || 'none'}

Observation:
${result.observation}`.trim()
}

export function createNanoClawToolLoopAgent(
  config: ResolvedAgentConfig,
  deps: NanoClawOrchestratorDeps,
): ToolLoopAgent<any, any, any> {
  const swarmMaxAgents =
    config.swarmMaxAgents ?? NANOCLAW_DEFAULTS.swarmMaxAgents
  const model = createLanguageModel(config)
  let totalExecutorSteps = 0

  const delegate = tool({
    description: 'Run one isolated browser worker on a goal-level instruction.',
    inputSchema: z.object({
      instruction: z.string().min(1),
    }),
    execute: async ({ instruction }, { abortSignal }) => {
      if (totalExecutorSteps >= NANOCLAW_DEFAULTS.maxTotalSteps) {
        return `Step budget exhausted (${NANOCLAW_DEFAULTS.maxTotalSteps}).`
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(
        () => controller.abort(),
        NANOCLAW_DEFAULTS.delegationTimeoutMs,
      )
      const onAbort = () => controller.abort()
      abortSignal?.addEventListener('abort', onAbort, { once: true })

      try {
        const result = await deps.executor.execute(
          instruction,
          controller.signal,
        )
        totalExecutorSteps += result.actionsPerformed
        return formatExecutorResult('Worker Result:', result)
      } finally {
        clearTimeout(timeoutId)
        abortSignal?.removeEventListener('abort', onAbort)
      }
    },
  })

  const delegateBatch = tool({
    description:
      'Run multiple isolated workers in parallel for independent subtasks such as research, comparison, or parallel evidence gathering.',
    inputSchema: z.object({
      instructions: z
        .array(z.string().min(1))
        .min(1)
        .max(8)
        .describe('Independent worker instructions.'),
    }),
    execute: async ({ instructions }, { abortSignal }) => {
      const batch = instructions.slice(0, swarmMaxAgents)
      const results = await Promise.all(
        batch.map(async (instruction, index) => {
          const controller = new AbortController()
          const timeoutId = setTimeout(
            () => controller.abort(),
            NANOCLAW_DEFAULTS.delegationTimeoutMs,
          )
          const onAbort = () => controller.abort()
          abortSignal?.addEventListener('abort', onAbort, { once: true })

          try {
            const result = await deps.executor.execute(
              instruction,
              controller.signal,
            )
            totalExecutorSteps += result.actionsPerformed
            return formatExecutorResult(`Worker ${index + 1}:`, result)
          } finally {
            clearTimeout(timeoutId)
            abortSignal?.removeEventListener('abort', onAbort)
          }
        }),
      )

      return results.join('\n\n')
    },
  })

  return new ToolLoopAgent({
    model,
    instructions: buildPrompt(config),
    tools: {
      delegate,
      delegate_batch: delegateBatch,
    },
    stopWhen: [
      stepCountIs(config.contextWindowSize ? NANOCLAW_DEFAULTS.maxTurns : 15),
    ],
  })
}
