import { View, Text } from 'react-native'
import { cn } from '@/lib/cn'

interface StatBlockProps {
  label: string
  value: string
  sub?: string
  valueClassName?: string
  subClassName?: string
  className?: string
}

export function StatBlock({
  label,
  value,
  sub,
  valueClassName,
  subClassName = 'text-neutral-500 dark:text-neutral-400',
  className,
}: StatBlockProps) {
  return (
    <View className={cn('flex-1 px-4 py-4', className)}>
      <Text className="mb-1.5 text-xs text-neutral-500 dark:text-neutral-400">{label}</Text>
      <Text className={cn('text-xl font-semibold text-neutral-900 dark:text-neutral-50', valueClassName)}>
        {value}
      </Text>
      {sub ? <Text className={cn('mt-1 text-xs', subClassName)}>{sub}</Text> : null}
    </View>
  )
}

interface OverviewStatProps {
  label: string
  value: string
}

export function OverviewStat({ label, value }: OverviewStatProps) {
  return (
    <View className="flex-1">
      <Text className="mb-1 text-xs text-neutral-500 dark:text-neutral-400">{label}</Text>
      <Text className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">{value}</Text>
    </View>
  )
}
