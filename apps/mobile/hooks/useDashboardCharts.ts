import { useCallback, useEffect, useMemo, useState } from 'react'
import type { BrokerAccount } from '@tscopier/shared'
import { supabase } from '@/lib/supabase'
import { isFxsocketLinkedBroker } from '@/lib/brokerLink'
import {
  DASHBOARD_MT_HISTORY_LIMIT,
  fetchBrokerMtTrades,
} from '@/lib/brokerTradeHistory'
import { buildPerformanceChannelLinkMaps } from '@/lib/chartChannelAttribution'
import {
  deriveDashboardCharts,
} from '@/lib/dashboardChartAnalytics'
import {
  buildChannelProfit7Day,
  buildTradeVolume7Day,
  type ChannelProfitRow,
  type DashboardChartTrade,
  type TradeVolumeDay,
} from '@/lib/dashboardCharts'

interface DbTradeRow {
  id: string
  status: string
  profit: number | null
  closed_at: string | null
  opened_at: string
  lot_size: number
  broker_account_id: string | null
  metaapi_order_id: string | null
  telegram_channel_id: string | null
  signal_id: string | null
}

function dbRowToChartTrade(
  row: DbTradeRow,
  attributionByTrade: Map<string, { channel_id: string | null }>,
  signalToChannel: Record<string, string>,
): DashboardChartTrade {
  const attribution = attributionByTrade.get(row.id)
  return {
    lotSize: Number(row.lot_size) || 0,
    profit: typeof row.profit === 'number' && Number.isFinite(row.profit) ? row.profit : null,
    status: 'closed',
    closedAt: row.closed_at,
    openedAt: row.opened_at,
    channelId:
      row.telegram_channel_id ??
      attribution?.channel_id ??
      (row.signal_id ? signalToChannel[row.signal_id] ?? null : null),
  }
}

export function useDashboardCharts(
  userId: string | undefined,
  brokers: BrokerAccount[] = [],
) {
  const [tradeVolume7Day, setTradeVolume7Day] = useState<TradeVolumeDay[]>([])
  const [channelProfit7d, setChannelProfit7d] = useState<ChannelProfitRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const hasMtBroker = useMemo(() => brokers.some(isFxsocketLinkedBroker), [brokers])
  const brokerKey = useMemo(
    () => brokers.map(b => b.id).sort().join(','),
    [brokers],
  )

  const load = useCallback(async () => {
    if (!userId) {
      setTradeVolume7Day([])
      setChannelProfit7d([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    const since = new Date()
    since.setDate(since.getDate() - 14)
    since.setHours(0, 0, 0, 0)

    const mtTradesPromise = hasMtBroker
      ? fetchBrokerMtTrades({
          accounts: brokers,
          limit: DASHBOARD_MT_HISTORY_LIMIT,
          includeBalanceCashflow: false,
        }).catch(() => [])
      : Promise.resolve([])

    const [tradesRes, channelsRes, signalsRes, attributionsRes, mtTrades] = await Promise.all([
      supabase
        .from('trades')
        .select(
          'id, status, profit, closed_at, opened_at, lot_size, broker_account_id, metaapi_order_id, telegram_channel_id, signal_id',
        )
        .eq('user_id', userId)
        .eq('status', 'closed')
        .not('closed_at', 'is', null)
        .gte('closed_at', since.toISOString())
        .order('closed_at', { ascending: false })
        .limit(1500),
      supabase
        .from('telegram_channels')
        .select('id, display_name, channel_username')
        .eq('user_id', userId),
      supabase.from('signals').select('id, channel_id').eq('user_id', userId).limit(3000),
      supabase
        .from('trade_channel_attributions')
        .select('broker_account_id, metaapi_order_id, signal_id, channel_id, channel_label, trade_id')
        .eq('user_id', userId),
      mtTradesPromise,
    ])

    if (tradesRes.error) {
      setError(tradesRes.error.message)
      setTradeVolume7Day([])
      setChannelProfit7d([])
      setLoading(false)
      return
    }

    const attributionByTrade = new Map<string, { channel_id: string | null }>()
    for (const row of attributionsRes.data ?? []) {
      attributionByTrade.set(row.trade_id, { channel_id: row.channel_id })
    }

    const signalToChannel: Record<string, string> = {}
    for (const signal of signalsRes.data ?? []) {
      if (signal.channel_id) signalToChannel[signal.id] = signal.channel_id
    }

    const dbTrades = ((tradesRes.data ?? []) as DbTradeRow[]).map(row =>
      dbRowToChartTrade(row, attributionByTrade, signalToChannel),
    )

    const channelLinkMaps = buildPerformanceChannelLinkMaps(
      (channelsRes.data ?? []).map(ch => ({
        id: ch.id,
        display_name: ch.display_name ?? '',
        channel_username: ch.channel_username,
      })),
      (tradesRes.data ?? []) as DbTradeRow[],
      signalsRes.data ?? [],
      attributionsRes.data ?? [],
    )

    const charts = deriveDashboardCharts({
      mtTrades,
      dbTrades,
      channelLinkMaps,
      accounts: brokers,
      hasMtBroker,
    })

    setTradeVolume7Day(charts.tradeVolume7Day)
    setChannelProfit7d(charts.channelProfit7d)
    setLoading(false)
  }, [userId, hasMtBroker, brokers])

  useEffect(() => {
    void load()
  }, [load, brokerKey])

  return { tradeVolume7Day, channelProfit7d, loading, error, refreshCharts: load }
}

/** @deprecated Use deriveDashboardCharts — kept for tests or direct DB-only fallback. */
export function buildChartsFromDbTrades(
  trades: DashboardChartTrade[],
  channelNames: Record<string, string>,
): { tradeVolume7Day: TradeVolumeDay[]; channelProfit7d: ChannelProfitRow[] } {
  return {
    tradeVolume7Day: buildTradeVolume7Day(trades),
    channelProfit7d: buildChannelProfit7Day(trades, channelNames),
  }
}
