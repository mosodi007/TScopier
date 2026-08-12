import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { Clock, Scale, X } from 'lucide-react-native'
import type { BacktestTradeRow } from '@/lib/backtestTypes'
import {
  computeRiskRewardRatio,
  displayOutcomeLabel,
  formatDurationMs,
  formatEntryPrice,
  formatPipValue,
  formatSignalTimestamp,
  outcomeBannerLabel,
  outcomeBannerTone,
  tradeDurationMs,
  tradePipPnl,
} from '@/lib/backtestDisplay'
import { cn } from '@/lib/cn'
import { pnlTextClass } from '@/components/ui'
import { useTheme } from '@/context/ThemeContext'
import { tscTheme } from '@/lib/tscTheme'

interface BacktestTradeDetailModalProps {
  trade: BacktestTradeRow | null
  visible: boolean
  onClose: () => void
}

export function BacktestTradeDetailModal({
  trade,
  visible,
  onClose,
}: BacktestTradeDetailModalProps) {
  const { isDark } = useTheme()
  const iconMuted = isDark ? tscTheme.textMuted.dark : tscTheme.textMuted.light

  if (!trade) return null

  const pips = tradePipPnl(trade)
  const durationMs = tradeDurationMs(trade.signal_at, trade.closed_at)
  const rr = computeRiskRewardRatio(trade.entry_price, trade.sl, trade.tp_levels, trade.direction)
  const banner = outcomeBannerLabel(trade.outcome, trade.tps_hit, trade.tp_levels.length)
  const bannerTone = outcomeBannerTone(trade.outcome, pips)
  const outcomeLabel = displayOutcomeLabel(trade.outcome, trade.tps_hit, trade.tp_levels.length)

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/55">
        <Pressable className="absolute inset-0" onPress={onClose} accessibilityLabel="Close" />
        <View className="max-h-[92%] rounded-t-3xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <View className="flex-row items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
            <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              Trade details
            </Text>
            <Pressable
              onPress={onClose}
              className="rounded-lg p-2 active:bg-neutral-100 dark:active:bg-neutral-800"
              accessibilityLabel="Close"
            >
              <X size={20} color={iconMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerClassName="gap-5 p-5 pb-10" showsVerticalScrollIndicator={false}>
            <View
              className={cn(
                'rounded-xl border px-4 py-3',
                bannerTone === 'success' &&
                  'border-teal-200 bg-teal-50 dark:border-teal-800 dark:bg-teal-950/40',
                bannerTone === 'danger' &&
                  'border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50',
                bannerTone === 'warning' &&
                  'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40',
                bannerTone === 'neutral' &&
                  'border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50',
              )}
            >
              <Text
                className={cn(
                  'font-semibold',
                  bannerTone === 'success' && 'text-teal-800 dark:text-teal-200',
                  bannerTone === 'danger' && 'text-neutral-700 dark:text-neutral-300',
                  bannerTone === 'warning' && 'text-amber-900 dark:text-amber-200',
                  bannerTone === 'neutral' && 'text-neutral-700 dark:text-neutral-300',
                )}
              >
                {banner}
              </Text>
            </View>

            <View className="flex-row gap-3">
              <StatTile label="Pips" value={formatPipValue(pips).replace(/p$/, '')} valueClassName={pnlTextClass(pips)} />
              <StatTile
                label="R:R"
                value={rr}
                icon={<Scale size={12} color={iconMuted} />}
              />
              <StatTile
                label="Duration"
                value={formatDurationMs(durationMs)}
                icon={<Clock size={12} color={iconMuted} />}
              />
            </View>

            <Text className="text-xs text-neutral-500 dark:text-neutral-400">
              {trade.symbol}
              {' · '}
              <Text className="font-medium uppercase">{trade.direction}</Text>
              {' · '}
              {outcomeLabel}
              {' · '}
              @ {formatEntryPrice(trade.entry_price)}
              {' · '}
              {formatSignalTimestamp(trade.signal_at)}
            </Text>

            <View className="gap-2 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
              <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Levels
              </Text>
              <LevelRow label="Entry" value={formatEntryPrice(trade.entry_price)} />
              <LevelRow
                label="SL"
                value={trade.sl != null ? formatEntryPrice(trade.sl) : '—'}
              />
              {trade.tp_levels.map((tp, i) => (
                <LevelRow key={`${tp}-${i}`} label={`TP${i + 1}`} value={formatEntryPrice(tp)} />
              ))}
              <LevelRow
                label="Exit"
                value={trade.exit_price != null ? formatEntryPrice(trade.exit_price) : '—'}
              />
              <LevelRow
                label="Closed"
                value={
                  trade.closed_at ? formatSignalTimestamp(trade.closed_at) : '—'
                }
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

function StatTile({
  label,
  value,
  valueClassName,
  icon,
}: {
  label: string
  value: string
  valueClassName?: string
  icon?: React.ReactNode
}) {
  return (
    <View className="flex-1 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
      <View className="mb-1 flex-row items-center justify-center gap-1">
        {icon}
        <Text className="text-[10px] font-medium uppercase tracking-wide text-neutral-400">
          {label}
        </Text>
      </View>
      <Text
        className={cn(
          'text-center text-xl font-bold tabular-nums text-neutral-900 dark:text-neutral-50',
          valueClassName,
        )}
      >
        {value}
      </Text>
    </View>
  )
}

function LevelRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="text-sm text-neutral-500">{label}</Text>
      <Text className="text-sm font-medium tabular-nums text-neutral-800 dark:text-neutral-200">
        {value}
      </Text>
    </View>
  )
}
