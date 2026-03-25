/**
 * @license
 * Copyright 2025 BrowserOS
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import type { LLMProvider } from '@browseros/shared/schemas/llm'

export interface ProviderConfig {
  provider: LLMProvider
  model: string
  apiKey?: string
  baseUrl?: string
  upstreamProvider?: string
  resourceName?: string
  region?: string
  accessKeyId?: string
  secretAccessKey?: string
  sessionToken?: string
}

export interface NovaClawRuntimeConfig {
  enabled: boolean
  brainBackend: 'native' | 'nanoclaw'
  safetyBackend: 'native' | 'ironclaw'
  swarmMaxAgents: number
  browserUsePolicy: 'on-demand' | 'prefer-browser'
  toolRouting: 'local-first' | 'hybrid' | 'mcp-first'
  allowManagedApps: boolean
  allowCustomMcp: boolean
}

export interface ResolvedAgentConfig {
  conversationId: string
  provider: LLMProvider
  model: string
  apiKey?: string
  baseUrl?: string
  upstreamProvider?: string
  resourceName?: string
  region?: string
  accessKeyId?: string
  secretAccessKey?: string
  sessionToken?: string
  accountId?: string
  reasoningEffort?: string
  reasoningSummary?: string
  contextWindowSize?: number
  userSystemPrompt?: string
  workingDir: string
  /** Whether the model supports image inputs (vision). Defaults to true. */
  supportsImages?: boolean
  /** Eval mode - enables window management tools. Defaults to false. */
  evalMode?: boolean
  /** Chat mode - restricts to read-only tools (no browser automation). Defaults to false. */
  chatMode?: boolean
  /** Internal compatibility flag for NovaClaw mode. Defaults to false. */
  lobsterMode?: boolean
  /** NovaClaw brain backend - native tool loop or NanoClaw-style orchestrator. */
  brainBackend?: 'native' | 'nanoclaw'
  /** NovaClaw safety backend - native/default rules or IronClaw-style safer tool policy. */
  safetyBackend?: 'native' | 'ironclaw'
  /** NovaClaw max worker slots for swarm-style delegation. */
  swarmMaxAgents?: number
  /** NovaClaw browser usage policy. */
  browserUsePolicy?: 'on-demand' | 'prefer-browser'
  /** NovaClaw local/MCP routing preference. */
  toolRouting?: 'local-first' | 'hybrid' | 'mcp-first'
  /** Whether NovaClaw may use connected managed apps. */
  allowManagedApps?: boolean
  /** Whether NovaClaw may use custom MCP servers. */
  allowCustomMcp?: boolean
  /** Scheduled task mode - disables tab grouping. Defaults to false. */
  isScheduledTask?: boolean
  /** Apps the user previously declined to connect via MCP (chose "do it manually"). */
  declinedApps?: string[]
}
