import { View } from 'react-native'
import { ChannelsPanel } from '@/components/home/ChannelsPanel'
import { HomeSectionTitle } from '@/components/home/HomeSectionTitle'

interface HomeChannelsSectionProps {
  /** When false, skip fetch + realtime (section not visited / screen inactive). */
  enabled?: boolean
}

export function HomeChannelsSection({ enabled = true }: HomeChannelsSectionProps) {
  return (
    <View className="flex-1">
      <HomeSectionTitle title="Channels" />
      <ChannelsPanel enabled={enabled} />
    </View>
  )
}
