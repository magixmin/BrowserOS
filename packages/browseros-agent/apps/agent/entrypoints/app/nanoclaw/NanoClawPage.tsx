import type { FC } from 'react'
import { Brain, Link2, Shield, Users, Workflow } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { PRODUCT_NAME } from '@/lib/constants/product'
import { useGetUserMCPIntegrations } from '@/entrypoints/app/connect-mcp/useGetUserMCPIntegrations'
import { useLlmProviders } from '@/lib/llm-providers/useLlmProviders'
import { useMcpServers } from '@/lib/mcp/mcpServerStorage'
import {
  DEFAULT_NOVACLAW_CONFIG,
  useNovaClawConfig,
} from '@/lib/nanoclaw/storage'

const PRESETS = [
  {
    id: 'conservative',
    label: 'Conservative',
    description: 'Safer, fewer workers, less parallelism',
    config: {
      ...DEFAULT_NOVACLAW_CONFIG,
      brainBackend: 'nanoclaw' as const,
      safetyBackend: 'ironclaw' as const,
      swarmMaxAgents: 3,
    },
  },
  {
    id: 'balanced',
    label: 'Balanced',
    description: 'Recommended default for most users',
    config: {
      ...DEFAULT_NOVACLAW_CONFIG,
      brainBackend: 'nanoclaw' as const,
      safetyBackend: 'ironclaw' as const,
      swarmMaxAgents: 5,
    },
  },
  {
    id: 'aggressive',
    label: 'Aggressive',
    description: 'More workers, less safety friction',
    config: {
      ...DEFAULT_NOVACLAW_CONFIG,
      brainBackend: 'nanoclaw' as const,
      safetyBackend: 'native' as const,
      swarmMaxAgents: 8,
    },
  },
]

