import { useCallback, useEffect, useRef, useState } from 'react'
import { InteractionManager } from 'react-native'
import { supabase } from '@/lib/supabase'
import {
  buildChannelDisplayNames,
  buildCopierEngineActivities,
  toCopierEngineListItem,
  TRADE_ACTIVITY_FETCH_LIMIT,
  TRADE_EXECUTION_LOG_SELECT,
  type CopierEngineListItem,
  type TradeActivityLogRow,
} from '@/lib/copierEngineActivities'
import { useScreenActive } from '@/hooks/useScreenActive'
import { STALE_TTL, shouldLoadOnFocus } from '@/lib/staleCache'

export interface CopierLogRow {
  id: string
  status: string | null
  symbol: string | null
  action: string | null
  created_at: string
  channel_name?: string | null
}

const DASHBOARD_COPIER_ENGINE_LIMIT = 10

function buildChannelNames(
  channels: Array<{ id: string; display_name?: string | null; channel_username?: string | null }>,
): Record<string, string> {
  return buildChannelDisplayNames(
    channels.map(ch => ({
      id: ch.id,
      display_name: ch.display_name ?? '',
      channel_username: ch.channel_username,
    })),
  )
}

export function useDashboardExtras(
  userId: string | undefined,
  opts?: { enabled?: boolean },
) {
  const screenActive = useScreenActive()
  const enabled = opts?.enabled !== false
  const active = screenActive && enabled
  const [copierLogs, setCopierLogs] = useState<CopierLogRow[]>([])
  const [copierEngineActivities, setCopierEngineActivities] = useState<CopierEngineListItem[]>([])
  const hasLoadedRef = useRef(false)
  const lastFetchedAtRef = useRef<number | null>(null)

  const load = useCallback(
    async (loadOpts?: { force?: boolean }) => {
      if (!userId) return
      if (
        !shouldLoadOnFocus({
          force: loadOpts?.force,
          lastFetchedAt: lastFetchedAtRef.current,
          ttlMs: STALE_TTL.extras,
          hasData: hasLoadedRef.current,
        })
      ) {
        return
      }

      const [signalsRes, logsRes, channelsRes] = await Promise.all([
        supabase
          .from('signals')
          .select('id, status, parsed_data, created_at, channel_id')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('trade_execution_logs')
          .select(TRADE_EXECUTION_LOG_SELECT)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(TRADE_ACTIVITY_FETCH_LIMIT),
        supabase
          .from('telegram_channels')
          .select('id, display_name, channel_username')
          .eq('user_id', userId),
      ])

      const channelNames = buildChannelNames(channelsRes.data ?? [])

      setCopierLogs(
        (signalsRes.data ?? []).map(row => {
          const parsed = row.parsed_data as { symbol?: string; action?: string } | null
          return {
            id: row.id,
            status: row.status,
            symbol: parsed?.symbol ?? null,
            action: parsed?.action ?? null,
            created_at: row.created_at,
            channel_name: row.channel_id ? channelNames[row.channel_id] ?? '—' : '—',
          }
        }),
      )

      const activities = buildCopierEngineActivities(
        (logsRes.data ?? []) as TradeActivityLogRow[],
        channelNames,
      ).map(toCopierEngineListItem)

      setCopierEngineActivities(activities.slice(0, DASHBOARD_COPIER_ENGINE_LIMIT))
      hasLoadedRef.current = true
      lastFetchedAtRef.current = Date.now()
    },
    [userId],
  )

  useEffect(() => {
    if (!active) return
    let cancelled = false
    const task = InteractionManager.runAfterInteractions(() => {
      if (cancelled) return
      void load()
    })
    return () => {
      cancelled = true
      task.cancel?.()
    }
  }, [load, active])

  const refreshExtras = useCallback(() => load({ force: true }), [load])

  return { copierLogs, copierEngineActivities, refreshExtras }
}
