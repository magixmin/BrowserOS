import {
  Bot,
  GlobeLock,
  Plus,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserRound,
  Workflow,
} from 'lucide-react'
import type { FC } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { resolveBrowserOpsRouteDecision } from '@/lib/browser-ops/scheduler'
import {
  createProfileDraft,
  createProxyDraft,
  createTaskDraft,
  useBrowserOpsWorkspace,
} from '@/lib/browser-ops/workspace'
import {
  getCountryPreset,
  getPlatformLabel,
  getProxySourceLabel,
  getTaskTypeLabel,
} from '@/lib/browser-ops/types'

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function isFingerprintAligned(countryCode: string, timezone: string, language: string) {
  const preset = getCountryPreset(countryCode)
  return preset.timezone === timezone && preset.language === language
}

export const BrowserOpsPage: FC = () => {
  const {
    workspace,
    updateSettings,
    addProfile,
    updateProfile,
    removeProfile,
    addProxy,
    toggleProxyStatus,
    removeProxy,
    addTask,
    removeTask,
  } = useBrowserOpsWorkspace()
  const [selectedProfileId, setSelectedProfileId] = useState<string>('')
  const [selectedTaskId, setSelectedTaskId] = useState<string>('')

  useEffect(() => {
    if (!workspace.profiles.length) {
      setSelectedProfileId('')
      return
    }

    if (!workspace.profiles.some((profile) => profile.id === selectedProfileId)) {
      setSelectedProfileId(workspace.profiles[0]?.id ?? '')
    }
  }, [workspace.profiles, selectedProfileId])

  useEffect(() => {
    if (!workspace.tasks.length) {
      setSelectedTaskId('')
      return
    }

    if (!workspace.tasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(workspace.tasks[0]?.id ?? '')
    }
  }, [workspace.tasks, selectedTaskId])

  const selectedProfile = useMemo(
    () =>
      workspace.profiles.find((profile) => profile.id === selectedProfileId) ??
      null,
    [workspace.profiles, selectedProfileId],
  )

  const selectedTask = useMemo(
    () => workspace.tasks.find((task) => task.id === selectedTaskId) ?? null,
    [workspace.tasks, selectedTaskId],
  )

  const routeDecision = useMemo(() => {
    if (!selectedProfile || !selectedTask) return null
    return resolveBrowserOpsRouteDecision(selectedProfile, selectedTask, workspace)
  }, [selectedProfile, selectedTask, workspace])

  const healthyProxyCount = workspace.proxies.filter(
    (proxy) => proxy.status === 'active' && proxy.health.successRate >= 0.9,
  ).length

  return (
    <div className="fade-in slide-in-from-bottom-5 animate-in space-y-6 duration-500">
      <Card className="overflow-hidden border-border shadow-sm">
        <CardHeader className="gap-4 border-b bg-gradient-to-r from-[var(--accent-orange)]/10 via-background to-background">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent-orange)]/15">
                  <GlobeLock className="h-5 w-5 text-[var(--accent-orange)]" />
                </div>
                <div>
                  <CardTitle className="text-xl">AI Browser Ops</CardTitle>
                  <CardDescription>
                    Multi-account environments, AI IP scheduling, and task-ready
                    browser routing inside BrowserOS.
                  </CardDescription>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Profile isolation roadmap</Badge>
                <Badge variant="outline">AI proxy routing</Badge>
                <Badge variant="outline">Task templates</Badge>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  const profile = createProfileDraft('tiktok')
                  await addProfile(profile)
                  setSelectedProfileId(profile.id)
                  toast.success('Added TikTok profile draft')
                }}
              >
                <Plus />
                Add Profile
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  await addProxy(createProxyDraft('bring-your-own'))
                  toast.success('Added custom proxy slot')
                }}
              >
                <Plus />
                Add Proxy
              </Button>
              <Button
                onClick={async () => {
                  const task = createTaskDraft('amazon')
                  await addTask(task)
                  setSelectedTaskId(task.id)
                  toast.success('Added task template')
                }}
              >
                <Workflow />
                Add Task
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-4 py-6 md:grid-cols-4">
          <StatCard
            icon={UserRound}
            label="Profiles"
            value={workspace.profiles.length.toString()}
            detail="Isolated account environments"
          />
          <StatCard
            icon={GlobeLock}
            label="Proxy Pool"
            value={`${workspace.proxies.length}`}
            detail={`${healthyProxyCount} healthy active routes`}
          />
          <StatCard
            icon={Workflow}
            label="Tasks"
            value={workspace.tasks.length.toString()}
            detail="Reusable browser operations"
          />
          <StatCard
            icon={Bot}
            label="Auto Routing"
            value={workspace.settings.autoRouteIp ? 'On' : 'Off'}
            detail={
              workspace.settings.autoAlignFingerprint
                ? 'Fingerprint alignment enabled'
                : 'Fingerprint alignment disabled'
            }
          />
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Workspace Policies</CardTitle>
          <CardDescription>
            These switches define how the scheduler evaluates routes before a
            task launches.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <PolicyToggle
            title="Auto-route IP"
            description="Let the scheduler choose the best proxy route for each task."
            checked={workspace.settings.autoRouteIp}
            onCheckedChange={(checked) => updateSettings({ autoRouteIp: checked })}
          />
          <PolicyToggle
            title="Align fingerprint"
            description="Auto-sync timezone and language with the selected market."
            checked={workspace.settings.autoAlignFingerprint}
            onCheckedChange={(checked) =>
              updateSettings({ autoAlignFingerprint: checked })
            }
          />
          <PolicyToggle
            title="Allow BYO proxies"
            description="Permit customer-supplied proxies to participate in routing."
            checked={workspace.settings.allowBringYourOwnProxy}
            onCheckedChange={(checked) =>
              updateSettings({ allowBringYourOwnProxy: checked })
            }
          />
          <PolicyToggle
            title="Use built-in pool"
            description="Allow managed and trial pools maintained inside the product."
            checked={workspace.settings.useBuiltInProxyPool}
            onCheckedChange={(checked) =>
              updateSettings({ useBuiltInProxyPool: checked })
            }
          />
          <PolicyToggle
            title="Quality guard"
            description="Prefer low-ban, high-success routes and warn on weak proxy health."
            checked={workspace.settings.enforceQualityGuard}
            onCheckedChange={(checked) =>
              updateSettings({ enforceQualityGuard: checked })
            }
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Profiles</CardTitle>
            <CardDescription>
              Each profile represents one account environment with its own
              fingerprint, cookie vault key, and routing policy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {workspace.profiles.map((profile) => {
              const fingerprintAligned = isFingerprintAligned(
                profile.marketCountry,
                profile.fingerprint.timezone,
                profile.fingerprint.language,
              )

              return (
                <div
                  key={profile.id}
                  className="space-y-3 rounded-xl border border-border/70 bg-background p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium text-sm">{profile.name}</div>
                        <Badge variant="outline">
                          {getPlatformLabel(profile.platform)}
                        </Badge>
                        <Badge variant="outline">{profile.marketCountry}</Badge>
                        <Badge variant="outline">{formatStatus(profile.status)}</Badge>
                        <Badge variant="outline">
                          {profile.proxyMode === 'auto' ? 'Auto IP' : 'Manual IP'}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {profile.accountLabel} • {profile.sessionPartition}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {profile.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateProfile(profile.id, {
                            proxyMode:
                              profile.proxyMode === 'auto' ? 'manual' : 'auto',
                            manualProxyId:
                              profile.proxyMode === 'auto'
                                ? workspace.proxies.find((proxy) => proxy.status === 'active')?.id
                                : undefined,
                          })
                        }
                      >
                        <RefreshCcw />
                        Toggle IP Mode
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          removeProfile(profile.id)
                          toast.success('Profile removed')
                        }}
                      >
                        <Trash2 />
                        Remove
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <MiniInfo
                      label="Preferred IP Types"
                      value={profile.preferredIpTypes.join(' / ')}
                    />
                    <MiniInfo
                      label="Timezone"
                      value={profile.fingerprint.timezone}
                    />
                    <MiniInfo
                      label="Language"
                      value={profile.fingerprint.language}
                    />
                  </div>

                  <div
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      fingerprintAligned
                        ? 'border-emerald-200 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300'
                        : 'border-amber-200 bg-amber-50/70 text-amber-700 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300'
                    }`}
                  >
                    {fingerprintAligned ? (
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        Fingerprint aligns with market {profile.marketCountry}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4" />
                        Fingerprint needs alignment for market {profile.marketCountry}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Proxy Pool</CardTitle>
            <CardDescription>
              Managed pools, user-supplied IPs, and trial routes all participate
              in the same scheduler.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {workspace.proxies.map((proxy) => (
              <div
                key={proxy.id}
                className="space-y-3 rounded-xl border border-border/70 bg-background p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium text-sm">{proxy.name}</div>
                      <Badge variant="outline">
                        {getProxySourceLabel(proxy.sourceType)}
                      </Badge>
                      <Badge variant="outline">{proxy.ipType}</Badge>
                      <Badge variant="outline">{proxy.sessionMode}</Badge>
                      <Badge variant="outline">{formatStatus(proxy.status)}</Badge>
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {proxy.providerName} • {proxy.endpoint}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleProxyStatus(proxy.id)}
                    >
                      {proxy.status === 'active' ? 'Pause' : 'Resume'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        removeProxy(proxy.id)
                        toast.success('Proxy removed')
                      }}
                    >
                      <Trash2 />
                      Remove
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <MiniInfo
                    label="Countries"
                    value={proxy.countries.join(', ')}
                  />
                  <MiniInfo
                    label="Success / Ban"
                    value={`${formatPercent(proxy.health.successRate)} / ${formatPercent(proxy.health.banRate)}`}
                  />
                  <MiniInfo
                    label="Latency"
                    value={`${proxy.health.latencyMs} ms`}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Task Templates</CardTitle>
          <CardDescription>
            Task templates define the target platform, risk profile, routing
            mode, and the eventual Skill binding.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {workspace.tasks.map((task) => (
            <div
              key={task.id}
              className="space-y-3 rounded-xl border border-border/70 bg-background p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-medium text-sm">{task.name}</div>
                  <div className="text-muted-foreground text-sm">
                    {task.goal}
                  </div>
                </div>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => {
                    removeTask(task.id)
                    toast.success('Task removed')
                  }}
                >
                  <Trash2 />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{getPlatformLabel(task.platform)}</Badge>
                <Badge variant="outline">{getTaskTypeLabel(task.taskType)}</Badge>
                <Badge variant="outline">
                  {task.rotateIpOnEachRun ? 'Rotate' : 'Sticky'}
                </Badge>
                <Badge variant="outline">{task.humanizationLevel}</Badge>
              </div>

              <div className="grid gap-3">
                <MiniInfo
                  label="Skill"
                  value={task.skillKey}
                />
                <MiniInfo
                  label="Country"
                  value={task.targetCountry ?? 'Auto'}
                />
                <MiniInfo
                  label="IP Types"
                  value={task.requiredIpTypes.join(' / ')}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>AI Route Preview</CardTitle>
          <CardDescription>
            This is the MVP scheduler. It resolves the best route, recommended
            fingerprint, and execution posture before the browser launches.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="font-medium text-sm">Profile</div>
              <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a profile" />
                </SelectTrigger>
                <SelectContent>
                  {workspace.profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="font-medium text-sm">Task</div>
              <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a task" />
                </SelectTrigger>
                <SelectContent>
                  {workspace.tasks.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {routeDecision ? (
            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-4 rounded-xl border border-border/70 bg-background p-4">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-[var(--accent-orange)]" />
                  <div className="font-medium text-sm">Decision Summary</div>
                </div>

                <MiniInfo label="Mode" value={routeDecision.mode} />
                <MiniInfo
                  label="Target Country"
                  value={routeDecision.targetCountry}
                />
                <MiniInfo
                  label="Rotation Strategy"
                  value={routeDecision.rotationStrategy}
                />
                <MiniInfo
                  label="Humanization"
                  value={routeDecision.humanizationLevel}
                />
                <MiniInfo label="Score" value={routeDecision.score.toString()} />
                <MiniInfo
                  label="Selected Proxy"
                  value={
                    routeDecision.selectedProxy
                      ? `${routeDecision.selectedProxy.name} (${routeDecision.selectedProxy.ipType})`
                      : 'No route selected'
                  }
                />
              </div>

              <div className="space-y-4 rounded-xl border border-border/70 bg-background p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <MiniInfo
                    label="Recommended Timezone"
                    value={routeDecision.recommendedFingerprint.timezone}
                  />
                  <MiniInfo
                    label="Recommended Language"
                    value={routeDecision.recommendedFingerprint.language}
                  />
                  <MiniInfo
                    label="Recommended Locale"
                    value={routeDecision.recommendedFingerprint.locale}
                  />
                  <MiniInfo
                    label="UA Preset"
                    value={routeDecision.recommendedFingerprint.userAgentPreset}
                  />
                </div>

                <div className="space-y-2">
                  <div className="font-medium text-sm">Why this route</div>
                  <div className="space-y-2">
                    {routeDecision.reasons.map((reason) => (
                      <div
                        key={reason}
                        className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300"
                      >
                        {reason}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-medium text-sm">Warnings</div>
                  {routeDecision.warnings.length ? (
                    <div className="space-y-2">
                      {routeDecision.warnings.map((warning) => (
                        <div
                          key={warning}
                          className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300"
                        >
                          {warning}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300">
                      No alignment or routing warnings for this plan.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-muted-foreground text-sm">
              Add at least one profile and one task template to preview route
              decisions.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

const StatCard: FC<{
  icon: typeof UserRound
  label: string
  value: string
  detail: string
}> = ({ icon: Icon, label, value, detail }) => {
  return (
    <div className="rounded-xl border border-border/70 bg-background p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-muted-foreground text-xs uppercase tracking-wide">
            {label}
          </div>
          <div className="font-semibold text-2xl">{value}</div>
        </div>
      </div>
      <div className="mt-3 text-muted-foreground text-sm">{detail}</div>
    </div>
  )
}

const PolicyToggle: FC<{
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}> = ({ title, description, checked, onCheckedChange }) => {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-background p-4">
      <div className="space-y-1">
        <div className="font-medium text-sm">{title}</div>
        <div className="text-muted-foreground text-sm">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

const MiniInfo: FC<{ label: string; value: string }> = ({ label, value }) => {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
      <div className="text-muted-foreground text-xs uppercase tracking-wide">
        {label}
      </div>
      <div className="mt-1 font-medium text-sm">{value}</div>
    </div>
  )
}
