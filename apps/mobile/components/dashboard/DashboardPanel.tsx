import { Pressable, Text, View } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import { Card, HeadingText } from '@/components/ui'

interface DashboardPanelProps {
  title: string
  onViewAll?: () => void
  viewAllLabel?: string
  children: React.ReactNode
  emptyMessage?: string
  isEmpty?: boolean
}

export function DashboardPanel({
  title,
  onViewAll,
  viewAllLabel = 'View all',
  children,
  emptyMessage,
  isEmpty,
}: DashboardPanelProps) {
  return (
    <Card className="overflow-hidden p-0">
      <View className="flex-row items-center justify-between border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
        <HeadingText className="text-sm">{title}</HeadingText>
        {onViewAll ? (
          <Pressable onPress={onViewAll} className="flex-row items-center gap-0.5">
            <Text className="text-xs font-medium text-teal-600 dark:text-teal-400">{viewAllLabel}</Text>
            <ChevronRight size={14} color="#0d9488" />
          </Pressable>
        ) : null}
      </View>
      {isEmpty ? (
        <View className="px-4 py-8">
          <Text className="text-center text-sm text-neutral-500 dark:text-neutral-400">{emptyMessage}</Text>
        </View>
      ) : (
        children
      )}
    </Card>
  )
}
