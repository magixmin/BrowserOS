import type {
  Cookie,
  CookieParam,
} from '@browseros/cdp-protocol/domains/network'
import type {
  BrowserOpsAutomationChatDraft,
  BrowserOpsLaunchBundle,
  BrowserOpsRuntimeAssetManifest,
  BrowserOpsRuntimeBinding,
} from '@browseros/shared/browser-ops'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import type { ControllerBackend } from '../../browser/backends/types'
import type { Browser } from '../../browser/browser'
import {
  type BrowserOpsRuntimeInstanceEventStore,
  BrowserOpsRuntimeInstanceEventStoreService,
} from '../services/browser-ops/runtime-instance-event-store'
import {
  type BrowserOpsRuntimeInstanceRegistry,
  BrowserOpsRuntimeInstanceRegistryService,
} from '../services/browser-ops/runtime-instance-registry'
import {
  type BrowserOpsRuntimeInstanceVerifier,
  BrowserOpsRuntimeInstanceVerifierService,
} from '../services/browser-ops/runtime-instance-verifier'
import {
  type BrowserOpsRuntimeLauncher,
  BrowserOpsRuntimeLauncherService,
} from '../services/browser-ops/runtime-launcher'
import {
  type BrowserOpsRuntimePersistence,
  BrowserOpsRuntimePersistenceService,
} from '../services/browser-ops/runtime-store'
import {
  buildBrowserOpsAutomationBrief,
} from '../services/browser-ops/automation'
import {
  BrowserOpsAutomationRunSchema,
  BrowserOpsBindAllocationSchema,
  BrowserOpsCleanupInstancesSchema,
  BrowserOpsCookieVaultBindingSchema,
  BrowserOpsHardCleanupInstanceSchema,
  BrowserOpsLaunchBundleSchema,
  BrowserOpsLaunchExecutionSchema,
  BrowserOpsOpenManagedWindowSchema,
  BrowserOpsPreviewRequestSchema,
  BrowserOpsReconcileInstancesSchema,
  BrowserOpsReconcileLaunchExecutionsSchema,
  BrowserOpsReconcileRuntimeSchema,
  BrowserOpsRefreshAllInstancesSchema,
  BrowserOpsRefreshInstanceSchema,
  BrowserOpsReleaseAllocationSchema,
  BrowserOpsRestartInstanceSchema,
  BrowserOpsStopLaunchExecutionSchema,
  BrowserOpsVerifyInstanceProxySchema,
  BrowserOpsTaskTemplateSchema,
  BrowserOpsUnbindRuntimeSchema,
} from '../services/browser-ops/schemas'
import { resolveBrowserOpsSkill } from '../services/browser-ops/skills'
import { BrowserOpsService } from '../services/browser-ops/service'

interface BrowserOpsRouteDeps {
  browser: Browser
  controller: ControllerBackend
  runtimePersistence?: BrowserOpsRuntimePersistence
  runtimeLauncher?: BrowserOpsRuntimeLauncher
  runtimeInstanceRegistry?: BrowserOpsRuntimeInstanceRegistry
  runtimeInstanceVerifier?: BrowserOpsRuntimeInstanceVerifier
  runtimeInstanceEventStore?: BrowserOpsRuntimeInstanceEventStore
}

function toCookieParam(cookie: Cookie): CookieParam {
  return {
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    secure: cookie.secure,
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    expires: cookie.session ? undefined : cookie.expires,
    priority: cookie.priority,
    sameParty: cookie.sameParty,
    sourceScheme: cookie.sourceScheme,
    sourcePort: cookie.sourcePort,
    partitionKey: cookie.partitionKey,
  }
}

