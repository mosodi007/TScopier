import { isTradeableClosedRow } from '@/lib/dashboardTradeStats'
import * as ChartChannelAttribution from '@/lib/chartChannelAttribution'
import type { PerformanceChannelLinkMaps } from '@/lib/chartChannelAttribution'
import {
  buildTradeVolume7Day,
  type ChannelProfitRow,
  type DashboardChartTrade,
  type TradeVolumeDay,
} from '@/lib/dashboardCharts'
import { coerceMtTimestamp } from '@/lib/mtApiDateTime'
import { displayTradeProfit, type MtTrade } from '@/lib/mtTrade'
import type { DashboardConnectAccount } from '@/lib/tradesSinceConnect'

function normalizeDirection(direction: string | undefined): 'buy' | 'sell' | '' {
  const raw = String(direction ?? '').toLowerCase()
  if (raw === 'buy' || raw === 'long' || raw.startsWith('buy_')) return 'buy'
  if (raw === 'sell' || raw === 'short' || raw.startsWith('sell_')) return 'sell'
  return ''
}

export function mtTradeToChartRow(t: MtTrade): DashboardChartTrade | null {
  if (
    t.status === 'closed' &&
    !isTradeableClosedRow({
      status: t.status,
      symbol: t.symbol,
      lot_size: t.lot_size,
      direction: t.direction,
      type: t.type,
    })
  ) {
    return null
  }
  const direction = normalizeDirection(t.direction)
  const hasLots = (Number(t.lot_size) || 0) > 0
  const hasSymbol = Boolean(String(t.symbol ?? '').trim())
  if (direction !== 'buy' && direction !== 'sell') {
    if (!(hasSymbol && hasLots && (t.status === 'closed' || t.status === 'open'))) return null
  }
  const profit = displayTradeProfit(t)
  return {
    lotSize: Number(t.lot_size) || 0,
    profit: profit != null && Number.isFinite(profit) ? profit : null,
    status: t.status,
    closedAt: coerceMtTimestamp(t.closed_at),
    openedAt: coerceMtTimestamp(t.opened_at),
    channelId: null,
  }
}

export function deriveDashboardCharts(args: {
  mtTrades: MtTrade[]
  dbTrades: DashboardChartTrade[]
  channelLinkMaps: PerformanceChannelLinkMaps
  accounts?: readonly DashboardConnectAccount[]
  hasMtBroker: boolean
  now?: Date
}): { tradeVolume7Day: TradeVolumeDay[]; channelProfit7d: ChannelProfitRow[] } {
  const now = args.now ?? new Date()
  const hasMtSource = args.mtTrades.length > 0
  const hasConnectScope = (args.accounts?.length ?? 0) > 0

  const scopedMt = hasMtSource
    ? ChartChannelAttribution.scopeDashboardCopierMtTrades(
        args.mtTrades,
        args.channelLinkMaps,
        args.accounts,
      )
    : []
  const useMtSummaries = scopedMt.length > 0
  const mtLoadedButEmpty = hasConnectScope && hasMtSource && scopedMt.length === 0

  const chartForVolume = useMtSummaries
    ? scopedMt.map(mtTradeToChartRow).filter((r): r is DashboardChartTrade => r != null)
    : mtLoadedButEmpty
      ? []
      : args.dbTrades

  return {
    tradeVolume7Day: buildTradeVolume7Day(chartForVolume, now),
    channelProfit7d: useMtSummaries
      ? ChartChannelAttribution.computeProfitByChannel(
          scopedMt,
          args.channelLinkMaps,
          'Channel',
          now,
        )
      : mtLoadedButEmpty
        ? []
        : computeProfitByChannelFromDb(args.dbTrades, args.channelLinkMaps.channelNames, now),
  }
}

function computeProfitByChannelFromDb(
  trades: DashboardChartTrade[],
  channelNames: Record<string, string>,
  now: Date,
): ChannelProfitRow[] {
  const volumeDays = buildTradeVolume7Day(trades, now)
  const allowedKeys = new Set(volumeDays.map(d => d.key))
  const byChannel = new Map<string, { count: number; pnl: number }>()

  for (const trade of trades) {
    if (trade.status !== 'closed') continue
    if (!trade.channelId) continue
    const iso = trade.closedAt ?? trade.openedAt
    if (!iso) continue
    const d = new Date(iso)
    if (!Number.isFinite(d.getTime())) continue
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!allowedKeys.has(key)) continue
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
