import { Platform, Pressable, View } from 'react-native'
import { Plus } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { tscTheme } from '@/lib/tscTheme'

/** Matches FloatingTabBar: safe-area pad + top pad + pill + small gap. */
const TAB_BAR_TOP_PAD = 8
const TAB_BAR_PILL_HEIGHT = 5
const FAB_GAP_ABOVE_NAV = -15

interface FloatingActionButtonProps {
  onPress: () => void
  disabled?: boolean
  accessibilityLabel: string
  /** Lift above the floating tab bar. Off on stack screens (no tab bar). */
  aboveTabBar?: boolean
}

export function FloatingActionButton({
  onPress,
  disabled = false,
  accessibilityLabel,
  aboveTabBar = true,
}: FloatingActionButtonProps) {
  const insets = useSafeAreaInsets()
  const bottomPad = Math.max(insets.bottom, 8)
  const tabClearance = aboveTabBar ? TAB_BAR_TOP_PAD + TAB_BAR_PILL_HEIGHT + FAB_GAP_ABOVE_NAV : 16
  const bottom = bottomPad + tabClearance

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        right: 16,
        bottom,
        zIndex: 20,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => ({
          opacity: disabled ? 0.5 : pressed ? 0.88 : 1,
        })}
      >
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 999,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: tscTheme.primary,
            ...(Platform.OS === 'ios'
              ? {
                  shadowColor: '#0f766e',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                }
              : { elevation: 10 }),
          }}
        >
          <Plus size={26} color="#ffffff" strokeWidth={2.5} />
        </View>
      </Pressable>
    </View>
  )
}
