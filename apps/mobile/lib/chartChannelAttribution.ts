import { isTradeableClosedRow } from '@/lib/dashboardTradeStats'
import { isMtTimestampInRange } from '@/lib/mtApiDateTime'
import { displayTradeProfit, type MtTrade } from '@/lib/mtTrade'
import {
  isTscopierComment,
  parseTscopierComment,
  sanitizeChannelCommentSlug,
} from '@/lib/tscopierComment'
import {
  filterMtTradesSinceConnect,
  normalizeSignalChannelIds,
  type DashboardConnectAccount,
} from '@/lib/tradesSinceConnect'

export const UNLINKED_CHANNEL_KEY = '__unlinked__'

export interface PerformanceChannelLinkMaps {
  ticketToChannelId: Record<string, string>
  ticketToSignalId: Record<string, string>
  signalPrefixToChannelId: Record<string, string>
  signalPrefixToSignalId: Record<string, string>
  channelSlugToChannelId: Record<string, string>
  channelNames: Record<string, string>
}

export interface ChannelProfitRow {
  key: string
  label: string
  count: number
  pnl: number
}

export interface TradeChannelAttributionRow {
  broker_account_id: string | null
  metaapi_order_id: string | null
  signal_id: string | null
  channel_id: string | null
  channel_label?: string | null
}

export type ResolveChannelIdOpts = {
  connectedChannelIds?: string[] | null
}

function periodRange7d(now = new Date()) {
  const { todayStart, tomorrowStart } = (() => {
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const tomorrowStart = new Date(todayStart)
    tomorrowStart.setDate(tomorrowStart.getDate() + 1)
    return { todayStart, tomorrowStart }
  })()
  const start = new Date(todayStart)
  start.setDate(start.getDate() - 6)
  return {
    inRange: (closedAt: string | null) => isMtTimestampInRange(closedAt, start, tomorrowStart),
  }
}

function closedMtTradesIn7d(trades: MtTrade[], now = new Date()): MtTrade[] {
  const { inRange } = periodRange7d(now)
  return trades.filter(t => {
    if (t.status !== 'closed') return false
    if (
      !isTradeableClosedRow({
        status: t.status,
        symbol: t.symbol,
        lot_size: t.lot_size,
        direction: t.direction,
        type: t.type,
      })
    ) {
      return false
    }
    const closeIso = t.closed_at ?? t.opened_at
    return closeIso != null && inRange(closeIso)
  })
}

export function brokerTicketLookupKeys(
  brokerId: string | null | undefined,
  ticket: string | number | null | undefined,
): string[] {
  const broker = String(brokerId ?? '').trim()
  if (!broker) return []
  const raw = String(ticket ?? '').trim()
  if (!raw) return []
  const keys = new Set<string>([`${broker}:${raw}`])
  const n = Number(raw)
  if (Number.isFinite(n) && n > 0) {
    const int = Math.trunc(n)
    keys.add(`${broker}:${int}`)
    keys.add(`${broker}:${String(int)}`)
  }
  return [...keys]
}

function registerTicketChannel(
  map: Record<string, string>,
  brokerId: string | null | undefined,
  ticket: string | number | null | undefined,
  channelId: string,
): void {
  for (const key of brokerTicketLookupKeys(brokerId, ticket)) {
    map[key] = channelId
  }
}

function registerTicketSignal(
  map: Record<string, string>,
  brokerId: string | null | undefined,
  ticket: string | number | null | undefined,
  signalId: string,
): void {
  for (const key of brokerTicketLookupKeys(brokerId, ticket)) {
    map[key] = signalId
  }
}

function buildSignalPrefixSignalMap(signals: Array<{ id: string }>): Record<string, string> {
  const byPrefix = new Map<string, Map<string, number>>()
  for (const s of signals) {
    const prefix = s.id.slice(0, 8).toLowerCase()
    if (!/^[a-f0-9]{8}$/.test(prefix)) continue
    const counts = byPrefix.get(prefix) ?? new Map<string, number>()
    counts.set(s.id, (counts.get(s.id) ?? 0) + 1)
    byPrefix.set(prefix, counts)
  }
  const out: Record<string, string> = {}
  for (const [prefix, counts] of byPrefix) {
    let bestSignal = ''
    let bestCount = 0
    for (const [signalId, count] of counts) {
      if (count > bestCount) {
        bestCount = count
        bestSignal = signalId
      }
    }
    if (bestSignal) out[prefix] = bestSignal
  }
  return out
}

