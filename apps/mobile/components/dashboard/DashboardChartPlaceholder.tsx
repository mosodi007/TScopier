import { Text, View } from 'react-native'
import { Card, MutedText } from '@/components/ui'
import { TrendingUp } from 'lucide-react-native'

interface DashboardChartPlaceholderProps {
  title: string
  subtitle: string
}

export function DashboardChartPlaceholder({ title, subtitle }: DashboardChartPlaceholderProps) {
  return (
    <Card className="min-h-[160px] justify-between">
      <View className="flex-row items-center gap-2">
        <TrendingUp size={16} color="#0d9488" />
        <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{title}</Text>
      </View>
      <View className="mt-6 flex-row items-end justify-between gap-1 px-1">
        {[32, 48, 28, 56, 40, 64, 36].map((height, index) => (
          <View
            key={index}
            className="flex-1 rounded-t-md bg-teal-100 dark:bg-teal-950/60"
            style={{ height }}
          />
        ))}
      </View>
      <MutedText className="mt-3 text-xs">{subtitle}</MutedText>
    </Card>
  )
}
