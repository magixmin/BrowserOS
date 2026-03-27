import { TIMEOUTS } from '@browseros/shared/constants/timeouts'
import type { WebSocket } from 'ws'
import { WebSocketServer } from 'ws'
import { logger } from '../../lib/logger'
import type { ControllerBackend as IControllerBackend } from './types'

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timeout: NodeJS.Timeout
}

export class ControllerBackend implements IControllerBackend {
  private wss: WebSocketServer | null = null
  private port: number
  private clients = new Map<string, WebSocket>()
  private primaryClientId: string | null = null
  private clientWindows = new Map<string, Set<number>>()
  private focusedWindowId: number | null = null
  private requestCounter = 0
  private pendingRequests = new Map<string, PendingRequest>()
  private bootstrapProxyAuthRules = new Map<string, Record<string, unknown>>()

  constructor(config: { port: number }) {
    this.port = config.port
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.wss = new WebSocketServer({
        port: this.port,
        host: '127.0.0.1',
      })

      const onListening = () => {
        this.wss?.off('error', onError)
        logger.info(
          `Controller WebSocket server listening on ws://127.0.0.1:${this.port}`,
        )
        resolve()
      }

      const onError = (error: Error) => {
        this.wss?.off('listening', onListening)
        reject(error)
      }

      this.wss.once('listening', onListening)
      this.wss.once('error', onError)

      this.wss.on('connection', (ws: WebSocket) => {
        const clientId = this.registerClient(ws)
        logger.info('Extension connected', { clientId })

        ws.on('message', (data: Buffer) => {
          try {
            const message = data.toString()
            const parsed = JSON.parse(message)

            if (parsed.type === 'ping') {
              ws.send(JSON.stringify({ type: 'pong' }))
              return
            }
            if (parsed.type === 'focused') {
              this.handleFocusEvent(clientId, parsed.windowId)
              return
            }
            if (
              parsed.type === 'register_windows' ||
              parsed.type === 'window_created' ||
              parsed.type === 'window_removed'
            ) {
              this.handleWindowEvent(clientId, parsed)
              return
            }

            this.handleResponse(parsed)
          } catch (error) {
            logger.error(`Error parsing message from ${clientId}: ${error}`)
          }
        })

        ws.on('close', () => {
          logger.info('Extension disconnected', { clientId })
          this.handleClientDisconnect(clientId)
        })

        ws.on('error', (error: Error) => {
          logger.error(`WebSocket error for ${clientId}: ${error.message}`)
        })

        if (this.primaryClientId === clientId) {
          this.replayBootstrapProxyAuthRules()
        }
      })

      this.wss.on('error', (error: Error) => {
        logger.error(`WebSocket server error: ${error.message}`)
      })
    })
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      for (const [id, pending] of this.pendingRequests.entries()) {
        clearTimeout(pending.timeout)
        pending.reject(new Error('ControllerBackend stopping'))
        this.pendingRequests.delete(id)
      }

      for (const ws of this.clients.values()) {
        try {
          ws.close()
        } catch {
          // ignore
        }
      }
      this.clients.clear()
      this.primaryClientId = null

      if (this.wss) {
        this.wss.close(() => {
          logger.info('Controller WebSocket server closed')
          resolve()
        })
      } else {
        resolve()
      }
    })
  }

  isConnected(): boolean {
    return this.primaryClientId !== null
  }

  async send(
    action: string,
    payload?: Record<string, unknown>,
  ): Promise<unknown> {
    if (!this.isConnected()) {
      throw new Error('BrowserOS helper service not connected')
    }

    const client = this.primaryClientId
      ? this.clients.get(this.primaryClientId)
      : null
    if (!client) {
      throw new Error('BrowserOS helper service not connected')
    }

    const id = `${Date.now()}-${++this.requestCounter}`
    const timeoutMs = TIMEOUTS.CONTROLLER_BRIDGE

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error(`Request ${action} timed out after ${timeoutMs}ms`))
      }, timeoutMs)

      this.pendingRequests.set(id, { resolve, reject, timeout })

      try {
        const message = JSON.stringify({
          id,
          action,
          payload: payload ?? {},
        })
        client.send(message)
      } catch (error) {
        clearTimeout(timeout)
        this.pendingRequests.delete(id)
        reject(error)
      }
    })
  }

  registerBootstrapProxyAuthRule(rule: {
    ruleId: string
    host: string
    port: number | null
    username: string
    password: string
    tabId?: number
  }): void {
    this.bootstrapProxyAuthRules.set(
      rule.ruleId,
      rule as Record<string, unknown>,
    )
    if (this.isConnected()) {
      void this.send(
        'setProxyAuthRule',
        rule as unknown as Record<string, unknown>,
      ).catch((error) => {
        logger.warn('Failed to replay bootstrap proxy auth rule', {
          ruleId: rule.ruleId,
          error: error instanceof Error ? error.message : String(error),
        })
      })
    }
  }

  clearBootstrapProxyAuthRule(ruleId: string): void {
    this.bootstrapProxyAuthRules.delete(ruleId)
    if (this.isConnected()) {
      void this.send('clearProxyAuthRule', { ruleId }).catch((error) => {
        logger.warn('Failed to clear bootstrap proxy auth rule', {
          ruleId,
          error: error instanceof Error ? error.message : String(error),
        })
      })
    }
  }

  getBootstrapProxyAuthRuleCount(): number {
    return this.bootstrapProxyAuthRules.size
  }

  getWindowOwnerClientId(windowId: number): string | null {
    for (const [clientId, windowIds] of this.clientWindows.entries()) {
      if (windowIds.has(windowId)) {
        return clientId
      }
    }
    return null
  }

  listOwnedWindows(): Array<{
    clientId: string
    windowId: number
    isPrimaryClient: boolean
    isFocusedWindow: boolean
  }> {
    const ownedWindows: Array<{
      clientId: string
      windowId: number
      isPrimaryClient: boolean
      isFocusedWindow: boolean
    }> = []

    for (const [clientId, windowIds] of this.clientWindows.entries()) {
      for (const windowId of windowIds) {
        ownedWindows.push({
          clientId,
          windowId,
          isPrimaryClient: clientId === this.primaryClientId,
          isFocusedWindow: windowId === this.focusedWindowId,
        })
      }
    }

    return ownedWindows.sort((left, right) => left.windowId - right.windowId)
  }

  private handleResponse(response: {
    id: string
    ok: boolean
    data?: unknown
    error?: string
  }): void {
    const pending = this.pendingRequests.get(response.id)

    if (!pending) {
      logger.warn(`Received response for unknown request ID: ${response.id}`)
      return
    }

    clearTimeout(pending.timeout)
    this.pendingRequests.delete(response.id)

    if (response.ok) {
      pending.resolve(response.data)
    } else {
      pending.reject(new Error(response.error || 'Unknown error'))
    }
  }

  private registerClient(ws: WebSocket): string {
    const clientId = `client-${Date.now()}-${Math.floor(Math.random() * 1000000)}`
    this.clients.set(clientId, ws)
    this.clientWindows.set(clientId, new Set())

    if (!this.primaryClientId) {
      this.primaryClientId = clientId
      logger.info('Primary controller assigned', { clientId })
    } else {
      logger.info('Controller connected in standby mode', {
        clientId,
        primaryClientId: this.primaryClientId,
      })
    }

    return clientId
  }

  private handleClientDisconnect(clientId: string): void {
    const wasPrimary = this.primaryClientId === clientId
    const ownedWindows = this.clientWindows.get(clientId)
    this.clients.delete(clientId)
    this.clientWindows.delete(clientId)

    if (
      ownedWindows &&
      this.focusedWindowId !== null &&
      ownedWindows.has(this.focusedWindowId)
    ) {
      this.focusedWindowId = null
    }

    if (wasPrimary) {
      this.primaryClientId = null

      for (const [id, pending] of this.pendingRequests.entries()) {
        clearTimeout(pending.timeout)
        pending.reject(new Error('Primary connection closed'))
        this.pendingRequests.delete(id)
      }

      this.promoteNextPrimary()
    }
  }

  private promoteNextPrimary(): void {
    const nextEntry = this.clients.keys().next()
    if (nextEntry.done) {
      logger.warn('No controller connections available to promote')
      return
    }

    this.primaryClientId = nextEntry.value
    logger.info('Promoted controller to primary', {
      clientId: this.primaryClientId,
    })
    this.replayBootstrapProxyAuthRules()
  }

  private handleFocusEvent(clientId: string, windowId?: number): void {
    if (typeof windowId === 'number') {
      this.focusedWindowId = windowId
      const windows = this.clientWindows.get(clientId)
      windows?.add(windowId)
    }

    if (this.primaryClientId === clientId) {
      logger.debug('Focused window updated for current primary controller', {
        clientId,
        windowId,
      })
      return
    }

    const previousPrimary = this.primaryClientId
    this.primaryClientId = clientId
    logger.info('Primary controller reassigned due to focus event', {
      clientId,
      previousPrimary,
      windowId,
    })
    this.replayBootstrapProxyAuthRules()
  }

  private replayBootstrapProxyAuthRules(): void {
    if (!this.isConnected() || this.bootstrapProxyAuthRules.size === 0) {
      return
    }

    for (const [ruleId, payload] of this.bootstrapProxyAuthRules.entries()) {
      void this.send('setProxyAuthRule', payload).catch((error) => {
        logger.warn('Failed to replay bootstrap proxy auth rule', {
          ruleId,
          error: error instanceof Error ? error.message : String(error),
        })
      })
    }
  }

  private handleWindowEvent(
    clientId: string,
    message: {
      type: 'register_windows' | 'window_created' | 'window_removed'
      windowIds?: number[]
      windowId?: number
    },
  ): void {
    const windows = this.clientWindows.get(clientId)
    if (!windows) return

    if (message.type === 'register_windows') {
      windows.clear()
      for (const windowId of message.windowIds ?? []) {
        windows.add(windowId)
      }
      logger.info('Registered windows for controller client', {
        clientId,
        windowIds: [...windows],
      })
      return
    }

    if (typeof message.windowId !== 'number') return

    if (message.type === 'window_created') {
      windows.add(message.windowId)
      logger.debug('Registered created window for controller client', {
        clientId,
        windowId: message.windowId,
      })
      return
    }

    windows.delete(message.windowId)
    if (this.focusedWindowId === message.windowId) {
      this.focusedWindowId = null
    }
    logger.debug('Removed window for controller client', {
      clientId,
      windowId: message.windowId,
    })
  }
}
