export interface TradeVolumeDay {
  key: string
  label: string
  volume: number
  profit: number
  /** Absolute loss magnitude (positive number for chart height). */
  loss: number
}

export interface ChannelProfitRow {
  key: string
  label: string
  count: number
  pnl: number
}

export interface DashboardChartTrade {
  brokerAccountId?: string | null
  lotSize: number
  profit: number | null
  status: 'open' | 'closed'
  closedAt: string | null
  openedAt: string | null
  channelId: string | null
}

function startOfLocalDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function dayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function shortDayLabel(d: Date): string {
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

function chartTradeDayKey(trade: DashboardChartTrade): string | null {
  if (trade.status !== 'closed') return null
  const iso = trade.closedAt ?? trade.openedAt
  if (!iso) return null
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return null
  return dayKey(startOfLocalDay(d))
}

export function buildTradeVolume7Day(trades: DashboardChartTrade[], now = new Date()): TradeVolumeDay[] {
  const today = startOfLocalDay(now)
  const days: Date[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    days.push(d)
  }

  const buckets = new Map<string, TradeVolumeDay>()
  for (const d of days) {
    const key = dayKey(d)
    buckets.set(key, { key, label: shortDayLabel(d), volume: 0, profit: 0, loss: 0 })
  }

  for (const trade of trades) {
    if (trade.status !== 'closed') continue
    const key = chartTradeDayKey(trade)
    if (!key) continue
    const bucket = buckets.get(key)
    if (!bucket) continue
    bucket.volume += trade.lotSize
    const p = trade.profit ?? 0
    if (p > 0) bucket.profit += p
    else if (p < 0) bucket.loss += Math.abs(p)
  }

  return days.map(d => buckets.get(dayKey(d))!).filter(Boolean)
}

export function buildChannelProfit7Day(
  trades: DashboardChartTrade[],
  channelNames: Record<string, string>,
  now = new Date(),
): ChannelProfitRow[] {
  const volumeDays = buildTradeVolume7Day(trades, now)
  const allowedKeys = new Set(volumeDays.map(d => d.key))

  const byChannel = new Map<string, { count: number; pnl: number }>()

  for (const trade of trades) {
    if (trade.status !== 'closed') continue
    const dayKeyValue = chartTradeDayKey(trade)
    if (!dayKeyValue || !allowedKeys.has(dayKeyValue)) continue
    if (!trade.channelId) continue
    const p = trade.profit
    if (p == null || !Number.isFinite(p)) continue
    const prev = byChannel.get(trade.channelId) ?? { count: 0, pnl: 0 }
    byChannel.set(trade.channelId, { count: prev.count + 1, pnl: prev.pnl + p })
  }

  return [...byChannel.entries()]
    .map(([channelId, stats]) => ({
      key: channelId,
      label: channelNames[channelId] ?? 'Channel',
      count: stats.count,
      pnl: stats.pnl,
    }))
    .sort((a, b) => b.pnl - a.pnl)
}

export function tradeVolumeIsEmpty(data: TradeVolumeDay[]): boolean {
  return data.every(d => d.profit === 0 && d.loss === 0 && d.volume === 0)
}
