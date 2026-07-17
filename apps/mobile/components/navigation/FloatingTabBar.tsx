import { useCallback, useEffect, useRef } from 'react'
import { Platform, Pressable, Text, View, type LayoutChangeEvent } from 'react-native'
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs/types'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useTheme } from '@/context/ThemeContext'
import { TabBarNavIcon } from '@/components/navigation/TabBarNavIcon'
import { TAB_NAV_META, TAB_SCREEN_ORDER } from '@/lib/navigation'
import { tscTheme } from '@/lib/tscTheme'

const TAB_ORDER = new Set<string>(TAB_SCREEN_ORDER)

const TIMING = {
  duration: 180,
  easing: Easing.out(Easing.cubic),
}

interface TabFrame {
  x: number
  y: number
  width: number
  height: number
}

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const { isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const bottomOffset = Math.max(insets.bottom, 8)

  const activeColor = '#ffffff'
  const inactiveColor = isDark ? tscTheme.textMuted.dark : tscTheme.textMuted.light
  const surfaceColor = isDark ? tscTheme.surface.dark : tscTheme.tabBar.light
  const borderColor = isDark ? 'rgba(148, 163, 184, 0.18)' : 'rgba(226, 232, 240, 0.95)'
  const highlightColor = tscTheme.primary

  const visibleRoutes = state.routes.filter(route => TAB_ORDER.has(route.name))
  const activeVisibleIndex = Math.max(
    0,
    visibleRoutes.findIndex(route => {
      const routeIndex = state.routes.findIndex(r => r.key === route.key)
      return state.index === routeIndex
    }),
  )
  const activeKey = visibleRoutes[activeVisibleIndex]?.key ?? null

  const framesRef = useRef<Record<string, TabFrame>>({})

  const highlightX = useSharedValue(0)
  const highlightY = useSharedValue(0)
  const highlightW = useSharedValue(0)
  const highlightH = useSharedValue(0)
  const highlightOpacity = useSharedValue(0)

  const moveHighlightTo = useCallback(
    (frame: TabFrame) => {
      if (frame.width <= 0 || frame.height <= 0) return
      highlightX.value = withTiming(frame.x, TIMING)
      highlightY.value = withTiming(frame.y, TIMING)
      highlightW.value = withTiming(frame.width, TIMING)
      highlightH.value = withTiming(frame.height, TIMING)
      highlightOpacity.value = withTiming(1, { duration: 120 })
    },
    [highlightH, highlightOpacity, highlightW, highlightX, highlightY],
  )

  useEffect(() => {
    if (!activeKey) return
    const frame = framesRef.current[activeKey]
    if (frame) moveHighlightTo(frame)
  }, [activeKey, moveHighlightTo])

  const onTabLayout = useCallback(
    (key: string, event: LayoutChangeEvent) => {
      const { x, y, width, height } = event.nativeEvent.layout
      const next = { x, y, width, height }
      framesRef.current[key] = next
      if (key === activeKey) {
        moveHighlightTo(next)
      }
    },
    [activeKey, moveHighlightTo],
  )

  const highlightStyle = useAnimatedStyle(() => ({
    opacity: highlightOpacity.value,
    transform: [{ translateX: highlightX.value }, { translateY: highlightY.value }],
    width: highlightW.value,
    height: highlightH.value,
  }))

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        paddingHorizontal: 16,
        paddingBottom: bottomOffset,
      }}
    >
      <View
        style={{
          width: '100%',
          flexDirection: 'row',
          alignItems: 'stretch',
          borderRadius: 28,
          borderWidth: 1,
          borderColor,
          backgroundColor: surfaceColor,
          padding: 4,
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
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: 0,
              top: 0,
              zIndex: 0,
              borderRadius: 22,
              backgroundColor: highlightColor,
            },
            highlightStyle,
          ]}
        />

        {visibleRoutes.map(route => {
          const routeIndex = state.routes.findIndex(r => r.key === route.key)
          const focused = state.index === routeIndex
          const meta = TAB_NAV_META[route.name as keyof typeof TAB_NAV_META]
          if (!meta) return null

          const Icon = meta.icon
          const color = focused ? activeColor : inactiveColor

          return (
            <View
              key={route.key}
              onLayout={e => onTabLayout(route.key, e)}
              style={{
                flex: 1,
                zIndex: 1,
              }}
            >
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
                  paddingVertical: 8,
                  opacity: pressed ? 0.82 : 1,
                })}
              >
                <TabBarNavIcon icon={Icon} color={color} size={20} />
                <Text
                  numberOfLines={1}
                  style={{
                    marginTop: 2,
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
