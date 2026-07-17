import { callEdgeFunction } from '@tscopier/shared'
import { supabase } from '@/lib/supabase'
import { getLocalCalendarDayBounds } from '@/lib/dashboardTradeStats'
import { formatLocalMtApiDateTime } from '@/lib/mtApiDateTime'
import type { MtTrade } from '@/lib/mtTrade'
import { resolveBrokerConnectMs, type BrokerConnectAnchor } from '@/lib/tradesSinceConnect'

export const DASHBOARD_CHART_MT_HISTORY_DAYS = 10
export const DASHBOARD_MT_HISTORY_LIMIT = 5000
const FXSOCKET_TRADES_TIMEOUT_MS = 180_000

export function resolveDashboardMtHistoryFrom(
  accounts: readonly BrokerConnectAnchor[],
  historyDays: number = DASHBOARD_CHART_MT_HISTORY_DAYS,
): Date {
  const chartFrom = new Date()
  chartFrom.setDate(chartFrom.getDate() - historyDays)
  chartFrom.setHours(0, 0, 0, 0)

  let earliestConnectMs = Number.POSITIVE_INFINITY
  for (const account of accounts) {
    const connectMs = resolveBrokerConnectMs(account)
    if (connectMs != null) earliestConnectMs = Math.min(earliestConnectMs, connectMs)
  }

  if (Number.isFinite(earliestConnectMs)) {
    return new Date(Math.max(chartFrom.getTime(), earliestConnectMs))
  }
  return chartFrom
}

async function ensureFreshAuthSession(): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error('Not signed in')
  return token
}

/** Full broker history start (matches web Trades page). */
export const BROKER_FULL_HISTORY_FROM = '2000-01-01'

/** Pull open positions + closed deal history from linked FxSocket brokers. */
export async function fetchBrokerMtTrades(opts: {
  brokerId?: string
  historyDays?: number
  /** When true, request full MT history from 2000-01-01 (Trades page). */
  fullHistory?: boolean
  limit?: number
  accounts?: readonly BrokerConnectAnchor[]
  includeBalanceCashflow?: boolean
} = {}): Promise<MtTrade[]> {
  const historyDays = opts.historyDays ?? DASHBOARD_CHART_MT_HISTORY_DAYS
  const { tomorrowStart: historyTo } = getLocalCalendarDayBounds()
  const historyFromStr = opts.fullHistory
    ? BROKER_FULL_HISTORY_FROM
    : formatLocalMtApiDateTime(
        opts.accounts?.length
          ? resolveDashboardMtHistoryFrom(opts.accounts, historyDays)
          : (() => {
              const from = new Date()
              from.setDate(from.getDate() - historyDays)
              return from
            })(),
      )

  const token = await ensureFreshAuthSession()
  const { ok, data } = await callEdgeFunction<{ trades?: MtTrade[]; error?: string }>(
    'fxsocket-broker',
    {
      accessToken: token,
      timeoutMs: FXSOCKET_TRADES_TIMEOUT_MS,
      body: {
        action: 'trades',
        broker_id: opts.brokerId ?? '',
        scope: 'all',
        history_profile: 'trades',
        history_from: historyFromStr,
        history_to: formatLocalMtApiDateTime(historyTo),
        ...(opts.limit != null && opts.limit > 0 ? { limit: opts.limit } : {}),
        ...(opts.includeBalanceCashflow === false ? { include_balance_cashflow: false } : {}),
      },
    },
  )

  if (!ok) {
    throw new Error(data.error ?? 'Failed to load broker trade history')
  }
  return data.trades ?? []
}
