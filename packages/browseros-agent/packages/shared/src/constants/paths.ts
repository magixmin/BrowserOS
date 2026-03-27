/**
 * @license
 * Copyright 2025 BrowserOS
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Centralized file system paths.
 */

export const PATHS = {
  DEFAULT_EXECUTION_DIR: process.cwd(),
  BROWSEROS_DIR_NAME: '.browseros',
  MEMORY_DIR_NAME: 'memory',
  SESSIONS_DIR_NAME: 'sessions',
  BROWSER_OPS_DIR_NAME: 'browser-ops',
  BROWSER_OPS_PROFILES_DIR_NAME: 'profiles',
  BROWSER_OPS_COOKIE_VAULTS_DIR_NAME: 'cookie-vaults',
  BROWSER_OPS_RUNTIME_SPECS_DIR_NAME: 'runtime-specs',
  BROWSER_OPS_RUNTIME_ASSETS_DIR_NAME: 'runtime-assets',
  BROWSER_OPS_LAUNCH_BUNDLES_DIR_NAME: 'launch-bundles',
  BROWSER_OPS_LAUNCH_EXECUTIONS_DIR_NAME: 'launch-executions',
  BROWSER_OPS_INSTANCES_DIR_NAME: 'instances',
  BROWSER_OPS_INSTANCE_EVENTS_DIR_NAME: 'instance-events',
  TOOL_OUTPUT_DIR_NAME: 'tool-output',
  SOUL_FILE_NAME: 'SOUL.md',
  CORE_MEMORY_FILE_NAME: 'CORE.md',
  SKILLS_DIR_NAME: 'skills',
  BUILTIN_DIR_NAME: 'builtin',
  SOUL_MAX_LINES: 150,
  MEMORY_RETENTION_DAYS: 30,
  SESSION_RETENTION_DAYS: 30,
} as const
