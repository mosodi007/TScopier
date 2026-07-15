import { useCallback, useEffect } from 'react'
import { type LayoutChangeEvent } from 'react-native'
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

const TIMING = {
  duration: 180,
  easing: Easing.out(Easing.cubic),
}

interface SlidingTabHighlightOptions {
  tabCount: number
  gap?: number
}

export function useSlidingTabHighlight(
  activeIndex: number,
  { tabCount, gap = 0 }: SlidingTabHighlightOptions,
) {
  const translateX = useSharedValue(0)
  const highlightWidth = useSharedValue(0)
  const highlightHeight = useSharedValue(0)
  const opacity = useSharedValue(0)
  const containerWidth = useSharedValue(0)
  const containerHeight = useSharedValue(0)

  const animateToIndex = useCallback(
    (index: number, width: number, height: number) => {
      if (tabCount <= 0 || width <= 0 || height <= 0) return

      const segmentWidth = (width - gap * (tabCount - 1)) / tabCount
      const x = index * (segmentWidth + gap)

      translateX.value = withTiming(x, TIMING)
      highlightWidth.value = withTiming(segmentWidth, TIMING)
      highlightHeight.value = withTiming(height, TIMING)
      opacity.value = withTiming(1, { duration: 120 })
    },
    [gap, highlightHeight, highlightWidth, opacity, tabCount, translateX],
  )

  useEffect(() => {
    animateToIndex(activeIndex, containerWidth.value, containerHeight.value)
  }, [activeIndex, animateToIndex, containerHeight, containerWidth])

  const onContainerLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout
      containerWidth.value = width
      containerHeight.value = height
      animateToIndex(activeIndex, width, height)
    },
    [activeIndex, animateToIndex, containerHeight, containerWidth],
  )

  const highlightStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
    width: highlightWidth.value,
    height: highlightHeight.value,
  }))

  return { highlightStyle, onContainerLayout }
}
