import { useCallback, useEffect, useRef, useState } from 'react'
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
  const [trades, setTrades] = useState<MtTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const inflightRef = useRef(false)
  const hasLoadedRef = useRef(false)

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
    void load()
  }, [userId, load])

  useDashboardRealtime(userId, () => {
    void load({ background: true, force: true })
  })

  return {
    trades,
    loading,
    refreshing,
    error,
    lastSyncedAt,
    refresh: () => void load({ force: true }),
  }
}
