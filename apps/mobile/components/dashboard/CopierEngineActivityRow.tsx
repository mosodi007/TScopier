import { Text, View } from 'react-native'
import { MutedText } from '@/components/ui'
import { formatShortTime, StatusBadge } from '@/components/dashboard/logDisplay'
import type { CopierEngineListItem } from '@/lib/copierEngineActivities'

interface CopierEngineActivityRowProps {
  activity: CopierEngineListItem
  variant?: 'compact' | 'full'
}

export function CopierEngineActivityRow({ activity, variant = 'compact' }: CopierEngineActivityRowProps) {
  if (variant === 'compact') {
    return (
      <View className="gap-1 px-4 py-3">
        <Text className="text-sm text-neutral-800 dark:text-neutral-100">{activity.message}</Text>
        <MutedText className="text-[11px]">{formatShortTime(activity.created_at)}</MutedText>
      </View>
    )
  }

  return (
    <View className="gap-2 px-4 py-3">
      <View className="flex-row flex-wrap items-center gap-2">
        <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{activity.kind}</Text>
        <StatusBadge status={activity.status} />
      </View>
      <Text className="text-sm leading-5 text-neutral-700 dark:text-neutral-200">{activity.message}</Text>
      <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
        <MutedText className="text-xs">{formatShortTime(activity.created_at)}</MutedText>
        {activity.symbol ? (
          <>
            <MutedText className="text-xs">·</MutedText>
            <Text className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{activity.symbol}</Text>
          </>
        ) : null}
        {activity.channelName ? (
          <>
            <MutedText className="text-xs">·</MutedText>
            <MutedText className="max-w-[12rem] text-xs" numberOfLines={1}>
              {activity.channelName}
            </MutedText>
          </>
        ) : null}
      </View>
    </View>
  )
}
