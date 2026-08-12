import type { BrokerAccount } from '@tscopier/shared'
import type { FxsocketAccountStreamSnapshot } from '@/lib/fxsocketStreamParse'

export interface BrokerLiveSnapshot extends FxsocketAccountStreamSnapshot {
  openTrades?: number
}

export interface DayTradeSummary {
  taken: number
  won: number
  lost: number
  breakeven: number
  netPnl: number
}

export interface DashboardAggregateMetrics {
  totalEquity: number
  openPnl: number
  openTrades: number
  accountsConnected: number
}

interface TradeRow {
  status?: string | null
  profit?: number | null
  closed_at?: string | null
}

export function getLocalDayBounds(now = new Date()) {
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const tomorrowStart = new Date(todayStart)
  tomorrowStart.setDate(tomorrowStart.getDate() + 1)
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  return { todayStart, tomorrowStart, yesterdayStart }
}

export function summarizeClosedTrades(trades: TradeRow[], start: Date, end: Date): DayTradeSummary {
  let taken = 0
  let won = 0
  let lost = 0
  let breakeven = 0
  let netPnl = 0

  for (const t of trades) {
    if (t.status !== 'closed') continue
    if (!t.closed_at) continue
    const closedAt = new Date(t.closed_at)
    if (Number.isNaN(closedAt.getTime()) || closedAt < start || closedAt >= end) continue
    if (t.profit == null || !Number.isFinite(t.profit)) continue
    taken++
    netPnl += t.profit
    if (t.profit > 0) won++
    else if (t.profit < 0) lost++
    else breakeven++
  }

  return { taken, won, lost, breakeven, netPnl }
}

export function isBrokerConnected(broker: BrokerAccount): boolean {
  return broker.connection_status === 'connected' || broker.fxsocket_status === 'connected'
}

export function resolveBrokerSnapshot(
  broker: BrokerAccount,
  live?: BrokerLiveSnapshot,
): BrokerLiveSnapshot {
  const balance = live?.balance ?? broker.last_balance ?? undefined
  const equity = live?.equity ?? broker.last_equity ?? balance
  let openPnl = live?.openPnl
  if (openPnl == null && balance != null && equity != null) {
    openPnl = equity - balance
  }
  return {
    balance,
    equity,
    openPnl,
    openTrades: live?.openTrades,
    currency: live?.currency ?? broker.last_currency ?? undefined,
  }
}

export function computeAggregateMetrics(
  brokers: BrokerAccount[],
  liveByBroker: Record<string, BrokerLiveSnapshot>,
  dbOpenTrades = 0,
): DashboardAggregateMetrics {
  let totalEquity = 0
  let openPnl = 0
  let openTrades = 0
  let hasLiveOpenPnl = false

  for (const broker of brokers) {
    const snap = resolveBrokerSnapshot(broker, liveByBroker[broker.id])
    if (snap.equity != null && Number.isFinite(snap.equity)) totalEquity += snap.equity
    else if (snap.balance != null && Number.isFinite(snap.balance)) totalEquity += snap.balance

    if (isBrokerConnected(broker)) {
      if (snap.openPnl != null && Number.isFinite(snap.openPnl)) {
        openPnl += snap.openPnl
        hasLiveOpenPnl = true
      }
      if (typeof snap.openTrades === 'number' && Number.isFinite(snap.openTrades)) {
        openTrades += snap.openTrades
      }
    }
  }

  if (openTrades === 0 && dbOpenTrades > 0) openTrades = dbOpenTrades

  return {
    totalEquity,
    openPnl: hasLiveOpenPnl ? openPnl : 0,
    openTrades,
    accountsConnected: brokers.length,
  }
}
