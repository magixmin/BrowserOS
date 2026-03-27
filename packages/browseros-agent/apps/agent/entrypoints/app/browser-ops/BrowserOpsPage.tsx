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
import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { Input } from '@/components/ui/input'
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
  createBrowserOSAction,
} from '@/lib/chat-actions/types'
import {
  assessBrowserOpsProxyHealth,
  type BrowserOpsControllerWindowOwnership,
  type BrowserOpsAutomationChatDraft,
  type BrowserOpsCookieVaultSummary,
  type BrowserOpsInstanceDiagnostics,
  type BrowserOpsInstanceEvent,
  type BrowserOpsLaunchBundle,
  type BrowserOpsLaunchDiagnostics,
  type BrowserOpsLaunchExecution,
  type BrowserOpsManagedInstance,
  type BrowserOpsPreviewResult,
  type BrowserOpsProviderCatalogEntry,
  type BrowserOpsProxyVerification,
  type BrowserOpsRouteAllocation,
  type BrowserOpsAutomationBrief,
  type BrowserOpsRuntimeAssetManifest,
  type BrowserOpsRuntimeBinding,
  type BrowserOpsRuntimeDiagnostics,
  type BrowserOpsRuntimeSessionSpec,
  type BrowserOpsSkillResolution,
  getCountryPreset,
  getPlatformLabel,
  getProxySourceLabel,
  getTaskTypeLabel,
} from '@/lib/browser-ops/types'
import { openSidePanelWithSearch } from '@/lib/messaging/sidepanel/openSidepanelWithSearch'
import {
  createProfileDraft,
  createProxyDraft,
  createTaskDraft,
  useBrowserOpsWorkspace,
} from '@/lib/browser-ops/workspace'
import { useRpcClient } from '@/lib/rpc/RpcClientProvider'

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function isFingerprintAligned(
  countryCode: string,
  timezone: string,
  language: string,
) {
  const preset = getCountryPreset(countryCode)
  return preset.timezone === timezone && preset.language === language
}

