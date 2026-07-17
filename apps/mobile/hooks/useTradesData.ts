import { useCallback, useEffect, useRef, useState } from 'react'
import { InteractionManager } from 'react-native'
import type { BrokerAccount } from '@tscopier/shared'
import { supabase } from '@/lib/supabase'
import { isFxsocketLinkedBroker } from '@/lib/brokerLink'
import {
  DASHBOARD_MT_HISTORY_LIMIT,
  fetchBrokerMtTrades,
} from '@/lib/brokerTradeHistory'
import { filterMtTradesSinceConnect } from '@/lib/tradesSinceConnect'
import type { MtTrade } from '@/lib/mtTrade'
import { parseMtHistoryTimestamp } from '@/lib/mtApiDateTime'
import { useDashboardRealtime } from '@/hooks/useDashboardRealtime'
import { useScreenActive } from '@/hooks/useScreenActive'

function tradeActivityMs(trade: MtTrade): number {
  if (trade.status === 'closed') {
    return (
      parseMtHistoryTimestamp(trade.closed_at) ??
      parseMtHistoryTimestamp(trade.opened_at) ??
      0
    )
  }
  return parseMtHistoryTimestamp(trade.opened_at) ?? 0
}

function sortTradesNewestFirst(trades: MtTrade[]): MtTrade[] {
  return [...trades].sort((a, b) => tradeActivityMs(b) - tradeActivityMs(a))
}

export function useTradesData(userId: string | undefined) {
  const active = useScreenActive()
  const [trades, setTrades] = useState<MtTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const inflightRef = useRef(false)
  const hasLoadedRef = useRef(false)
  const activeRef = useRef(active)
  activeRef.current = active

  const load = useCallback(
    async (opts?: { force?: boolean; background?: boolean }) => {
      if (!userId || inflightRef.current) return
      inflightRef.current = true

      const background = opts?.background ?? hasLoadedRef.current
      if (background) setRefreshing(true)
      else setLoading(true)

      try {
        const { data: brokerRows, error: brokerError } = await supabase
          .from('broker_accounts')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)

        if (brokerError) throw brokerError

        const accounts = (brokerRows ?? []) as BrokerAccount[]
        const linked = accounts.filter(isFxsocketLinkedBroker)

        if (linked.length === 0) {
          setTrades([])
          setError(null)
          setLastSyncedAt(Date.now())
          hasLoadedRef.current = true
          return
        }

        const raw = await fetchBrokerMtTrades({
          accounts: linked,
          fullHistory: true,
          limit: DASHBOARD_MT_HISTORY_LIMIT,
          includeBalanceCashflow: false,
        })
        if (!activeRef.current && hasLoadedRef.current) {
          // Screen blurred mid-fetch — keep previous data if we already had some.
          return
        }
        const filtered = filterMtTradesSinceConnect(raw, linked)
        setTrades(sortTradesNewestFirst(filtered))
        setError(null)
        setLastSyncedAt(Date.now())
        hasLoadedRef.current = true
      } catch (e) {
        if (!hasLoadedRef.current) {
          setTrades([])
        }
        setError(e instanceof Error ? e.message : 'Failed to load trades')
      } finally {
        inflightRef.current = false
        setLoading(false)
        setRefreshing(false)
      }
    },
    [userId],
  )

  useEffect(() => {
    if (!userId) {
      setTrades([])
      setLoading(false)
      hasLoadedRef.current = false
      return
    }
    if (!active) return

    let cancelled = false
    const task = InteractionManager.runAfterInteractions(() => {
      if (cancelled) return
      void load({ background: hasLoadedRef.current })
    })

    return () => {
      cancelled = true
      task.cancel?.()
    }
  }, [userId, active, load])

  useDashboardRealtime(
    userId,
    () => {
      if (!activeRef.current) return
      void load({ background: true, force: true })
    },
    undefined,
    'trades',
    active,
  )

  return {
    trades,
    loading,
    refreshing,
    error,
    lastSyncedAt,
    refresh: () => void load({ force: true }),
  }
}
