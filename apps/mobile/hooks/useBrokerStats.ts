import { useCallback, useEffect, useMemo, useState } from 'react'
import type { BrokerAccount } from '@tscopier/shared'
import { computeBrokerStatsSnapshot, type BrokerStatsSnapshot } from '@tscopier/web-lib/brokerStats'
import { computeLinkedAccountPerformance } from '@tscopier/web-lib/dashboardTradeStats'
import { useAuth } from '@/context/AuthContext'
import { isFxsocketLinkedBroker } from '@/lib/brokerLink'
import { fetchBrokerMtTrades } from '@/lib/brokerTradeHistory'
import { buildPerformanceChannelLinkMaps, type PerformanceChannelLinkMaps } from '@/lib/chartChannelAttribution'
import type { BrokerLiveSnapshot } from '@/lib/dashboardStats'
import { supabase } from '@/lib/supabase'
import { filterMtTradesSinceConnect } from '@/lib/tradesSinceConnect'
import type { MtTrade } from '@/lib/mtTrade'

/** Match web performance history window for broker stats. */
const BROKER_STATS_HISTORY_DAYS = 400

const EMPTY_MAPS: PerformanceChannelLinkMaps = {
  ticketToChannelId: {},
  ticketToSignalId: {},
  signalPrefixToChannelId: {},
  signalPrefixToSignalId: {},
  channelSlugToChannelId: {},
  channelNames: {},
}

export type BrokerStatsPerformance = {
  roi: number | null
  winRate: number | null
  maxDrawdownPct: number | null
}

function buildSnapshot(
  broker: BrokerAccount,
  mtTrades: MtTrade[],
  channelLinkMaps: PerformanceChannelLinkMaps,
  live?: BrokerLiveSnapshot,
): { stats: BrokerStatsSnapshot; perf: BrokerStatsPerformance } {
  const currentBalance = live?.balance ?? broker.last_balance ?? null
  const currentEquity = live?.equity ?? broker.last_equity ?? currentBalance

  const stats = computeBrokerStatsSnapshot({
    brokerId: broker.id,
    initialBalance: broker.performance_baseline_balance,
    connectedAt: broker.performance_baseline_captured_at,
    currentBalance,
    currentEquity,
    mtTrades: mtTrades as Parameters<typeof computeBrokerStatsSnapshot>[0]['mtTrades'],
    chartTrades: [],
    channelLinkMaps: channelLinkMaps as Parameters<
      typeof computeBrokerStatsSnapshot
    >[0]['channelLinkMaps'],
    connectedChannelIds: broker.signal_channel_ids,
    unlinkedChannelLabel: 'Unlinked',
  })

  const brokerMt = mtTrades.filter(t => t.broker_id === broker.id)
  const perf = computeLinkedAccountPerformance(
    {
      performance_baseline_balance: broker.performance_baseline_balance,
      last_balance: broker.last_balance,
    },
    brokerMt.map(t => ({
      status: t.status,
      profit: t.profit,
      closed_at: t.closed_at,
      opened_at: t.opened_at,
      symbol: t.symbol,
      lot_size: t.lot_size,
      direction: t.direction,
      type: t.type,
      swap: t.swap,
      commission: t.commission,
    })),
    currentEquity,
  )

  return { stats, perf }
}

export function useBrokerStats(
  broker: BrokerAccount | null,
  live?: BrokerLiveSnapshot,
) {
  const { user } = useAuth()
  const [mtTrades, setMtTrades] = useState<MtTrade[]>([])
  const [channelLinkMaps, setChannelLinkMaps] = useState<PerformanceChannelLinkMaps>(EMPTY_MAPS)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadedBrokerId, setLoadedBrokerId] = useState<string | null>(null)

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!user?.id || !broker) {
        setMtTrades([])
        setChannelLinkMaps(EMPTY_MAPS)
        setLoadedBrokerId(null)
        setLoading(false)
        return
      }

      const silent = opts?.silent === true
      if (silent) setRefreshing(true)
      else setLoading(true)
      setError(null)

      try {
        const [channelsRes, dbTradesRes, attributionsRes, signalsRes, mtRaw] = await Promise.all([
          supabase
            .from('telegram_channels')
            .select('id, display_name, channel_username')
            .eq('user_id', user.id),
          supabase
            .from('trades')
            .select('broker_account_id, metaapi_order_id, signal_id, telegram_channel_id')
            .eq('user_id', user.id)
            .eq('broker_account_id', broker.id),
          supabase
            .from('trade_channel_attributions')
            .select('broker_account_id, metaapi_order_id, signal_id, channel_id, channel_label')
            .eq('user_id', user.id)
            .eq('broker_account_id', broker.id),
          supabase.from('signals').select('id, channel_id').eq('user_id', user.id),
          isFxsocketLinkedBroker(broker)
            ? fetchBrokerMtTrades({
                brokerId: broker.id,
                historyDays: BROKER_STATS_HISTORY_DAYS,
                accounts: [broker],
              })
            : Promise.resolve([] as MtTrade[]),
        ])

        const maps = buildPerformanceChannelLinkMaps(
          (channelsRes.data ?? []) as Array<{
            id: string
            display_name: string
            channel_username?: string | null
          }>,
          (dbTradesRes.data ?? []) as Array<{
            broker_account_id: string | null
            metaapi_order_id: string | null
            signal_id: string | null
            telegram_channel_id: string | null
          }>,
          (signalsRes.data ?? []) as Array<{ id: string; channel_id: string | null }>,
          (attributionsRes.data ?? []) as Array<{
            broker_account_id: string | null
            metaapi_order_id: string | null
            signal_id: string | null
            channel_id: string | null
            channel_label: string | null
          }>,
        )

        setChannelLinkMaps(maps)
        setMtTrades(filterMtTradesSinceConnect(mtRaw, [broker]))
        setLoadedBrokerId(broker.id)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load account stats')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [broker, user?.id],
  )

  useEffect(() => {
    if (!broker) {
      setMtTrades([])
      setChannelLinkMaps(EMPTY_MAPS)
      setLoadedBrokerId(null)
      setError(null)
      setLoading(false)
      return
    }
    void load()
  }, [broker?.id, load])

  const derived = useMemo(() => {
    if (!broker || loadedBrokerId !== broker.id) return null
    return buildSnapshot(broker, mtTrades, channelLinkMaps, live)
  }, [broker, channelLinkMaps, live, loadedBrokerId, mtTrades])

  const refresh = useCallback(() => load({ silent: true }), [load])

  const currency = useMemo(
    () => (live?.currency ?? broker?.last_currency ?? 'USD').trim() || 'USD',
    [broker?.last_currency, live?.currency],
  )

  return {
    stats: derived?.stats ?? null,
    perf: derived?.perf ?? null,
    loading,
    refreshing,
    error,
    refresh,
    currency,
  }
}
