import { Text, View } from 'react-native'
import { cn } from '@/lib/cn'

type BrokerBadgeTone = 'primary' | 'neutral' | 'error'

interface BrokerBadgeProps {
  label: string
  tone?: BrokerBadgeTone
}

const toneClass: Record<BrokerBadgeTone, string> = {
  primary: 'bg-teal-50 dark:bg-teal-950/60',
  neutral: 'bg-neutral-100 dark:bg-neutral-800',
  error: 'bg-red-50 dark:bg-red-950/40',
}

const textClass: Record<BrokerBadgeTone, string> = {
  primary: 'text-teal-700 dark:text-teal-400',
  neutral: 'text-neutral-600 dark:text-neutral-300',
  error: 'text-red-700 dark:text-red-400',
}

export function BrokerBadge({ label, tone = 'neutral' }: BrokerBadgeProps) {
  return (
    <View className={cn('rounded-full px-2 py-0.5', toneClass[tone])}>
      <Text className={cn('text-[10px] font-semibold', textClass[tone])}>{label}</Text>
    </View>
  )
}
