import { Pressable, Text, View } from 'react-native'
import { cn } from '@/lib/cn'
import type { ManageSignalRow } from '@/hooks/useManageSignals'

function formatSignalTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString([], {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface ManageSignalRowCardProps {
  item: ManageSignalRow
  onPress?: () => void
}

export function ManageSignalRowCard({ item, onPress }: ManageSignalRowCardProps) {
  const isOpen = item.openStatus === 'open'
  const isBuy = item.action === 'buy'
  const isSell = item.action === 'sell'

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className={cn(
        'border-b border-neutral-100 px-4 py-4 dark:border-neutral-800',
        isOpen && 'bg-teal-50 dark:bg-teal-950/40',
        onPress && 'active:opacity-90',
      )}
    >
      <View className="mb-2 flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text
            className="text-sm font-semibold text-neutral-900 dark:text-neutral-50"
            numberOfLines={1}
          >
            {item.symbol !== '—' ? item.symbol : item.actionLabel}
          </Text>
          <Text className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400" numberOfLines={1}>
            {item.channelName}
          </Text>
        </View>
        <View className="shrink-0 items-end gap-1">
          <View
            className={cn(
              'rounded-full px-2 py-0.5',
              isOpen
                ? 'bg-teal-100 dark:bg-teal-900/50'
                : 'bg-neutral-100 dark:bg-neutral-800',
            )}
          >
            <Text
              className={cn(
                'text-[11px] font-semibold uppercase tracking-wide',
                isOpen
                  ? 'text-teal-800 dark:text-teal-200'
                  : 'text-neutral-600 dark:text-neutral-300',
              )}
            >
              {isOpen ? 'Open' : 'Closed'}
            </Text>
          </View>
          <Text className="text-xs text-neutral-400">{formatSignalTime(item.created_at)}</Text>
        </View>
      </View>

      <Text
        className={cn(
          'mb-1.5 text-xs font-semibold uppercase',
          isBuy && 'text-teal-600 dark:text-teal-400',
          isSell && 'text-red-600 dark:text-red-400',
          !isBuy && !isSell && 'text-neutral-600 dark:text-neutral-300',
        )}
      >
        {item.actionLabel}
      </Text>
      <Text className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">
        {item.summary}
      </Text>
    </Pressable>
  )
}