function buildSignalPrefixChannelMap(
  signals: Array<{ id: string; channel_id: string | null }>,
): Record<string, string> {
  const byPrefix = new Map<string, Map<string, number>>()
  for (const s of signals) {
    if (!s.channel_id) continue
    const prefix = s.id.slice(0, 8).toLowerCase()
    if (!/^[a-f0-9]{8}$/.test(prefix)) continue
    const counts = byPrefix.get(prefix) ?? new Map<string, number>()
    counts.set(s.channel_id, (counts.get(s.channel_id) ?? 0) + 1)
    byPrefix.set(prefix, counts)
  }
  const out: Record<string, string> = {}
  for (const [prefix, counts] of byPrefix) {
    let bestChannel = ''
    let bestCount = 0
    for (const [channelId, count] of counts) {
      if (count > bestCount) {
        bestCount = count
        bestChannel = channelId
      }
    }
    if (bestChannel) out[prefix] = bestChannel
  }
  return out
}

function buildChannelSlugMap(
  channels: Array<{ id: string; display_name: string; channel_username?: string | null }>,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const ch of channels) {
    const slugCandidates = [
      sanitizeChannelCommentSlug(ch.display_name ?? ''),
      sanitizeChannelCommentSlug(ch.channel_username ?? ''),
    ].filter(Boolean)
    for (const slug of slugCandidates) {
      out[slug.toLowerCase()] = ch.id
    }
  }
  return out
}

function channelAttributionTicketKeys(trade: MtTrade): string[] {
  const keys = new Set<string>()
  for (const key of brokerTicketLookupKeys(trade.broker_id, trade.ticket)) {
    keys.add(key)
  }
  const positionTicket = trade.position_ticket
  if (positionTicket != null && positionTicket > 0) {
    for (const key of brokerTicketLookupKeys(trade.broker_id, positionTicket)) {
      keys.add(key)
    }
  }
  return [...keys]
}

function canonicalChannelId(channelId: string, maps: PerformanceChannelLinkMaps): string {
  const lower = channelId.trim().toLowerCase()
  if (!lower) return channelId
  for (const key of Object.keys(maps.channelNames)) {
    if (key.toLowerCase() === lower) return key
  }
  return channelId
}

function connectedChannelIds(
  raw: string[] | null | undefined,
  maps: PerformanceChannelLinkMaps,
): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const id of normalizeSignalChannelIds(raw)) {
    const canonical = canonicalChannelId(id, maps)
    if (seen.has(canonical)) continue
    seen.add(canonical)
    out.push(canonical)
  }
  return out
}

function resolveSlugOnConnectedChannels(
  slug: string,
  connected: string[],
  maps: PerformanceChannelLinkMaps,
): string | null {
  const norm = slug.trim().toLowerCase()
  if (!norm) return null
  for (const channelId of connected) {
    const label = maps.channelNames[channelId] ?? ''
    const candidates = [sanitizeChannelCommentSlug(label)].filter(Boolean)
    for (const candidate of candidates) {
      if (candidate.toLowerCase() === norm) return channelId
    }
  }
  return null
}

export function resolveChannelIdForTrade(
  trade: MtTrade,
  maps: PerformanceChannelLinkMaps,
  opts?: ResolveChannelIdOpts,
): string {
  for (const key of channelAttributionTicketKeys(trade)) {
    const fromTicket = maps.ticketToChannelId[key]
    if (fromTicket) return fromTicket
  }

  const parsed = parseTscopierComment(trade.comment)
  if (parsed?.signalIdPrefix) {
    const fromPrefix = maps.signalPrefixToChannelId[parsed.signalIdPrefix.toLowerCase()]
    if (fromPrefix) return fromPrefix
  }

  if (parsed?.channelSlug) {
    const fromSlug = maps.channelSlugToChannelId[parsed.channelSlug.toLowerCase()]
    if (fromSlug) return fromSlug
  }

  const connected = connectedChannelIds(opts?.connectedChannelIds, maps)
  if (parsed && connected.length > 0) {
    if (parsed.channelSlug) {
      const fromConnected = resolveSlugOnConnectedChannels(parsed.channelSlug, connected, maps)
      if (fromConnected) return fromConnected
    }
    if (isTscopierComment(trade.comment) && connected.length === 1) {
      return connected[0]!
    }
  }

  return UNLINKED_CHANNEL_KEY
}

