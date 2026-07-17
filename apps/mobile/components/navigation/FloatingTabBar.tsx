import { Platform, Pressable, Text, View } from 'react-native'
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs/types'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '@/context/ThemeContext'
import { SlidingTabHighlight } from '@/components/navigation/SlidingTabHighlight'
import { TabBarNavIcon } from '@/components/navigation/TabBarNavIcon'
import { useSlidingTabHighlight } from '@/components/navigation/useSlidingTabHighlight'
import { TAB_NAV_META, TAB_SCREEN_ORDER } from '@/lib/navigation'
import { tscTheme } from '@/lib/tscTheme'

const BAR_PAD = 6

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const { isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const bottomPad = Math.max(insets.bottom, 8)

  const activeColor = '#ffffff'
  const inactiveColor = isDark ? tscTheme.textMuted.dark : tscTheme.textMuted.light
  const surfaceColor = isDark ? tscTheme.surface.dark : tscTheme.tabBar.light
  const borderColor = isDark ? 'rgba(148, 163, 184, 0.18)' : 'rgba(226, 232, 240, 0.95)'
  const highlightColor = tscTheme.primary

  const visibleRoutes = TAB_SCREEN_ORDER.map(name =>
    state.routes.find(route => route.name === name),
  ).filter((route): route is (typeof state.routes)[number] => route != null)

  const activeVisibleIndex = Math.max(
    0,
    visibleRoutes.findIndex(route => {
      const routeIndex = state.routes.findIndex(r => r.key === route.key)
      return state.index === routeIndex
    }),
  )

  const { highlightStyle, onContainerLayout } = useSlidingTabHighlight(activeVisibleIndex, {
    tabCount: visibleRoutes.length,
    gap: 0,
    inset: BAR_PAD,
  })

  return (
    <View
      pointerEvents="box-none"
      style={{
        paddingHorizontal: 16,
        paddingBottom: bottomPad,
        paddingTop: 8,
        backgroundColor: 'transparent',
      }}
    >
      <View
        onLayout={onContainerLayout}
        style={{
          position: 'relative',
          flexDirection: 'row',
          width: '100%',
          borderRadius: 28,
          borderWidth: 1,
          borderColor,
          backgroundColor: surfaceColor,
          padding: BAR_PAD,
          ...(Platform.OS === 'ios'
            ? {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: isDark ? 0.38 : 0.14,
                shadowRadius: 18,
              }
            : { elevation: 14 }),
        }}
      >
        <SlidingTabHighlight color={highlightColor} borderRadius={22} style={highlightStyle} />

        {visibleRoutes.map(route => {
          const routeIndex = state.routes.findIndex(r => r.key === route.key)
          const focused = state.index === routeIndex
          const meta = TAB_NAV_META[route.name as keyof typeof TAB_NAV_META]
          if (!meta) return null

          const color = focused ? activeColor : inactiveColor

          return (
            // Layout MUST live on View — Pressable function-styles drop width/flex (NativeWind).
            <View key={route.key} style={{ flex: 1, zIndex: 1 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
                accessibilityLabel={meta.label}
                onPress={() => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  })
                  if (event.defaultPrevented) return
                  navigation.navigate(route.name, route.params)
                }}
                onLongPress={() => {
                  navigation.emit({
                    type: 'tabLongPress',
                    target: route.key,
                  })
                }}
                style={({ pressed }) => ({
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 10,
                  opacity: pressed ? 0.88 : 1,
                })}
              >
                <TabBarNavIcon icon={meta.icon} color={color} size={22} />
                <Text
                  numberOfLines={1}
                  style={{
                    marginTop: 2,
                    width: '100%',
                    fontSize: 9,
                    fontWeight: '600',
                    color,
                    textAlign: 'center',
                  }}
                >
                  {meta.label}
                </Text>
              </Pressable>
            </View>
          )
        })}
      </View>
    </View>
  )
}
