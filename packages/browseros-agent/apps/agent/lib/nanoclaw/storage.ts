import { storage } from '@wxt-dev/storage'
import { useCallback, useEffect, useState } from 'react'

export type NovaClawBrainBackend = 'native' | 'nanoclaw'
export type NovaClawSafetyBackend = 'native' | 'ironclaw'
export type NovaClawBrowserUsePolicy = 'on-demand' | 'prefer-browser'
export type NovaClawToolRouting = 'local-first' | 'hybrid' | 'mcp-first'

export interface NovaClawConfig {
  brainBackend: NovaClawBrainBackend
  safetyBackend: NovaClawSafetyBackend
  swarmMaxAgents: number
  browserUsePolicy: NovaClawBrowserUsePolicy
  toolRouting: NovaClawToolRouting
  allowManagedApps: boolean
  allowCustomMcp: boolean
  executionProviderId?: string
  disabledManagedServerNames: string[]
  disabledCustomServerNames: string[]
}

export const DEFAULT_NOVACLAW_CONFIG: NovaClawConfig = {
  brainBackend: 'nanoclaw',
  safetyBackend: 'ironclaw',
  swarmMaxAgents: 5,
  browserUsePolicy: 'on-demand',
  toolRouting: 'local-first',
  allowManagedApps: true,
  allowCustomMcp: true,
  executionProviderId: undefined,
  disabledManagedServerNames: [],
  disabledCustomServerNames: [],
}

// Keep the legacy key so existing users keep their current NovaClaw strategy.
export const novaClawConfigStorage = storage.defineItem<NovaClawConfig>(
  'local:nanoclaw-config',
  {
    version: 3,
    migrations: {
      3: (value: Partial<NovaClawConfig> | null): NovaClawConfig | null => {
        if (!value) return value as null
        return {
          ...DEFAULT_NOVACLAW_CONFIG,
          ...value,
        }
      },
    },
    fallback: DEFAULT_NOVACLAW_CONFIG,
  },
)

export function useNovaClawConfig() {
  const [config, setConfigState] = useState<NovaClawConfig>(
    DEFAULT_NOVACLAW_CONFIG,
  )

  useEffect(() => {
    novaClawConfigStorage.getValue().then((value) => {
      setConfigState(value ?? DEFAULT_NOVACLAW_CONFIG)
    })
    const unwatch = novaClawConfigStorage.watch((newValue) => {
      setConfigState(newValue ?? DEFAULT_NOVACLAW_CONFIG)
    })
    return unwatch
  }, [])

  const setConfig = useCallback(async (next: NovaClawConfig) => {
    await novaClawConfigStorage.setValue(next)
    setConfigState(next)
  }, [])

  const updateConfig = useCallback(
    async (patch: Partial<NovaClawConfig>) => {
      const next = { ...config, ...patch }
      await novaClawConfigStorage.setValue(next)
      setConfigState(next)
    },
    [config],
  )

  return { config, setConfig, updateConfig }
}

// Backward-compatible aliases while the rest of the app migrates to NovaClaw.
export type BrainBackend = NovaClawBrainBackend
export type SafetyBackend = NovaClawSafetyBackend
export type BrowserUsePolicy = NovaClawBrowserUsePolicy
export type ToolRouting = NovaClawToolRouting
export type NanoClawConfig = NovaClawConfig
export const DEFAULT_CONFIG = DEFAULT_NOVACLAW_CONFIG
export const nanoclawConfigStorage = novaClawConfigStorage
export const useNanoClawConfig = useNovaClawConfig
