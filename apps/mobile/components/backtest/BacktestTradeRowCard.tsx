import { Pressable, Text, View } from 'react-native'
import type { BacktestTradeRow } from '@/lib/backtestTypes'
import {
  displayOutcomeLabel,
  formatPipValue,
  formatSignalTimestamp,
  outcomeTone,
  tradePipPnl,
} from '@/lib/backtestDisplay'
import { cn } from '@/lib/cn'
import { pnlTextClass } from '@/components/ui'

interface BacktestTradeRowCardProps {
  trade: BacktestTradeRow
  onPress: () => void
}

export function BacktestTradeRowCard({ trade, onPress }: BacktestTradeRowCardProps) {
  const pips = tradePipPnl(trade)
  const tone = outcomeTone(trade.outcome, pips)
  const outcome = displayOutcomeLabel(trade.outcome, trade.tps_hit, trade.tp_levels.length)
  const isBuy = trade.direction.toLowerCase() === 'buy'
  const isSell = trade.direction.toLowerCase() === 'sell'

  return (
    <Pressable
      onPress={onPress}
      className="border-b border-neutral-100 px-4 py-3.5 active:bg-neutral-50 dark:border-neutral-800 dark:active:bg-neutral-800/40"
      accessibilityRole="button"
      accessibilityLabel={`${trade.symbol} ${outcome}`}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-2">
            <View
              className={cn(
                'h-full w-1 self-stretch rounded-full',
                tone === 'good' && 'bg-teal-500',
                tone === 'bad' && 'bg-neutral-400',
                tone === 'neutral' && 'bg-neutral-300 dark:bg-neutral-600',
              )}
            />
            <View className="min-w-0 flex-1">
              <Text
                className="text-sm font-semibold text-neutral-900 dark:text-neutral-50"
                numberOfLines={1}
              >
                {trade.symbol}
              </Text>
              <Text className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                <Text
                  className={cn(
                    'font-medium uppercase',
                    isBuy && 'text-teal-600 dark:text-teal-400',
                    isSell && 'text-red-600 dark:text-red-400',
                  )}
                >
                  {trade.direction || '—'}
                </Text>
                {' · '}
                {outcome}
              </Text>
              <Text className="mt-0.5 text-[11px] tabular-nums text-neutral-400">
                {formatSignalTimestamp(trade.signal_at)}
              </Text>
            </View>
          </View>
        </View>
        <Text className={cn('text-sm font-semibold tabular-nums', pnlTextClass(pips))}>
          {formatPipValue(pips)}
        </Text>
      </View>
    </Pressable>
  )
}
