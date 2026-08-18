import { forwardRef, useImperativeHandle, useRef, type ReactNode } from 'react'
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleProp,
  useWindowDimensions,
  ViewStyle,
} from 'react-native'

export type WelcomePagerHandle = {
  setPage: (index: number) => void
}

type WelcomePagerProps = {
  style?: StyleProp<ViewStyle>
  initialPage?: number
  onPageSelected: (index: number) => void
  children: ReactNode
}

/** Web cannot import react-native-pager-view (native codegen). Horizontal paging instead. */
export const WelcomePager = forwardRef<WelcomePagerHandle, WelcomePagerProps>(
  function WelcomePager({ style, onPageSelected, children }, ref) {
    const scrollRef = useRef<ScrollView>(null)
    const { width } = useWindowDimensions()

    useImperativeHandle(ref, () => ({
      setPage(index: number) {
        scrollRef.current?.scrollTo({ x: index * width, animated: true })
        onPageSelected(index)
      },
    }))

    const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x
      const index = width > 0 ? Math.round(x / width) : 0
      onPageSelected(index)
    }

    return (
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScrollEndDrag={onMomentumScrollEnd}
        scrollEventThrottle={16}
        style={style}
      >
        {children}
      </ScrollView>
    )
  },
)
