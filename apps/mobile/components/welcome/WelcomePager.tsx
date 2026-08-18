import { forwardRef, useImperativeHandle, useRef, type ReactNode } from 'react'
import { StyleProp, ViewStyle } from 'react-native'
import PagerView from 'react-native-pager-view'

export type WelcomePagerHandle = {
  setPage: (index: number) => void
}

type WelcomePagerProps = {
  style?: StyleProp<ViewStyle>
  initialPage?: number
  onPageSelected: (index: number) => void
  children: ReactNode
}

export const WelcomePager = forwardRef<WelcomePagerHandle, WelcomePagerProps>(
  function WelcomePager({ style, initialPage = 0, onPageSelected, children }, ref) {
    const pagerRef = useRef<PagerView>(null)

    useImperativeHandle(ref, () => ({
      setPage(index: number) {
        pagerRef.current?.setPage(index)
      },
    }))

    return (
      <PagerView
        ref={pagerRef}
        style={style}
        initialPage={initialPage}
        onPageSelected={e => onPageSelected(e.nativeEvent.position)}
      >
        {children}
      </PagerView>
    )
  },
)
