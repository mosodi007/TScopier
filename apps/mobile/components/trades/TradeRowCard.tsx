import { Pressable, Text, View } from 'react-native'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react-native'
import type { MtTrade } from '@/lib/mtTrade'
import {
  formatTradeLots,
  formatTradePrice,
  getTradeDisplayMeta,
} from '@/lib/tradeDisplay'
import { cn } from '@/lib/cn'
import { pnlTextClass } from '@/components/ui'
import { useTheme } from '@/context/ThemeContext'
import { tscTheme } from '@/lib/tscTheme'

interface TradeRowCardProps {
  trade: MtTrade
  onPress: () => void
}

export function TradeRowCard({ trade, onPress }: TradeRowCardProps) {
  const { isDark } = useTheme()
  const { isBuy, isSell, profit, status, broker, directionLabel, timeLabel } =
    getTradeDisplayMeta(trade)
  const muted = isDark ? tscTheme.textMuted.dark : tscTheme.textMuted.light
  const dirColor = isBuy
    ? tscTheme.primary
    : isSell
      ? '#dc2626'
      : muted

  return (
    <Pressable
      onPress={onPress}
      className="border-b border-neutral-100 px-4 py-4 active:bg-neutral-50 dark:border-neutral-800 dark:active:bg-neutral-800/40"
      accessibilityRole="button"
      accessibilityLabel={`View details: ${trade.symbol || 'trade'} #${trade.ticket}`}
    >
      <View className="mb-3 flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text
            className="text-base font-semibold text-neutral-900 dark:text-neutral-50"
            numberOfLines={1}
          >
            {trade.symbol || '—'}
          </Text>
          <Text className="mt-0.5 text-[11px] tabular-nums text-neutral-400">#{trade.ticket}</Text>
        </View>
        <View className="shrink-0 items-end gap-1.5">
          <View
            className={cn(
              'rounded-full px-2 py-0.5',
              status.variant === 'open'
                ? 'bg-teal-100 dark:bg-teal-900/50'
                : 'bg-neutral-100 dark:bg-neutral-800',
            )}
          >
            <Text
              className={cn(
                'text-[11px] font-semibold uppercase tracking-wide',
                status.variant === 'open'
                  ? 'text-teal-800 dark:text-teal-200'
                  : 'text-neutral-600 dark:text-neutral-300',
              )}
            >
              {status.label}
            </Text>
          </View>
          <Text className={cn('text-sm font-semibold tabular-nums', pnlTextClass(profit))}>
            {profit == null ? '—' : `${profit > 0 ? '+' : ''}${profit.toFixed(2)}`}
          </Text>
        </View>
      </View>

      <View className="mb-3 flex-row items-center gap-1">
        {isBuy ? (
          <ArrowUpRight size={14} color={dirColor} />
        ) : isSell ? (
          <ArrowDownRight size={14} color={dirColor} />
        ) : (
          <Minus size={14} color={dirColor} />
        )}
        <Text
          className={cn(
            'text-sm font-medium',
            isBuy && 'text-teal-600 dark:text-teal-400',
            isSell && 'text-red-600 dark:text-red-400',
            !isBuy && !isSell && 'text-neutral-500 dark:text-neutral-400',
          )}
        >
          {directionLabel}
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-x-4 gap-y-2">
        <MetaCell label="Broker" value={broker} />
        <MetaCell label="Lots" value={formatTradeLots(trade.lot_size)} />
        <MetaCell label="Entry" value={formatTradePrice(trade.entry_price)} />
        <MetaCell label="Date & Time" value={timeLabel} />
        <MetaCell label="SL" value={formatTradePrice(trade.sl)} />
        <MetaCell label="TP" value={formatTradePrice(trade.tp)} />
      </View>
    </Pressable>
  )
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <View className="w-[45%] min-w-[40%]">
      <Text className="text-[10px] uppercase tracking-wide text-neutral-400">{label}</Text>
      <Text
        className="mt-0.5 text-xs tabular-nums text-neutral-700 dark:text-neutral-300"
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  )
}
