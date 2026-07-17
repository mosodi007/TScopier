import { useCallback, useState } from 'react'
import { Pressable, View } from 'react-native'
import { Plus } from 'lucide-react-native'
import { ChannelsPanel } from '@/components/home/ChannelsPanel'
import { HomeSectionTitle } from '@/components/home/HomeSectionTitle'

interface HomeChannelsSectionProps {
  /** When false, skip fetch + realtime (section not visited / screen inactive). */
  enabled?: boolean
}

export function HomeChannelsSection({ enabled = true }: HomeChannelsSectionProps) {
  const [addAction, setAddAction] = useState<{
    onPress: () => void
    disabled: boolean
  } | null>(null)

  const onAddActionChange = useCallback(
    (action: { onPress: () => void; disabled: boolean } | null) => {
      setAddAction(action)
    },
    [],
  )

  return (
    <View className="flex-1">
      <HomeSectionTitle
        title="Channels"
        action={
          addAction ? (
            <Pressable
              onPress={addAction.onPress}
              disabled={addAction.disabled}
              accessibilityRole="button"
              accessibilityLabel="Add channel from Telegram"
              className="h-9 w-9 items-center justify-center rounded-full bg-teal-600 active:bg-teal-700"
              style={{ opacity: addAction.disabled ? 0.5 : 1 }}
            >
              <Plus size={20} color="#ffffff" strokeWidth={2.5} />
            </Pressable>
          ) : null
        }
      />
      <ChannelsPanel
        enabled={enabled}
        hideInlineAddButton
        onAddActionChange={onAddActionChange}
      />
    </View>
  )
}
