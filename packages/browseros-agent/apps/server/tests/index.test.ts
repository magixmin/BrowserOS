/**
 * @license
 * Copyright 2025 BrowserOS
 */

import { afterAll, beforeAll, describe, it } from 'bun:test'
import assert from 'node:assert'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { Hono } from 'hono'
import type { Browser, PageInfo } from '../src/browser/browser'
import { createMcpRoutes } from '../src/api/routes/mcp'
import { registry } from '../src/tools/registry'

function createBrowserStub(): Browser {
  const pages: PageInfo[] = [
    {
      pageId: 1,
      targetId: 'target-1',
      tabId: 101,
      url: 'about:blank',
      title: 'Blank',
      isActive: true,
      isLoading: false,
      loadProgress: 100,
      isPinned: false,
      isHidden: false,
      windowId: 1,
      index: 0,
    },
  ]

  return {
    listPages: async () => pages,
    isCdpConnected: () => true,
    getTabIdForPage: (pageId: number) =>
      pages.find((page) => page.pageId === pageId)?.tabId,
  } as unknown as Browser
}

function textOf(result: { content: { type: string; text?: string }[] }): string {
  return result.content
    .filter((item) => item.type === 'text')
    .map((item) => item.text ?? '')
    .join('\n')
}

let server: Bun.Server | null = null
let client: Client | null = null
let transport: StreamableHTTPClientTransport | null = null

describe('mcp route smoke tests', () => {
  beforeAll(async () => {
    const app = new Hono().route(
      '/mcp',
      createMcpRoutes({
        version: 'test',
        registry,
        browser: createBrowserStub(),
        executionDir: '/tmp/browseros-test-execution',
        resourcesDir: '/tmp/browseros-test-resources',
        klavisProxy: null,
      }),
    )

    server = Bun.serve({
      port: 0,
      fetch: app.fetch,
    })

    transport = new StreamableHTTPClientTransport(
      new URL(`http://127.0.0.1:${server.port}/mcp`),
    )
    client = new Client({
      name: 'browseros-mcp-smoke-test',
      version: '1.0.0',
    })

    await client.connect(transport)
  })

  afterAll(async () => {
    if (transport) {
      await transport.close()
      transport = null
    }
    client = null
    server?.stop(true)
    server = null
  })

  it('calls list_pages successfully', async () => {
    assert.ok(client, 'MCP client should be connected')

    const result = await client.callTool({
      name: 'list_pages',
      arguments: {},
    })

    assert.ok(!result.isError, textOf(result))
    assert.ok(result.structuredContent, 'Expected structured content')
    assert.ok(
      textOf(result).includes('about:blank'),
      'Expected page URL in MCP response',
    )
  })

  it('calls list_pages multiple times without conflicts', async () => {
    assert.ok(client, 'MCP client should be connected')

    const first = await client.callTool({
      name: 'list_pages',
      arguments: {},
    })
    const second = await client.callTool({
      name: 'list_pages',
      arguments: {},
    })

    assert.ok(!first.isError, textOf(first))
    assert.ok(!second.isError, textOf(second))
    assert.ok(second.structuredContent, 'Expected repeated call to succeed')
  })

  it('exposes the full local registry tool set', async () => {
    assert.ok(client, 'MCP client should be connected')

    const { tools } = await client.listTools()
    const exposedNames = tools.map((tool) => tool.name).sort()
    const definedNames = registry.names().slice().sort()

    assert.deepStrictEqual(exposedNames, definedNames)
  })
})
