import Animated, { type AnimatedStyle } from 'react-native-reanimated'
import { type StyleProp, type ViewStyle } from 'react-native'

interface SlidingTabHighlightProps {
  color: string
  borderRadius: number
  style: StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>
}

export function SlidingTabHighlight({ color, borderRadius, style }: SlidingTabHighlightProps) {
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: 0,
          top: 0,
          backgroundColor: color,
          borderRadius,
        },
        style,
      ]}
    />
  )
}
