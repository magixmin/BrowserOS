/**
 * @license
 * Copyright 2025 BrowserOS
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export interface ProxyAuthRule {
  ruleId: string
  host: string
  port: number | null
  username: string
  password: string
  tabId?: number
}

export class ProxyAuthManager {
  private static instance: ProxyAuthManager | null = null
  private rules = new Map<string, ProxyAuthRule>()
  private initialized = false

  static getInstance(): ProxyAuthManager {
    if (!ProxyAuthManager.instance) {
      ProxyAuthManager.instance = new ProxyAuthManager()
    }
    return ProxyAuthManager.instance
  }

  private constructor() {
    this.ensureListener()
  }

  setRule(rule: ProxyAuthRule): { ruleId: string; activeRuleCount: number } {
    this.rules.set(rule.ruleId, rule)
    return { ruleId: rule.ruleId, activeRuleCount: this.rules.size }
  }

  clearRule(ruleId: string): { removed: boolean; activeRuleCount: number } {
    const removed = this.rules.delete(ruleId)
    return { removed, activeRuleCount: this.rules.size }
  }

  private ensureListener(): void {
    if (this.initialized) return
    this.initialized = true

    chrome.webRequest.onAuthRequired.addListener(
      (
        details: chrome.webRequest.OnAuthRequiredDetails,
        callback?: (response: chrome.webRequest.BlockingResponse) => void,
      ): chrome.webRequest.BlockingResponse | undefined => {
        if (!details.isProxy) {
          callback?.({})
          return undefined
        }

        const host = details.challenger?.host
        const port = details.challenger?.port ?? null
        const tabId = details.tabId

        const rule = [...this.rules.values()].find((candidate) => {
          if (candidate.host !== host) return false
          if (candidate.port !== null && candidate.port !== port) return false
          if (
            typeof candidate.tabId === 'number' &&
            candidate.tabId !== tabId
          ) {
            return false
          }
          return true
        })

        if (!rule) {
          callback?.({})
          return undefined
        }

        callback?.({
          authCredentials: {
            username: rule.username,
            password: rule.password,
          },
        })
        return undefined
      },
      { urls: ['<all_urls>'] },
      ['asyncBlocking'],
    )
  }
}
