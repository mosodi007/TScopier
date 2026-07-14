import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useDashboardRealtime } from '@/hooks/useDashboardRealtime'

export interface TradeRow {
  id: string
  symbol: string | null
  side: string | null
  volume: number | null
  profit: number | null
  open_time: string | null
  close_time: string | null
  status: string | null
  broker_account_id: string | null
}

export function useTradesData(userId: string | undefined) {
  const [trades, setTrades] = useState<TradeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('trades')
      .select('id, symbol, side, volume, profit, open_time, close_time, status, broker_account_id')
      .eq('user_id', userId)
      .order('open_time', { ascending: false })
      .limit(100)
    if (fetchError) {
      setError(fetchError.message)
    } else {
      setTrades((data ?? []) as TradeRow[])
      setError(null)
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  useDashboardRealtime(userId, load, undefined, 'trades')

  return { trades, loading, error, refresh: load }
}
