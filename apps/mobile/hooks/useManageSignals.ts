import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type SignalDateFilter = 'all' | 'today' | '7d'

export interface ManageSignalRow {
  id: string
  channel_id: string | null
  created_at: string
  parsed_data: Record<string, unknown> | null
  skip_reason: string | null
  channelName: string
  action: string
  symbol: string
  summary: string
}

const TRADE_ACTIONS = new Set([
  'buy',
  'sell',
  'close',
  'close_worse_entries',
  'breakeven',
  'partial_profit',
  'partial_breakeven',
  'modify',
])

function parsedAction(data: unknown): string {
  return String((data as Record<string, unknown> | null)?.action ?? '')
    .toLowerCase()
    .trim()
}

function isTradeSignal(row: {
  channel_id?: string | null
  parsed_data?: unknown
  skip_reason?: string | null
}): boolean {
  if (!row.channel_id) return false
  const skip = String(row.skip_reason ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  if (skip === 'non_trade_message' || skip === 'channel_filter_ignored') return false
  const action = parsedAction(row.parsed_data)
  return Boolean(action && action !== 'ignore' && TRADE_ACTIONS.has(action))
}

function buildChannelNames(
  channels: Array<{ id: string; display_name?: string | null; channel_username?: string | null }>,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const channel of channels) {
    const name = channel.display_name?.trim()
    const username = channel.channel_username?.trim().replace(/^@/, '')
    out[channel.id] = name || (username ? `@${username}` : 'Channel')
  }
  return out
}

function formatSignalSummary(parsed: Record<string, unknown> | null, action: string, symbol: string): string {
  const side = action.replace(/_/g, ' ')
  if (symbol) return `${side.toUpperCase()} ${symbol}`
  return side.toUpperCase()
}

function inDateFilter(createdAt: string, filter: SignalDateFilter): boolean {
  if (filter === 'all') return true
  const created = new Date(createdAt)
  if (Number.isNaN(created.getTime())) return false
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  if (filter === 'today') {
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    return created >= start && created < end
  }
  start.setDate(start.getDate() - 6)
  return created >= start
}

export function useManageSignals(userId: string | undefined, dateFilter: SignalDateFilter = 'all') {
  const [rows, setRows] = useState<ManageSignalRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!userId) {
      setRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    const [channelsRes, signalsRes] = await Promise.all([
      supabase.from('telegram_channels').select('id, display_name, channel_username').eq('user_id', userId),
      supabase
        .from('signals')
        .select('id, channel_id, created_at, parsed_data, skip_reason')
        .eq('user_id', userId)
        .or('skip_reason.is.null,skip_reason.neq.non_trade_message')
        .order('created_at', { ascending: false })
        .limit(500),
    ])

    const channelNames = buildChannelNames(channelsRes.data ?? [])
    const mapped = ((signalsRes.data ?? []) as Array<{
      id: string
      channel_id: string | null
      created_at: string
      parsed_data: Record<string, unknown> | null
      skip_reason: string | null
    }>)
      .filter(isTradeSignal)
      .map(row => {
        const action = parsedAction(row.parsed_data)
        const symbol = String(row.parsed_data?.symbol ?? '').trim().toUpperCase()
        return {
          id: row.id,
          channel_id: row.channel_id,
          created_at: row.created_at,
          parsed_data: row.parsed_data,
          skip_reason: row.skip_reason,
          channelName: row.channel_id ? channelNames[row.channel_id] ?? 'Channel' : '—',
          action,
          symbol,
          summary: formatSignalSummary(row.parsed_data, action, symbol),
        }
      })

    setRows(mapped)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  const filteredRows = useMemo(
    () => rows.filter(row => inDateFilter(row.created_at, dateFilter)),
    [rows, dateFilter],
  )

  return { rows: filteredRows, loading, refresh: load }
}
