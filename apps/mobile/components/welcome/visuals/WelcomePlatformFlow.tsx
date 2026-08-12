import { useEffect } from 'react'
import { Image, StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  ReduceMotion,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'
import { useTheme } from '@/context/ThemeContext'

const telegram = require('@/assets/images/Telegram.png')
const hubLogo = require('@/assets/images/tslogo-collapse.png')
const mt5 = require('@/assets/images/MT5.png')

/** Slightly slower than web so the traveler is easy to see on mobile. */
const FLOW_MS = 1800

const NODE = 52
const HUB = 90
const GAP = 36
const ROW_W = NODE + GAP + HUB + GAP + NODE
const WIRE_START = NODE / 2
const WIRE_WIDTH = ROW_W - NODE
const HUB_AT = (NODE + GAP + HUB / 2 - WIRE_START) / WIRE_WIDTH
const TIMING = {
  duration: FLOW_MS,
  easing: Easing.linear,
  reduceMotion: ReduceMotion.Never,
} as const

function FlowNode({
  source,
  size,
  imgSize,
  variant,
  peakAt,
  progress,
  isDark,
}: {
  source: number
  size: number
  imgSize: number
  variant: 'telegram' | 'hub' | 'broker'
  peakAt: number
  progress: SharedValue<number>
  isDark: boolean
}) {
  const anim = useAnimatedStyle(() => {
    const dist = Math.abs(progress.value - peakAt)
    const pulse = dist < 0.12 ? 1 - dist / 0.12 : 0
    return {
      transform: [{ scale: interpolate(pulse, [0, 1], [1, 1.12]) }],
    }
  })

  const surface =
    variant === 'telegram'
      ? isDark
        ? 'rgba(4, 47, 46, 0.55)'
        : 'rgba(240, 253, 250, 0.95)'
      : variant === 'hub'
        ? isDark
          ? '#020617'
          : '#0a0a0a'
        : isDark
          ? '#0f172a'
          : '#ffffff'

  const border =
    variant === 'telegram'
      ? isDark
        ? 'rgba(45, 212, 191, 0.35)'
        : 'rgba(153, 246, 228, 0.95)'
      : variant === 'hub'
        ? 'rgba(20, 184, 166, 0.45)'
        : isDark
          ? '#334155'
          : 'rgba(229, 231, 235, 0.95)'

  return (
    <Animated.View
      style={[
        styles.node,
        {
          width: size,
          height: size,
          borderRadius: variant === 'hub' ? size * 0.32 : 14,
          backgroundColor: surface,
          borderColor: border,
        },
        variant === 'hub' && styles.hubRing,
        anim,
      ]}
    >
      <Image source={source} style={{ width: imgSize, height: imgSize }} resizeMode="contain" />
    </Animated.View>
  )
}

/**
 * Landing HeroPlatformFlow (Telegram → TScopier → MT5) for the welcome intro.
 */
export function WelcomePlatformFlow() {
  const { isDark } = useTheme()
  const progress = useSharedValue(0)

  useEffect(() => {
    progress.value = 0
    progress.value = withRepeat(withTiming(1, TIMING), -1, false)
  }, [progress])

  const travelerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * WIRE_WIDTH }],
  }))

  const wireColor = isDark ? '#525252' : '#94a3b8'

  return (
    <View
      style={styles.root}
      accessibilityRole="image"
      accessibilityLabel="Signals flow from Telegram through TScopier to MetaTrader 5"
    >
      <View style={[styles.wire, { backgroundColor: wireColor }]} />

      {/* Under the logos so the traveler ducks behind the TScopier hub. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.traveler, travelerStyle]}
      />

      <View style={styles.nodes} pointerEvents="none">
        <FlowNode
          source={telegram}
          size={NODE}
          imgSize={28}
          variant="telegram"
          peakAt={0}
          progress={progress}
          isDark={isDark}
        />
        <FlowNode
          source={hubLogo}
          size={HUB}
          imgSize={51}
          variant="hub"
          peakAt={HUB_AT}
          progress={progress}
          isDark={isDark}
        />
        <FlowNode
          source={mt5}
          size={NODE}
          imgSize={28}
          variant="broker"
          peakAt={0.96}
          progress={progress}
          isDark={isDark}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    height: HUB + 16,
    width: ROW_W,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wire: {
    position: 'absolute',
    left: WIRE_START,
    width: WIRE_WIDTH,
    top: '50%',
    marginTop: -1,
    height: 2,
    borderRadius: 999,
    zIndex: 1,
  },
  traveler: {
    position: 'absolute',
    left: WIRE_START - 5,
    top: '50%',
    marginTop: -5,
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#14b8a6',
    borderWidth: 2,
    borderColor: 'rgba(45, 212, 191, 0.55)',
    zIndex: 2,
    elevation: 1,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 6,
  },
  nodes: {
    zIndex: 10,
    elevation: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: GAP,
  },
  node: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    elevation: 4,
  },
  hubRing: {
    borderWidth: 1.5,
    elevation: 6,
  },
})
