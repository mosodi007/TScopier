import { AppScreen } from '@/components/layout/AppScreen'
import { ChannelsPanel } from '@/components/home/ChannelsPanel'

export default function ChannelsScreen() {
  return (
    <AppScreen title="Channels" subtitle="Manage which Telegram channels you're monitoring">
      <ChannelsPanel />
    </AppScreen>
  )
}
