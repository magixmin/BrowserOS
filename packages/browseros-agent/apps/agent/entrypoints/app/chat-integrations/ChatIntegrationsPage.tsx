import { MessageCircleMore, Radio, Send, Webhook } from 'lucide-react'
import type { FC } from 'react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { AddCustomMCPDialog } from '@/entrypoints/app/connect-mcp/AddCustomMCPDialog'
import { ApiKeyDialog } from '@/entrypoints/app/connect-mcp/ApiKeyDialog'
import { useAddManagedServer } from '@/entrypoints/app/connect-mcp/useAddManagedServer'
import { useGetUserMCPIntegrations } from '@/entrypoints/app/connect-mcp/useGetUserMCPIntegrations'
import { useSubmitApiKey } from '@/entrypoints/app/connect-mcp/useSubmitApiKey'
import { useMcpServers } from '@/lib/mcp/mcpServerStorage'
import { useNovaClawConfig } from '@/lib/nanoclaw/storage'

type IntegrationTemplate = {
  id: string
  name: string
  description: string
  mode: 'managed' | 'custom'
  icon: typeof MessageCircleMore
  managedServerName?: string
  preset?: {
    name: string
    description: string
  }
}

const CHAT_INTEGRATION_TEMPLATES: IntegrationTemplate[] = [
  {
    id: 'slack',
    name: 'Slack',
    description: 'Use BrowserOS managed app connection for Slack chat actions.',
    mode: 'managed',
    icon: MessageCircleMore,
    managedServerName: 'Slack',
  },
  {
    id: 'feishu',
    name: 'Feishu',
    description:
      'Connect a Feishu bot, webhook bridge, or MCP relay for team chat workflows.',
    mode: 'custom',
    icon: Radio,
    preset: {
      name: 'Feishu Bridge',
      description: 'Feishu bot / webhook bridge for NovaClaw conversations',
    },
  },
  {
    id: 'telegram',
    name: 'Telegram',
    description:
      'Connect a Telegram bot bridge or MCP relay for inbound and outbound chat tasks.',
    mode: 'custom',
    icon: Send,
    preset: {
      name: 'Telegram Bridge',
      description: 'Telegram bot bridge for NovaClaw conversations',
    },
  },
  {
    id: 'discord',
    name: 'Discord',
    description:
      'Connect a Discord bot bridge or webhook relay for channel-driven automation.',
    mode: 'custom',
    icon: MessageCircleMore,
    preset: {
      name: 'Discord Bridge',
      description: 'Discord bot / webhook bridge for NovaClaw conversations',
    },
  },
  {
    id: 'webhook',
    name: 'Custom Bridge / Webhook',
    description:
      'Register your own bridge service, chat gateway, or webhook-backed MCP endpoint.',
    mode: 'custom',
    icon: Webhook,
    preset: {
      name: 'Chat Bridge',
      description: 'Custom MCP or webhook bridge for external chat tools',
    },
  },
]

