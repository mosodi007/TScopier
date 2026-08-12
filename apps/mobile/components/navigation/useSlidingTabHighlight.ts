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
  /** Vertical inset — controls pill height inside the bar. */
  inset?: number
  /**
   * Horizontal inset for pill x/width. Defaults to `inset`.
   * Pass the container’s content padding so the pill lines up under each tab
   * (icons/labels stay centered) while `inset` can stay smaller for a taller pill.
   */
  horizontalInset?: number
}

export function useSlidingTabHighlight(
  activeIndex: number,
  { tabCount, gap = 0, inset = 0, horizontalInset }: SlidingTabHighlightOptions,
) {
  const hInset = horizontalInset ?? inset
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(inset)
  const highlightWidth = useSharedValue(0)
  const highlightHeight = useSharedValue(0)
  const opacity = useSharedValue(0)
  const containerWidth = useSharedValue(0)
  const containerHeight = useSharedValue(0)

  const animateToIndex = useCallback(
    (index: number, width: number, height: number) => {
      if (tabCount <= 0 || width <= 0 || height <= 0) return

      const innerWidth = Math.max(0, width - hInset * 2)
      const innerHeight = Math.max(0, height - inset * 2)
      const segmentWidth = (innerWidth - gap * (tabCount - 1)) / tabCount
      const x = hInset + index * (segmentWidth + gap)

      translateX.value = withTiming(x, TIMING)
      translateY.value = withTiming(inset, TIMING)
      highlightWidth.value = withTiming(segmentWidth, TIMING)
      highlightHeight.value = withTiming(innerHeight, TIMING)
      opacity.value = withTiming(1, { duration: 120 })
    },
    [gap, hInset, highlightHeight, highlightWidth, inset, opacity, tabCount, translateX, translateY],
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
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
    width: highlightWidth.value,
    height: highlightHeight.value,
  }))

  return { highlightStyle, onContainerLayout }
}