export const NovaClawPage: FC = () => {
  const { config, setConfig, updateConfig } = useNovaClawConfig()
  const { providers: llmProviders } = useLlmProviders()
  const { servers } = useMcpServers()
  const { data: userIntegrations } = useGetUserMCPIntegrations()
  const managedServers = servers.filter((server) => server.type === 'managed')
  const customServers = servers.filter((server) => server.type === 'custom')
  const executionProvider =
    llmProviders.find((provider) => provider.id === config.executionProviderId) ??
    null
  const authenticatedManagedCount =
    userIntegrations?.integrations?.filter((integration) =>
      managedServers.some(
        (server) =>
          server.managedServerName === integration.name &&
          integration.is_authenticated,
      ),
    ).length ?? 0

  return (
    <div className="fade-in slide-in-from-bottom-5 animate-in space-y-6 duration-500">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-orange)]/10">
            <Brain className="h-6 w-6 text-[var(--accent-orange)]" />
          </div>
          <div className="flex-1">
            <h2 className="mb-1 font-semibold text-xl">NovaClaw</h2>
            <p className="text-muted-foreground text-sm">
              Configure the runtime used by NovaClaw mode. Manage NanoClaw
              orchestration, browser access, and chat/tool integrations without
              coupling them to the main chat UI.
            </p>
          </div>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="space-y-6 p-6">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <h3 className="font-medium text-sm">Effective NovaClaw Runtime</h3>
            <p className="mt-2 text-muted-foreground text-sm leading-6">
              NovaClaw mode currently uses:
              <span className="mx-1 font-medium text-foreground">
                {config.brainBackend}
              </span>
              for orchestration,
              <span className="mx-1 font-medium text-foreground">
                {config.safetyBackend}
              </span>
              for safety, and
              <span className="mx-1 font-medium text-foreground">
                {config.swarmMaxAgents}
              </span>
              worker slots inside {PRODUCT_NAME}.
            </p>
            <p className="mt-2 text-muted-foreground text-sm leading-6">
              Browser access is currently
              <span className="mx-1 font-medium text-foreground">
                {config.browserUsePolicy}
              </span>
              and tool routing is
              <span className="mx-1 font-medium text-foreground">
                {config.toolRouting}
              </span>
              . Execution model is
              <span className="mx-1 font-medium text-foreground">
                {executionProvider?.name ?? 'current chat model'}
              </span>
              .
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="font-medium text-sm">Presets</h3>
              <p className="mt-1 text-muted-foreground text-xs">
                Apply a recommended NovaClaw profile in one click.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setConfig(preset.config)}
                  className="rounded-xl border border-border bg-background p-4 text-left transition-colors hover:border-[var(--accent-orange)]/40 hover:bg-[var(--accent-orange)]/5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">{preset.label}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="pointer-events-none h-7 px-2 text-xs"
                    >
                      Apply
                    </Button>
                  </div>
                  <p className="mt-2 text-muted-foreground text-xs leading-5">
                    {preset.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-[var(--accent-orange)]" />
              <Label>Brain Backend</Label>
            </div>
            <Select
              value={config.brainBackend}
              onValueChange={(value) =>
                updateConfig({
                  brainBackend: value as 'native' | 'nanoclaw',
                })
              }
            >
              <SelectTrigger className="max-w-sm">
                <SelectValue placeholder="Select brain backend" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nanoclaw">NanoClaw</SelectItem>
                <SelectItem value="native">Native</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              NanoClaw runs an orchestrator with isolated workers. Native uses
              the standard {PRODUCT_NAME} tool loop directly.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[var(--accent-orange)]" />
              <Label>Safety Backend</Label>
            </div>
            <Select
              value={config.safetyBackend}
              onValueChange={(value) =>
                updateConfig({
                  safetyBackend: value as 'native' | 'ironclaw',
                })
              }
            >
              <SelectTrigger className="max-w-sm">
                <SelectValue placeholder="Select safety backend" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ironclaw">IronClaw</SelectItem>
                <SelectItem value="native">Native</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              IronClaw applies a stricter tool policy for secrets, destructive
              actions, and shell-style capabilities.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[var(--accent-orange)]" />
              <Label htmlFor="swarm-max-agents">Max Worker Slots</Label>
            </div>
            <Input
              id="swarm-max-agents"
              type="number"
              min={1}
              max={8}
              value={config.swarmMaxAgents}
              onChange={(event) => {
                const parsed = Number.parseInt(event.target.value, 10)
                const value = Number.isNaN(parsed)
                  ? 1
                  : Math.max(1, Math.min(8, parsed))
                updateConfig({ swarmMaxAgents: value })
              }}
              className="max-w-sm"
            />
            <p className="text-muted-foreground text-xs">
              Recommended range is 3-5. Higher values increase parallelism but
              also increase contention and browser load.
            </p>
          </div>

          <div className="space-y-4 border-border/60 border-t pt-6">
            <div className="flex items-center gap-2">
              <Workflow className="h-4 w-4 text-[var(--accent-orange)]" />
              <h3 className="font-medium text-sm">Browser Access</h3>
            </div>

            <div className="space-y-2">
              <Label>Browser Use Policy</Label>
              <Select
                value={config.browserUsePolicy}
                onValueChange={(value) =>
                  updateConfig({
                    browserUsePolicy: value as 'on-demand' | 'prefer-browser',
                  })
                }
              >
                <SelectTrigger className="max-w-sm">
                  <SelectValue placeholder="Select browser usage policy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on-demand">On-demand browser use</SelectItem>
                  <SelectItem value="prefer-browser">
                    Prefer browser interaction
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                On-demand keeps NovaClaw local-first. Prefer-browser biases
                toward BrowserOS MCP when web interaction could help.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Capability Routing</Label>
              <Select
                value={config.toolRouting}
                onValueChange={(value) =>
                  updateConfig({
                    toolRouting: value as 'local-first' | 'hybrid' | 'mcp-first',
                  })
                }
              >
                <SelectTrigger className="max-w-sm">
                  <SelectValue placeholder="Select tool routing policy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local-first">Local-first</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="mcp-first">MCP-first</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                This controls whether NovaClaw should favor local execution,
                balance both paths, or prefer BrowserOS MCP and connected tools.
              </p>
            </div>
          </div>

          <div className="space-y-4 border-border/60 border-t pt-6">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-[var(--accent-orange)]" />
              <h3 className="font-medium text-sm">Chat Tool Integrations</h3>
            </div>

            <div className="space-y-2">
              <Label>Execution Model</Label>
              <Select
                value={config.executionProviderId || '__current__'}
                onValueChange={(value) =>
                  updateConfig({
                    executionProviderId:
                      value === '__current__' ? undefined : value,
                  })
                }
              >
                <SelectTrigger className="max-w-sm">
                  <SelectValue placeholder="Select execution model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__current__">
                    Use current chat model
                  </SelectItem>
                  {llmProviders.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name} · {provider.modelId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                NovaClaw can inherit the current chat model or use a dedicated
                execution model for NanoClaw planning and workers.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="font-medium text-sm">Managed App Integrations</div>
                <p className="mt-1 text-muted-foreground text-xs leading-5">
                  Authenticated chat/app plugins connected through BrowserOS
                  managed MCP.
                </p>
                <div className="mt-3 text-foreground text-sm">
                  {authenticatedManagedCount} connected / {managedServers.length} configured
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Allow managed apps</Label>
                    <p className="text-muted-foreground text-xs">
                      Let NovaClaw call connected apps when useful
                    </p>
                  </div>
                  <Switch
                    checked={config.allowManagedApps}
                    onCheckedChange={(checked) =>
                      updateConfig({ allowManagedApps: checked })
                    }
                  />
                </div>
                {managedServers.length > 0 ? (
                  <div className="mt-4 space-y-2 border-border/50 border-t pt-3">
                    {managedServers.map((server) => {
                      const name = server.managedServerName ?? server.displayName
                      const checked =
                        config.allowManagedApps &&
                        !config.disabledManagedServerNames.includes(name)
                      const authenticated =
                        userIntegrations?.integrations?.some(
                          (integration) =>
                            integration.name === server.managedServerName &&
                            integration.is_authenticated,
                        ) ?? false

                      return (
                        <label
                          key={server.id}
                          className="flex items-start gap-3 rounded-lg border border-border/50 bg-background px-3 py-2"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(nextChecked) => {
                              const disabled = new Set(
                                config.disabledManagedServerNames,
                              )
                              if (nextChecked) disabled.delete(name)
                              else disabled.add(name)
                              updateConfig({
                                disabledManagedServerNames: [...disabled],
                              })
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm">{name}</div>
                            <div className="text-muted-foreground text-xs">
                              {authenticated ? 'Authenticated' : 'Configured'}
                            </div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                ) : null}
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="font-medium text-sm">Custom MCP Servers</div>
                <p className="mt-1 text-muted-foreground text-xs leading-5">
                  External chat bridges, custom tools, and self-hosted plugins.
                </p>
                <div className="mt-3 text-foreground text-sm">
                  {customServers.length} configured
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Allow custom MCP</Label>
                    <p className="text-muted-foreground text-xs">
                      Let NovaClaw route tasks through custom MCP servers
                    </p>
                  </div>
                  <Switch
                    checked={config.allowCustomMcp}
                    onCheckedChange={(checked) =>
                      updateConfig({ allowCustomMcp: checked })
                    }
                  />
                </div>
                {customServers.length > 0 ? (
                  <div className="mt-4 space-y-2 border-border/50 border-t pt-3">
                    {customServers.map((server) => {
                      const name = server.displayName
                      const checked =
                        config.allowCustomMcp &&
                        !config.disabledCustomServerNames.includes(name)

                      return (
                        <label
                          key={server.id}
                          className="flex items-start gap-3 rounded-lg border border-border/50 bg-background px-3 py-2"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(nextChecked) => {
                              const disabled = new Set(
                                config.disabledCustomServerNames,
                              )
                              if (nextChecked) disabled.delete(name)
                              else disabled.add(name)
                              updateConfig({
                                disabledCustomServerNames: [...disabled],
                              })
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm">{name}</div>
                            <div className="truncate text-muted-foreground text-xs">
                              {server.config?.url ?? 'No URL configured'}
                            </div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/connect-apps">Manage Connected Apps</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/settings/mcp">Open MCP Settings</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export { NovaClawPage as NanoClawPage }
