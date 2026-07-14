import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
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
  telegram_channel_id: string | null
  signal_id: string | null
}

function buildChannelNames(
  channels: Array<{ id: string; display_name?: string | null; channel_username?: string | null }>,
  attributions: Array<{ channel_id?: string | null; channel_label?: string | null }>,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const channel of channels) {
    const name = channel.display_name?.trim()
    const username = channel.channel_username?.trim().replace(/^@/, '')
    out[channel.id] = name || (username ? `@${username}` : 'Channel')
  }
  for (const row of attributions) {
    if (row.channel_id && row.channel_label?.trim()) {
      out[row.channel_id] = row.channel_label.trim()
    }
  }
  return out
}

export function useDashboardCharts(userId: string | undefined) {
  const [trades, setTrades] = useState<DashboardChartTrade[]>([])
  const [channelNames, setChannelNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!userId) {
      setTrades([])
      setChannelNames({})
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    const since = new Date()
    since.setDate(since.getDate() - 14)
    since.setHours(0, 0, 0, 0)

    const [tradesRes, channelsRes, signalsRes, attributionsRes] = await Promise.all([
      supabase
        .from('trades')
        .select('id, status, profit, closed_at, opened_at, lot_size, telegram_channel_id, signal_id')
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
        .select('trade_id, channel_id, channel_label')
        .eq('user_id', userId),
    ])

    if (tradesRes.error) {
      setError(tradesRes.error.message)
      setTrades([])
      setLoading(false)
      return
    }

    const attributionByTrade = new Map<string, { channel_id: string | null; channel_label: string | null }>()
    for (const row of attributionsRes.data ?? []) {
      attributionByTrade.set(row.trade_id, {
        channel_id: row.channel_id,
        channel_label: row.channel_label,
      })
    }

    const names = buildChannelNames(channelsRes.data ?? [], attributionsRes.data ?? [])
    const signalToChannel: Record<string, string> = {}
    for (const signal of signalsRes.data ?? []) {
      if (signal.channel_id) signalToChannel[signal.id] = signal.channel_id
    }

    setTrades(
      ((tradesRes.data ?? []) as DbTradeRow[]).map(row => {
        const attribution = attributionByTrade.get(row.id)
        return {
          lotSize: Number(row.lot_size) || 0,
          profit: typeof row.profit === 'number' && Number.isFinite(row.profit) ? row.profit : null,
          status: 'closed' as const,
          closedAt: row.closed_at,
          openedAt: row.opened_at,
          channelId:
            row.telegram_channel_id ??
            attribution?.channel_id ??
            (row.signal_id ? signalToChannel[row.signal_id] ?? null : null),
        }
      }),
    )
    setChannelNames(names)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  const tradeVolume7Day = useMemo<TradeVolumeDay[]>(() => buildTradeVolume7Day(trades), [trades])
  const channelProfit7d = useMemo<ChannelProfitRow[]>(
    () => buildChannelProfit7Day(trades, channelNames),
    [trades, channelNames],
  )

  return { tradeVolume7Day, channelProfit7d, loading, error, refreshCharts: load }
}
