import { View } from 'react-native'
import { HeadingText } from '@/components/ui'

interface HomeSectionTitleProps {
  title: string
  action?: React.ReactNode
}

export function HomeSectionTitle({ title, action }: HomeSectionTitleProps) {
  return (
    <View className="mb-3 flex-row items-center justify-between gap-3">
      <HeadingText className="min-w-0 flex-1 text-xl">{title}</HeadingText>
      {action ? <View className="shrink-0">{action}</View> : null}
    </View>
  )
}