export function buildPerformanceChannelLinkMaps(
  channels: Array<{ id: string; display_name: string; channel_username?: string | null }>,
  dbTrades: Array<{
    broker_account_id: string | null
    metaapi_order_id: string | null
    signal_id: string | null
    telegram_channel_id?: string | null
  }>,
  signals: Array<{ id: string; channel_id: string | null }>,
  attributions: TradeChannelAttributionRow[] = [],
): PerformanceChannelLinkMaps {
  const channelNames: Record<string, string> = {}
  for (const ch of channels) {
    channelNames[ch.id] = ch.display_name?.trim() || ch.channel_username?.trim() || 'Channel'
  }

  const signalToChannel: Record<string, string> = {}
  for (const s of signals) {
    if (s.channel_id) signalToChannel[s.id] = s.channel_id
  }

  for (const a of attributions) {
    if (a.channel_id && a.channel_label?.trim() && !channelNames[a.channel_id]) {
      channelNames[a.channel_id] = a.channel_label.trim()
    }
    if (a.signal_id && a.channel_id && !signalToChannel[a.signal_id]) {
      signalToChannel[a.signal_id] = a.channel_id
    }
  }

  const signalRows = [
    ...signals,
    ...attributions
      .filter(a => a.signal_id && a.channel_id)
      .map(a => ({ id: a.signal_id!, channel_id: a.channel_id! })),
  ]
  const signalPrefixToChannelId = buildSignalPrefixChannelMap(signalRows)
  const signalPrefixToSignalId = buildSignalPrefixSignalMap([
    ...signals,
    ...attributions.filter(a => a.signal_id).map(a => ({ id: a.signal_id! })),
  ])
  const channelSlugToChannelId = buildChannelSlugMap(channels)

  const ticketToChannelId: Record<string, string> = {}
  const ticketToSignalId: Record<string, string> = {}
  for (const a of attributions) {
    if (!a.broker_account_id || !a.metaapi_order_id) continue
    if (a.channel_id) {
      registerTicketChannel(ticketToChannelId, a.broker_account_id, a.metaapi_order_id, a.channel_id)
    }
    if (a.signal_id) {
      registerTicketSignal(ticketToSignalId, a.broker_account_id, a.metaapi_order_id, a.signal_id)
    }
  }
  for (const t of dbTrades) {
    const channelId =
      t.telegram_channel_id ?? (t.signal_id ? signalToChannel[t.signal_id] : undefined)
    if (channelId && t.broker_account_id && t.metaapi_order_id) {
      registerTicketChannel(ticketToChannelId, t.broker_account_id, t.metaapi_order_id, channelId)
    }
    if (t.signal_id && t.broker_account_id && t.metaapi_order_id) {
      registerTicketSignal(ticketToSignalId, t.broker_account_id, t.metaapi_order_id, t.signal_id)
    }
  }

  return {
    ticketToChannelId,
    ticketToSignalId,
    signalPrefixToChannelId,
    signalPrefixToSignalId,
    channelSlugToChannelId,
    channelNames,
  }
}

export function scopeDashboardCopierMtTrades(
  mtTrades: MtTrade[],
  maps: PerformanceChannelLinkMaps,
  accounts?: readonly DashboardConnectAccount[],
  opts?: ResolveChannelIdOpts,
): MtTrade[] {
  const sinceConnect = accounts?.length
    ? filterMtTradesSinceConnect(mtTrades, accounts)
    : mtTrades

  const connectedByBroker = new Map<string, string[]>()
  for (const account of accounts ?? []) {
    if (!account.id) continue
    connectedByBroker.set(account.id, normalizeSignalChannelIds(account.signal_channel_ids))
  }

  return sinceConnect.filter(trade => {
    const resolveOpts: ResolveChannelIdOpts = {
      connectedChannelIds:
        connectedByBroker.get(trade.broker_id) ?? opts?.connectedChannelIds ?? null,
    }
    return resolveChannelIdForTrade(trade, maps, resolveOpts) !== UNLINKED_CHANNEL_KEY
  })
}

export function computeProfitByChannel(
  trades: MtTrade[],
  maps: PerformanceChannelLinkMaps,
  unlinkedLabel: string,
  now = new Date(),
): ChannelProfitRow[] {
  const closed = closedMtTradesIn7d(trades, now)
  const byChannel = new Map<string, { count: number; pnl: number }>()

  for (const trade of closed) {
    const pnl = displayTradeProfit(trade)
    if (pnl == null || !Number.isFinite(pnl)) continue
    const channelId = resolveChannelIdForTrade(trade, maps)
    if (channelId === UNLINKED_CHANNEL_KEY) continue
    const prev = byChannel.get(channelId) ?? { count: 0, pnl: 0 }
    byChannel.set(channelId, { count: prev.count + 1, pnl: prev.pnl + pnl })
  }

  return [...byChannel.entries()]
    .map(([channelId, stats]) => ({
      key: channelId,
      label: maps.channelNames[channelId] ?? unlinkedLabel,
      count: stats.count,
      pnl: stats.pnl,
    }))
    .sort((a, b) => b.pnl - a.pnl)
}
