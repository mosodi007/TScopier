import { callEdgeFunction, getWorkerUrl } from '@tscopier/shared'
import { supabase } from '@/lib/supabase'

export type FxsocketStreamTopic = 'account' | 'positions' | 'trades' | 'terminal'

export interface FxsocketStreamMessage {
  type: FxsocketStreamTopic | string
  data?: unknown
}

export interface FxsocketStreamHandle {
  close(): void
}

const LIVE_TOPICS: FxsocketStreamTopic[] = ['account', 'positions', 'trades']

async function ensureFreshAuthSession(): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error('Not signed in')
  return token
}

async function resolveBrokerStreamUrl(brokerAccountId: string, token: string): Promise<string> {
  try {
    const { ok, data } = await callEdgeFunction<{ ws_url?: string; error?: string }>(
      'fxsocket-broker',
      {
        accessToken: token,
        body: { action: 'stream_ticket', broker_account_id: brokerAccountId },
        timeoutMs: 30_000,
      },
    )
    if (ok && data.ws_url) {
      const u = new URL(data.ws_url)
      u.searchParams.set('token', token)
      return u.toString()
    }
  } catch { /* fallback */ }

  const raw = getWorkerUrl()
  if (!raw) throw new Error('Worker URL is not configured')
  const httpBase = raw.startsWith('http') ? raw : `https://${raw}`
  const u = new URL(httpBase.replace(/\/+$/, ''))
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:'
  u.pathname = '/broker/stream'
  u.search = new URLSearchParams({ broker_account_id: brokerAccountId, token }).toString()
  return u.toString()
}

export async function openFxsocketStream(
  brokerAccountId: string,
  handlers: {
    onMessage?: (msg: FxsocketStreamMessage) => void
    onStateChange?: (connected: boolean) => void
    onError?: (message: string) => void
  },
): Promise<FxsocketStreamHandle> {
  let ws: WebSocket | null = null
  let closed = false
  let connecting = false
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectAttempt = 0

  const sendFrame = (frame: Record<string, unknown>) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify(frame))
  }

  const subscribeLiveTopics = () => {
    for (const topic of LIVE_TOPICS) {
      sendFrame({ action: 'subscribe', topic })
    }
  }

  const scheduleReconnect = () => {
    if (closed || reconnectTimer) return
    const delay = Math.min(30_000, 1_000 * 2 ** reconnectAttempt)
    reconnectAttempt += 1
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      void connect()
    }, delay)
  }

  const connect = async () => {
    if (closed || connecting) return
    connecting = true
    try {
      const token = await ensureFreshAuthSession()
      const url = await resolveBrokerStreamUrl(brokerAccountId, token)
      try { ws?.close() } catch { /* ignore */ }
      const socket = new WebSocket(url)
      ws = socket

      socket.onopen = () => {
        connecting = false
        reconnectAttempt = 0
        handlers.onStateChange?.(true)
        subscribeLiveTopics()
      }
      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data)) as FxsocketStreamMessage
          handlers.onMessage?.(msg)
        } catch { /* ignore */ }
      }
      socket.onerror = () => {
        connecting = false
        handlers.onError?.('WebSocket error')
      }
      socket.onclose = () => {
        connecting = false
        handlers.onStateChange?.(false)
        if (!closed) scheduleReconnect()
      }
    } catch (e) {
      connecting = false
      handlers.onError?.(e instanceof Error ? e.message : 'Connect failed')
      scheduleReconnect()
    }
  }

  void connect()

  return {
    close: () => {
      closed = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      try { ws?.close() } catch { /* ignore */ }
    },
  }
}
