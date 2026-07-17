import { useCallback, useEffect, useMemo, useState } from 'react'
import type { BrokerAccount } from '@tscopier/shared'
import { supabase } from '@/lib/supabase'
import { useDashboardRealtime } from '@/hooks/useDashboardRealtime'
import { useFxsocketStream } from '@/hooks/useFxsocketStream'
import { useScreenActive } from '@/hooks/useScreenActive'
import { resolveFxsocketFloatingOpenPnl } from '@/lib/fxsocketStreamParse'
import {
  computeAggregateMetrics,
  getLocalDayBounds,
  summarizeClosedTrades,
  type BrokerLiveSnapshot,
} from '@/lib/dashboardStats'

export interface DashboardMetricsState {
  brokers: BrokerAccount[]
  liveByBroker: Record<string, BrokerLiveSnapshot>
  activeChannels: number
  tradesCopiedToday: number
  todaySummary: ReturnType<typeof summarizeClosedTrades>
  yesterdaySummary: ReturnType<typeof summarizeClosedTrades>
  dbOpenTrades: number
  aggregate: ReturnType<typeof computeAggregateMetrics>
  loading: boolean
  refreshing: boolean
  refresh: () => Promise<void>
}

export function useDashboardMetrics(userId: string | undefined): DashboardMetricsState {
  const active = useScreenActive()
  const [brokers, setBrokers] = useState<BrokerAccount[]>([])
  const [liveByBroker, setLiveByBroker] = useState<Record<string, BrokerLiveSnapshot>>({})
  const [activeChannels, setActiveChannels] = useState(0)
  const [tradesCopiedToday, setTradesCopiedToday] = useState(0)
  const [trades, setTrades] = useState<Array<{ status?: string | null; profit?: number | null; closed_at?: string | null }>>([])
  const [dbOpenTrades, setDbOpenTrades] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadBrokers = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
    setBrokers((data ?? []) as BrokerAccount[])
  }, [userId])

  const loadSecondaryMetrics = useCallback(async () => {
    if (!userId) return

    const { todayStart, tomorrowStart } = getLocalDayBounds()
    const todayIso = todayStart.toISOString()
    const tomorrowIso = tomorrowStart.toISOString()

    const [channelsRes, signalsRes, tradesRes] = await Promise.all([
      supabase
        .from('telegram_channels')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_active', true),
      supabase
        .from('signals')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', todayIso)
        .lt('created_at', tomorrowIso)
        .in('status', ['executed', 'parsed']),
      supabase
        .from('trades')
        .select('status, profit, closed_at')
        .eq('user_id', userId)
        .order('closed_at', { ascending: false })
        .limit(2000),
    ])

    setActiveChannels(channelsRes.count ?? 0)
    setTradesCopiedToday(signalsRes.count ?? 0)

    const rows = tradesRes.data ?? []
    setTrades(rows)
    setDbOpenTrades(rows.filter(t => t.status === 'open').length)
  }, [userId])

  const loadAll = useCallback(async () => {
    if (!userId) return
    await Promise.all([loadBrokers(), loadSecondaryMetrics()])
  }, [userId, loadBrokers, loadSecondaryMetrics])

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    void loadAll().finally(() => setLoading(false))
  }, [userId, loadAll])

  useDashboardRealtime(
    userId,
    loadAll,
    broker => {
      setBrokers(prev => prev.map(b => (b.id === broker.id ? { ...b, ...broker } : b)))
    },
    'main',
    active,
  )

  useFxsocketStream(
    brokers,
    {
      onAccount: (brokerId, data) => {
        setLiveByBroker(prev => {
          const current = prev[brokerId] ?? {}
          const openTrades = current.openTrades ?? 0
          const accountOpenPnl = resolveFxsocketFloatingOpenPnl(data, openTrades)
          const openPnl =
            openTrades > 0 && current.openPnl != null && accountOpenPnl === 0
              ? current.openPnl
              : accountOpenPnl ?? current.openPnl

          return {
            ...prev,
            [brokerId]: {
              ...current,
              balance: data.balance ?? current.balance,
              equity: data.equity ?? current.equity,
              openPnl,
              currency: data.currency ?? current.currency,
            },
          }
        })
      },
      onPositions: (brokerId, data) => {
        setLiveByBroker(prev => {
          const current = prev[brokerId] ?? {}
          return {
            ...prev,
            [brokerId]: {
              ...current,
              openTrades: data.openTrades,
              openPnl: data.openPnl ?? current.openPnl,
            },
          }
        })
      },
    },
    active,
  )

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await loadAll()
    } finally {
      setRefreshing(false)
    }
  }, [loadAll])

  const { todayStart, tomorrowStart, yesterdayStart } = useMemo(() => getLocalDayBounds(), [trades])

  const todaySummary = useMemo(
    () => summarizeClosedTrades(trades, todayStart, tomorrowStart),
    [trades, todayStart, tomorrowStart],
  )

  const yesterdaySummary = useMemo(
    () => summarizeClosedTrades(trades, yesterdayStart, todayStart),
    [trades, yesterdayStart, todayStart],
  )

  const aggregate = useMemo(
    () => computeAggregateMetrics(brokers, liveByBroker, dbOpenTrades),
    [brokers, liveByBroker, dbOpenTrades],
  )

  return {
    brokers,
    liveByBroker,
    activeChannels,
    tradesCopiedToday,
    todaySummary,
    yesterdaySummary,
    dbOpenTrades,
    aggregate,
    loading,
    refreshing,
    refresh,
  }
}
