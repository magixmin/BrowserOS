import type {
  Cookie,
  CookieParam,
} from '@browseros/cdp-protocol/domains/network'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import type { ControllerBackend } from '../../browser/backends/types'
import type { Browser } from '../../browser/browser'
import {
  type BrowserOpsRuntimeLauncher,
  BrowserOpsRuntimeLauncherService,
} from '../services/browser-ops/runtime-launcher'
import {
  type BrowserOpsRuntimePersistence,
  BrowserOpsRuntimePersistenceService,
} from '../services/browser-ops/runtime-store'
import {
  BrowserOpsBindAllocationSchema,
  BrowserOpsCookieVaultBindingSchema,
  BrowserOpsLaunchBundleSchema,
  BrowserOpsLaunchExecutionSchema,
  BrowserOpsOpenManagedWindowSchema,
  BrowserOpsPreviewRequestSchema,
  BrowserOpsReconcileRuntimeSchema,
  BrowserOpsReleaseAllocationSchema,
  BrowserOpsStopLaunchExecutionSchema,
  BrowserOpsUnbindRuntimeSchema,
} from '../services/browser-ops/schemas'
import { BrowserOpsService } from '../services/browser-ops/service'

interface BrowserOpsRouteDeps {
  browser: Browser
  controller: ControllerBackend
  runtimePersistence?: BrowserOpsRuntimePersistence
  runtimeLauncher?: BrowserOpsRuntimeLauncher
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

  return new Hono()
    .get('/providers', async (c) => {
      return c.json({
        providers: service.listProviders(),
      })
    })
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
    .get('/runtime/cookie-vaults', async (c) => {
      return c.json({
        vaults: await runtimePersistence.listCookieVaults(),
      })
    })
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
        return c.json({ execution }, 201)
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

        return c.json({ execution })
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

        for (const browserContextId of browserContextIds) {
          await browser.disposeBrowserContext(browserContextId)
        }
        await runtimePersistence.markAssetsReleasedForAllocation(
          allocation.allocationId,
        )
        return c.json({ allocation })
      },
    )
}
