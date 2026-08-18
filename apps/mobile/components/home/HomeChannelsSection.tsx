import { View } from 'react-native'
import { ChannelsPanel } from '@/components/home/ChannelsPanel'

interface HomeChannelsSectionProps {
  /** When false, skip fetch + realtime (section not visited / screen inactive). */
  enabled?: boolean
}

/** Channels body without page chrome — used when embedded; stack screen uses StackScreen. */
export function HomeChannelsSection({ enabled = true }: HomeChannelsSectionProps) {
  return (
    <View className="flex-1">
      <ChannelsPanel enabled={enabled} />
    </View>
  )
}
