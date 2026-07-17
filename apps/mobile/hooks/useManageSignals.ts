import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Signal } from '@tscopier/shared'
import {
  formatTradeSignalSummary,
  isTelegramTradeSignal,
  parsedSignalAction,
  tradeSignalActionLabel,
  type TradeSignalSummaryLabels,
} from '@tscopier/web-lib/copierLogDisplay'
import { supabase } from '@/lib/supabase'

export type SignalDatePreset = 'all' | 'today' | '7d' | '30d' | 'custom'

export interface SignalChannelOption {
  id: string
  label: string
}

export interface ManageSignalRow {
  id: string
  channel_id: string | null
  created_at: string
  channelName: string
  action: string
  actionLabel: string
  symbol: string
  summary: string
  openStatus: 'open' | 'closed'
}

export interface ManageSignalStats {
  today: number
  last7d: number
  last30d: number
  total: number
}

const SUMMARY_LABELS: TradeSignalSummaryLabels = {
  actionBuy: 'Buy',
  actionSell: 'Sell',
  actionClose: 'Close',
  actionCloseWorseEntries: 'Close worse entries',
  actionBreakeven: 'Move SL to break-even',
  actionModify: 'Update SL/TP',
  actionPartialProfit: 'Take partial profit',
  actionPartialBreakeven: 'Partial profit + break-even',
  onSymbol: 'on {symbol}',
  entryAt: 'Entry {price}',
  slAt: 'SL {price}',
  tpAt: 'TP {prices}',
}

const EMPTY_SYMBOL_CONTEXT = {
  lookup: new Map(),
  replyParentBySignalId: new Map(),
}

function formatDateInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function todayInput(): string {
  return formatDateInput(new Date())
}

function daysAgoInput(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return formatDateInput(date)
}

function startOfDay(dateStr: string): Date {
  const date = new Date(dateStr)
  date.setHours(0, 0, 0, 0)
  return date
}

function endOfDay(dateStr: string): Date {
  const date = new Date(dateStr)
  date.setHours(23, 59, 59, 999)
  return date
}

export function detectSignalDatePreset(dateFrom: string, dateTo: string): SignalDatePreset {
  if (!dateFrom && !dateTo) return 'all'
  const today = todayInput()
  if (dateFrom === today && dateTo === today) return 'today'
  if (dateFrom === daysAgoInput(7) && dateTo === today) return '7d'
  if (dateFrom === daysAgoInput(30) && dateTo === today) return '30d'
  return 'custom'
}

export function applySignalDatePreset(
  preset: Exclude<SignalDatePreset, 'custom'>,
): { dateFrom: string; dateTo: string } {
  const today = todayInput()
  switch (preset) {
    case 'all':
      return { dateFrom: '', dateTo: '' }
    case 'today':
      return { dateFrom: today, dateTo: today }
    case '7d':
      return { dateFrom: daysAgoInput(7), dateTo: today }
    case '30d':
      return { dateFrom: daysAgoInput(30), dateTo: today }
  }
}

function signalInDateRange(createdAt: Date, dateFrom: string, dateTo: string): boolean {
  if (dateFrom && createdAt < startOfDay(dateFrom)) return false
  if (dateTo && createdAt > endOfDay(dateTo)) return false
  return true
}

function channelDisplayName(channel: {
  display_name?: string | null
  channel_username?: string | null
}): string {
  const name = channel.display_name?.trim()
  const username = channel.channel_username?.trim().replace(/^@/, '')
  return name || (username ? `@${username}` : 'Unnamed channel')
}

function resolveSymbol(parsed: Record<string, unknown> | null): string {
  const symbol = String(parsed?.symbol ?? '').trim().toUpperCase()
  return symbol || '—'
}

function isEntryAction(action: string): boolean {
  return action === 'buy' || action === 'sell'
}

