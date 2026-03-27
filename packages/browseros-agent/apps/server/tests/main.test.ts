/**
 * @license
 * Copyright 2025 BrowserOS
 */

import { afterEach, describe, expect, it, mock } from 'bun:test'

const config = {
  cdpPort: 9222,
  serverPort: 9100,
  agentPort: 9100,
  extensionPort: 9300,
  resourcesDir: '/tmp/browseros-resources',
  executionDir: '/tmp/browseros-execution',
  mcpAllowRemote: false,
}

describe('Application.start', () => {
  afterEach(() => {
    mock.restore()
  })

  it('continues when controller startup fails', async () => {
    const controllerError = Object.assign(new Error('bind failed'), {
      code: 'EADDRINUSE',
    })
    const createHttpServer = mock(async () => ({}))
    const controllerStart = mock(async () => {
      throw controllerError
    })
    const cdpConnect = mock(async () => {})
    const sentryCaptureException = mock(() => {})
    const loggerInfo = mock(() => {})
    const loggerWarn = mock(() => {})
    const loggerDebug = mock(() => {})
    const loggerError = mock(() => {})
    const processExit = mock((() => {
      throw new Error('process.exit called')
    }) as typeof process.exit)
    const originalExit = process.exit
    process.exit = processExit

    try {
      mock.module('../src/api/server', () => ({
        createHttpServer,
      }))
      mock.module('../src/browser/backends/controller', () => ({
        ControllerBackend: class {
          registerBootstrapProxyAuthRule(): void {}
          clearBootstrapProxyAuthRule(): void {}
          getBootstrapProxyAuthRuleCount(): number {
            return 0
          }

          async start(): Promise<void> {
            await controllerStart()
          }

          async stop(): Promise<void> {}

          isConnected(): boolean {
            return false
          }

          async send(): Promise<never> {
            throw new Error('BrowserOS helper service not connected')
          }
        },
      }))
      mock.module('../src/browser/backends/cdp', () => ({
        CdpBackend: class {
          async connect(): Promise<void> {
            await cdpConnect()
          }
        },
      }))
      mock.module('../src/browser/browser', () => ({
        Browser: class {},
      }))
      mock.module('../src/lib/browseros-dir', () => ({
        ensureBrowserosDir: mock(async () => {}),
        cleanOldSessions: mock(async () => {}),
        getBrowserosDir: mock(() => '/tmp/browseros'),
        getSkillsDir: mock(() => '/tmp/browseros/skills'),
        getBuiltinSkillsDir: mock(() => '/tmp/browseros/skills/builtin'),
        getBrowserOpsDir: mock(() => '/tmp/browseros/browser-ops'),
        getBrowserOpsProfilesDir: mock(
          () => '/tmp/browseros/browser-ops/profiles',
        ),
        getBrowserOpsCookieVaultsDir: mock(
          () => '/tmp/browseros/browser-ops/cookie-vaults',
        ),
        getBrowserOpsRuntimeSpecsDir: mock(
          () => '/tmp/browseros/browser-ops/runtime-specs',
        ),
        getBrowserOpsRuntimeAssetsDir: mock(
          () => '/tmp/browseros/browser-ops/runtime-assets',
        ),
        getBrowserOpsLaunchBundlesDir: mock(
          () => '/tmp/browseros/browser-ops/launch-bundles',
        ),
        getBrowserOpsLaunchExecutionsDir: mock(
          () => '/tmp/browseros/browser-ops/launch-executions',
        ),
        getBrowserOpsInstancesDir: mock(
          () => '/tmp/browseros/browser-ops/instances',
        ),
        getBrowserOpsInstanceEventsDir: mock(
          () => '/tmp/browseros/browser-ops/instance-events',
        ),
      }))
      mock.module('../src/lib/db', () => ({
        initializeDb: mock(() => ({})),
      }))
      mock.module('../src/lib/identity', () => ({
        identity: {
          initialize: mock(() => {}),
          getBrowserOSId: mock(() => 'browseros-id'),
        },
      }))
      mock.module('../src/lib/logger', () => ({
        logger: {
          setLogFile: mock(() => {}),
          info: loggerInfo,
          warn: loggerWarn,
          debug: loggerDebug,
          error: loggerError,
        },
      }))
      mock.module('../src/lib/metrics', () => ({
        metrics: {
          initialize: mock(() => {}),
          isEnabled: mock(() => true),
          log: mock(() => {}),
        },
      }))
      mock.module('../src/lib/rate-limiter/fetch-config', () => ({
        fetchDailyRateLimit: mock(async () => 100),
      }))
      mock.module('../src/lib/rate-limiter/rate-limiter', () => ({
        RateLimiter: class {},
      }))
      mock.module('../src/lib/sentry', () => ({
        Sentry: {
          setContext: mock(() => {}),
          captureException: sentryCaptureException,
        },
      }))
      mock.module('../src/lib/soul', () => ({
        seedSoulTemplate: mock(async () => {}),
      }))
      mock.module('../src/skills/migrate', () => ({
        migrateBuiltinSkills: mock(async () => {}),
      }))
      mock.module('../src/skills/remote-sync', () => ({
        syncBuiltinSkills: mock(async () => {}),
        startSkillSync: mock(() => {}),
        stopSkillSync: mock(() => {}),
      }))
      mock.module('../src/tools/registry', () => ({
        registry: {
          names: () => ['test_tool'],
        },
      }))

      const { Application } = await import('../src/main')
      const app = new Application(config)

      await app.start()

      expect(controllerStart).toHaveBeenCalledTimes(1)
      expect(cdpConnect).toHaveBeenCalledTimes(1)
      expect(createHttpServer).toHaveBeenCalledTimes(1)
      expect(sentryCaptureException).toHaveBeenCalledTimes(1)
      expect(sentryCaptureException).toHaveBeenCalledWith(controllerError)
      expect(processExit).not.toHaveBeenCalled()

      const warningCall = loggerWarn.mock.calls.find(
        ([message]) =>
          message ===
          'Controller WebSocket server unavailable, continuing without controller bridge',
      )
      expect(warningCall).toBeDefined()
      expect(warningCall?.[1]).toEqual({
        port: config.extensionPort,
        error: 'bind failed',
      })

      const portConflictCall = loggerWarn.mock.calls.find(
        ([message]) =>
          message ===
          'Controller WebSocket port is already in use, continuing without controller bridge',
      )
      expect(portConflictCall).toBeDefined()
      expect(portConflictCall?.[1]).toEqual({
        port: config.extensionPort,
      })
      expect(
        loggerInfo.mock.calls.some(
          ([message]) => message === '  Controller Server: unavailable',
        ),
      ).toBe(true)
      expect(loggerError).not.toHaveBeenCalled()
    } finally {
      process.exit = originalExit
    }
  })

  it('registers bootstrap proxy auth rule from environment before controller startup', async () => {
    const createHttpServer = mock(async () => ({}))
    const controllerStart = mock(async () => {})
    const registerBootstrapProxyAuthRule = mock(() => {})
    const cdpConnect = mock(async () => {})
    const loggerInfo = mock(() => {})
    const loggerWarn = mock(() => {})
    const loggerDebug = mock(() => {})
    const loggerError = mock(() => {})

    const originalProxyServer = process.env.BROWSER_OPS_PROXY_SERVER
    const originalUser = process.env.BROWSER_OPS_PROXY_AUTH_USERNAME_RESOLVED
    const originalPass = process.env.BROWSER_OPS_PROXY_AUTH_PASSWORD_RESOLVED

    process.env.BROWSER_OPS_PROXY_SERVER = 'http://proxy.example.com:8443'
    process.env.BROWSER_OPS_PROXY_AUTH_USERNAME_RESOLVED = 'proxy-user'
    process.env.BROWSER_OPS_PROXY_AUTH_PASSWORD_RESOLVED = 'proxy-pass'

    try {
      mock.module('../src/api/server', () => ({
        createHttpServer,
      }))
      mock.module('../src/browser/backends/controller', () => ({
        ControllerBackend: class {
          registerBootstrapProxyAuthRule(
            rule: Record<string, unknown>,
          ): void {
            registerBootstrapProxyAuthRule(rule)
          }
          clearBootstrapProxyAuthRule(): void {}
          getBootstrapProxyAuthRuleCount(): number {
            return 1
          }

          async start(): Promise<void> {
            await controllerStart()
          }

          async stop(): Promise<void> {}

          isConnected(): boolean {
            return false
          }

          async send(): Promise<never> {
            throw new Error('BrowserOS helper service not connected')
          }

          getWindowOwnerClientId(): string | null {
            return null
          }

          listOwnedWindows() {
            return []
          }

          clearBootstrapProxyAuthRule(): void {}
        },
      }))
      mock.module('../src/browser/backends/cdp', () => ({
        CdpBackend: class {
          async connect(): Promise<void> {
            await cdpConnect()
          }
        },
      }))
      mock.module('../src/browser/browser', () => ({
        Browser: class {},
      }))
      mock.module('../src/lib/browseros-dir', () => ({
        ensureBrowserosDir: mock(async () => {}),
        cleanOldSessions: mock(async () => {}),
        getBrowserosDir: mock(() => '/tmp/browseros'),
        getSkillsDir: mock(() => '/tmp/browseros/skills'),
        getBuiltinSkillsDir: mock(() => '/tmp/browseros/skills/builtin'),
        getBrowserOpsDir: mock(() => '/tmp/browseros/browser-ops'),
        getBrowserOpsProfilesDir: mock(
          () => '/tmp/browseros/browser-ops/profiles',
        ),
        getBrowserOpsCookieVaultsDir: mock(
          () => '/tmp/browseros/browser-ops/cookie-vaults',
        ),
        getBrowserOpsRuntimeSpecsDir: mock(
          () => '/tmp/browseros/browser-ops/runtime-specs',
        ),
        getBrowserOpsRuntimeAssetsDir: mock(
          () => '/tmp/browseros/browser-ops/runtime-assets',
        ),
        getBrowserOpsLaunchBundlesDir: mock(
          () => '/tmp/browseros/browser-ops/launch-bundles',
        ),
        getBrowserOpsLaunchExecutionsDir: mock(
          () => '/tmp/browseros/browser-ops/launch-executions',
        ),
        getBrowserOpsInstancesDir: mock(
          () => '/tmp/browseros/browser-ops/instances',
        ),
        getBrowserOpsInstanceEventsDir: mock(
          () => '/tmp/browseros/browser-ops/instance-events',
        ),
      }))
      mock.module('../src/lib/db', () => ({
        initializeDb: mock(() => ({})),
      }))
      mock.module('../src/lib/identity', () => ({
        identity: {
          initialize: mock(() => {}),
          getBrowserOSId: mock(() => 'browseros-id'),
        },
      }))
      mock.module('../src/lib/logger', () => ({
        logger: {
          setLogFile: mock(() => {}),
          info: loggerInfo,
          warn: loggerWarn,
          debug: loggerDebug,
          error: loggerError,
        },
      }))
      mock.module('../src/lib/metrics', () => ({
        metrics: {
          initialize: mock(() => {}),
          isEnabled: mock(() => true),
          log: mock(() => {}),
        },
      }))
      mock.module('../src/lib/rate-limiter/fetch-config', () => ({
        fetchDailyRateLimit: mock(async () => 100),
      }))
      mock.module('../src/lib/rate-limiter/rate-limiter', () => ({
        RateLimiter: class {},
      }))
      mock.module('../src/lib/sentry', () => ({
        Sentry: {
          setContext: mock(() => {}),
          captureException: mock(() => {}),
        },
      }))
      mock.module('../src/lib/soul', () => ({
        seedSoulTemplate: mock(async () => {}),
      }))
      mock.module('../src/skills/migrate', () => ({
        migrateBuiltinSkills: mock(async () => {}),
      }))
      mock.module('../src/skills/remote-sync', () => ({
        syncBuiltinSkills: mock(async () => {}),
        startSkillSync: mock(() => {}),
        stopSkillSync: mock(() => {}),
      }))
      mock.module('../src/tools/registry', () => ({
        registry: {
          names: () => ['test_tool'],
        },
      }))

      const { Application } = await import('../src/main')
      const app = new Application(config)

      await app.start()

      expect(registerBootstrapProxyAuthRule).toHaveBeenCalledTimes(1)
      expect(registerBootstrapProxyAuthRule).toHaveBeenCalledWith({
        ruleId: 'bootstrap-launch-proxy',
        host: 'proxy.example.com',
        port: 8443,
        username: 'proxy-user',
        password: 'proxy-pass',
      })
    } finally {
      if (originalProxyServer === undefined) delete process.env.BROWSER_OPS_PROXY_SERVER
      else process.env.BROWSER_OPS_PROXY_SERVER = originalProxyServer
      if (originalUser === undefined) delete process.env.BROWSER_OPS_PROXY_AUTH_USERNAME_RESOLVED
      else process.env.BROWSER_OPS_PROXY_AUTH_USERNAME_RESOLVED = originalUser
      if (originalPass === undefined) delete process.env.BROWSER_OPS_PROXY_AUTH_PASSWORD_RESOLVED
      else process.env.BROWSER_OPS_PROXY_AUTH_PASSWORD_RESOLVED = originalPass
    }
  })
})
