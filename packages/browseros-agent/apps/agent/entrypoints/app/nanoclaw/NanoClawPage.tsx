import type { FC } from 'react'
import { Brain, Shield, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PRODUCT_NAME } from '@/lib/constants/product'
import { useNovaClawConfig } from '@/lib/nanoclaw/storage'

const PRESETS = [
  {
    id: 'conservative',
    label: 'Conservative',
    description: 'Safer, fewer workers, less parallelism',
    config: {
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
      brainBackend: 'nanoclaw' as const,
      safetyBackend: 'native' as const,
      swarmMaxAgents: 8,
    },
  },
]

export const NovaClawPage: FC = () => {
  const { config, setConfig, updateConfig } = useNovaClawConfig()

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
              orchestration, IronClaw safety policy, and parallel worker limits
              without coupling them to the main chat UI.
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
        </CardContent>
      </Card>
    </div>
  )
}

export { NovaClawPage as NanoClawPage }
