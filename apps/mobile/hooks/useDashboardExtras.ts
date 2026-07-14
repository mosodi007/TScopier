import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface CopierLogRow {
  id: string
  status: string | null
  symbol: string | null
  action: string | null
  created_at: string
  channel_name?: string | null
}

export interface TradeActivityRow {
  id: string
  action: string
  status: string
  created_at: string
  details?: string | null
}

function buildChannelNames(
  channels: Array<{ id: string; display_name?: string | null; channel_username?: string | null }>,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const channel of channels) {
    const name = channel.display_name?.trim()
    const username = channel.channel_username?.trim().replace(/^@/, '')
    out[channel.id] = name || (username ? `@${username}` : 'Unnamed channel')
  }
  return out
}

export function useDashboardExtras(userId: string | undefined) {
  const [copierLogs, setCopierLogs] = useState<CopierLogRow[]>([])
  const [activities, setActivities] = useState<TradeActivityRow[]>([])

  const load = useCallback(async () => {
    if (!userId) return
    const [signalsRes, logsRes, channelsRes] = await Promise.all([
      supabase
        .from('signals')
        .select('id, status, parsed_data, created_at, channel_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(8),
      supabase
        .from('trade_execution_logs')
        .select('id, action, status, created_at, error_message')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(8),
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

    setActivities(
      (logsRes.data ?? []).map(row => ({
        id: row.id,
        action: row.action,
        status: row.status,
        created_at: row.created_at,
        details: row.error_message,
      })),
    )
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  return { copierLogs, activities, refreshExtras: load }
}