export function createBrowserOpsRoutes(deps: BrowserOpsRouteDeps) {
  const { browser, controller } = deps
  const service = new BrowserOpsService()
  const runtimePersistence =
    deps.runtimePersistence ?? new BrowserOpsRuntimePersistenceService()
  const runtimeLauncher =
    deps.runtimeLauncher ?? new BrowserOpsRuntimeLauncherService()
  const runtimeInstanceRegistry =
    deps.runtimeInstanceRegistry ??
    new BrowserOpsRuntimeInstanceRegistryService()
  const runtimeInstanceVerifier =
    deps.runtimeInstanceVerifier ??
    new BrowserOpsRuntimeInstanceVerifierService()
  const runtimeInstanceEventStore =
    deps.runtimeInstanceEventStore ??
    new BrowserOpsRuntimeInstanceEventStoreService()

  async function pushProxyAuthRule(bindingId: string): Promise<void> {
    if (!controller.isConnected()) return
    const rule = service.resolveProxyAuthRule(bindingId)
    if (!rule) return
    await controller.send(
      'setProxyAuthRule',
      rule as unknown as Record<string, unknown>,
    )
  }

  async function clearProxyAuthRule(bindingId: string): Promise<void> {
    if (!controller.isConnected()) return
    await controller.send('clearProxyAuthRule', { ruleId: bindingId })
  }

  return new Hono()
    .get('/providers', async (c) => {
      return c.json({
        providers: service.listProviders(),
      })
    })
    .post(
      '/skills/resolve',
      zValidator('json', BrowserOpsTaskTemplateSchema),
      async (c) => {
        const request = c.req.valid('json')
        const resolution = await resolveBrowserOpsSkill(request)
        return c.json({ resolution })
      },
    )
    .post(
      '/automation/brief',
      zValidator('json', BrowserOpsPreviewRequestSchema),
      async (c) => {
        const request = c.req.valid('json')
        const routePreview = service.previewRoute(request)
        const brief = await buildBrowserOpsAutomationBrief(
          request,
          routePreview,
        )
        return c.json({ brief })
      },
    )
    .post(
      '/automation/run-draft',
      zValidator('json', BrowserOpsAutomationRunSchema),
      async (c) => {
        const request = c.req.valid('json')
        const routePreview = service.previewRoute(request)
        const brief = await buildBrowserOpsAutomationBrief(request, routePreview)
        const allocation = service.allocateRoute(request)

        try {
          let binding: BrowserOpsRuntimeBinding | null = null
          let asset: BrowserOpsRuntimeAssetManifest | null = null
          let bundle: BrowserOpsLaunchBundle | null = null
          let restoredCookies = 0
          let page:
            | {
                pageId: number
                tabId: number
                windowId?: number
                url: string
                title: string
              }
            | null = null

          if (request.forceManagedWindow) {
            const browserContextId = await browser.createBrowserContext()
            const window = await browser.createWindow({
              hidden: false,
              browserContextId,
            })
            const pageId = await browser.newPage(brief.recommendedStartUrl, {
              windowId: window.windowId,
              browserContextId,
            })
            const pages = await browser.listPages()
            const resolvedPage = pages.find(
              (candidate) => candidate.pageId === pageId,
            )

            if (!resolvedPage) {
              service.releaseAllocation(allocation.allocationId)
              return c.json(
                { error: 'Failed to locate automation page after launch' },
                500,
              )
            }

            const controllerClientId =
              typeof resolvedPage.windowId === 'number'
                ? controller.getWindowOwnerClientId(resolvedPage.windowId)
                : null

            binding = service.bindAllocationToPage({
              allocationId: allocation.allocationId,
              controllerClientId,
              browserContextId,
              page: {
                pageId: resolvedPage.pageId,
                tabId: resolvedPage.tabId,
                windowId: resolvedPage.windowId,
                url: resolvedPage.url,
                title: resolvedPage.title,
              },
            })

            if (!binding) {
              service.releaseAllocation(allocation.allocationId)
              return c.json({ error: 'Failed to bind automation window' }, 500)
            }

            const spec =
              binding.runtimeSpecId !== null
                ? service.getRuntimeSessionSpec(binding.runtimeSpecId)
                : null
            asset = spec
              ? await runtimePersistence.materializeRuntimeSessionSpec(spec)
              : null
            bundle = spec
              ? await runtimePersistence.materializeLaunchBundle(spec.specId)
              : null

            if (request.restoreCookieVault) {
              const vault = await runtimePersistence.readCookieVault(
                binding.bindingId,
              )
              if (vault) {
                const cookies = vault.cookies as Cookie[]
                if (cookies.length > 0) {
                  await browser.setCookies(
                    cookies.map(toCookieParam),
                    browserContextId,
                  )
                  restoredCookies = cookies.length
                }
              }
            }

            await pushProxyAuthRule(binding.bindingId)
            page = {
              pageId: resolvedPage.pageId,
              tabId: resolvedPage.tabId,
              windowId: resolvedPage.windowId,
              url: resolvedPage.url,
              title: resolvedPage.title,
            }
          } else {
            const activePage = await browser.getActivePage()
            if (!activePage) {
              service.releaseAllocation(allocation.allocationId)
              return c.json({ error: 'No active page available to bind' }, 400)
            }

            const controllerClientId =
              typeof activePage.windowId === 'number'
                ? controller.getWindowOwnerClientId(activePage.windowId)
                : null

            binding = service.bindAllocationToPage({
              allocationId: allocation.allocationId,
              controllerClientId,
              browserContextId: null,
              page: {
                pageId: activePage.pageId,
                tabId: activePage.tabId,
                windowId: activePage.windowId,
                url: activePage.url,
                title: activePage.title,
              },
            })

            if (!binding) {
              service.releaseAllocation(allocation.allocationId)
              return c.json({ error: 'Failed to bind active window' }, 500)
            }

            const spec =
              binding.runtimeSpecId !== null
                ? service.getRuntimeSessionSpec(binding.runtimeSpecId)
                : null
            asset = spec
              ? await runtimePersistence.materializeRuntimeSessionSpec(spec)
              : null
            bundle = spec
              ? await runtimePersistence.materializeLaunchBundle(spec.specId)
              : null

            await pushProxyAuthRule(binding.bindingId)
            page = {
              pageId: activePage.pageId,
              tabId: activePage.tabId,
              windowId: activePage.windowId,
              url: activePage.url,
              title: activePage.title,
            }
          }

          if (!binding || !page) {
            service.releaseAllocation(allocation.allocationId)
            return c.json({ error: 'Automation binding was not created' }, 500)
          }

          const chatDraft: BrowserOpsAutomationChatDraft = {
            mode: request.mode ?? brief.recommendedMode,
            query: brief.executionPrompt,
            browserContext: {
              ...(typeof page.windowId === 'number'
                ? { windowId: page.windowId }
                : {}),
              activeTab: {
                id: page.tabId,
                pageId: page.pageId,
                url: page.url,
                title: page.title,
              },
            },
          }

          return c.json(
            { brief, allocation, binding, asset, bundle, page, restoredCookies, chatDraft },
            201,
          )
        } catch (error) {
          service.releaseAllocation(allocation.allocationId)
          return c.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to prepare automation run',
            },
            500,
          )
        }
      },
    )
    .get('/allocations', async (c) => {
      return c.json({
        allocations: service.listAllocations(),
      })
    })
    .get('/runtime-bindings', async (c) => {
      return c.json({
        bindings: service.listRuntimeBindings(),
      })
    })
    .get('/runtime/ownership', async (c) => {
      return c.json({
        ownership: controller.listOwnedWindows(),
      })
    })
    .get('/runtime/assets', async (c) => {
      return c.json({
        assets: await runtimePersistence.listRuntimeAssets(),
      })
    })
    .get('/runtime/launch-bundles', async (c) => {
      return c.json({
        bundles: await runtimePersistence.listLaunchBundles(),
      })
    })
    .get('/runtime/launch-executions', async (c) => {
      return c.json({
        executions: await runtimeLauncher.listExecutions(),
      })
    })
    .get('/runtime/instances', async (c) => {
      return c.json({
        instances: await runtimeInstanceRegistry.listInstances(),
      })
    })
    .get('/runtime/instance-events', async (c) => {
      return c.json({
        events: await runtimeInstanceEventStore.listEvents(),
      })
    })
    .post(
      '/runtime/instances/verify-proxy',
      zValidator('json', BrowserOpsVerifyInstanceProxySchema),
      async (c) => {
        const request = c.req.valid('json')
        const instance = await runtimeInstanceRegistry.getInstance(
          request.instanceId,
        )

        if (!instance) {
          return c.json({ error: 'Managed instance not found' }, 404)
        }

        const verification = await runtimeInstanceVerifier.verifyProxy(instance, {
          url: request.url,
          previousVerification: instance.lastProxyVerification,
        })
        const updatedInstance =
          await runtimeInstanceRegistry.recordProxyVerification(
            instance.instanceId,
            verification,
          )

        await runtimeInstanceEventStore.appendEvent({
          eventId: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          scope: 'instance',
          action: 'instance_refreshed',
          message: `Verified proxy for instance ${instance.instanceId}: ${verification.status}`,
          instanceId: instance.instanceId,
          executionId: instance.executionId,
          specId: instance.specId,
          profileId: instance.profileId,
          metadata: {
            verificationStatus: verification.status,
            detectedIp: verification.detectedIp ?? 'n/a',
          },
        })

        return c.json({ verification, instance: updatedInstance })
      },
    )
    .post(
      '/runtime/instances/refresh',
      zValidator('json', BrowserOpsRefreshInstanceSchema),
      async (c) => {
        const request = c.req.valid('json')
        const instance = await runtimeInstanceRegistry.refreshInstanceHealth(
          request.instanceId,
        )

        if (!instance) {
          return c.json({ error: 'Managed instance not found' }, 404)
        }

        await runtimeInstanceEventStore.appendEvent({
          eventId: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          scope: 'instance',
          action: 'instance_refreshed',
          message: `Refreshed instance ${instance.instanceId}`,
          instanceId: instance.instanceId,
          executionId: instance.executionId,
          specId: instance.specId,
          profileId: instance.profileId,
        })
        return c.json({ instance })
      },
    )
    .post(
      '/runtime/instances/refresh-all',
      zValidator('json', BrowserOpsRefreshAllInstancesSchema),
      async (c) => {
        const refreshed =
          await runtimeInstanceRegistry.refreshAllInstanceHealth()
        await runtimeInstanceEventStore.appendEvent({
          eventId: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          scope: 'system',
          action: 'instances_refreshed',
          message: `Refreshed ${refreshed.length} managed instances`,
          metadata: { count: refreshed.length },
        })
        return c.json({ refreshed })
      },
    )
    .get('/runtime/launch-diagnostics', async (c) => {
      const specs = service.listRuntimeSessionSpecs()
      const bundles = await runtimePersistence.listLaunchBundles()
      return c.json({
        diagnostics: await runtimeLauncher.getDiagnostics({
          activeSpecIds: specs.map((spec) => spec.specId),
          activeBundleIds: bundles.map((bundle) => bundle.bundleId),
        }),
      })
    })
    .get('/runtime/cookie-vaults', async (c) => {
      return c.json({
        vaults: await runtimePersistence.listCookieVaults(),
      })
    })
    .get('/runtime/instance-diagnostics', async (c) => {
      const executions = await runtimeLauncher.listExecutions()
      return c.json({
        diagnostics: await runtimeInstanceRegistry.getDiagnostics({
          executionIds: executions.map((execution) => execution.executionId),
        }),
      })
    })
    .post(
      '/runtime/instances/reconcile',
      zValidator('json', BrowserOpsReconcileInstancesSchema),
      async (c) => {
        const request = c.req.valid('json')
        const executions = await runtimeLauncher.listExecutions()
        const result = await runtimeInstanceRegistry.reconcileInstances({
          executionIds: executions.map((execution) => execution.executionId),
          stopOrphanInstances: request.stopOrphanInstances,
          refreshHealth: request.refreshHealth,
        })
        await runtimeInstanceEventStore.appendEvent({
          eventId: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          scope: 'system',
          action: 'instances_reconciled',
          message: `Reconciled instances; stopped=${result.stoppedInstanceIds.length} refreshed=${result.refreshedInstanceIds.length}`,
          metadata: {
            stopped: result.stoppedInstanceIds.length,
            refreshed: result.refreshedInstanceIds.length,
          },
        })
        return c.json(result)
      },
    )
    .post(
      '/runtime/instances/cleanup',
      zValidator('json', BrowserOpsCleanupInstancesSchema),
      async (c) => {
        const request = c.req.valid('json')
        const executions = await runtimeLauncher.listExecutions()
        const removedInstanceIds =
          await runtimeInstanceRegistry.cleanupInstances({
            removeStopped: request.removeStopped,
            removeFailed: request.removeFailed,
            removeOrphan: request.removeOrphan,
            executionIds: executions.map((execution) => execution.executionId),
          })

        await runtimeInstanceEventStore.appendEvent({
          eventId: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          scope: 'system',
          action: 'instance_cleaned',
          message: `Cleaned up ${removedInstanceIds.length} managed instances`,
          metadata: { count: removedInstanceIds.length },
        })

        return c.json({ removedInstanceIds })
      },
    )
    .post(
      '/runtime/instances/hard-cleanup',
      zValidator('json', BrowserOpsHardCleanupInstanceSchema),
      async (c) => {
        const request = c.req.valid('json')
        const instance = await runtimeInstanceRegistry.getInstance(
          request.instanceId,
        )

        if (!instance) {
          return c.json({ error: 'Managed instance not found' }, 404)
        }

        let execution = null
        if (request.removeExecution) {
          execution = await runtimeLauncher.cleanupExecution(
            instance.executionId,
          )
        }

        const removedInstance = await runtimeInstanceRegistry.cleanupInstance(
          request.instanceId,
        )

        await runtimeInstanceEventStore.appendEvent({
          eventId: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          scope: 'instance',
          action: 'instance_cleaned',
          message: `Hard cleaned instance ${request.instanceId}`,
          instanceId: request.instanceId,
        })

        return c.json({ execution, instance: removedInstance })
      },
    )
    .post(
      '/runtime/instances/restart',
      zValidator('json', BrowserOpsRestartInstanceSchema),
      async (c) => {
        const request = c.req.valid('json')
        const instance = await runtimeInstanceRegistry.getInstance(
          request.instanceId,
        )

        if (!instance) {
          return c.json({ error: 'Managed instance not found' }, 404)
        }

        const bundle =
          (await runtimePersistence.readLaunchBundle(instance.specId)) ??
          (await runtimePersistence.materializeLaunchBundle(instance.specId))

        if (!bundle) {
          return c.json({ error: 'Launch bundle source not found' }, 404)
        }

        const previousExecution = await runtimeLauncher.stopExecution(
          instance.executionId,
        )
        if (previousExecution) {
          await runtimeInstanceRegistry.markExecutionState(previousExecution)
        }

        const execution = await runtimeLauncher.launchBundle(bundle, {
          execute: request.execute,
        })
        const nextInstance = await runtimeInstanceRegistry.registerExecution(
          bundle,
          execution,
        )
        await runtimeInstanceEventStore.appendEvent({
          eventId: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          scope: 'instance',
          action: 'instance_restarted',
          message: `Restarted instance ${nextInstance.instanceId}`,
          instanceId: nextInstance.instanceId,
          executionId: execution.executionId,
          specId: execution.specId,
          profileId: execution.profileId,
        })

        return c.json(
          { previousExecution, execution, instance: nextInstance },
          201,
        )
      },
    )
    .get('/runtime/diagnostics', async (c) => {
      const browserWindows = (await browser.listWindows()).map((window) => ({
        windowId: window.windowId,
        isActive: window.isActive,
        tabCount: window.tabCount,
        windowType: window.windowType,
      }))
      const liveBrowserContextIds = await browser.getBrowserContexts()

      return c.json({
        diagnostics: service.getRuntimeDiagnostics({
          browserWindows,
          liveBrowserContextIds,
          controllerOwnership: controller.listOwnedWindows(),
        }),
      })
    })
    .post(
      '/runtime/reconcile',
      zValidator('json', BrowserOpsReconcileRuntimeSchema),
      async (c) => {
        const request = c.req.valid('json')
        const browserWindows = (await browser.listWindows()).map((window) => ({
          windowId: window.windowId,
          isActive: window.isActive,
          tabCount: window.tabCount,
          windowType: window.windowType,
        }))
        const liveBrowserContextIds = await browser.getBrowserContexts()
        const diagnostics = service.getRuntimeDiagnostics({
          browserWindows,
          liveBrowserContextIds,
          controllerOwnership: controller.listOwnedWindows(),
        })

        const disposedContextIds: string[] = []
        const recreatedContexts: Array<{
          specId: string
          browserContextId: string
          restoredCookies: number
        }> = []

        if (request.disposeOrphanContexts) {
          for (const browserContextId of diagnostics.browserContextsWithoutSpecs) {
            await browser.disposeBrowserContext(browserContextId)
            disposedContextIds.push(browserContextId)
          }
        }

        if (request.recreateMissingContexts) {
          for (const specId of diagnostics.specsWithoutBrowserContext) {
            const currentSpec =
              service.getRuntimeSessionSpec(specId) ??
              (await runtimePersistence.readRuntimeSessionSpec(specId))

            if (!currentSpec) continue

            const nextBrowserContextId = await browser.createBrowserContext()
            const updatedSpec = service.updateRuntimeSessionBrowserContext(
              specId,
              nextBrowserContextId,
            )
            const specToPersist = updatedSpec ?? {
              ...currentSpec,
              browserContextId: nextBrowserContextId,
            }

            await runtimePersistence.materializeRuntimeSessionSpec(
              specToPersist,
            )
            await runtimePersistence.materializeLaunchBundle(
              specToPersist.specId,
            )

            let restoredCookies = 0
            const vault = await runtimePersistence.readCookieVault(
              specToPersist.bindingId,
            )
            if (vault) {
              const cookies = vault.cookies as Cookie[]
              if (cookies.length > 0) {
                await browser.setCookies(
                  cookies.map(toCookieParam),
                  nextBrowserContextId,
                )
                restoredCookies = cookies.length
              }
            }

            recreatedContexts.push({
              specId,
              browserContextId: nextBrowserContextId,
              restoredCookies,
            })
          }
        }

        const nextDiagnostics = service.getRuntimeDiagnostics({
          browserWindows: (await browser.listWindows()).map((window) => ({
            windowId: window.windowId,
            isActive: window.isActive,
            tabCount: window.tabCount,
            windowType: window.windowType,
          })),
          liveBrowserContextIds: await browser.getBrowserContexts(),
          controllerOwnership: controller.listOwnedWindows(),
        })

        return c.json({
          disposedContextIds,
          recreatedContexts,
          diagnostics: nextDiagnostics,
        })
      },
    )
    .get('/runtime/specs', async (c) => {
      return c.json({
        specs: service.listRuntimeSessionSpecs(),
      })
    })
    .post(
      '/runtime/launch-bundle',
      zValidator('json', BrowserOpsLaunchBundleSchema),
      async (c) => {
        const request = c.req.valid('json')
        const bundle = await runtimePersistence.materializeLaunchBundle(
          request.specId,
        )

        if (!bundle) {
          return c.json({ error: 'Launch bundle source not found' }, 404)
        }

        return c.json({ bundle })
      },
    )
    .post(
      '/runtime/launch',
      zValidator('json', BrowserOpsLaunchExecutionSchema),
      async (c) => {
        const request = c.req.valid('json')
        const bundle = await runtimePersistence.materializeLaunchBundle(
          request.specId,
        )

        if (!bundle) {
          return c.json({ error: 'Launch bundle source not found' }, 404)
        }

        const execution = await runtimeLauncher.launchBundle(bundle, {
          execute: request.execute,
        })
        const instance = await runtimeInstanceRegistry.registerExecution(
          bundle,
          execution,
        )
        await runtimeInstanceEventStore.appendEvent({
          eventId: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          scope: 'execution',
          action: request.execute ? 'launch_started' : 'launch_prepared',
          message: request.execute
            ? `Started launch execution ${execution.executionId}`
            : `Prepared launch execution ${execution.executionId}`,
          instanceId: instance.instanceId,
          executionId: execution.executionId,
          specId: execution.specId,
          profileId: execution.profileId,
        })
        await runtimeInstanceEventStore.appendEvent({
          eventId: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          scope: 'instance',
          action: 'instance_registered',
          message: `Registered instance ${instance.instanceId}`,
          instanceId: instance.instanceId,
          executionId: execution.executionId,
          specId: execution.specId,
          profileId: execution.profileId,
        })
        return c.json({ execution, instance }, 201)
      },
    )
    .post(
      '/runtime/launch/stop',
      zValidator('json', BrowserOpsStopLaunchExecutionSchema),
      async (c) => {
        const request = c.req.valid('json')
        const execution = await runtimeLauncher.stopExecution(
          request.executionId,
        )

        if (!execution) {
          return c.json({ error: 'Launch execution not found' }, 404)
        }
        const instance =
          await runtimeInstanceRegistry.markExecutionState(execution)
        await runtimeInstanceEventStore.appendEvent({
          eventId: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          scope: 'execution',
          action: 'launch_stopped',
          message: `Stopped launch execution ${execution.executionId}`,
          instanceId: instance?.instanceId,
          executionId: execution.executionId,
          specId: execution.specId,
          profileId: execution.profileId,
        })
        return c.json({ execution, instance })
      },
    )
    .post(
      '/runtime/launch/reconcile',
      zValidator('json', BrowserOpsReconcileLaunchExecutionsSchema),
      async (c) => {
        const request = c.req.valid('json')
        const specs = service.listRuntimeSessionSpecs()
        const bundles = await runtimePersistence.listLaunchBundles()
        const diagnostics = await runtimeLauncher.getDiagnostics({
          activeSpecIds: specs.map((spec) => spec.specId),
          activeBundleIds: bundles.map((bundle) => bundle.bundleId),
        })

        const stoppedExecutionIds: string[] = []
        if (request.stopOrphanLaunchedExecutions) {
          for (const executionId of diagnostics.orphanLaunchedExecutionIds) {
            const execution = await runtimeLauncher.stopExecution(executionId)
            if (execution) stoppedExecutionIds.push(execution.executionId)
            if (execution) {
              await runtimeInstanceRegistry.markExecutionState(execution)
            }
          }
        }

        await runtimeInstanceEventStore.appendEvent({
          eventId: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          scope: 'system',
          action: 'launches_reconciled',
          message: `Reconciled launch executions; stopped=${stoppedExecutionIds.length}`,
          metadata: { stopped: stoppedExecutionIds.length },
        })

        return c.json({
          stoppedExecutionIds,
          instanceDiagnostics: await runtimeInstanceRegistry.getDiagnostics({
            executionIds: (await runtimeLauncher.listExecutions()).map(
              (execution) => execution.executionId,
            ),
          }),
          diagnostics: await runtimeLauncher.getDiagnostics({
            activeSpecIds: specs.map((spec) => spec.specId),
            activeBundleIds: bundles.map((bundle) => bundle.bundleId),
          }),
        })
      },
    )
    .post(
      '/preview',
      zValidator('json', BrowserOpsPreviewRequestSchema),
      async (c) => {
        const request = c.req.valid('json')
        const result = service.previewRoute(request)
        return c.json(result)
      },
    )
    .post(
      '/providers/resolve',
      zValidator('json', BrowserOpsPreviewRequestSchema),
      async (c) => {
        const request = c.req.valid('json')
        const resolution = service.resolveProviderRoute(request)
        return c.json({ resolution })
      },
    )
    .post(
      '/allocate',
      zValidator('json', BrowserOpsPreviewRequestSchema),
      async (c) => {
        const request = c.req.valid('json')
        const allocation = service.allocateRoute(request)
        return c.json({ allocation }, 201)
      },
    )
    .post(
      '/runtime/bind-active-window',
      zValidator('json', BrowserOpsBindAllocationSchema),
      async (c) => {
        const request = c.req.valid('json')
        const activePage = await browser.getActivePage()

        if (!activePage) {
          return c.json({ error: 'No active browser page found' }, 409)
        }

        const controllerClientId =
          typeof activePage.windowId === 'number'
            ? controller.getWindowOwnerClientId(activePage.windowId)
            : null

        const binding = service.bindAllocationToPage({
          allocationId: request.allocationId,
          controllerClientId,
          browserContextId: null,
          page: {
            pageId: activePage.pageId,
            tabId: activePage.tabId,
            windowId: activePage.windowId,
            url: activePage.url,
            title: activePage.title,
          },
        })

        if (!binding) {
          return c.json({ error: 'Allocation not found' }, 404)
        }

        const spec =
          binding.runtimeSpecId !== null
            ? service.getRuntimeSessionSpec(binding.runtimeSpecId)
            : null

        const asset = spec
          ? await runtimePersistence.materializeRuntimeSessionSpec(spec)
          : null
        const bundle = spec
          ? await runtimePersistence.materializeLaunchBundle(spec.specId)
          : null

        await pushProxyAuthRule(binding.bindingId)

        return c.json({ binding, asset, bundle }, 201)
      },
    )
    .post(
      '/runtime/open-managed-window',
      zValidator('json', BrowserOpsOpenManagedWindowSchema),
      async (c) => {
        const request = c.req.valid('json')

        const browserContextId = await browser.createBrowserContext()
        const window = await browser.createWindow({
          hidden: request.hidden,
          browserContextId,
        })
        const pageId = await browser.newPage('about:blank', {
          windowId: window.windowId,
          browserContextId,
        })
        const pages = await browser.listPages()
        let page = pages.find((candidate) => candidate.pageId === pageId)

        if (!page) {
          return c.json({ error: 'Failed to locate newly created page' }, 500)
        }

        const controllerClientId =
          typeof page.windowId === 'number'
            ? controller.getWindowOwnerClientId(page.windowId)
            : null

        const binding = service.bindAllocationToPage({
          allocationId: request.allocationId,
          controllerClientId,
          browserContextId,
          page: {
            pageId: page.pageId,
            tabId: page.tabId,
            windowId: page.windowId,
            url: page.url,
            title: page.title,
          },
        })

        if (!binding) {
          return c.json({ error: 'Allocation not found' }, 404)
        }

        const spec =
          binding.runtimeSpecId !== null
            ? service.getRuntimeSessionSpec(binding.runtimeSpecId)
            : null
        const asset = spec
          ? await runtimePersistence.materializeRuntimeSessionSpec(spec)
          : null
        const bundle = spec
          ? await runtimePersistence.materializeLaunchBundle(spec.specId)
          : null
        let restoredCookies = 0

        if (request.restoreCookieVault) {
          const vault = await runtimePersistence.readCookieVault(
            binding.bindingId,
          )
          if (vault) {
            const cookies = vault.cookies as Cookie[]
            if (cookies.length > 0) {
              await browser.setCookies(
                cookies.map(toCookieParam),
                browserContextId,
              )
              restoredCookies = cookies.length
            }
          }
        }

        if (request.url !== 'about:blank') {
          await browser.goto(page.pageId, request.url)
          const updatedPages = await browser.listPages()
          page =
            updatedPages.find((candidate) => candidate.pageId === pageId) ??
            page
        }

        await pushProxyAuthRule(binding.bindingId)

        return c.json(
          { window, page, binding, asset, bundle, restoredCookies },
          201,
        )
      },
    )
    .post(
      '/runtime/unbind',
      zValidator('json', BrowserOpsUnbindRuntimeSchema),
      async (c) => {
        const request = c.req.valid('json')
        const currentBinding = service.getRuntimeBinding(request.bindingId)
        const currentSpec =
          currentBinding?.runtimeSpecId !== null && currentBinding
            ? service.getRuntimeSessionSpec(currentBinding.runtimeSpecId)
            : null
        const binding = service.unbindRuntime(request.bindingId)

        if (!binding) {
          return c.json({ error: 'Binding not found' }, 404)
        }

        if (currentSpec?.browserContextId) {
          await browser.disposeBrowserContext(currentSpec.browserContextId)
        }
        await clearProxyAuthRule(binding.bindingId)
        if (currentSpec) {
          const stoppedExecutions =
            await runtimeLauncher.stopExecutionsForSpecs([currentSpec.specId])
          for (const execution of stoppedExecutions) {
            await runtimeInstanceRegistry.markExecutionState(execution)
          }
        }
        await runtimePersistence.markAssetsReleasedForBinding(binding.bindingId)
        return c.json({ binding })
      },
    )
    .post(
      '/runtime/cookie-vault/capture',
      zValidator('json', BrowserOpsCookieVaultBindingSchema),
      async (c) => {
        const request = c.req.valid('json')
        const binding = service.getRuntimeBinding(request.bindingId)

        if (!binding) {
          return c.json({ error: 'Binding not found' }, 404)
        }

        const spec =
          binding.runtimeSpecId !== null
            ? service.getRuntimeSessionSpec(binding.runtimeSpecId)
            : null

        const cookies = await browser.getCookies(
          spec?.browserContextId ? undefined : [binding.pageUrl],
          spec?.browserContextId ?? undefined,
        )
        const vault = await runtimePersistence.writeCookieVault(
          binding.bindingId,
          cookies,
          [binding.pageUrl],
        )

        if (!vault) {
          return c.json({ error: 'Cookie vault asset not found' }, 404)
        }

        return c.json({ vault, captured: cookies.length })
      },
    )
    .post(
      '/runtime/cookie-vault/restore',
      zValidator('json', BrowserOpsCookieVaultBindingSchema),
      async (c) => {
        const request = c.req.valid('json')
        const vault = await runtimePersistence.readCookieVault(
          request.bindingId,
        )

        if (!vault) {
          return c.json({ error: 'Cookie vault not found' }, 404)
        }

        const binding = service.getRuntimeBinding(request.bindingId)
        const spec =
          binding?.runtimeSpecId !== null && binding
            ? service.getRuntimeSessionSpec(binding.runtimeSpecId)
            : null

        const cookies = vault.cookies as Cookie[]
        await browser.setCookies(
          cookies.map(toCookieParam),
          spec?.browserContextId ?? undefined,
        )

        return c.json({ restored: cookies.length, vault })
      },
    )
    .post(
      '/runtime/cookie-vault/clear',
      zValidator('json', BrowserOpsCookieVaultBindingSchema),
      async (c) => {
        const request = c.req.valid('json')
        const vault = await runtimePersistence.clearCookieVault(
          request.bindingId,
        )

        if (!vault) {
          return c.json({ error: 'Cookie vault not found' }, 404)
        }

        const binding = service.getRuntimeBinding(request.bindingId)
        const spec =
          binding?.runtimeSpecId !== null && binding
            ? service.getRuntimeSessionSpec(binding.runtimeSpecId)
            : null
        if (spec?.browserContextId) {
          await browser.clearCookies(spec.browserContextId)
        }

        return c.json({ vault })
      },
    )
    .post(
      '/release',
      zValidator('json', BrowserOpsReleaseAllocationSchema),
      async (c) => {
        const request = c.req.valid('json')
        const relatedBindings = service
          .listRuntimeBindings()
          .filter((binding) => binding.allocationId === request.allocationId)
        const browserContextIds = relatedBindings
          .map((binding) =>
            binding.runtimeSpecId !== null
              ? (service.getRuntimeSessionSpec(binding.runtimeSpecId)
                  ?.browserContextId ?? null)
              : null,
          )
          .filter((contextId): contextId is string => contextId !== null)
        const allocation = service.releaseAllocation(request.allocationId)

        if (!allocation) {
          return c.json({ error: 'Allocation not found' }, 404)
        }

        const relatedSpecIds = relatedBindings
          .map((binding) =>
            binding.runtimeSpecId !== null ? binding.runtimeSpecId : null,
          )
          .filter((specId): specId is string => specId !== null)

        for (const browserContextId of browserContextIds) {
          await browser.disposeBrowserContext(browserContextId)
        }
        for (const binding of relatedBindings) {
          await clearProxyAuthRule(binding.bindingId)
        }
        if (relatedSpecIds.length > 0) {
          const stoppedExecutions =
            await runtimeLauncher.stopExecutionsForSpecs(relatedSpecIds)
          for (const execution of stoppedExecutions) {
            await runtimeInstanceRegistry.markExecutionState(execution)
          }
        }
        await runtimePersistence.markAssetsReleasedForAllocation(
          allocation.allocationId,
        )
        return c.json({ allocation })
      },
    )
}
