import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type {
  BrowserOpsManagedInstance,
  BrowserOpsProxyVerification,
} from '@browseros/shared/browser-ops'
import { COUNTRY_PRESETS } from '@browseros/shared/browser-ops'

export interface BrowserOpsRuntimeInstanceVerifier {
  verifyProxy(
    instance: BrowserOpsManagedInstance,
    options?: { url?: string; previousVerification?: BrowserOpsProxyVerification | null },
  ): Promise<BrowserOpsProxyVerification>
}

function textOf(result: { content?: Array<{ type: string; text?: string }> }): string {
  return (result.content ?? [])
    .filter((item) => item.type === 'text')
    .map((item) => item.text ?? '')
    .join('\n')
}

function pageIdFromResult(result: {
  structuredContent?: Record<string, unknown>
  content?: Array<{ type: string; text?: string }>
}): number | null {
  const structuredPageId = result.structuredContent?.pageId
  if (typeof structuredPageId === 'number') {
    return structuredPageId
  }

  const text = textOf(result)
  const match = text.match(/Page ID:\s*(\d+)/i)
  return match ? Number(match[1]) : null
}

function detectIp(text: string): string | null {
  const ipv4 = text.match(/\b\d{1,3}(?:\.\d{1,3}){3}\b/)
  if (ipv4) return ipv4[0]

  const ipv6 = text.match(/\b(?:[a-fA-F0-9]{1,4}:){2,}[a-fA-F0-9]{1,4}\b/)
  return ipv6 ? ipv6[0] : null
}

function detectCountry(text: string): string | null {
  const compact = text.trim()

  const keyMatchers = [
    /"country(?:_code|Code|_iso)?"\s*:\s*"([A-Za-z]{2,3})"/i,
    /country(?:_code|Code|_iso)?\s*[:=]\s*([A-Za-z]{2,3})/i,
  ]

  for (const matcher of keyMatchers) {
    const match = compact.match(matcher)
    if (match?.[1]) {
      return match[1].toUpperCase()
    }
  }

  for (const preset of Object.values(COUNTRY_PRESETS)) {
    if (compact.toLowerCase().includes(preset.label.toLowerCase())) {
      return preset.countryCode
    }
  }

  return null
}

export class BrowserOpsRuntimeInstanceVerifierService
  implements BrowserOpsRuntimeInstanceVerifier
{
  async verifyProxy(
    instance: BrowserOpsManagedInstance,
    options?: { url?: string; previousVerification?: BrowserOpsProxyVerification | null },
  ): Promise<BrowserOpsProxyVerification> {
    const targetUrl = options?.url ?? 'https://ifconfig.co/json'
    const previousVerification = options?.previousVerification ?? null
    const client = new Client({
      name: 'browserops-instance-verifier',
      version: '1.0.0',
    })
    const transport = new StreamableHTTPClientTransport(
      new URL(`http://127.0.0.1:${instance.ports.server}/mcp`),
    )

    let pageId: number | null = null

    try {
      await client.connect(transport)

      const openResult = (await client.callTool({
        name: 'new_hidden_page',
        arguments: { url: targetUrl },
      })) as {
        structuredContent?: Record<string, unknown>
        content?: Array<{ type: string; text?: string }>
      }

      pageId = pageIdFromResult(openResult)
      if (pageId === null) {
        return {
          instanceId: instance.instanceId,
          checkedAt: new Date().toISOString(),
          targetUrl,
          status: 'failed',
          verdict: 'failed',
          observedText: textOf(openResult) || null,
          detectedIp: null,
          detectedCountry: null,
          sessionVerdict: instance.proxy?.sessionId ? 'unknown' : 'not-applicable',
          expectedProxy: instance.proxy
            ? {
                providerName: instance.proxy.providerName,
                serverArg: instance.proxy.serverArg,
                sessionId: instance.proxy.sessionId,
                country: instance.proxy.country,
              }
            : null,
          bootstrapConfigured: instance.health.proxyAuthBootstrapConfigured,
          notes: ['Failed to determine verification page ID from MCP result.'],
        }
      }

      const contentResult = (await client.callTool({
        name: 'get_page_content',
        arguments: { page: pageId },
      })) as {
        content?: Array<{ type: string; text?: string }>
      }

      const observedText = textOf(contentResult).trim() || null
      const detectedIp = observedText ? detectIp(observedText) : null
      const detectedCountry = observedText ? detectCountry(observedText) : null
      const expectedCountry = instance.proxy?.country ?? null
      const countryMatches =
        expectedCountry === null ||
        detectedCountry === null ||
        expectedCountry.toUpperCase() === detectedCountry.toUpperCase()
      const sessionVerdict =
        !instance.proxy?.sessionId
          ? 'not-applicable'
          : previousVerification?.detectedIp
            ? previousVerification.detectedIp === detectedIp
              ? 'consistent'
              : 'changed'
            : 'unknown'
      const verdict = !detectedIp
        ? 'failed'
        : expectedCountry !== null && detectedCountry !== null && !countryMatches
          ? 'failed'
          : sessionVerdict === 'changed'
            ? 'failed'
          : instance.health.proxyAuthBootstrapConfigured ||
              instance.proxy?.credentialSource !== 'env'
            ? 'verified'
            : 'inconclusive'

      return {
        instanceId: instance.instanceId,
        checkedAt: new Date().toISOString(),
        targetUrl,
        status: detectedIp ? 'verified' : 'failed',
        verdict,
        observedText,
        detectedIp,
        detectedCountry,
        sessionVerdict,
        expectedProxy: instance.proxy
          ? {
              providerName: instance.proxy.providerName,
              serverArg: instance.proxy.serverArg,
              sessionId: instance.proxy.sessionId,
              country: instance.proxy.country,
            }
          : null,
        bootstrapConfigured: instance.health.proxyAuthBootstrapConfigured,
        notes: !detectedIp
          ? ['Verification completed but no IP-like value was detected in page content.']
          : expectedCountry !== null &&
              detectedCountry !== null &&
              !countryMatches
            ? [
                `Observed country ${detectedCountry} does not match expected route country ${expectedCountry}.`,
              ]
          : sessionVerdict === 'changed'
            ? [
                `Observed IP ${detectedIp} drifted from previous sticky-session verification (${previousVerification?.detectedIp}).`,
              ]
          : verdict === 'verified'
            ? [
                `Observed public egress IP${detectedCountry ? ` (${detectedCountry})` : ''} and proxy bootstrap state is consistent with the instance configuration.`,
              ]
            : ['Observed public egress IP, but proxy bootstrap was not confirmed for an env-backed credential flow.'],
      }
    } catch (error) {
      return {
        instanceId: instance.instanceId,
        checkedAt: new Date().toISOString(),
        targetUrl,
        status: 'failed',
        verdict: 'failed',
        observedText: null,
        detectedIp: null,
        detectedCountry: null,
        sessionVerdict: instance.proxy?.sessionId ? 'unknown' : 'not-applicable',
        expectedProxy: instance.proxy
          ? {
              providerName: instance.proxy.providerName,
              serverArg: instance.proxy.serverArg,
              sessionId: instance.proxy.sessionId,
              country: instance.proxy.country,
            }
          : null,
        bootstrapConfigured: instance.health.proxyAuthBootstrapConfigured,
        notes: [
          error instanceof Error ? error.message : 'Instance proxy verification failed',
        ],
      }
    } finally {
      if (pageId !== null) {
        await client
          .callTool({
            name: 'close_page',
            arguments: { page: pageId },
          })
          .catch(() => {})
      }
      await transport.close().catch(() => {})
    }
  }
}
