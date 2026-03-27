/**
 * @license
 * Copyright 2025 BrowserOS
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Hono } from 'hono'
import type { ControllerBackend } from '../../browser/backends/controller'

interface StatusDeps {
  controller: ControllerBackend
}

export function createStatusRoute(deps: StatusDeps) {
  const { controller } = deps

  return new Hono().get('/', (c) =>
    c.json({
      status: 'ok',
      extensionConnected: controller.isConnected(),
      proxyAuthBootstrapConfigured: controller.getBootstrapProxyAuthRuleCount() > 0,
      proxyAuthBootstrapRuleCount: controller.getBootstrapProxyAuthRuleCount(),
      browserOpsContext: {
        profileId: process.env.BROWSEROS_PROFILE_ID ?? null,
        sessionPartition: process.env.BROWSEROS_SESSION_PARTITION ?? null,
        launchContextId: process.env.BROWSER_OPS_LAUNCH_CONTEXT_ID ?? null,
        profileDir: process.env.BROWSER_OPS_PROFILE_DIR ?? null,
      },
    }),
  )
}
