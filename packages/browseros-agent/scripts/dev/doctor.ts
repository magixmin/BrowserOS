#!/usr/bin/env bun
import { access, readFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { createConnection } from 'node:net'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

type Ports = {
  cdp: number
  server: number
  extension: number
}

type EnvSnapshot = {
  path: string
  ports: Ports
  browserBinary?: string
  viteServerPort?: number
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')
const SERVER_ENV_PATH = join(ROOT, 'apps/server/.env.development')
const AGENT_ENV_PATH = join(ROOT, 'apps/agent/.env.development')

function parseEnv(content: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const separatorIndex = line.indexOf('=')
    if (separatorIndex < 0) continue
    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim()
    result[key] = value
  }
  return result
}

async function readEnvSnapshot(path: string): Promise<EnvSnapshot> {
  const content = await readFile(path, 'utf8')
  const env = parseEnv(content)
  return {
    path,
    ports: {
      cdp: Number(env.BROWSEROS_CDP_PORT) || 0,
      server: Number(env.BROWSEROS_SERVER_PORT) || 0,
      extension: Number(env.BROWSEROS_EXTENSION_PORT) || 0,
    },
    browserBinary: env.BROWSEROS_BINARY,
    viteServerPort: env.VITE_BROWSEROS_SERVER_PORT
      ? Number(env.VITE_PUBLIC_BROWSEROS_SERVER_PORT || env.VITE_BROWSEROS_SERVER_PORT)
      : undefined,
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}

async function isTcpReachable(port: number): Promise<boolean> {
  return await new Promise((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port })
    const finalize = (value: boolean) => {
      socket.removeAllListeners()
      try {
        socket.destroy()
      } catch {
        // ignore
      }
      resolve(value)
    }
    socket.setTimeout(1000)
    socket.once('connect', () => finalize(true))
    socket.once('error', () => finalize(false))
    socket.once('timeout', () => finalize(false))
  })
}

async function getCdpStatus(port: number): Promise<{
  reachable: boolean
  ok: boolean
  detail: string
}> {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/json/version`, {
      signal: AbortSignal.timeout(1500),
    })
    if (!response.ok) {
      return {
        reachable: true,
        ok: false,
        detail: `HTTP ${response.status}`,
      }
    }
    const json = (await response.json()) as { Browser?: string }
    return {
      reachable: true,
      ok: true,
      detail: json.Browser ?? 'ok',
    }
  } catch (error) {
    return {
      reachable: false,
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    }
  }
}

function printSection(title: string): void {
  console.log(`\n${title}`)
}

function printCheck(
  label: string,
  ok: boolean,
  detail?: string,
): void {
  console.log(`${ok ? 'OK ' : 'ERR'} ${label}${detail ? `: ${detail}` : ''}`)
}

function samePorts(left: Ports, right: Ports): boolean {
  return (
    left.cdp === right.cdp &&
    left.server === right.server &&
    left.extension === right.extension
  )
}

async function main() {
  const [serverEnv, agentEnv] = await Promise.all([
    readEnvSnapshot(SERVER_ENV_PATH),
    readEnvSnapshot(AGENT_ENV_PATH),
  ])

  printSection('Env')
  console.log(
    `Server ports: CDP=${serverEnv.ports.cdp} HTTP=${serverEnv.ports.server} EXT=${serverEnv.ports.extension}`,
  )
  console.log(
    `Agent ports:  CDP=${agentEnv.ports.cdp} HTTP=${agentEnv.ports.server} EXT=${agentEnv.ports.extension}`,
  )
  printCheck(
    'Server/agent ports are aligned',
    samePorts(serverEnv.ports, agentEnv.ports),
  )
  printCheck(
    'Agent VITE server port matches server port',
    agentEnv.viteServerPort === undefined ||
      agentEnv.viteServerPort === serverEnv.ports.server,
    agentEnv.viteServerPort !== undefined
      ? `${agentEnv.viteServerPort} vs ${serverEnv.ports.server}`
      : 'unset',
  )

  printSection('Binary')
  const browserBinary =
    agentEnv.browserBinary || '/Applications/BrowserOS.app/Contents/MacOS/BrowserOS'
  printCheck(
    'BrowserOS binary exists',
    await fileExists(browserBinary),
    browserBinary,
  )

  printSection('Ports')
  const [cdpTcp, serverTcp, extensionTcp, cdpHttp] = await Promise.all([
    isTcpReachable(serverEnv.ports.cdp),
    isTcpReachable(serverEnv.ports.server),
    isTcpReachable(serverEnv.ports.extension),
    getCdpStatus(serverEnv.ports.cdp),
  ])
  printCheck(
    `CDP TCP reachable on ${serverEnv.ports.cdp}`,
    cdpTcp,
  )
  printCheck(
    `HTTP server reachable on ${serverEnv.ports.server}`,
    serverTcp,
  )
  printCheck(
    `Extension WS port reachable on ${serverEnv.ports.extension}`,
    extensionTcp,
  )
  printCheck(
    `CDP /json/version on ${serverEnv.ports.cdp}`,
    cdpHttp.ok,
    cdpHttp.detail,
  )

  printSection('Suggested next step')
  if (!samePorts(serverEnv.ports, agentEnv.ports)) {
    console.log('1. Align apps/server/.env.development and apps/agent/.env.development.')
  }
  if (!cdpHttp.ok) {
    console.log('2. Start BrowserOS with CDP, or run: bun scripts/dev/start.ts --manual --new')
  } else {
    console.log('2. CDP is up. You can now run: bun run start:server')
  }
}

await main()
