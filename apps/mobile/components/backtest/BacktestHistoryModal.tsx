import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native'
import { Clock, X } from 'lucide-react-native'
import { supabase } from '@/lib/supabase'
import type { BacktestHistoryRow } from '@/hooks/useBacktestFlow'
import type { BacktestRunRow } from '@/lib/backtestTypes'
import { formatPipValue, parseSummary } from '@/lib/backtestDisplay'
import { cn } from '@/lib/cn'
import { pnlTextClass } from '@/components/ui'
import { useTheme } from '@/context/ThemeContext'
import { tscTheme } from '@/lib/tscTheme'

interface BacktestHistoryModalProps {
  visible: boolean
  userId: string | undefined
  channelNames: Map<string, string>
  onClose: () => void
  onSelectRun: (run: BacktestHistoryRow) => void
}

function runSymbols(config: BacktestRunRow['config']): string {
  const syms = config?.symbols
  if (Array.isArray(syms) && syms.length > 0) {
    return syms.map(String).join(', ')
  }
  return '—'
}

function formatRunDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusBadge(status: string): { label: string; className: string; textClass: string } {
  switch (status) {
    case 'completed':
      return {
        label: 'Completed',
        className: 'bg-teal-100 dark:bg-teal-950',
        textClass: 'text-teal-800 dark:text-teal-300',
      }
    case 'failed':
      return {
        label: 'Failed',
        className: 'bg-neutral-100 dark:bg-neutral-800',
        textClass: 'text-neutral-600 dark:text-neutral-400',
      }
    case 'running':
    case 'pending':
      return {
        label: 'Running',
        className: 'bg-amber-100 dark:bg-amber-950',
        textClass: 'text-amber-900 dark:text-amber-200',
      }
    case 'cancelled':
      return {
        label: 'Cancelled',
        className: 'bg-neutral-100 dark:bg-neutral-800',
        textClass: 'text-neutral-600 dark:text-neutral-400',
      }
    default:
      return {
        label: status,
        className: 'bg-neutral-100 dark:bg-neutral-800',
        textClass: 'text-neutral-600',
      }
  }
}

export function BacktestHistoryModal({
  visible,
  userId,
  channelNames,
  onClose,
  onSelectRun,
}: BacktestHistoryModalProps) {
  const { isDark } = useTheme()
  const iconMuted = isDark ? tscTheme.textMuted.dark : tscTheme.textMuted.light
  const [runs, setRuns] = useState<BacktestHistoryRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')

  const runChannelLabel = (config: BacktestRunRow['config']): string => {
    const ids = config?.channelIds
    if (!Array.isArray(ids) || ids.length === 0) return '—'
    const first = channelNames.get(String(ids[0])) ?? 'Channel'
    return ids.length > 1 ? `${first} +${ids.length - 1}` : first
  }

  const fetchHistory = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setLoadError('')
    try {
      const { data, error } = await supabase
        .from('backtest_runs')
        .select('id, name, status, summary, config, created_at, completed_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw new Error(error.message)
      setRuns((data ?? []) as BacktestHistoryRow[])
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e))
      setRuns([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!visible) return
    void fetchHistory()
  }, [visible, fetchHistory])

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/55">
        <Pressable className="absolute inset-0" onPress={onClose} accessibilityLabel="Close" />
        <View className="max-h-[85%] rounded-t-3xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <View className="flex-row items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
            <View className="min-w-0 flex-1">
              <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                Backtest history
              </Text>
              <Text className="mt-0.5 text-xs text-neutral-500">
                Recent runs from your account
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              className="rounded-lg p-2 active:bg-neutral-100 dark:active:bg-neutral-800"
              accessibilityLabel="Close"
            >
              <X size={20} color={iconMuted} />
            </Pressable>
          </View>

          {loading ? (
            <View className="items-center justify-center gap-2 py-16">
              <ActivityIndicator color={tscTheme.primary} />
              <Text className="text-sm text-neutral-500">Loading…</Text>
            </View>
          ) : loadError ? (
            <Text className="px-5 py-8 text-sm text-red-600">{loadError}</Text>
          ) : runs.length === 0 ? (
            <Text className="px-5 py-16 text-center text-sm text-neutral-500">
              No backtest runs yet.
            </Text>
          ) : (
            <FlatList
              data={runs}
              keyExtractor={item => item.id}
              contentContainerClassName="pb-8"
              renderItem={({ item: run }) => {
                const badge = statusBadge(run.status)
                const summary = parseSummary(run.summary)
                const pips = summary?.totalPips
                const cfg = run.config as BacktestRunRow['config']
                const dateRange =
                  cfg?.dateFrom && cfg?.dateTo ? `${cfg.dateFrom} → ${cfg.dateTo}` : '—'

                return (
                  <Pressable
                    onPress={() => onSelectRun(run)}
                    className="border-b border-neutral-100 px-5 py-4 active:bg-neutral-50 dark:border-neutral-800 dark:active:bg-neutral-800/50"
                  >
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="min-w-0 flex-1">
                        <Text
                          className="font-medium text-neutral-900 dark:text-neutral-100"
                          numberOfLines={1}
                        >
                          {runSymbols(cfg)}
                        </Text>
                        <Text className="mt-0.5 text-xs text-neutral-500">
                          {runChannelLabel(cfg)}
                          {' · '}
                          {dateRange}
                        </Text>
                        <View className="mt-1 flex-row items-center gap-1">
                          <Clock size={12} color={iconMuted} />
                          <Text className="text-xs tabular-nums text-neutral-400">
                            {formatRunDate(run.created_at)}
                          </Text>
                        </View>
                      </View>
                      <View className="shrink-0 items-end gap-1.5">
                        <View className={cn('rounded-full px-2 py-0.5', badge.className)}>
                          <Text
                            className={cn(
                              'text-[10px] font-semibold uppercase',
                              badge.textClass,
                            )}
                          >
                            {badge.label}
                          </Text>
                        </View>
                        {pips != null && Number.isFinite(pips) ? (
                          <Text
                            className={cn('text-sm font-bold tabular-nums', pnlTextClass(pips))}
                          >
                            {formatPipValue(pips)}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </Pressable>
                )
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  )
}