export function useManageSignals(
  userId: string | undefined,
  filters: {
    channelFilter: string
    dateFrom: string
    dateTo: string
  },
) {
  const [rows, setRows] = useState<ManageSignalRow[]>([])
  const [channels, setChannels] = useState<SignalChannelOption[]>([])
  const [stats, setStats] = useState<ManageSignalStats>({
    today: 0,
    last7d: 0,
    last30d: 0,
    total: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!userId) {
      setRows([])
      setChannels([])
      setStats({ today: 0, last7d: 0, last30d: 0, total: 0 })
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const [channelsRes, signalsRes, openTradesRes] = await Promise.all([
      supabase
        .from('telegram_channels')
        .select('id, display_name, channel_username, created_at')
        .eq('user_id', userId)
        .order('display_name', { ascending: true }),
      supabase
        .from('signals')
        .select(
          'id, channel_id, created_at, parsed_data, skip_reason, parent_signal_id, reply_to_message_id, is_modification, telegram_message_id, user_override',
        )
        .eq('user_id', userId)
        .or('skip_reason.is.null,skip_reason.neq.non_trade_message')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase.from('trades').select('signal_id').eq('user_id', userId).eq('status', 'open'),
    ])

    if (channelsRes.error || signalsRes.error || openTradesRes.error) {
      setError(
        channelsRes.error?.message ||
          signalsRes.error?.message ||
          openTradesRes.error?.message ||
          'Failed to load signals',
      )
      setLoading(false)
      return
    }

    const channelOptions = (channelsRes.data ?? []).map(ch => ({
      id: ch.id as string,
      label: channelDisplayName(ch),
    }))
    const channelCreatedAt = new Map(
      (channelsRes.data ?? []).map(ch => [ch.id as string, String(ch.created_at ?? '')]),
    )
    const channelNames = Object.fromEntries(channelOptions.map(ch => [ch.id, ch.label]))

    const openSignalIds = new Set(
      ((openTradesRes.data ?? []) as Array<{ signal_id?: string | null }>)
        .map(row => row.signal_id)
        .filter((id): id is string => Boolean(id)),
    )

    const tradeSignals = ((signalsRes.data ?? []) as Signal[])
      .filter(signal => {
        if (!isTelegramTradeSignal(signal)) return false
        if (!signal.channel_id) return false
        const created = channelCreatedAt.get(signal.channel_id)
        if (!created) return false
        return new Date(signal.created_at).getTime() >= new Date(created).getTime()
      })

    const mapped: ManageSignalRow[] = tradeSignals.map(signal => {
      const action = parsedSignalAction(signal.parsed_data)
      const parsed = (signal.parsed_data ?? null) as Record<string, unknown> | null
      const symbol = resolveSymbol(parsed)
      const summary = formatTradeSignalSummary(
        signal,
        EMPTY_SYMBOL_CONTEXT,
        tradeSignals,
        SUMMARY_LABELS,
      )
      return {
        id: signal.id,
        channel_id: signal.channel_id,
        created_at: signal.created_at,
        channelName: signal.channel_id ? channelNames[signal.channel_id] ?? 'Channel' : '—',
        action,
        actionLabel: tradeSignalActionLabel(action, SUMMARY_LABELS),
        symbol,
        summary,
        openStatus: openSignalIds.has(signal.id) ? 'open' : 'closed',
      }
    })

    const now = new Date()
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)
    const start7d = new Date(now)
    start7d.setDate(now.getDate() - 7)
    const start30d = new Date(now)
    start30d.setDate(now.getDate() - 30)

    const entrySignals = mapped.filter(row => isEntryAction(row.action))

    setChannels(channelOptions)
    setRows(mapped)
    setStats({
      today: entrySignals.filter(s => new Date(s.created_at) >= startOfToday).length,
      last7d: entrySignals.filter(s => new Date(s.created_at) >= start7d).length,
      last30d: entrySignals.filter(s => new Date(s.created_at) >= start30d).length,
      total: entrySignals.length,
    })
    setLoading(false)
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      if (filters.channelFilter !== 'all' && row.channel_id !== filters.channelFilter) return false
      if (!filters.dateFrom && !filters.dateTo) return true
      return signalInDateRange(new Date(row.created_at), filters.dateFrom, filters.dateTo)
    })
  }, [rows, filters.channelFilter, filters.dateFrom, filters.dateTo])

  return {
    rows: filteredRows,
    channels,
    stats,
    loading,
    error,
    refresh: load,
  }
}
