import WebSocket from 'ws'
import { normalizeFxsocketWsMessage } from './fxsocketStreamNormalize'
import {
  fxsocketSocketOutageGraceMs,
  hashHealthResourceId,
  SustainedOutageTracker,
} from './observability/criticalHealth'

const DEFAULT_BASE_URL = 'https://api.fxsocket.com'

export type FxsocketWsTopic = 'prices' | 'bars' | 'account' | 'positions' | 'trades' | 'terminal'

export interface FxsocketWsSubscribeFrame {
  action: 'subscribe' | 'unsubscribe'
  topic: FxsocketWsTopic
  symbol?: string
  timeframe?: string
}

export type FxsocketWsServerMessage =
  | { type: 'tick'; symbol: string; data: Record<string, unknown> }
  | { type: 'bar'; symbol: string; timeframe: string; data: Record<string, unknown> }
  | { type: 'account'; data: Record<string, unknown> }
  | { type: 'positions'; data: unknown[] }
  | { type: 'trade'; data: Record<string, unknown> }
  | { type: 'terminal'; data: Record<string, unknown> }
  | { type: 'subscribed' | 'unsubscribed' | 'error' | 'warning'; [key: string]: unknown }

export type FxsocketWsMessageHandler = (msg: FxsocketWsServerMessage) => void
type FxsocketWsHealthMonitor = Pick<
  SustainedOutageTracker,
  'recordActivity' | 'recordConnected' | 'recordDisconnected' | 'recordReconnectAttempt' | 'reset'
>

export interface FxsocketWsClientOptions {
  accountId: string
  apiKey: string
  baseUrl?: string
  platform?: 'MT4' | 'MT5'
  reconnect?: boolean
  reconnectDelayMs?: number
  maxReconnectDelayMs?: number
  onConnectionChange?: (connected: boolean) => void
  healthMonitor?: FxsocketWsHealthMonitor | null
}

function trimEnv(v: string | undefined): string {
  return (v ?? '').trim()
}

function wsBaseUrl(httpBase: string): string {
  const u = httpBase.replace(/\/+$/, '')
  if (u.startsWith('https://')) return `wss://${u.slice('https://'.length)}`
  if (u.startsWith('http://')) return `ws://${u.slice('http://'.length)}`
  return `wss://${u}`
}

function wsEndpointHost(wsUrl: string): string {
  try {
    return new URL(wsUrl).host.slice(0, 120)
  } catch {
    return 'fxsocket'
  }
}

function subscriptionKey(frame: FxsocketWsSubscribeFrame): string {
  const parts = [frame.action === 'subscribe' ? 'sub' : 'unsub', frame.topic]
  if (frame.symbol) parts.push(frame.symbol)
  if (frame.timeframe) parts.push(frame.timeframe)
  return parts.join(':')
}

export class FxsocketWsClient {
  private readonly accountId: string
  private readonly apiKey: string
  private readonly wsUrl: string
  private readonly reconnect: boolean
  private readonly reconnectDelayMs: number
  private readonly maxReconnectDelayMs: number
  private readonly onConnectionChange?: (connected: boolean) => void
  private readonly healthMonitor: FxsocketWsHealthMonitor | null

  private ws: WebSocket | null = null
  private handlers = new Set<FxsocketWsMessageHandler>()
  private activeSubscriptions = new Map<string, FxsocketWsSubscribeFrame>()
  private intentionalClose = false
  private reconnectTimer: NodeJS.Timeout | null = null
  private reconnectAttempt = 0

  constructor(opts: FxsocketWsClientOptions) {
    const base = trimEnv(opts.baseUrl) || trimEnv(process.env.FXSOCKET_BASE_URL) || DEFAULT_BASE_URL
    const id = String(opts.accountId ?? '').trim()
    const key = String(opts.apiKey ?? '').trim()
    if (!id) throw new Error('FxsocketWsClient: accountId required')
    if (!key) throw new Error('FxsocketWsClient: apiKey required')

    this.accountId = id
    this.apiKey = key
    const segment = opts.platform === 'MT4' ? 'mt4' : 'mt5'
    this.wsUrl = `${wsBaseUrl(base)}/${segment}/${encodeURIComponent(id)}/ws?api_key=${encodeURIComponent(key)}`
    this.reconnect = opts.reconnect !== false
    this.reconnectDelayMs = Math.max(500, opts.reconnectDelayMs ?? 2_000)
    this.maxReconnectDelayMs = Math.max(this.reconnectDelayMs, opts.maxReconnectDelayMs ?? 60_000)
    this.onConnectionChange = opts.onConnectionChange
    this.healthMonitor = opts.healthMonitor === null
      ? null
      : opts.healthMonitor ?? new SustainedOutageTracker({
        component: 'fx_socket',
        failureClass: 'sustained_outage',
        provider: 'fxsocket',
        graceMs: fxsocketSocketOutageGraceMs(),
        reasonCode: 'FXSOCKET_SOCKET_SUSTAINED_OUTAGE',
        message: 'critical_health.fx_socket.sustained_outage',
        fingerprint: ['critical_health', 'fx_socket', 'sustained_outage', 'fxsocket'],
        dedupeKey: `fx_socket|fxsocket|${segment}|${wsEndpointHost(this.wsUrl)}`,
        metadata: {
          endpoint_host: wsEndpointHost(this.wsUrl),
          platform: segment.toUpperCase(),
          account_id_hash: hashHealthResourceId(id),
          reconnect_enabled: this.reconnect,
        },
      })
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  onMessage(handler: FxsocketWsMessageHandler): () => void {
    this.handlers.add(handler)
    return () => { this.handlers.delete(handler) }
  }

  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return
    }
    this.intentionalClose = false
    this.clearReconnectTimer()

