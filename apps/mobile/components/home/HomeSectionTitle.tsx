import { Text, View } from 'react-native'
import { HeadingText } from '@/components/ui'

interface HomeSectionTitleProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function HomeSectionTitle({ title, subtitle, action }: HomeSectionTitleProps) {
  return (
    <View className="mb-3 flex-row items-start justify-between gap-3">
      <View className="min-w-0 flex-1">
        <HeadingText className="text-xl">{title}</HeadingText>
        {subtitle ? (
          <Text
            numberOfLines={2}
            className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400"
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action ? <View className="shrink-0">{action}</View> : null}
    </View>
  )
}
