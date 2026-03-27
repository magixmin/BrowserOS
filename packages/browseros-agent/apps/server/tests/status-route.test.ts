import { describe, expect, it } from 'bun:test'
import { createStatusRoute } from '../src/api/routes/status'

describe('status route', () => {
  it('exposes bootstrap proxy auth status', async () => {
    const app = createStatusRoute({
      controller: {
        isConnected: () => true,
        getBootstrapProxyAuthRuleCount: () => 2,
      } as never,
    })

    const response = await app.request('/')
    expect(response.status).toBe(200)

    const json = (await response.json()) as {
      status: string
      extensionConnected: boolean
      proxyAuthBootstrapConfigured: boolean
      proxyAuthBootstrapRuleCount: number
      browserOpsContext: {
        profileId: string | null
        sessionPartition: string | null
        launchContextId: string | null
        profileDir: string | null
      }
    }

    expect(json.status).toBe('ok')
    expect(json.extensionConnected).toBe(true)
    expect(json.proxyAuthBootstrapConfigured).toBe(true)
    expect(json.proxyAuthBootstrapRuleCount).toBe(2)
    expect(json.browserOpsContext.profileId).toBe(null)
  })
})