    const ws = new WebSocket(this.wsUrl, {
      handshakeTimeout: 15_000,
      perMessageDeflate: false,
    })
    this.ws = ws

    ws.on('open', () => {
      if (this.ws !== ws) return
      this.reconnectAttempt = 0
      this.reportHealth(monitor => monitor.recordConnected({ reason: 'socket_open' }))
      this.onConnectionChange?.(true)
      for (const frame of this.activeSubscriptions.values()) {
        this.sendFrame(frame)
      }
    })

    ws.on('message', (data) => {
      if (this.ws !== ws) return
      const msg = this.parseMessage(data)
      if (!msg) return
      this.reportHealth(monitor => monitor.recordActivity())
      for (const handler of this.handlers) {
        try { handler(msg) } catch (e) {
          console.warn('[fxsocketWsClient] handler error:', e instanceof Error ? e.message : e)
        }
      }
    })

    ws.on('close', () => {
      if (this.ws !== ws) return
      this.ws = null
      this.onConnectionChange?.(false)
      if (!this.intentionalClose && this.reconnect && this.handlers.size > 0) {
        this.reportHealth(monitor => monitor.recordDisconnected({
          reconnectAttempt: this.reconnectAttempt,
          reason: 'socket_close',
        }))
        this.scheduleReconnect()
      } else {
        this.reportHealth(monitor => monitor.reset())
      }
    })

    ws.on('error', (err) => {
      if (this.ws !== ws) return
      console.warn(`[fxsocketWsClient] socket error account=${this.accountId}:`, err.message)
    })
  }

  close(): void {
    this.intentionalClose = true
    this.clearReconnectTimer()
    this.reportHealth(monitor => monitor.reset())
    if (this.ws) {
      try { this.ws.close() } catch { /* ignore */ }
      this.ws = null
    }
  }

  subscribe(frame: Omit<FxsocketWsSubscribeFrame, 'action'>): void {
    const full: FxsocketWsSubscribeFrame = { action: 'subscribe', ...frame }
    this.activeSubscriptions.set(subscriptionKey(full), full)
    this.connect()
    this.sendFrame(full)
  }

  unsubscribe(frame: Omit<FxsocketWsSubscribeFrame, 'action'>): void {
    const full: FxsocketWsSubscribeFrame = { action: 'unsubscribe', ...frame }
    const key = subscriptionKey({ action: 'subscribe', topic: frame.topic, symbol: frame.symbol, timeframe: frame.timeframe })
    this.activeSubscriptions.delete(key)
    this.sendFrame(full)
    if (this.handlers.size === 0 && this.activeSubscriptions.size === 0) {
      this.close()
    }
  }

  private sendFrame(frame: FxsocketWsSubscribeFrame): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    try {
      this.ws.send(JSON.stringify(frame))
    } catch (e) {
      console.warn('[fxsocketWsClient] send failed:', e instanceof Error ? e.message : e)
    }
  }

  private parseMessage(data: WebSocket.RawData): FxsocketWsServerMessage | null {
    const text = typeof data === 'string' ? data : data.toString('utf8')
    if (!text.trim()) return null
    try {
      const parsed = JSON.parse(text) as unknown
      return normalizeFxsocketWsMessage(parsed)
    } catch {
      console.warn('[fxsocketWsClient] invalid JSON frame:', text.slice(0, 200))
    }
    return null
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return
    const delay = Math.min(
      this.maxReconnectDelayMs,
      this.reconnectDelayMs * Math.pow(1.5, this.reconnectAttempt),
    )
    this.reconnectAttempt += 1
    this.reportHealth(monitor => monitor.recordReconnectAttempt({
      reconnectAttempt: this.reconnectAttempt,
      reconnectDelayMs: delay,
      reason: 'reconnect_scheduled',
    }))
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (!this.intentionalClose) this.connect()
    }, delay)
    this.reconnectTimer.unref?.()
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private reportHealth(fn: (monitor: FxsocketWsHealthMonitor) => void): void {
    if (!this.healthMonitor) return
    try {
      fn(this.healthMonitor)
    } catch {
      // Observability must never affect socket lifecycle, reconnect, or handlers.
    }
  }
}

export function buildFxsocketWsUrl(
  accountId: string,
  apiKey: string,
  baseUrl?: string,
  platform: 'MT4' | 'MT5' = 'MT5',
): string {
  const base = trimEnv(baseUrl) || trimEnv(process.env.FXSOCKET_BASE_URL) || DEFAULT_BASE_URL
  const segment = platform === 'MT4' ? 'mt4' : 'mt5'
  return `${wsBaseUrl(base)}/${segment}/${encodeURIComponent(accountId)}/ws?api_key=${encodeURIComponent(apiKey)}`
}
