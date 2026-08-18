import { ChannelsPanel } from '@/components/home/ChannelsPanel'
import { StackScreen } from '@/components/layout/StackScreen'

export default function ChannelsScreen() {
  return (
    <StackScreen title="Channels">
      <ChannelsPanel />
    </StackScreen>
  )
}