export const ChatIntegrationsPage: FC = () => {
  const { config: novaClawConfig, updateConfig: updateNovaClawConfig } =
    useNovaClawConfig()
  const { servers, addServer } = useMcpServers()
  const { data: userIntegrations, mutate: mutateIntegrations } =
    useGetUserMCPIntegrations()
  const { trigger: addManagedServerMutation } = useAddManagedServer()
  const { trigger: submitApiKeyMutation, isMutating: isSubmittingApiKey } =
    useSubmitApiKey()
  const [dialogPreset, setDialogPreset] = useState<IntegrationTemplate | null>(
    null,
  )
  const [apiKeyServer, setApiKeyServer] = useState<{
    name: string
    apiKeyUrl: string
  } | null>(null)

  const customServerNames = useMemo(
    () => new Set(servers.filter((server) => server.type === 'custom').map((server) => server.displayName)),
    [servers],
  )

  const managedServerNames = useMemo(
    () =>
      new Set(
        servers
          .filter((server) => server.type === 'managed')
          .map((server) => server.managedServerName ?? server.displayName),
      ),
    [servers],
  )

  return (
    <div className="fade-in slide-in-from-bottom-5 animate-in space-y-6 duration-500">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md">
        <h2 className="font-semibold text-xl">Chat Integrations</h2>
        <p className="mt-1 text-muted-foreground text-sm">
          Keep external chat tools one level under Settings. Use Slack through
          managed app connections, and add Feishu, Telegram, Discord, or your
          own bridge through custom MCP or webhook relays.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {CHAT_INTEGRATION_TEMPLATES.map((template) => {
          const Icon = template.icon
          const managedConfigured =
            template.mode === 'managed' &&
            template.managedServerName &&
            managedServerNames.has(template.managedServerName)
          const managedConnected =
            managedConfigured &&
            (userIntegrations?.integrations?.some(
              (integration) =>
                integration.name === template.managedServerName &&
                integration.is_authenticated,
            ) ??
              false)

          const customConfigured =
            template.mode === 'custom' &&
            template.preset &&
            customServerNames.has(template.preset.name)

          const isConnected = managedConnected || customConfigured
          const needsAuthentication =
            template.mode === 'managed' && managedConfigured && !managedConnected
          const integrationName =
            template.mode === 'managed'
              ? (template.managedServerName ?? template.name)
              : (template.preset?.name ?? template.name)
          const enabledInNovaClaw =
            template.mode === 'managed'
              ? novaClawConfig.allowManagedApps &&
                !novaClawConfig.disabledManagedServerNames.includes(
                  integrationName,
                )
              : novaClawConfig.allowCustomMcp &&
                !novaClawConfig.disabledCustomServerNames.includes(
                  integrationName,
                )
          const statusLabel = isConnected
            ? 'Configured'
            : needsAuthentication
              ? 'Needs authentication'
              : 'Not configured'
          const statusTone = isConnected
            ? 'text-foreground'
            : needsAuthentication
              ? 'text-amber-700'
              : 'text-foreground'

          return (
            <Card key={template.id} className="shadow-sm">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-orange)]/10">
                    <Icon className="h-5 w-5 text-[var(--accent-orange)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-base">{template.name}</h3>
                      <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground uppercase tracking-wide">
                        {template.mode === 'managed' ? 'Managed' : 'Bridge'}
                      </span>
                    </div>
                    <p className="mt-1 text-muted-foreground text-sm leading-6">
                      {template.description}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                  Status:{' '}
                  <span className={`font-medium ${statusTone}`}>
                    {statusLabel}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background px-3 py-2">
                  <div className="space-y-0.5">
                    <div className="font-medium text-sm">Use in NovaClaw</div>
                    <div className="text-muted-foreground text-xs">
                      Allow NovaClaw to route chat tasks through this
                      integration
                    </div>
                  </div>
                  <Switch
                    checked={isConnected && enabledInNovaClaw}
                    disabled={!isConnected}
                    onCheckedChange={(checked) => {
                      const nextDisabled = new Set(
                        template.mode === 'managed'
                          ? novaClawConfig.disabledManagedServerNames
                          : novaClawConfig.disabledCustomServerNames,
                      )

                      if (checked) nextDisabled.delete(integrationName)
                      else nextDisabled.add(integrationName)

                      if (template.mode === 'managed') {
                        updateNovaClawConfig({
                          disabledManagedServerNames: [...nextDisabled],
                        })
                      } else {
                        updateNovaClawConfig({
                          disabledCustomServerNames: [...nextDisabled],
                        })
                      }
                    }}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {template.mode === 'managed' ? (
                    <>
                      <Button
                        size="sm"
                        onClick={async () => {
                          if (!template.managedServerName) return
                          try {
                            const response = await addManagedServerMutation({
                              serverName: template.managedServerName,
                            })

                            if (!managedConfigured) {
                              addServer({
                                id: Date.now().toString(),
                                displayName: template.name,
                                type: 'managed',
                                managedServerName: template.managedServerName,
                                managedServerDescription: template.description,
                              })
                            }

                            if (response.apiKeyUrl) {
                              setApiKeyServer({
                                name: template.managedServerName,
                                apiKeyUrl: response.apiKeyUrl,
                              })
                              return
                            }

                            if (!response.oauthUrl) {
                              toast.error(`Failed to connect ${template.name}`)
                              return
                            }

                            window.open(response.oauthUrl, '_blank')?.focus()
                          } catch (error) {
                            toast.error(
                              `Failed to connect ${template.name}: ${
                                error instanceof Error ? error.message : 'Unknown error'
                              }`,
                            )
                          }
                        }}
                      >
                        {needsAuthentication ? 'Authenticate' : 'Connect'}
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link to="/connect-apps">Open Connect Apps</Link>
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => setDialogPreset(template)}
                    >
                      Add Bridge
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-medium text-sm">Advanced MCP Settings</div>
            <div className="mt-1 text-muted-foreground text-xs leading-5">
              Only needed for server URL inspection, remote access, and low-level
              debugging.
            </div>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/settings/mcp">Open Advanced MCP Settings</Link>
          </Button>
        </div>
      </div>

      <AddCustomMCPDialog
        open={!!dialogPreset}
        onOpenChange={(open) => !open && setDialogPreset(null)}
        title={dialogPreset ? `Add ${dialogPreset.name}` : 'Add Chat Bridge'}
        description={
          dialogPreset?.description ||
          'Configure a custom chat integration bridge'
        }
        initialValues={
          dialogPreset?.preset
            ? {
                name: dialogPreset.preset.name,
                description: dialogPreset.preset.description,
              }
            : undefined
        }
        onAddServer={(config) => {
          addServer({
            id: Date.now().toString(),
            displayName: config.name,
            type: 'custom',
            config: {
              url: config.url,
              description: config.description,
            },
          })
          setDialogPreset(null)
        }}
      />

      <ApiKeyDialog
        open={!!apiKeyServer}
        onOpenChange={(open) => !open && setApiKeyServer(null)}
        serverName={apiKeyServer?.name ?? ''}
        isSubmitting={isSubmittingApiKey}
        onSubmit={async (apiKey) => {
          if (!apiKeyServer) return
          try {
            await submitApiKeyMutation({
              serverName: apiKeyServer.name,
              apiKey,
              apiKeyUrl: apiKeyServer.apiKeyUrl,
            })
            toast.success(`${apiKeyServer.name} connected successfully`)
            setApiKeyServer(null)
            mutateIntegrations()
          } catch (error) {
            toast.error(
              `Failed to connect ${apiKeyServer.name}: ${
                error instanceof Error ? error.message : 'Unknown error'
              }`,
            )
          }
        }}
      />
    </div>
  )
}
