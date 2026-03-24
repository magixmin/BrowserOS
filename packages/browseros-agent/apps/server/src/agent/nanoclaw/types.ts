export interface ExecutorResult {
  observation: string
  status: 'done' | 'blocked' | 'timeout'
  url: string
  actionsPerformed: number
  toolsUsed: string[]
}

export const NANOCLAW_DEFAULTS = {
  maxTurns: 15,
  swarmMaxAgents: 5,
  maxTotalSteps: 300,
  delegationTimeoutMs: 300_000,
} as const
