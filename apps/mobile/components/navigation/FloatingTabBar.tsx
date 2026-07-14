import { Platform, Pressable, Text, View } from 'react-native'
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs/types'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '@/context/ThemeContext'
import { TabBarNavIcon } from '@/components/navigation/TabBarNavIcon'
import { TAB_NAV_META, TAB_SCREEN_ORDER } from '@/lib/navigation'
import { tscTheme } from '@/lib/tscTheme'

const TAB_ORDER = new Set<string>(TAB_SCREEN_ORDER)

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const { isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const bottomOffset = Math.max(insets.bottom, 8)

  const activeColor = isDark ? tscTheme.primaryMuted.dark : tscTheme.primary
  const inactiveColor = isDark ? tscTheme.textMuted.dark : tscTheme.textMuted.light
  const surfaceColor = isDark ? tscTheme.surface.dark : tscTheme.tabBar.light
  const borderColor = isDark ? 'rgba(148, 163, 184, 0.18)' : 'rgba(226, 232, 240, 0.95)'
  const highlightColor = isDark ? 'rgba(4, 47, 46, 0.55)' : '#f0fdfa'

  const visibleRoutes = state.routes.filter(route => TAB_ORDER.has(route.name))

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 16,
        paddingBottom: bottomOffset,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          borderRadius: 28,
          borderWidth: 1,
          borderColor,
          backgroundColor: surfaceColor,
          paddingHorizontal: 6,
          paddingVertical: 6,
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
        {visibleRoutes.map(route => {
          const routeIndex = state.routes.findIndex(r => r.key === route.key)
          const focused = state.index === routeIndex
          const meta = TAB_NAV_META[route.name as keyof typeof TAB_NAV_META]
          if (!meta) return null

          const Icon = meta.icon
          const color = focused ? activeColor : inactiveColor

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={meta.label}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                })
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params)
                }
              }}
              onLongPress={() => {
                navigation.emit({
                  type: 'tabLongPress',
                  target: route.key,
                })
              }}
              style={({ pressed }) => ({
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 0,
                paddingHorizontal: 1,
                paddingVertical: 1,
                opacity: pressed ? 0.82 : 1,
              })}
            >
              <View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 18,
                  paddingHorizontal: focused ? 14 : 6,
                  paddingVertical: 5,
                  width: '100%',
                  backgroundColor: focused ? highlightColor : 'transparent',
                }}
              >
                <TabBarNavIcon icon={Icon} color={color} size={20} />
                <Text
                  numberOfLines={1}
                  style={{
                    marginTop: 1,
                    fontSize: 9,
                    fontWeight: focused ? '700' : '600',
                    color,
                  }}
                >
                  {meta.label}
                </Text>
              </View>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
