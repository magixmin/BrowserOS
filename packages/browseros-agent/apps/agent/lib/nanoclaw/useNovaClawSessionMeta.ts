import { useMemo } from 'react'
import { useGetUserMCPIntegrations } from '@/entrypoints/app/connect-mcp/useGetUserMCPIntegrations'
import { useI18n } from '@/lib/i18n/useI18n'
import { useLlmProviders } from '@/lib/llm-providers/useLlmProviders'
import { useMcpServers } from '@/lib/mcp/mcpServerStorage'
import { useNovaClawConfig } from '@/lib/nanoclaw/storage'

export function useNovaClawSessionMeta(selectedProviderId?: string) {
  const { t } = useI18n()
  const { config } = useNovaClawConfig()
  const { providers } = useLlmProviders()
  const { servers } = useMcpServers()
  const { data: userIntegrations } = useGetUserMCPIntegrations()

  const executionProvider = useMemo(() => {
    const providerId = config.executionProviderId || selectedProviderId
    if (!providerId) return null
    return providers.find((provider) => provider.id === providerId) ?? null
  }, [config.executionProviderId, selectedProviderId, providers])

  const enabledManagedCount = useMemo(() => {
    if (!config.allowManagedApps) return 0

    const managedServers = servers.filter((server) => server.type === 'managed')
    return managedServers.filter((server) => {
      const name = server.managedServerName ?? server.displayName
      if (config.disabledManagedServerNames.includes(name)) return false
      return (
        userIntegrations?.integrations?.some(
          (integration) =>
            integration.name === server.managedServerName &&
            integration.is_authenticated,
        ) ?? false
      )
    }).length
  }, [
    config.allowManagedApps,
    config.disabledManagedServerNames,
    servers,
    userIntegrations,
  ])

  const enabledCustomCount = useMemo(() => {
    if (!config.allowCustomMcp) return 0

    return servers.filter((server) => {
      if (server.type !== 'custom') return false
      if (!server.config?.url) return false
      return !config.disabledCustomServerNames.includes(server.displayName)
    }).length
  }, [config.allowCustomMcp, config.disabledCustomServerNames, servers])

  return {
    executionModelLabel:
      executionProvider?.name ?? t('novaclaw.model.current'),
    enabledPluginCount: enabledManagedCount + enabledCustomCount,
  }
}