function getDefaultTaskLaunchUrl(taskId: string): string {
  if (taskId.includes('tiktok')) return 'https://www.tiktok.com/upload'
  if (taskId.includes('amazon')) return 'https://sellercentral.amazon.com'
  if (taskId.includes('walmart')) return 'https://www.walmart.com'
  return 'about:blank'
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
  const rpcClient = useRpcClient()
  const [selectedProfileId, setSelectedProfileId] = useState<string>('')
  const [selectedTaskId, setSelectedTaskId] = useState<string>('')
  const [serverPreview, setServerPreview] =
    useState<BrowserOpsPreviewResult | null>(null)
  const [automationBrief, setAutomationBrief] =
    useState<BrowserOpsAutomationBrief | null>(null)
  const [automationBriefError, setAutomationBriefError] = useState<
    string | null
  >(null)
  const [skillResolution, setSkillResolution] =
    useState<BrowserOpsSkillResolution | null>(null)
  const [skillResolutionError, setSkillResolutionError] = useState<
    string | null
  >(null)
  const [serverPreviewPending, setServerPreviewPending] = useState(false)
  const [serverPreviewError, setServerPreviewError] = useState<string | null>(
    null,
  )
  const [providerCatalog, setProviderCatalog] = useState<
    BrowserOpsProviderCatalogEntry[]
  >([])
  const [providerCatalogError, setProviderCatalogError] = useState<
    string | null
  >(null)
  const [byoProxyInput, setByoProxyInput] = useState('')
  const [allocations, setAllocations] = useState<BrowserOpsRouteAllocation[]>(
    [],
  )
  const [runtimeBindings, setRuntimeBindings] = useState<
    BrowserOpsRuntimeBinding[]
  >([])
  const [runtimeSessionSpecs, setRuntimeSessionSpecs] = useState<
    BrowserOpsRuntimeSessionSpec[]
  >([])
  const [runtimeAssets, setRuntimeAssets] = useState<
    BrowserOpsRuntimeAssetManifest[]
  >([])
  const [cookieVaults, setCookieVaults] = useState<
    BrowserOpsCookieVaultSummary[]
  >([])
  const [launchBundles, setLaunchBundles] = useState<BrowserOpsLaunchBundle[]>(
    [],
  )
  const [launchExecutions, setLaunchExecutions] = useState<
    BrowserOpsLaunchExecution[]
  >([])
  const [launchDiagnostics, setLaunchDiagnostics] =
    useState<BrowserOpsLaunchDiagnostics | null>(null)
  const [managedInstances, setManagedInstances] = useState<
    BrowserOpsManagedInstance[]
  >([])
  const [instanceDiagnostics, setInstanceDiagnostics] =
    useState<BrowserOpsInstanceDiagnostics | null>(null)
  const [instanceEvents, setInstanceEvents] = useState<BrowserOpsInstanceEvent[]>(
    [],
  )
  const [instanceProxyChecks, setInstanceProxyChecks] = useState<
    Record<string, BrowserOpsProxyVerification>
  >({})
  const [windowOwnership, setWindowOwnership] = useState<
    BrowserOpsControllerWindowOwnership[]
  >([])
  const [runtimeDiagnostics, setRuntimeDiagnostics] =
    useState<BrowserOpsRuntimeDiagnostics | null>(null)
  const [reconcileResult, setReconcileResult] = useState<{
    disposedContextIds: string[]
    recreatedContexts: Array<{
      specId: string
      browserContextId: string
      restoredCookies: number
    }>
  } | null>(null)
  const [allocationPending, setAllocationPending] = useState(false)
  const [allocationError, setAllocationError] = useState<string | null>(null)
  const [bindingPending, setBindingPending] = useState(false)
  const [bindingError, setBindingError] = useState<string | null>(null)
  const [automationRunPending, setAutomationRunPending] = useState(false)

  useEffect(() => {
    if (!workspace.profiles.length) {
      setSelectedProfileId('')
      return
    }

    if (
      !workspace.profiles.some((profile) => profile.id === selectedProfileId)
    ) {
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

  const localRouteDecision = useMemo(() => {
    if (!selectedProfile || !selectedTask) return null
    return resolveBrowserOpsRouteDecision({
      profile: selectedProfile,
      task: selectedTask,
      proxies: workspace.proxies,
      settings: workspace.settings,
    })
  }, [selectedProfile, selectedTask, workspace.proxies, workspace.settings])
  const routeDecision = serverPreview?.decision ?? localRouteDecision
  const matchedProvider = serverPreview?.matchedProvider ?? null
  const routeResolution = serverPreview?.routeResolution ?? null

  useEffect(() => {
    let cancelled = false

    async function loadSkillResolution() {
      if (!selectedTask) {
        setSkillResolution(null)
        setSkillResolutionError(null)
        return
      }

      try {
        const response = await rpcClient['browser-ops'].skills.resolve.$post({
          json: selectedTask,
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const result = (await response.json()) as {
          resolution: BrowserOpsSkillResolution
        }
        if (!cancelled) {
          setSkillResolution(result.resolution)
          setSkillResolutionError(null)
        }
      } catch (error) {
        if (!cancelled) {
          setSkillResolution(null)
          setSkillResolutionError(
            error instanceof Error
              ? error.message
              : 'Failed to resolve Browser Ops skill',
          )
        }
      }
    }

    void loadSkillResolution()

    return () => {
      cancelled = true
    }
  }, [rpcClient, selectedTask])

  useEffect(() => {
    let cancelled = false

    async function loadAutomationBrief() {
      if (!selectedProfile || !selectedTask) {
        setAutomationBrief(null)
        setAutomationBriefError(null)
        return
      }

      try {
        const response = await rpcClient['browser-ops'].automation.brief.$post({
          json: {
            profile: selectedProfile,
            task: selectedTask,
            proxies: workspace.proxies,
            settings: workspace.settings,
          },
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const result = (await response.json()) as {
          brief: BrowserOpsAutomationBrief
        }
        if (!cancelled) {
          setAutomationBrief(result.brief)
          setAutomationBriefError(null)
        }
      } catch (error) {
        if (!cancelled) {
          setAutomationBrief(null)
          setAutomationBriefError(
            error instanceof Error
              ? error.message
              : 'Failed to build automation brief',
          )
        }
      }
    }

    void loadAutomationBrief()

    return () => {
      cancelled = true
    }
  }, [
    rpcClient,
    selectedProfile,
    selectedTask,
    workspace.proxies,
    workspace.settings,
  ])

  const refreshRuntimeSessionSpecs = useCallback(async () => {
    const response = await rpcClient['browser-ops'].runtime.specs.$get()
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const result = (await response.json()) as {
      specs: BrowserOpsRuntimeSessionSpec[]
    }
    setRuntimeSessionSpecs(result.specs)
  }, [rpcClient])

  const refreshWindowOwnership = useCallback(async () => {
    const response = await rpcClient['browser-ops'].runtime.ownership.$get()
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const result = (await response.json()) as {
      ownership: BrowserOpsControllerWindowOwnership[]
    }
    setWindowOwnership(result.ownership)
  }, [rpcClient])

  const refreshRuntimeDiagnostics = useCallback(async () => {
    const response = await rpcClient['browser-ops'].runtime.diagnostics.$get()
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const result = (await response.json()) as {
      diagnostics: BrowserOpsRuntimeDiagnostics
    }
    setRuntimeDiagnostics(result.diagnostics)
  }, [rpcClient])

  const refreshRuntimeAssets = useCallback(async () => {
    const response = await rpcClient['browser-ops'].runtime.assets.$get()
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const result = (await response.json()) as {
      assets: BrowserOpsRuntimeAssetManifest[]
    }
    setRuntimeAssets(result.assets)
  }, [rpcClient])

  const refreshCookieVaults = useCallback(async () => {
    const response =
      await rpcClient['browser-ops'].runtime['cookie-vaults'].$get()
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const result = (await response.json()) as {
      vaults: BrowserOpsCookieVaultSummary[]
    }
    setCookieVaults(result.vaults)
  }, [rpcClient])

  const refreshLaunchBundles = useCallback(async () => {
    const response =
      await rpcClient['browser-ops'].runtime['launch-bundles'].$get()
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const result = (await response.json()) as {
      bundles: BrowserOpsLaunchBundle[]
    }
    setLaunchBundles(result.bundles)
  }, [rpcClient])

  const refreshLaunchExecutions = useCallback(async () => {
    const response =
      await rpcClient['browser-ops'].runtime['launch-executions'].$get()
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const result = (await response.json()) as {
      executions: BrowserOpsLaunchExecution[]
    }
    setLaunchExecutions(result.executions)
  }, [rpcClient])

  const refreshLaunchDiagnostics = useCallback(async () => {
    const response =
      await rpcClient['browser-ops'].runtime['launch-diagnostics'].$get()
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const result = (await response.json()) as {
      diagnostics: BrowserOpsLaunchDiagnostics
    }
    setLaunchDiagnostics(result.diagnostics)
  }, [rpcClient])

  const refreshManagedInstances = useCallback(async () => {
    const response = await rpcClient['browser-ops'].runtime.instances.$get()
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const result = (await response.json()) as {
      instances: BrowserOpsManagedInstance[]
    }
    setManagedInstances(result.instances)
  }, [rpcClient])

  const refreshInstanceDiagnostics = useCallback(async () => {
    const response =
      await rpcClient['browser-ops'].runtime['instance-diagnostics'].$get()
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const result = (await response.json()) as {
      diagnostics: BrowserOpsInstanceDiagnostics
    }
    setInstanceDiagnostics(result.diagnostics)
  }, [rpcClient])

  const refreshInstanceEvents = useCallback(async () => {
    const response =
      await rpcClient['browser-ops'].runtime['instance-events'].$get()
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const result = (await response.json()) as {
      events: BrowserOpsInstanceEvent[]
    }
    setInstanceEvents(result.events)
  }, [rpcClient])

  const importBringYourOwnProxy = async () => {
    const rawValue = byoProxyInput.trim()
    if (!rawValue) return

    const colonParts = rawValue.split(':')
    const looksLikeUrl = rawValue.includes('://')
    const isValidColonProxy = colonParts.length >= 2

    if (!looksLikeUrl && !isValidColonProxy) {
      toast.error('Expected proxy as host:port:user:pass or URL format')
      return
    }

    const proxyDraft = createProxyDraft('bring-your-own')
    await addProxy({
      ...proxyDraft,
      name: `BYO Proxy ${workspace.proxies.length + 1}`,
      endpoint: rawValue,
      countries: ['US'],
      status: 'active',
    })
    setByoProxyInput('')
    toast.success('Imported bring-your-own proxy')
  }

  useEffect(() => {
    let cancelled = false

    const loadProviderCatalog = async () => {
      try {
        const response = await rpcClient['browser-ops'].providers.$get()
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const result = (await response.json()) as {
          providers: BrowserOpsProviderCatalogEntry[]
        }
        if (!cancelled) {
          setProviderCatalog(result.providers)
          setProviderCatalogError(null)
        }
      } catch (error) {
        if (!cancelled) {
          setProviderCatalog([])
          setProviderCatalogError(
            error instanceof Error ? error.message : 'Failed to load providers',
          )
        }
      }
    }

    loadProviderCatalog()

    return () => {
      cancelled = true
    }
  }, [rpcClient])

  useEffect(() => {
    let cancelled = false

    const loadManagedInstances = async () => {
      try {
        const response = await rpcClient['browser-ops'].runtime.instances.$get()
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const result = (await response.json()) as {
          instances: BrowserOpsManagedInstance[]
        }
        if (!cancelled) {
          setManagedInstances(result.instances)
          setBindingError(null)
        }
      } catch (error) {
        if (!cancelled) {
          setManagedInstances([])
          setBindingError(
            error instanceof Error
              ? error.message
              : 'Failed to load managed instances',
          )
        }
      }
    }

    loadManagedInstances()

    return () => {
      cancelled = true
    }
  }, [rpcClient])

  useEffect(() => {
    let cancelled = false

    const loadInstanceDiagnostics = async () => {
      try {
        const response =
          await rpcClient['browser-ops'].runtime['instance-diagnostics'].$get()
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const result = (await response.json()) as {
          diagnostics: BrowserOpsInstanceDiagnostics
        }
        if (!cancelled) {
          setInstanceDiagnostics(result.diagnostics)
          setBindingError(null)
        }
      } catch (error) {
        if (!cancelled) {
          setInstanceDiagnostics(null)
          setBindingError(
            error instanceof Error
              ? error.message
              : 'Failed to load instance diagnostics',
          )
        }
      }
    }

    loadInstanceDiagnostics()

    return () => {
      cancelled = true
    }
  }, [rpcClient])

  useEffect(() => {
    let cancelled = false

    const loadInstanceEvents = async () => {
      try {
        const response =
          await rpcClient['browser-ops'].runtime['instance-events'].$get()
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const result = (await response.json()) as {
          events: BrowserOpsInstanceEvent[]
        }
        if (!cancelled) {
          setInstanceEvents(result.events)
          setBindingError(null)
        }
      } catch (error) {
        if (!cancelled) {
          setInstanceEvents([])
          setBindingError(
            error instanceof Error
              ? error.message
              : 'Failed to load instance events',
          )
        }
      }
    }

    loadInstanceEvents()

    return () => {
      cancelled = true
    }
  }, [rpcClient])

  useEffect(() => {
    let cancelled = false

    const loadRuntimeAssets = async () => {
      try {
        const response = await rpcClient['browser-ops'].runtime.assets.$get()
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const result = (await response.json()) as {
          assets: BrowserOpsRuntimeAssetManifest[]
        }
        if (!cancelled) {
          setRuntimeAssets(result.assets)
          setBindingError(null)
        }
      } catch (error) {
        if (!cancelled) {
          setRuntimeAssets([])
          setBindingError(
            error instanceof Error
              ? error.message
              : 'Failed to load runtime assets',
          )
        }
      }
    }

    loadRuntimeAssets()

    return () => {
      cancelled = true
    }
  }, [rpcClient])

  useEffect(() => {
    let cancelled = false

    const loadCookieVaults = async () => {
      try {
        const response =
          await rpcClient['browser-ops'].runtime['cookie-vaults'].$get()
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const result = (await response.json()) as {
          vaults: BrowserOpsCookieVaultSummary[]
        }
        if (!cancelled) {
          setCookieVaults(result.vaults)
          setBindingError(null)
        }
      } catch (error) {
        if (!cancelled) {
          setCookieVaults([])
          setBindingError(
            error instanceof Error
              ? error.message
              : 'Failed to load cookie vault summaries',
          )
        }
      }
    }

    loadCookieVaults()

    return () => {
      cancelled = true
    }
  }, [rpcClient])

  useEffect(() => {
    let cancelled = false

    const loadLaunchBundles = async () => {
      try {
        const response =
          await rpcClient['browser-ops'].runtime['launch-bundles'].$get()
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const result = (await response.json()) as {
          bundles: BrowserOpsLaunchBundle[]
        }
        if (!cancelled) {
          setLaunchBundles(result.bundles)
          setBindingError(null)
        }
      } catch (error) {
        if (!cancelled) {
          setLaunchBundles([])
          setBindingError(
            error instanceof Error
              ? error.message
              : 'Failed to load launch bundles',
          )
        }
      }
    }

    loadLaunchBundles()

    return () => {
      cancelled = true
    }
  }, [rpcClient])

  useEffect(() => {
    let cancelled = false

    const loadLaunchExecutions = async () => {
      try {
        const response =
          await rpcClient['browser-ops'].runtime['launch-executions'].$get()
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const result = (await response.json()) as {
          executions: BrowserOpsLaunchExecution[]
        }
        if (!cancelled) {
          setLaunchExecutions(result.executions)
          setBindingError(null)
        }
      } catch (error) {
        if (!cancelled) {
          setLaunchExecutions([])
          setBindingError(
            error instanceof Error
              ? error.message
              : 'Failed to load launch executions',
          )
        }
      }
    }

    loadLaunchExecutions()

    return () => {
      cancelled = true
    }
  }, [rpcClient])

  useEffect(() => {
    let cancelled = false

    const loadLaunchDiagnostics = async () => {
      try {
        const response =
          await rpcClient['browser-ops'].runtime['launch-diagnostics'].$get()
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const result = (await response.json()) as {
          diagnostics: BrowserOpsLaunchDiagnostics
        }
        if (!cancelled) {
          setLaunchDiagnostics(result.diagnostics)
          setBindingError(null)
        }
      } catch (error) {
        if (!cancelled) {
          setLaunchDiagnostics(null)
          setBindingError(
            error instanceof Error
              ? error.message
              : 'Failed to load launch diagnostics',
          )
        }
      }
    }

    loadLaunchDiagnostics()

    return () => {
      cancelled = true
    }
  }, [rpcClient])

  useEffect(() => {
    let cancelled = false

    const loadRuntimeDiagnostics = async () => {
      try {
        const response =
          await rpcClient['browser-ops'].runtime.diagnostics.$get()
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const result = (await response.json()) as {
          diagnostics: BrowserOpsRuntimeDiagnostics
        }
        if (!cancelled) {
          setRuntimeDiagnostics(result.diagnostics)
          setBindingError(null)
        }
      } catch (error) {
        if (!cancelled) {
          setRuntimeDiagnostics(null)
          setBindingError(
            error instanceof Error
              ? error.message
              : 'Failed to load runtime diagnostics',
          )
        }
      }
    }

    loadRuntimeDiagnostics()

    return () => {
      cancelled = true
    }
  }, [rpcClient])

  useEffect(() => {
    let cancelled = false

    const loadAllocations = async () => {
      try {
        const response = await rpcClient['browser-ops'].allocations.$get()
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const result = (await response.json()) as {
          allocations: BrowserOpsRouteAllocation[]
        }
        if (!cancelled) {
          setAllocations(result.allocations)
          setAllocationError(null)
        }
      } catch (error) {
        if (!cancelled) {
          setAllocations([])
          setAllocationError(
            error instanceof Error
              ? error.message
              : 'Failed to load route allocations',
          )
        }
      }
    }

    loadAllocations()

    return () => {
      cancelled = true
    }
  }, [rpcClient])

  useEffect(() => {
    let cancelled = false

    const loadRuntimeSessionSpecs = async () => {
      try {
        const response = await rpcClient['browser-ops'].runtime.specs.$get()
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const result = (await response.json()) as {
          specs: BrowserOpsRuntimeSessionSpec[]
        }
        if (!cancelled) {
          setRuntimeSessionSpecs(result.specs)
          setBindingError(null)
        }
      } catch (error) {
        if (!cancelled) {
          setRuntimeSessionSpecs([])
          setBindingError(
            error instanceof Error
              ? error.message
              : 'Failed to load runtime session specs',
          )
        }
      }
    }

    loadRuntimeSessionSpecs()

    return () => {
      cancelled = true
    }
  }, [rpcClient])

  useEffect(() => {
    let cancelled = false

    const loadWindowOwnership = async () => {
      try {
        const response = await rpcClient['browser-ops'].runtime.ownership.$get()
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const result = (await response.json()) as {
          ownership: BrowserOpsControllerWindowOwnership[]
        }
        if (!cancelled) {
          setWindowOwnership(result.ownership)
          setBindingError(null)
        }
      } catch (error) {
        if (!cancelled) {
          setWindowOwnership([])
          setBindingError(
            error instanceof Error
              ? error.message
              : 'Failed to load controller window ownership',
          )
        }
      }
    }

    loadWindowOwnership()

    return () => {
      cancelled = true
    }
  }, [rpcClient])

  useEffect(() => {
    let cancelled = false

    const loadRuntimeBindings = async () => {
      try {
        const response =
          await rpcClient['browser-ops']['runtime-bindings'].$get()
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const result = (await response.json()) as {
          bindings: BrowserOpsRuntimeBinding[]
        }
        if (!cancelled) {
          setRuntimeBindings(result.bindings)
          setBindingError(null)
        }
      } catch (error) {
        if (!cancelled) {
          setRuntimeBindings([])
          setBindingError(
            error instanceof Error
              ? error.message
              : 'Failed to load runtime bindings',
          )
        }
      }
    }

    loadRuntimeBindings()

    return () => {
      cancelled = true
    }
  }, [rpcClient])

  useEffect(() => {
    if (!selectedProfile || !selectedTask) {
      setServerPreview(null)
      setServerPreviewPending(false)
      setServerPreviewError(null)
      return
    }

    let cancelled = false

    const loadServerPreview = async () => {
      setServerPreviewPending(true)
      setServerPreviewError(null)

      try {
        const response = await rpcClient['browser-ops'].preview.$post({
          json: {
            profile: selectedProfile,
            task: selectedTask,
            proxies: workspace.proxies,
            settings: workspace.settings,
          },
        })

        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const result = (await response.json()) as BrowserOpsPreviewResult

        if (!cancelled) {
          setServerPreview(result)
          if (result.providerCatalog.length > 0) {
            setProviderCatalog(result.providerCatalog)
          }
        }
      } catch (error) {
        if (!cancelled) {
          setServerPreview(null)
          setServerPreviewError(
            error instanceof Error
              ? error.message
              : 'Failed to preview route on local service',
          )
        }
      } finally {
        if (!cancelled) {
          setServerPreviewPending(false)
        }
      }
    }

    loadServerPreview()

    return () => {
      cancelled = true
    }
  }, [
    rpcClient,
    selectedProfile,
    selectedTask,
    workspace.proxies,
    workspace.settings,
  ])

  const healthyProxyCount = workspace.proxies.filter(
    (proxy) => proxy.status === 'active' && proxy.health.successRate >= 0.9,
  ).length

  const allocateSelectedRoute = async () => {
    if (!selectedProfile || !selectedTask) return

    setAllocationPending(true)
    setAllocationError(null)

    try {
      const response = await rpcClient['browser-ops'].allocate.$post({
        json: {
          profile: selectedProfile,
          task: selectedTask,
          proxies: workspace.proxies,
          settings: workspace.settings,
        },
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const result = (await response.json()) as {
        allocation: BrowserOpsRouteAllocation
      }

      setAllocations((current) => [result.allocation, ...current])
      toast.success('Route allocated')
    } catch (error) {
      setAllocationError(
        error instanceof Error ? error.message : 'Failed to allocate route',
      )
      toast.error('Failed to allocate route')
    } finally {
      setAllocationPending(false)
    }
  }

  const releaseAllocation = async (allocationId: string) => {
    setAllocationPending(true)
    setAllocationError(null)

    try {
      const response = await rpcClient['browser-ops'].release.$post({
        json: { allocationId },
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      setAllocations((current) =>
        current.filter(
          (allocation) => allocation.allocationId !== allocationId,
        ),
      )
      setRuntimeBindings((current) =>
        current.filter((binding) => binding.allocationId !== allocationId),
      )
      await refreshRuntimeSessionSpecs()
      await refreshRuntimeAssets()
      await refreshCookieVaults()
      await refreshLaunchBundles()
      await refreshLaunchExecutions()
      await refreshLaunchDiagnostics()
      await refreshManagedInstances()
      await refreshInstanceDiagnostics()
      await refreshWindowOwnership()
      await refreshRuntimeDiagnostics()
      toast.success('Route released')
    } catch (error) {
      setAllocationError(
        error instanceof Error ? error.message : 'Failed to release route',
      )
      toast.error('Failed to release route')
    } finally {
      setAllocationPending(false)
    }
  }

  const openManagedWindow = async (allocation: BrowserOpsRouteAllocation) => {
    setBindingPending(true)
    setBindingError(null)

    try {
      const response = await rpcClient['browser-ops'].runtime[
        'open-managed-window'
      ].$post({
        json: {
          allocationId: allocation.allocationId,
          url: getDefaultTaskLaunchUrl(allocation.taskId),
          hidden: false,
          restoreCookieVault: true,
        },
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const result = (await response.json()) as {
        binding: BrowserOpsRuntimeBinding
      }

      setRuntimeBindings((current) => {
        const filtered = current.filter(
          (binding) =>
            binding.bindingId !== result.binding.bindingId &&
            binding.allocationId !== result.binding.allocationId &&
            binding.windowId !== result.binding.windowId,
        )
        return [result.binding, ...filtered]
      })

      await refreshRuntimeSessionSpecs()
      await refreshRuntimeAssets()
      await refreshCookieVaults()
      await refreshLaunchBundles()
      await refreshLaunchExecutions()
      await refreshLaunchDiagnostics()
      await refreshManagedInstances()
      await refreshInstanceDiagnostics()
      await refreshWindowOwnership()
      await refreshRuntimeDiagnostics()
      toast.success('Managed window opened and bound')
    } catch (error) {
      setBindingError(
        error instanceof Error
          ? error.message
          : 'Failed to open managed window',
      )
      toast.error('Failed to open managed window')
    } finally {
      setBindingPending(false)
    }
  }

  const captureCookieVault = async (bindingId: string) => {
    setBindingPending(true)
    setBindingError(null)

    try {
      const response = await rpcClient['browser-ops'].runtime[
        'cookie-vault'
      ].capture.$post({
        json: { bindingId },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      await refreshCookieVaults()
      toast.success('Captured cookies into vault')
    } catch (error) {
      setBindingError(
        error instanceof Error
          ? error.message
          : 'Failed to capture cookie vault',
      )
      toast.error('Failed to capture cookie vault')
    } finally {
      setBindingPending(false)
    }
  }

  const restoreCookieVault = async (bindingId: string) => {
    setBindingPending(true)
    setBindingError(null)

    try {
      const response = await rpcClient['browser-ops'].runtime[
        'cookie-vault'
      ].restore.$post({
        json: { bindingId },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      toast.success('Restored cookies from vault')
    } catch (error) {
      setBindingError(
        error instanceof Error
          ? error.message
          : 'Failed to restore cookie vault',
      )
      toast.error('Failed to restore cookie vault')
    } finally {
      setBindingPending(false)
    }
  }

  const startAutomationRun = async () => {
    if (!selectedProfile || !selectedTask || !automationBrief) {
      toast.error('Select a profile and task first')
      return
    }

    setAutomationRunPending(true)
    try {
      const response = await rpcClient['browser-ops'].automation['run-draft'].$post({
        json: {
          profile: selectedProfile,
          task: selectedTask,
          proxies: workspace.proxies,
          settings: workspace.settings,
          mode: 'agent',
          forceManagedWindow: true,
          restoreCookieVault: true,
        },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const result = (await response.json()) as {
        brief: BrowserOpsAutomationBrief
        allocation: BrowserOpsRouteAllocation
        binding: BrowserOpsRuntimeBinding
        chatDraft: BrowserOpsAutomationChatDraft
      }

      setAllocations((current) => {
        const filtered = current.filter(
          (allocation) =>
            allocation.allocationId !== result.allocation.allocationId,
        )
        return [result.allocation, ...filtered]
      })
      setRuntimeBindings((current) => {
        const filtered = current.filter(
          (binding) =>
            binding.bindingId !== result.binding.bindingId &&
            binding.allocationId !== result.binding.allocationId,
        )
        return [result.binding, ...filtered]
      })
      setAutomationBrief(result.brief)

      const activeTab = result.chatDraft.browserContext.activeTab
      const action = createBrowserOSAction({
        mode: result.chatDraft.mode,
        message: result.chatDraft.query,
        tabs: activeTab
          ? [
              {
                id: activeTab.id,
                url: activeTab.url,
                title: activeTab.title,
                windowId: result.chatDraft.browserContext.windowId,
              } as chrome.tabs.Tab,
            ]
          : undefined,
        browserContextOverride: result.chatDraft.browserContext,
      })

      openSidePanelWithSearch('open', {
        query: result.chatDraft.query,
        mode: result.chatDraft.mode,
        action,
      })

      await refreshRuntimeSessionSpecs()
      await refreshRuntimeAssets()
      await refreshCookieVaults()
      await refreshLaunchBundles()
      await refreshLaunchExecutions()
      await refreshLaunchDiagnostics()
      await refreshManagedInstances()
      await refreshInstanceDiagnostics()
      await refreshWindowOwnership()
      await refreshRuntimeDiagnostics()

      toast.success('Automation run drafted in sidepanel')
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to start automation run',
      )
    } finally {
      setAutomationRunPending(false)
    }
  }

  const clearCookieVault = async (bindingId: string) => {
    setBindingPending(true)
    setBindingError(null)

    try {
      const response = await rpcClient['browser-ops'].runtime[
        'cookie-vault'
      ].clear.$post({
        json: { bindingId },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      await refreshCookieVaults()
      toast.success('Cleared cookie vault')
    } catch (error) {
      setBindingError(
        error instanceof Error ? error.message : 'Failed to clear cookie vault',
      )
      toast.error('Failed to clear cookie vault')
    } finally {
      setBindingPending(false)
    }
  }

  const reconcileRuntime = async () => {
    setBindingPending(true)
    setBindingError(null)

    try {
      const response = await rpcClient['browser-ops'].runtime.reconcile.$post({
        json: {
          disposeOrphanContexts: true,
          recreateMissingContexts: true,
        },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const result = (await response.json()) as {
        disposedContextIds: string[]
        recreatedContexts: Array<{
          specId: string
          browserContextId: string
          restoredCookies: number
        }>
        diagnostics: BrowserOpsRuntimeDiagnostics
      }

      setReconcileResult({
        disposedContextIds: result.disposedContextIds,
        recreatedContexts: result.recreatedContexts,
      })
      setRuntimeDiagnostics(result.diagnostics)
      await refreshRuntimeSessionSpecs()
      await refreshRuntimeAssets()
      await refreshCookieVaults()
      await refreshLaunchBundles()
      await refreshLaunchExecutions()
      await refreshLaunchDiagnostics()
      await refreshManagedInstances()
      await refreshInstanceDiagnostics()
      toast.success('Runtime reconcile completed')
    } catch (error) {
      setBindingError(
        error instanceof Error ? error.message : 'Failed to reconcile runtime',
      )
      toast.error('Failed to reconcile runtime')
    } finally {
      setBindingPending(false)
    }
  }

  const launchBundle = async (specId: string, execute: boolean) => {
    setBindingPending(true)
    setBindingError(null)

    try {
      const response = await rpcClient['browser-ops'].runtime.launch.$post({
        json: { specId, execute },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      await refreshLaunchExecutions()
      await refreshLaunchDiagnostics()
      await refreshManagedInstances()
      await refreshInstanceDiagnostics()
      await refreshInstanceEvents()
      toast.success(execute ? 'Launch requested' : 'Launch prepared')
    } catch (error) {
      setBindingError(
        error instanceof Error ? error.message : 'Failed to launch bundle',
      )
      toast.error('Failed to launch bundle')
    } finally {
      setBindingPending(false)
    }
  }

  const stopLaunchExecution = async (executionId: string) => {
    setBindingPending(true)
    setBindingError(null)

    try {
      const response = await rpcClient['browser-ops'].runtime.launch.stop.$post(
        {
          json: { executionId },
        },
      )
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      await refreshLaunchExecutions()
      await refreshLaunchDiagnostics()
      await refreshManagedInstances()
      await refreshInstanceDiagnostics()
      await refreshInstanceEvents()
      toast.success('Launch execution updated')
    } catch (error) {
      setBindingError(
        error instanceof Error
          ? error.message
          : 'Failed to stop launch execution',
      )
      toast.error('Failed to stop launch execution')
    } finally {
      setBindingPending(false)
    }
  }

  const reconcileLaunchExecutions = async () => {
    setBindingPending(true)
    setBindingError(null)

    try {
      const response = await rpcClient[
        'browser-ops'
      ].runtime.launch.reconcile.$post({
        json: {
          stopOrphanLaunchedExecutions: true,
        },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      await refreshLaunchExecutions()
      await refreshLaunchDiagnostics()
      await refreshManagedInstances()
      await refreshInstanceDiagnostics()
      await refreshInstanceEvents()
      toast.success('Launch reconcile completed')
    } catch (error) {
      setBindingError(
        error instanceof Error
          ? error.message
          : 'Failed to reconcile launch executions',
      )
      toast.error('Failed to reconcile launch executions')
    } finally {
      setBindingPending(false)
    }
  }

  const refreshManagedInstance = async (instanceId: string) => {
    setBindingPending(true)
    setBindingError(null)

    try {
      const response = await rpcClient[
        'browser-ops'
      ].runtime.instances.refresh.$post({
        json: { instanceId },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      await refreshManagedInstances()
      await refreshInstanceDiagnostics()
      await refreshInstanceEvents()
      toast.success('Managed instance refreshed')
    } catch (error) {
      setBindingError(
        error instanceof Error ? error.message : 'Failed to refresh instance',
      )
      toast.error('Failed to refresh instance')
    } finally {
      setBindingPending(false)
    }
  }

  const reconcileInstances = async () => {
    setBindingPending(true)
    setBindingError(null)

    try {
      const response = await rpcClient[
        'browser-ops'
      ].runtime.instances.reconcile.$post({
        json: {
          stopOrphanInstances: true,
          refreshHealth: true,
        },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      await refreshManagedInstances()
      await refreshInstanceDiagnostics()
      toast.success('Instance reconcile completed')
    } catch (error) {
      setBindingError(
        error instanceof Error
          ? error.message
          : 'Failed to reconcile instances',
      )
      toast.error('Failed to reconcile instances')
    } finally {
      setBindingPending(false)
    }
  }

  const refreshAllInstances = async () => {
    setBindingPending(true)
    setBindingError(null)

    try {
      const response = await rpcClient['browser-ops'].runtime.instances[
        'refresh-all'
      ].$post({
        json: {},
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      await refreshManagedInstances()
      await refreshInstanceDiagnostics()
      await refreshInstanceEvents()
      toast.success('All instances refreshed')
    } catch (error) {
      setBindingError(
        error instanceof Error ? error.message : 'Failed to refresh instances',
      )
      toast.error('Failed to refresh instances')
    } finally {
      setBindingPending(false)
    }
  }

  const restartInstance = async (instanceId: string) => {
    setBindingPending(true)
    setBindingError(null)

    try {
      const response = await rpcClient[
        'browser-ops'
      ].runtime.instances.restart.$post({
        json: {
          instanceId,
          execute: true,
        },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      await refreshLaunchExecutions()
      await refreshManagedInstances()
      await refreshInstanceDiagnostics()
      await refreshInstanceEvents()
      toast.success('Instance restart requested')
    } catch (error) {
      setBindingError(
        error instanceof Error ? error.message : 'Failed to restart instance',
      )
      toast.error('Failed to restart instance')
    } finally {
      setBindingPending(false)
    }
  }

  const hardCleanupInstance = async (instanceId: string) => {
    setBindingPending(true)
    setBindingError(null)

    try {
      const response = await rpcClient['browser-ops'].runtime.instances[
        'hard-cleanup'
      ].$post({
        json: {
          instanceId,
          removeExecution: true,
        },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      await refreshLaunchExecutions()
      await refreshLaunchDiagnostics()
      await refreshManagedInstances()
      await refreshInstanceDiagnostics()
      await refreshInstanceEvents()
      toast.success('Instance hard cleanup completed')
    } catch (error) {
      setBindingError(
        error instanceof Error
          ? error.message
          : 'Failed to hard cleanup instance',
      )
      toast.error('Failed to hard cleanup instance')
    } finally {
      setBindingPending(false)
    }
  }

  const verifyInstanceProxy = async (instanceId: string) => {
    setBindingPending(true)
    setBindingError(null)

    try {
      const response = await rpcClient['browser-ops'].runtime.instances[
        'verify-proxy'
      ].$post({
        json: { instanceId },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const result = (await response.json()) as {
        verification: BrowserOpsProxyVerification
      }
      setInstanceProxyChecks((current) => ({
        ...current,
        [instanceId]: result.verification,
      }))
      await refreshManagedInstances()
      await refreshInstanceEvents()
      toast.success(
        result.verification.detectedIp
          ? `Verified proxy IP ${result.verification.detectedIp}`
          : 'Proxy verification completed',
      )
    } catch (error) {
      setBindingError(
        error instanceof Error
          ? error.message
          : 'Failed to verify instance proxy',
      )
      toast.error('Failed to verify instance proxy')
    } finally {
      setBindingPending(false)
    }
  }

  const bindAllocationToActiveWindow = async (allocationId: string) => {
    setBindingPending(true)
    setBindingError(null)

    try {
      const response = await rpcClient['browser-ops'].runtime[
        'bind-active-window'
      ].$post({
        json: { allocationId },
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const result = (await response.json()) as {
        binding: BrowserOpsRuntimeBinding
      }

      setRuntimeBindings((current) => {
        const filtered = current.filter(
          (binding) =>
            binding.bindingId !== result.binding.bindingId &&
            binding.allocationId !== result.binding.allocationId &&
            binding.windowId !== result.binding.windowId,
        )
        return [result.binding, ...filtered]
      })
      await refreshRuntimeSessionSpecs()
      await refreshRuntimeAssets()
      await refreshCookieVaults()
      await refreshLaunchBundles()
      await refreshLaunchExecutions()
      await refreshLaunchDiagnostics()
      await refreshManagedInstances()
      await refreshInstanceDiagnostics()
      await refreshWindowOwnership()
      await refreshRuntimeDiagnostics()
      toast.success('Bound allocation to active window')
    } catch (error) {
      setBindingError(
        error instanceof Error
          ? error.message
          : 'Failed to bind allocation to active window',
      )
      toast.error('Failed to bind allocation')
    } finally {
      setBindingPending(false)
    }
  }

  const unbindRuntime = async (bindingId: string) => {
    setBindingPending(true)
    setBindingError(null)

    try {
      const response = await rpcClient['browser-ops'].runtime.unbind.$post({
        json: { bindingId },
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      setRuntimeBindings((current) =>
        current.filter((binding) => binding.bindingId !== bindingId),
      )
      await refreshRuntimeSessionSpecs()
      await refreshRuntimeAssets()
      await refreshCookieVaults()
      await refreshLaunchBundles()
      await refreshLaunchExecutions()
      await refreshLaunchDiagnostics()
      await refreshManagedInstances()
      await refreshInstanceDiagnostics()
      await refreshWindowOwnership()
      await refreshRuntimeDiagnostics()
      toast.success('Runtime binding removed')
    } catch (error) {
      setBindingError(
        error instanceof Error ? error.message : 'Failed to unbind runtime',
      )
      toast.error('Failed to remove runtime binding')
    } finally {
      setBindingPending(false)
    }
  }

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
            icon={Bot}
            label="Providers"
            value={providerCatalog.length.toString()}
            detail="Managed vendor adapters and BYO routing"
          />
          <StatCard
            icon={Workflow}
            label="Tasks"
            value={workspace.tasks.length.toString()}
            detail="Reusable browser operations"
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
            onCheckedChange={(checked) =>
              updateSettings({ autoRouteIp: checked })
            }
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
                        <div className="font-medium text-sm">
                          {profile.name}
                        </div>
                        <Badge variant="outline">
                          {getPlatformLabel(profile.platform)}
                        </Badge>
                        <Badge variant="outline">{profile.marketCountry}</Badge>
                        <Badge variant="outline">
                          {formatStatus(profile.status)}
                        </Badge>
                        <Badge variant="outline">
                          {profile.proxyMode === 'auto'
                            ? 'Auto IP'
                            : 'Manual IP'}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {profile.accountLabel} • {profile.sessionPartition}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {profile.tags.map((tag: string) => (
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
                                ? workspace.proxies.find(
                                    (proxy) => proxy.status === 'active',
                                  )?.id
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
                        Fingerprint needs alignment for market{' '}
                        {profile.marketCountry}
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
            <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/10 p-4">
              <div className="font-medium text-sm">Import BYO Proxy</div>
              <div className="text-muted-foreground text-sm">
                Paste `host:port:user:pass` or a full proxy URL to add a
                customer-supplied route.
              </div>
              <div className="flex flex-col gap-2 md:flex-row">
                <Input
                  value={byoProxyInput}
                  onChange={(event) => setByoProxyInput(event.target.value)}
                  placeholder="host:port:user:pass"
                />
                <Button
                  variant="outline"
                  onClick={importBringYourOwnProxy}
                  disabled={!byoProxyInput.trim()}
                >
                  Import
                </Button>
              </div>
            </div>

            {workspace.proxies.map((proxy) => {
              const health = assessBrowserOpsProxyHealth(proxy)

              return (
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
                        <Badge variant="outline">
                          {formatStatus(proxy.status)}
                        </Badge>
                        <Badge variant="outline">
                          {health.tier} • {health.score}
                        </Badge>
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

                  <div className="grid gap-3 md:grid-cols-4">
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
                    <MiniInfo
                      label="Health"
                      value={`${health.tier} (${health.score})`}
                    />
                  </div>
                </div>
              )
            })}
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
                <Badge variant="outline">
                  {getPlatformLabel(task.platform)}
                </Badge>
                <Badge variant="outline">
                  {getTaskTypeLabel(task.taskType)}
                </Badge>
                <Badge variant="outline">
                  {task.rotateIpOnEachRun ? 'Rotate' : 'Sticky'}
                </Badge>
                <Badge variant="outline">{task.humanizationLevel}</Badge>
              </div>

              <div className="grid gap-3">
                <MiniInfo label="Skill" value={task.skillKey} />
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
          <CardTitle>Provider Catalog</CardTitle>
          <CardDescription>
            This comes from the local Browser Ops service layer and defines
            which proxy vendors are recognized by the route allocator.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {providerCatalogError ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-amber-700 text-sm dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
              Failed to load provider catalog: {providerCatalogError}
            </div>
          ) : providerCatalog.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {providerCatalog.map((provider) => (
                <div
                  key={provider.id}
                  className="space-y-3 rounded-xl border border-border/70 bg-background p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium text-sm">{provider.name}</div>
                    <Badge variant="outline">
                      {getProxySourceLabel(provider.sourceType)}
                    </Badge>
                    <Badge variant="outline">{provider.stage}</Badge>
                  </div>

                  <div className="grid gap-3">
                    <MiniInfo
                      label="IP Types"
                      value={provider.supportedIpTypes.join(' / ')}
                    />
                    <MiniInfo
                      label="Session Modes"
                      value={provider.supportedSessionModes.join(' / ')}
                    />
                  </div>

                  <div className="space-y-2">
                    {provider.notes.map((note: string) => (
                      <div
                        key={note}
                        className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm"
                      >
                        {note}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border border-dashed px-4 py-6 text-center text-muted-foreground text-sm">
              Provider catalog is empty.
            </div>
          )}
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
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              Preview engine: {serverPreview ? 'server' : 'local fallback'}
            </Badge>
            {serverPreviewPending ? (
              <Badge variant="outline">Refreshing preview…</Badge>
            ) : null}
            {matchedProvider ? (
              <Badge variant="outline">
                Adapter: {matchedProvider.name} ({matchedProvider.stage})
              </Badge>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              disabled={!selectedProfile || !selectedTask || allocationPending}
              onClick={allocateSelectedRoute}
            >
              Allocate Route
            </Button>
          </div>

          {serverPreviewError ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-amber-700 text-sm dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
              Browser Ops service preview failed: {serverPreviewError}. Using
              local fallback scoring.
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="font-medium text-sm">Profile</div>
              <Select
                value={selectedProfileId}
                onValueChange={setSelectedProfileId}
              >
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
                <MiniInfo
                  label="Score"
                  value={routeDecision.score.toString()}
                />
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

                {routeResolution ? (
                  <div className="space-y-2">
                    <div className="font-medium text-sm">
                      Provider Route Resolution
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <MiniInfo
                        label="Endpoint"
                        value={`${routeResolution.endpointHost}:${routeResolution.endpointPort ?? 'n/a'}`}
                      />
                      <MiniInfo
                        label="Auth Mode"
                        value={routeResolution.authMode}
                      />
                      <MiniInfo
                        label="Masked URL"
                        value={routeResolution.proxyUrlMasked}
                      />
                      <MiniInfo
                        label="Proxy Server Arg"
                        value={routeResolution.proxyServerArg ?? 'n/a'}
                      />
                      <MiniInfo
                        label="Credential Source"
                        value={routeResolution.credentialSource}
                      />
                      <MiniInfo
                        label="Credential Status"
                        value={routeResolution.credentialStatus}
                      />
                      <MiniInfo
                        label="Username Template"
                        value={routeResolution.usernameTemplate ?? 'n/a'}
                      />
                      <MiniInfo
                        label="Password Required"
                        value={routeResolution.passwordRequired ? 'yes' : 'no'}
                      />
                      <MiniInfo
                        label="Session"
                        value={routeResolution.sessionId ?? 'rotate'}
                      />
                    </div>
                    {routeResolution.credentialEnv ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        <MiniInfo
                          label="Username Env"
                          value={routeResolution.credentialEnv.username ?? 'n/a'}
                        />
                        <MiniInfo
                          label="Password Env"
                          value={routeResolution.credentialEnv.password ?? 'n/a'}
                        />
                      </div>
                    ) : null}
                    {routeResolution.missingCredentialEnv.length ? (
                      <div className="space-y-2">
                        {routeResolution.missingCredentialEnv.map(
                          (envName: string) => (
                            <div
                              key={envName}
                              className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-amber-700 text-sm dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300"
                            >
                              Missing credential env: {envName}
                            </div>
                          ),
                        )}
                      </div>
                    ) : null}
                    <div className="space-y-2">
                      {routeResolution.notes.map((note: string) => (
                        <div
                          key={note}
                          className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm"
                        >
                          {note}
                        </div>
                      ))}
                    </div>
                    {routeResolution.warnings.length ? (
                      <div className="space-y-2">
                        {routeResolution.warnings.map((warning: string) => (
                          <div
                            key={warning}
                            className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-amber-700 text-sm dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300"
                          >
                            {warning}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <div className="font-medium text-sm">
                    Automation Skill Resolution
                  </div>
                  {skillResolutionError ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-amber-700 text-sm dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
                      Failed to resolve skill: {skillResolutionError}
                    </div>
                  ) : skillResolution ? (
                    <div className="space-y-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <MiniInfo
                          label="Task Skill Key"
                          value={skillResolution.taskSkillKey}
                        />
                        <MiniInfo
                          label="Match Type"
                          value={skillResolution.matchType}
                        />
                        <MiniInfo
                          label="Resolved Skill"
                          value={skillResolution.resolvedSkillId ?? 'None'}
                        />
                        <MiniInfo
                          label="Skill Name"
                          value={skillResolution.resolvedSkillName ?? 'n/a'}
                        />
                      </div>
                      <div className="space-y-2">
                        {skillResolution.notes.map((note: string) => (
                          <div
                            key={note}
                            className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm"
                          >
                            {note}
                          </div>
                        ))}
                      </div>
                      {skillResolution.candidates.length ? (
                        <div className="space-y-2">
                          {skillResolution.candidates.map((candidate: {
                            skillId: string
                            reason: string
                            exists: boolean
                            builtIn?: boolean
                            description?: string
                          }) => (
                            <div
                              key={`${candidate.skillId}-${candidate.reason}`}
                              className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="font-medium text-sm">
                                  {candidate.skillId}
                                </div>
                                <Badge variant="outline">
                                  {candidate.exists ? 'Available' : 'Missing'}
                                </Badge>
                                {candidate.builtIn ? (
                                  <Badge variant="outline">Built-in</Badge>
                                ) : null}
                              </div>
                              <div className="mt-1 text-muted-foreground text-sm">
                                {candidate.reason}
                              </div>
                              {candidate.description ? (
                                <div className="mt-1 text-sm">
                                  {candidate.description}
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                      Select a task to resolve its automation skill bridge.
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="font-medium text-sm">Automation Brief</div>
                  {automationBriefError ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-amber-700 text-sm dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
                      Failed to build automation brief: {automationBriefError}
                    </div>
                  ) : automationBrief ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          disabled={
                            automationRunPending ||
                            automationBrief.readiness !== 'ready'
                          }
                          onClick={startAutomationRun}
                        >
                          {automationRunPending
                            ? 'Preparing...'
                            : 'Run In Sidepanel'}
                        </Button>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <MiniInfo
                          label="Readiness"
                          value={automationBrief.readiness}
                        />
                        <MiniInfo
                          label="Launch Mode"
                          value={automationBrief.launchMode}
                        />
                        <MiniInfo
                          label="Recommended Start URL"
                          value={automationBrief.recommendedStartUrl}
                        />
                        <MiniInfo
                          label="Resolved Skill"
                          value={automationBrief.resolvedSkillId ?? 'None'}
                        />
                      </div>
                      {automationBrief.missingRequirements.length ? (
                        <div className="space-y-2">
                          {automationBrief.missingRequirements.map(
                            (item: string) => (
                              <div
                                key={item}
                                className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-amber-700 text-sm dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300"
                              >
                                {item}
                              </div>
                            ),
                          )}
                        </div>
                      ) : null}
                      <div className="space-y-2">
                        {automationBrief.notes.map((note: string) => (
                          <div
                            key={note}
                            className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm"
                          >
                            {note}
                          </div>
                        ))}
                      </div>
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                        <div className="mb-2 font-medium text-sm">
                          Execution Prompt
                        </div>
                        <pre className="whitespace-pre-wrap break-words text-sm">
                          {automationBrief.executionPrompt}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                      Select a profile and task to build an automation brief.
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="font-medium text-sm">Why this route</div>
                  <div className="space-y-2">
                    {routeDecision.reasons.map((reason: string) => (
                      <div
                        key={reason}
                        className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-emerald-700 text-sm dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300"
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
                      {routeDecision.warnings.map((warning: string) => (
                        <div
                          key={warning}
                          className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-amber-700 text-sm dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300"
                        >
                          {warning}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-emerald-700 text-sm dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300">
                      No alignment or routing warnings for this plan.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border border-dashed px-4 py-6 text-center text-muted-foreground text-sm">
              Add at least one profile and one task template to preview route
              decisions.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Active Route Allocations</CardTitle>
          <CardDescription>
            In-memory route leases returned by the local Browser Ops service.
            This is the first step toward sticky session orchestration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {allocationError ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-amber-700 text-sm dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
              Allocation error: {allocationError}
            </div>
          ) : null}

          {allocations.length ? (
            <div className="space-y-4">
              {allocations.map((allocation) => (
                <div
                  key={allocation.allocationId}
                  className="space-y-3 rounded-xl border border-border/70 bg-background p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium text-sm">
                          {allocation.profileId}
                        </div>
                        <Badge variant="outline">{allocation.state}</Badge>
                        <Badge variant="outline">{allocation.taskId}</Badge>
                      </div>
                      <div className="text-muted-foreground text-sm">
                        Allocation: {allocation.allocationId}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={allocationPending}
                      onClick={() => releaseAllocation(allocation.allocationId)}
                    >
                      Release
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={bindingPending}
                      onClick={() =>
                        bindAllocationToActiveWindow(allocation.allocationId)
                      }
                    >
                      Bind Active Window
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={bindingPending}
                      onClick={() => openManagedWindow(allocation)}
                    >
                      Open Managed Window
                    </Button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <MiniInfo
                      label="Proxy"
                      value={
                        allocation.decision.selectedProxy
                          ? allocation.decision.selectedProxy.name
                          : 'No route'
                      }
                    />
                    <MiniInfo
                      label="Expires At"
                      value={new Date(allocation.expiresAt).toLocaleString()}
                    />
                    <MiniInfo
                      label="Rotation"
                      value={allocation.decision.rotationStrategy}
                    />
                  </div>

                  {allocation.routeResolution ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <MiniInfo
                        label="Resolved Endpoint"
                        value={`${allocation.routeResolution.endpointHost}:${allocation.routeResolution.endpointPort ?? 'n/a'}`}
                      />
                      <MiniInfo
                        label="Session"
                        value={allocation.routeResolution.sessionId ?? 'rotate'}
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border border-dashed px-4 py-6 text-center text-muted-foreground text-sm">
              No active route allocations yet.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Runtime Bindings</CardTitle>
          <CardDescription>
            This ties an allocated route to the current active browser window
            and forms the ownership layer for future multi-profile runtime
            isolation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {bindingError ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-amber-700 text-sm dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
              Binding error: {bindingError}
            </div>
          ) : null}

          {runtimeBindings.length ? (
            <div className="space-y-4">
              {runtimeBindings.map((binding) => (
                <div
                  key={binding.bindingId}
                  className="space-y-3 rounded-xl border border-border/70 bg-background p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium text-sm">
                          Window {binding.windowId ?? 'n/a'}
                        </div>
                        <Badge variant="outline">{binding.profileId}</Badge>
                        <Badge variant="outline">{binding.taskId}</Badge>
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {binding.pageTitle || binding.pageUrl}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={bindingPending}
                      onClick={() => unbindRuntime(binding.bindingId)}
                    >
                      Unbind
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={bindingPending}
                      onClick={() => captureCookieVault(binding.bindingId)}
                    >
                      Capture Vault
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={bindingPending}
                      onClick={() => restoreCookieVault(binding.bindingId)}
                    >
                      Restore Vault
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={bindingPending}
                      onClick={() => clearCookieVault(binding.bindingId)}
                    >
                      Clear Vault
                    </Button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-4">
                    <MiniInfo label="Binding" value={binding.bindingId} />
                    <MiniInfo
                      label="Controller Client"
                      value={binding.controllerClientId ?? 'n/a'}
                    />
                    <MiniInfo
                      label="Window / Tab"
                      value={`${binding.windowId ?? 'n/a'} / ${binding.tabId}`}
                    />
                    <MiniInfo
                      label="Page ID"
                      value={binding.pageId.toString()}
                    />
                    <MiniInfo label="State" value={binding.state} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border border-dashed px-4 py-6 text-center text-muted-foreground text-sm">
              No runtime bindings yet.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Runtime Session Specs</CardTitle>
          <CardDescription>
            These specs translate a bound allocation into the exact browser
            runtime contract needed for future Chromium profile/session
            isolation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {runtimeSessionSpecs.length ? (
            <div className="space-y-4">
              {runtimeSessionSpecs.map((spec) => (
                <div
                  key={spec.specId}
                  className="space-y-3 rounded-xl border border-border/70 bg-background p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium text-sm">{spec.profileId}</div>
                    <Badge variant="outline">{spec.riskLevel}</Badge>
                    <Badge variant="outline">{spec.warmupPolicy}</Badge>
                    <Badge variant="outline">
                      {spec.ownership.windowId ?? 'n/a'} /{' '}
                      {spec.ownership.tabId}
                    </Badge>
                  </div>

                  <div className="grid gap-3 md:grid-cols-4">
                    <MiniInfo
                      label="Session Partition"
                      value={spec.sessionPartition}
                    />
                    <MiniInfo
                      label="Cookie Vault"
                      value={spec.cookieVaultKey}
                    />
                    <MiniInfo
                      label="Launch Context"
                      value={spec.launchContextId}
                    />
                    <MiniInfo
                      label="Profile Dir"
                      value={spec.profileDirectoryName}
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-4">
                    <MiniInfo
                      label="Timezone"
                      value={spec.fingerprint.timezone}
                    />
                    <MiniInfo
                      label="Language"
                      value={spec.fingerprint.language}
                    />
                    <MiniInfo label="Locale" value={spec.fingerprint.locale} />
                    <MiniInfo
                      label="UA Preset"
                      value={spec.fingerprint.userAgentPreset}
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <MiniInfo
                      label="Page"
                      value={spec.ownership.pageTitle || spec.ownership.pageUrl}
                    />
                    <MiniInfo
                      label="Controller Client"
                      value={spec.ownership.controllerClientId ?? 'n/a'}
                    />
                    <MiniInfo
                      label="Proxy Provider"
                      value={spec.proxyResolution?.providerName ?? 'No proxy'}
                    />
                    <MiniInfo
                      label="Proxy Auth"
                      value={spec.proxyResolution?.authMode ?? 'n/a'}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border border-dashed px-4 py-6 text-center text-muted-foreground text-sm">
              No runtime session specs yet.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Runtime Assets</CardTitle>
          <CardDescription>
            Materialized local assets for each runtime session spec, including
            the profile directory, cookie vault file, and persisted spec JSON.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {runtimeAssets.length ? (
            <div className="space-y-4">
              {runtimeAssets.map((asset) => (
                <div
                  key={asset.manifestId}
                  className="space-y-3 rounded-xl border border-border/70 bg-background p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium text-sm">{asset.profileId}</div>
                    <Badge variant="outline">{asset.state}</Badge>
                    <Badge variant="outline">{asset.specId}</Badge>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <MiniInfo
                      label="Profile Directory"
                      value={asset.profileDirectoryPath}
                    />
                    <MiniInfo
                      label="Cookie Vault"
                      value={asset.cookieVaultPath}
                    />
                    <MiniInfo
                      label="Runtime Spec"
                      value={asset.runtimeSpecPath}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border border-dashed px-4 py-6 text-center text-muted-foreground text-sm">
              No runtime assets have been materialized yet.
            </div>
          )}

          <div className="border-t pt-4">
            <div className="mb-3 font-medium text-sm">Cookie Vaults</div>
            {cookieVaults.length ? (
              <div className="space-y-3">
                {cookieVaults.map((vault) => (
                  <div
                    key={vault.bindingId}
                    className="grid gap-3 rounded-xl border border-border/70 bg-background p-4 md:grid-cols-4"
                  >
                    <MiniInfo label="Binding" value={vault.bindingId} />
                    <MiniInfo label="Vault Key" value={vault.vaultKey} />
                    <MiniInfo
                      label="Cookie Count"
                      value={vault.cookieCount.toString()}
                    />
                    <MiniInfo
                      label="Updated"
                      value={new Date(vault.updatedAt).toLocaleString()}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-border border-dashed px-4 py-6 text-center text-muted-foreground text-sm">
                No cookie vault data captured yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Launch Bundles</CardTitle>
          <CardDescription>
            Computed Chromium launch contracts derived from runtime specs and
            persisted assets. These are the bridge toward launching isolated
            profile processes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {launchBundles.length ? (
            <div className="space-y-4">
              {launchBundles.map((bundle) => (
                <div
                  key={bundle.bundleId}
                  className="space-y-3 rounded-xl border border-border/70 bg-background p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium text-sm">
                      {bundle.profileId}
                    </div>
                    <Badge variant="outline">{bundle.state}</Badge>
                    <Badge variant="outline">{bundle.specId}</Badge>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <MiniInfo label="Startup URL" value={bundle.startupUrl} />
                    <MiniInfo
                      label="User Data Dir"
                      value={bundle.userDataDir}
                    />
                    <MiniInfo
                      label="Context"
                      value={bundle.browserContextId ?? 'default'}
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <MiniInfo
                      label="Fingerprint"
                      value={`${bundle.fingerprint.language} / ${bundle.fingerprint.timezone}`}
                    />
                    <MiniInfo
                      label="Proxy"
                      value={bundle.proxy?.maskedUrl ?? 'No proxy'}
                    />
                    <MiniInfo
                      label="Proxy Server Arg"
                      value={bundle.proxy?.serverArg ?? 'No proxy'}
                    />
                    <MiniInfo
                      label="Credential Source"
                      value={bundle.proxy?.credentialSource ?? 'n/a'}
                    />
                    <MiniInfo
                      label="Credential Status"
                      value={bundle.proxy?.credentialStatus ?? 'n/a'}
                    />
                    <MiniInfo
                      label="Username Template"
                      value={bundle.proxy?.usernameTemplate ?? 'n/a'}
                    />
                    <MiniInfo
                      label="Password Required"
                      value={
                        bundle.proxy
                          ? bundle.proxy.passwordRequired
                            ? 'yes'
                            : 'no'
                          : 'n/a'
                      }
                    />
                    <MiniInfo
                      label="Launcher Script"
                      value={bundle.launcherScriptPath}
                    />
                    <MiniInfo
                      label="Command Preview"
                      value={bundle.launcherCommandPreview}
                    />
                  </div>

                  {bundle.proxy?.credentialEnv ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <MiniInfo
                        label="Username Env"
                        value={bundle.proxy.credentialEnv.username ?? 'n/a'}
                      />
                      <MiniInfo
                        label="Password Env"
                        value={bundle.proxy.credentialEnv.password ?? 'n/a'}
                      />
                    </div>
                  ) : null}
                  {bundle.proxy?.missingCredentialEnv.length ? (
                    <div className="space-y-2">
                      {bundle.proxy.missingCredentialEnv.map((envName) => (
                        <div
                          key={envName}
                          className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-amber-700 text-sm dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300"
                        >
                          Missing credential env: {envName}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {Object.keys(bundle.env).some((key) =>
                    key.startsWith('BROWSER_OPS_PROXY_'),
                  ) ? (
                    <div className="space-y-2">
                      <div className="font-medium text-sm">Proxy Env</div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {Object.entries(bundle.env)
                          .filter(([key]) => key.startsWith('BROWSER_OPS_PROXY_'))
                          .map(([key, value]) => (
                            <MiniInfo key={key} label={key} value={value} />
                          ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    {bundle.chromiumArgs.map((arg) => (
                      <div
                        key={arg}
                        className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 font-mono text-sm"
                      >
                        {arg}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={bindingPending}
                      onClick={() => launchBundle(bundle.specId, false)}
                    >
                      Prepare Launch
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={bindingPending}
                      onClick={() => launchBundle(bundle.specId, true)}
                    >
                      Launch Now
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border border-dashed px-4 py-6 text-center text-muted-foreground text-sm">
              No launch bundles generated yet.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Launch Executions</CardTitle>
          <CardDescription>
            Prepared or started local launcher executions derived from launch
            bundles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {launchExecutions.length ? (
            <div className="space-y-4">
              {launchExecutions.map((execution) => (
                <div
                  key={execution.executionId}
                  className="space-y-3 rounded-xl border border-border/70 bg-background p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium text-sm">
                      {execution.profileId}
                    </div>
                    <Badge variant="outline">{execution.state}</Badge>
                    <Badge variant="outline">{execution.specId}</Badge>
                  </div>

                  <div className="grid gap-3 md:grid-cols-4">
                    <MiniInfo
                      label="Binary"
                      value={execution.binaryPath ?? 'not configured'}
                    />
                    <MiniInfo
                      label="PID"
                      value={execution.pid?.toString() ?? 'n/a'}
                    />
                    <MiniInfo
                      label="Dry Run"
                      value={execution.dryRun ? 'yes' : 'no'}
                    />
                    <MiniInfo
                      label="Created"
                      value={new Date(execution.createdAt).toLocaleString()}
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <MiniInfo
                      label="CDP Port"
                      value={execution.ports.cdp.toString()}
                    />
                    <MiniInfo
                      label="Server Port"
                      value={execution.ports.server.toString()}
                    />
                    <MiniInfo
                      label="Extension Port"
                      value={execution.ports.extension.toString()}
                    />
                  </div>

                  <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 font-mono text-sm">
                    {execution.commandPreview}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={bindingPending}
                      onClick={() => stopLaunchExecution(execution.executionId)}
                    >
                      Stop Execution
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border border-dashed px-4 py-6 text-center text-muted-foreground text-sm">
              No launch executions yet.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Managed Instances</CardTitle>
          <CardDescription>
            Instance registry that ties launch executions, ports, and health
            state together.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={bindingPending}
              onClick={refreshAllInstances}
            >
              Refresh All
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={bindingPending}
              onClick={reconcileInstances}
            >
              Reconcile Instances
            </Button>
          </div>

          {managedInstances.length ? (
            <div className="space-y-4">
              {managedInstances.map((instance) => (
                <div
                  key={instance.instanceId}
                  className="space-y-3 rounded-xl border border-border/70 bg-background p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium text-sm">
                      {instance.profileId}
                    </div>
                    <Badge variant="outline">{instance.state}</Badge>
                    <Badge variant="outline">{instance.specId}</Badge>
                  </div>

                  <div className="grid gap-3 md:grid-cols-4">
                    <MiniInfo
                      label="Binary"
                      value={instance.binaryPath ?? 'not configured'}
                    />
                    <MiniInfo
                      label="PID"
                      value={instance.pid?.toString() ?? 'n/a'}
                    />
                    <MiniInfo
                      label="Health"
                      value={`${instance.health.cdpReachable ? 'cdp' : '-'} / ${instance.health.serverReachable ? 'server' : '-'} / ${instance.health.extensionReachable ? 'ext' : '-'} / ${instance.health.proxyAuthBootstrapConfigured ? 'proxy-auth' : '-'} / ${instance.health.proxyEgressVerified ? 'egress' : '-'} / ${instance.health.proxySessionConsistent ? 'session' : 'session-drift'}`}
                    />
                    <MiniInfo
                      label="Checked"
                      value={
                        instance.lastHealthCheckAt
                          ? new Date(
                              instance.lastHealthCheckAt,
                            ).toLocaleString()
                          : 'never'
                      }
                    />
                  </div>

                  {(instanceProxyChecks[instance.instanceId] ??
                    instance.lastProxyVerification) ? (
                    <div className="grid gap-3 md:grid-cols-4">
                      <MiniInfo
                        label="Proxy Verify"
                        value={
                          (
                            instanceProxyChecks[instance.instanceId] ??
                            instance.lastProxyVerification
                          )?.verdict
                        }
                      />
                      <MiniInfo
                        label="Detected IP"
                        value={
                          (
                            instanceProxyChecks[instance.instanceId] ??
                            instance.lastProxyVerification
                          )?.detectedIp ?? 'n/a'
                        }
                      />
                      <MiniInfo
                        label="Detected Country"
                        value={
                          (
                            instanceProxyChecks[instance.instanceId] ??
                            instance.lastProxyVerification
                          )?.detectedCountry ?? 'n/a'
                        }
                      />
                      <MiniInfo
                        label="Session Verdict"
                        value={
                          (
                            instanceProxyChecks[instance.instanceId] ??
                            instance.lastProxyVerification
                          )?.sessionVerdict
                        }
                      />
                      <MiniInfo
                        label="Verified At"
                        value={new Date(
                          (
                            instanceProxyChecks[instance.instanceId] ??
                            instance.lastProxyVerification
                          )?.checkedAt ?? '',
                        ).toLocaleString()}
                      />
                    </div>
                  ) : null}

                  {(instanceProxyChecks[instance.instanceId] ??
                    instance.lastProxyVerification)?.expectedProxy ? (
                    <div className="grid gap-3 md:grid-cols-4">
                      <MiniInfo
                        label="Expected Provider"
                        value={
                          (
                            instanceProxyChecks[instance.instanceId] ??
                            instance.lastProxyVerification
                          )?.expectedProxy?.providerName ?? 'n/a'
                        }
                      />
                      <MiniInfo
                        label="Expected Server"
                        value={
                          (
                            instanceProxyChecks[instance.instanceId] ??
                            instance.lastProxyVerification
                          )?.expectedProxy?.serverArg ?? 'n/a'
                        }
                      />
                      <MiniInfo
                        label="Expected Session"
                        value={
                          (
                            instanceProxyChecks[instance.instanceId] ??
                            instance.lastProxyVerification
                          )?.expectedProxy?.sessionId ?? 'rotate'
                        }
                      />
                      <MiniInfo
                        label="Expected Country"
                        value={
                          (
                            instanceProxyChecks[instance.instanceId] ??
                            instance.lastProxyVerification
                          )?.expectedProxy?.country ?? 'n/a'
                        }
                      />
                    </div>
                  ) : null}

                  <div className="grid gap-3 md:grid-cols-3">
                    <MiniInfo
                      label="Proxy Provider"
                      value={instance.proxy?.providerName ?? 'n/a'}
                    />
                    <MiniInfo
                      label="Proxy Mode"
                      value={instance.proxy?.authMode ?? 'n/a'}
                    />
                    <MiniInfo
                      label="Proxy Session"
                      value={instance.proxy?.sessionId ?? 'rotate'}
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <MiniInfo
                      label="CDP"
                      value={instance.ports.cdp.toString()}
                    />
                    <MiniInfo
                      label="Server"
                      value={instance.ports.server.toString()}
                    />
                    <MiniInfo
                      label="Extension"
                      value={instance.ports.extension.toString()}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={bindingPending}
                      onClick={() => verifyInstanceProxy(instance.instanceId)}
                    >
                      Verify Proxy
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={bindingPending}
                      onClick={() =>
                        refreshManagedInstance(instance.instanceId)
                      }
                    >
                      Refresh Instance
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={bindingPending}
                      onClick={() => restartInstance(instance.instanceId)}
                    >
                      Restart Instance
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={bindingPending}
                      onClick={() => hardCleanupInstance(instance.instanceId)}
                    >
                      Hard Cleanup
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border border-dashed px-4 py-6 text-center text-muted-foreground text-sm">
              No managed instances yet.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Instance Diagnostics</CardTitle>
          <CardDescription>
            Drift detection between launch executions and registered managed
            instances.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {instanceDiagnostics ? (
            <>
              <div className="grid gap-3 md:grid-cols-4">
                <MiniInfo
                  label="Running"
                  value={instanceDiagnostics.runningInstanceIds.length.toString()}
                />
                <MiniInfo
                  label="Unreachable"
                  value={instanceDiagnostics.unreachableInstanceIds.length.toString()}
                />
                <MiniInfo
                  label="Missing Exec"
                  value={instanceDiagnostics.instanceIdsWithoutExecutions.length.toString()}
                />
                <MiniInfo
                  label="Missing Instance"
                  value={instanceDiagnostics.executionIdsWithoutInstances.length.toString()}
                />
              </div>

              <DiagnosticsList
                title="Instances Without Executions"
                items={instanceDiagnostics.instanceIdsWithoutExecutions}
              />
              <DiagnosticsList
                title="Executions Without Instances"
                items={instanceDiagnostics.executionIdsWithoutInstances}
              />
              <DiagnosticsList
                title="Unreachable Instances"
                items={instanceDiagnostics.unreachableInstanceIds}
              />
            </>
          ) : (
            <div className="rounded-xl border border-border border-dashed px-4 py-6 text-center text-muted-foreground text-sm">
              Instance diagnostics are not available yet.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Instance Events</CardTitle>
          <CardDescription>
            Audit trail for launch, instance, and reconciliation operations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {instanceEvents.length ? (
            <div className="space-y-3">
              {instanceEvents.map((event) => (
                <div
                  key={event.eventId}
                  className="rounded-xl border border-border/70 bg-background p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{event.scope}</Badge>
                    <Badge variant="outline">{event.action}</Badge>
                    <span className="text-muted-foreground text-sm">
                      {new Date(event.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-2 font-medium text-sm">{event.message}</div>
                  <div className="mt-2 grid gap-3 md:grid-cols-4">
                    <MiniInfo label="Instance" value={event.instanceId ?? 'n/a'} />
                    <MiniInfo label="Execution" value={event.executionId ?? 'n/a'} />
                    <MiniInfo label="Spec" value={event.specId ?? 'n/a'} />
                    <MiniInfo label="Profile" value={event.profileId ?? 'n/a'} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border border-dashed px-4 py-6 text-center text-muted-foreground text-sm">
              No instance events recorded yet.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Launch Diagnostics</CardTitle>
          <CardDescription>
            Drift detection for launch executions that are no longer backed by a
            runtime spec or launch bundle.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={bindingPending}
              onClick={reconcileLaunchExecutions}
            >
              Reconcile Launches
            </Button>
          </div>

          {launchDiagnostics ? (
            <>
              <div className="grid gap-3 md:grid-cols-4">
                <MiniInfo
                  label="Launched"
                  value={launchDiagnostics.launchedExecutionIds.length.toString()}
                />
                <MiniInfo
                  label="Orphan Launched"
                  value={launchDiagnostics.orphanLaunchedExecutionIds.length.toString()}
                />
                <MiniInfo
                  label="Missing Spec"
                  value={launchDiagnostics.executionIdsWithoutSpecs.length.toString()}
                />
                <MiniInfo
                  label="Missing Bundle"
                  value={launchDiagnostics.executionIdsWithoutBundles.length.toString()}
                />
              </div>

              <DiagnosticsList
                title="Executions Without Specs"
                items={launchDiagnostics.executionIdsWithoutSpecs}
              />
              <DiagnosticsList
                title="Executions Without Bundles"
                items={launchDiagnostics.executionIdsWithoutBundles}
              />
              <DiagnosticsList
                title="Orphan Launched Executions"
                items={launchDiagnostics.orphanLaunchedExecutionIds}
              />
            </>
          ) : (
            <div className="rounded-xl border border-border border-dashed px-4 py-6 text-center text-muted-foreground text-sm">
              Launch diagnostics are not available yet.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Controller Window Ownership</CardTitle>
          <CardDescription>
            Live registry reported by the controller extension. This is the base
            layer for window ownership in multi-profile runtime mode.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {windowOwnership.length ? (
            <div className="space-y-4">
              {windowOwnership.map((ownership) => (
                <div
                  key={`${ownership.clientId}-${ownership.windowId}`}
                  className="grid gap-3 rounded-xl border border-border/70 bg-background p-4 md:grid-cols-4"
                >
                  <MiniInfo label="Client" value={ownership.clientId} />
                  <MiniInfo
                    label="Window"
                    value={ownership.windowId.toString()}
                  />
                  <MiniInfo
                    label="Primary"
                    value={ownership.isPrimaryClient ? 'yes' : 'no'}
                  />
                  <MiniInfo
                    label="Focused"
                    value={ownership.isFocusedWindow ? 'yes' : 'no'}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border border-dashed px-4 py-6 text-center text-muted-foreground text-sm">
              No controller ownership records reported yet.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Runtime Diagnostics</CardTitle>
          <CardDescription>
            Drift and gap detection across browser windows, controller
            ownership, route bindings, and runtime session specs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={bindingPending}
              onClick={reconcileRuntime}
            >
              Reconcile Runtime
            </Button>
          </div>

          {reconcileResult ? (
            <div className="grid gap-3 md:grid-cols-2">
              <MiniInfo
                label="Disposed Contexts"
                value={reconcileResult.disposedContextIds.length.toString()}
              />
              <MiniInfo
                label="Recreated Contexts"
                value={reconcileResult.recreatedContexts.length.toString()}
              />
            </div>
          ) : null}

          {runtimeDiagnostics ? (
            <>
              <div className="grid gap-3 md:grid-cols-4">
                <MiniInfo
                  label="Browser Windows"
                  value={runtimeDiagnostics.browserWindows.length.toString()}
                />
                <MiniInfo
                  label="Live Contexts"
                  value={runtimeDiagnostics.liveBrowserContextIds.length.toString()}
                />
                <MiniInfo
                  label="Unbound Allocations"
                  value={runtimeDiagnostics.unboundAllocationIds.length.toString()}
                />
                <MiniInfo
                  label="Missing Ownership"
                  value={runtimeDiagnostics.bindingsWithoutControllerOwnership.length.toString()}
                />
                <MiniInfo
                  label="Ownership Drift"
                  value={runtimeDiagnostics.controllerOwnershipDrift.length.toString()}
                />
              </div>

              <DiagnosticsList
                title="Unbound Allocations"
                items={runtimeDiagnostics.unboundAllocationIds}
              />
              <DiagnosticsList
                title="Bindings Without Browser Window"
                items={runtimeDiagnostics.bindingsWithoutBrowserWindow}
              />
              <DiagnosticsList
                title="Bindings Without Controller Ownership"
                items={runtimeDiagnostics.bindingsWithoutControllerOwnership}
              />
              <DiagnosticsList
                title="Controller Ownership Drift"
                items={runtimeDiagnostics.controllerOwnershipDrift}
              />
              <DiagnosticsList
                title="Specs Without Bindings"
                items={runtimeDiagnostics.specsWithoutBindings}
              />
              <DiagnosticsList
                title="Specs Without Browser Context"
                items={runtimeDiagnostics.specsWithoutBrowserContext}
              />
              <DiagnosticsList
                title="Browser Contexts Without Specs"
                items={runtimeDiagnostics.browserContextsWithoutSpecs}
              />
            </>
          ) : (
            <div className="rounded-xl border border-border border-dashed px-4 py-6 text-center text-muted-foreground text-sm">
              Runtime diagnostics are not available yet.
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

const DiagnosticsList: FC<{ title: string; items: string[] }> = ({
  title,
  items,
}) => {
  return (
    <div className="space-y-2">
      <div className="font-medium text-sm">{title}</div>
      {items.length ? (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item}
              className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm"
            >
              {item}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-emerald-700 text-sm dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300">
          No issues detected.
        </div>
      )}
    </div>
  )
}
