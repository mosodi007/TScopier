import type { BrokerAccount } from '@tscopier/shared'
import type { MtTrade } from '@/lib/mtTrade'
import { parseMtHistoryTimestamp } from '@/lib/mtApiDateTime'

export type BrokerConnectAnchor = Pick<
  BrokerAccount,
  'id' | 'performance_baseline_captured_at' | 'created_at' | 'last_activated_at'
>

export function resolveBrokerConnectMs(
  account: Pick<BrokerAccount, 'performance_baseline_captured_at' | 'last_activated_at'> & {
    created_at?: string | null
  },
): number | null {
  const anchors: number[] = []
  for (const raw of [account.performance_baseline_captured_at, account.last_activated_at]) {
    const trimmed = raw?.trim()
    if (!trimmed) continue
    const ms = parseMtHistoryTimestamp(trimmed)
    if (ms != null) anchors.push(ms)
  }
  if (anchors.length > 0) return Math.max(...anchors)

  const created = account.created_at?.trim()
  if (!created) return null
  return parseMtHistoryTimestamp(created)
}

function buildBrokerConnectMsMap(accounts: readonly BrokerConnectAnchor[]): Map<string, number> {
  const out = new Map<string, number>()
  for (const account of accounts) {
    const ms = resolveBrokerConnectMs(account)
    if (ms != null) out.set(account.id, ms)
  }
  return out
}

function resolveMtTradeSinceConnectMs(trade: MtTrade): number | null {
  const opened = parseMtHistoryTimestamp(trade.opened_at)
  if (opened != null) return opened
  if (trade.status === 'closed') {
    return parseMtHistoryTimestamp(trade.closed_at)
  }
  return null
}

function isMtTradeSinceConnect(
  trade: MtTrade,
  connectMsByBrokerId: ReadonlyMap<string, number>,
): boolean {
  const connectMs = connectMsByBrokerId.get(trade.broker_id)
  if (connectMs == null) return true

  const activityMs = resolveMtTradeSinceConnectMs(trade)
  if (activityMs == null) return trade.status === 'open'
  return activityMs >= connectMs
}

export function filterMtTradesSinceConnect(
  trades: MtTrade[],
  accounts: readonly BrokerConnectAnchor[],
): MtTrade[] {
  if (trades.length === 0 || accounts.length === 0) return trades
  const connectMsByBrokerId = buildBrokerConnectMsMap(accounts)
  if (connectMsByBrokerId.size === 0) return trades
  return trades.filter(trade => isMtTradeSinceConnect(trade, connectMsByBrokerId))
}

export type DashboardConnectAccount = BrokerConnectAnchor & {
  signal_channel_ids?: string[] | null
}

export function normalizeSignalChannelIds(raw: string[] | null | undefined): string[] {
  if (!raw?.length) return []
  return raw.map(id => String(id).trim().toLowerCase()).filter(Boolean)
}
