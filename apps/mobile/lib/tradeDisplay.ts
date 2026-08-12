import { parseMtHistoryTimestamp } from '@/lib/mtApiDateTime'
import { displayTradeProfit, type MtTrade } from '@/lib/mtTrade'

/** Position side from entry vs SL/TP geometry (buy: SL below, TP above entry). */
function inferDirectionFromStopPrices(
  entry: number | null | undefined,
  sl: number | null | undefined,
  tp: number | null | undefined,
): 'buy' | 'sell' | '' {
  if (entry == null || !Number.isFinite(entry) || entry <= 0) return ''
  let buyVotes = 0
  let sellVotes = 0
  if (sl != null && Number.isFinite(sl) && sl > 0) {
    if (sl < entry) buyVotes++
    else if (sl > entry) sellVotes++
  }
  if (tp != null && Number.isFinite(tp) && tp > 0) {
    if (tp > entry) buyVotes++
    else if (tp < entry) sellVotes++
  }
  if (buyVotes > sellVotes) return 'buy'
  if (sellVotes > buyVotes) return 'sell'
  return ''
}

export function directionDisplayLabel(direction: 'buy' | 'sell' | ''): string {
  if (direction === 'buy') return 'Buy'
  if (direction === 'sell') return 'Sell'
  return '—'
}

/** Prefer SL/TP geometry when deal-level type disagrees. */
export function resolveTradeDisplayDirection(input: {
  direction?: string
  entry_price?: number | null
  sl?: number | null
  tp?: number | null
}): 'buy' | 'sell' | '' {
  const fromPrices = inferDirectionFromStopPrices(input.entry_price, input.sl, input.tp)
  const raw = String(input.direction ?? '').toLowerCase()
  const fromField = (() => {
    if (raw === 'buy' || raw === 'long' || raw.startsWith('buy_')) return 'buy'
    if (raw === 'sell' || raw === 'short' || raw.startsWith('sell_')) return 'sell'
    return ''
  })()
  if (fromPrices && fromField && fromPrices !== fromField) return fromPrices
  return fromField || fromPrices
}

export function formatTradePrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  if (!Number.isFinite(value) || value === 0) return '—'
  return value.toFixed(5)
}

export function formatTradeLots(lotSize: number): string {
  if (!Number.isFinite(lotSize)) return '—'
  return lotSize.toFixed(2)
}

function formatTradeTimeLabel(raw: string | number | null | undefined): string {
  const ms = parseMtHistoryTimestamp(raw)
  if (ms == null) return '—'
  return new Date(ms).toLocaleString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatTradeCloseTimeLabel(trade: MtTrade): string {
  const raw =
    trade.status === 'closed' ? (trade.closed_at ?? trade.opened_at) : trade.opened_at
  return formatTradeTimeLabel(raw)
}

export function getTradeDisplayMeta(trade: MtTrade) {
  const displayDirection = resolveTradeDisplayDirection(trade)
  const isBuy = displayDirection === 'buy'
  const isSell = displayDirection === 'sell'
  const profit = displayTradeProfit(trade)
  const status =
    trade.status === 'open'
      ? { variant: 'open' as const, label: 'Open' }
      : trade.status === 'closed'
        ? { variant: 'closed' as const, label: 'Closed' }
        : { variant: 'closed' as const, label: trade.status }
  const timeLabel = formatTradeCloseTimeLabel(trade)
  const broker = trade.broker_name || trade.broker_label || '—'
  const directionLabel = directionDisplayLabel(displayDirection)

  return { isBuy, isSell, profit, status, broker, directionLabel, timeLabel, displayDirection }
}

export { displayTradeProfit }
