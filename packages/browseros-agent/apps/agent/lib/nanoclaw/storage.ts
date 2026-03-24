import { storage } from '@wxt-dev/storage'
import { useCallback, useEffect, useState } from 'react'

export type NovaClawBrainBackend = 'native' | 'nanoclaw'
export type NovaClawSafetyBackend = 'native' | 'ironclaw'

export interface NovaClawConfig {
  brainBackend: NovaClawBrainBackend
  safetyBackend: NovaClawSafetyBackend
  swarmMaxAgents: number
}

export const DEFAULT_NOVACLAW_CONFIG: NovaClawConfig = {
  brainBackend: 'nanoclaw',
  safetyBackend: 'ironclaw',
  swarmMaxAgents: 5,
}

// Keep the legacy key so existing users keep their current NovaClaw strategy.
export const novaClawConfigStorage = storage.defineItem<NovaClawConfig>(
  'local:nanoclaw-config',
  {
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
export type NanoClawConfig = NovaClawConfig
export const DEFAULT_CONFIG = DEFAULT_NOVACLAW_CONFIG
export const nanoclawConfigStorage = novaClawConfigStorage
export const useNanoClawConfig = useNovaClawConfig
