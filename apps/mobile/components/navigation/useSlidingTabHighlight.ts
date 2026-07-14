import { useCallback, useEffect, useState } from 'react'
import { type LayoutChangeEvent } from 'react-native'
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

const TIMING = {
  duration: 260,
  easing: Easing.out(Easing.cubic),
}

interface TabLayout {
  x: number
  y: number
  width: number
  height: number
}

export function useSlidingTabHighlight(activeIndex: number) {
  const [layouts, setLayouts] = useState<TabLayout[]>([])
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const highlightWidth = useSharedValue(0)
  const highlightHeight = useSharedValue(0)
  const opacity = useSharedValue(0)

  const moveHighlight = useCallback(
    (layout: TabLayout | undefined) => {
      if (!layout) return
      translateX.value = withTiming(layout.x, TIMING)
      translateY.value = withTiming(layout.y, TIMING)
      highlightWidth.value = withTiming(layout.width, TIMING)
      highlightHeight.value = withTiming(layout.height, TIMING)
      opacity.value = withTiming(1, { duration: 180 })
    },
    [highlightHeight, highlightWidth, opacity, translateX, translateY],
  )

  useEffect(() => {
    moveHighlight(layouts[activeIndex])
  }, [activeIndex, layouts, moveHighlight])

  const onTabLayout = useCallback(
    (index: number) => (event: LayoutChangeEvent) => {
      const { x, y, width, height } = event.nativeEvent.layout
      setLayouts(prev => {
        const next = [...prev]
        next[index] = { x, y, width, height }
        return next
      })
    },
    [],
  )

  const highlightStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
    width: highlightWidth.value,
    height: highlightHeight.value,
  }))

  return { highlightStyle, onTabLayout }
}
