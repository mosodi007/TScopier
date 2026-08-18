import { useCallback, useMemo, useRef, useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ThemeToggle } from '@/components/ThemeToggle'
import { TscopierLogo } from '@/components/branding/TscopierLogo'
import { WelcomePager, type WelcomePagerHandle } from '@/components/welcome/WelcomePager'
import { WelcomeCopierVisual } from '@/components/welcome/visuals/WelcomeCopierVisual'
import { WelcomeFiltersVisual } from '@/components/welcome/visuals/WelcomeFiltersVisual'
import { WelcomeIntroVisual } from '@/components/welcome/visuals/WelcomeIntroVisual'
import { WelcomeLogsVisual } from '@/components/welcome/visuals/WelcomeLogsVisual'
import { WelcomeMultilingualVisual } from '@/components/welcome/visuals/WelcomeMultilingualVisual'
import { useLocale } from '@/context/LocaleContext'
import { useTheme } from '@/context/ThemeContext'
import {
  buildWelcomeSlides,
  getWelcomeChrome,
  type WelcomeFeatureVisualId,
} from '@/lib/welcomeSlides'
import { tscTheme } from '@/lib/tscTheme'

function FeatureVisual({ id }: { id: WelcomeFeatureVisualId }) {
  switch (id) {
    case 'copier':
      return <WelcomeCopierVisual />
    case 'multilingual':
      return <WelcomeMultilingualVisual />
    case 'filters':
      return <WelcomeFiltersVisual />
    case 'logs':
      return <WelcomeLogsVisual />
  }
}

function Dot({ index, progress }: { index: number; progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const active = interpolate(
      progress.value,
      [index - 1, index, index + 1],
      [0, 1, 0],
      Extrapolation.CLAMP,
    )
    return {
      width: 8 + active * 16,
      opacity: 0.35 + active * 0.65,
      backgroundColor: tscTheme.primary,
    }
  })
  return <Animated.View style={[styles.dot, style]} />
}

interface WelcomeSliderProps {
  onFinished: () => void
  onSkip?: () => void
}

export function WelcomeSlider({ onFinished, onSkip }: WelcomeSliderProps) {
  const insets = useSafeAreaInsets()
  const { width: screenW } = useWindowDimensions()
  const { isDark } = useTheme()
  const { locale, landing, dir } = useLocale()
  const pagerRef = useRef<WelcomePagerHandle>(null)
  const [page, setPage] = useState(0)
  const progress = useSharedValue(0)

  const slides = useMemo(
    () => buildWelcomeSlides(landing, locale),
    [landing, locale],
  )
  const chrome = useMemo(() => getWelcomeChrome(locale), [locale])
  const isLast = page === slides.length - 1

  const onPageSelected = useCallback(
    (next: number) => {
      setPage(next)
      progress.value = withSpring(next, { damping: 18, stiffness: 180 })
    },
    [progress],
  )

  const goNext = () => {
    if (isLast) {
      onFinished()
      return
    }
    pagerRef.current?.setPage(page + 1)
  }

  const bg = isDark ? '#020617' : '#f8fafc'
  const titleColor = isDark ? '#f8fafc' : '#0f172a'
  const bodyColor = isDark ? '#94a3b8' : '#64748b'
  const ctaLabel = isLast ? chrome.getStarted : chrome.next

  return (
    <View style={[styles.root, { backgroundColor: bg, paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TscopierLogo height={26} />
        <View style={styles.topActions}>
          <LanguageSwitcher />
          <ThemeToggle size={18} />
          <Pressable
            onPress={onSkip ?? onFinished}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={chrome.skip}
          >
            <Text style={[styles.skip, { color: bodyColor }]}>{chrome.skip}</Text>
          </Pressable>
        </View>
      </View>

      <WelcomePager
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageSelected={onPageSelected}
      >
        {slides.map(slide => (
          <View key={slide.id} style={[styles.page, { width: screenW }]} collapsable={false}>
            {slide.kind === 'intro' ? (
              <WelcomeIntroVisual
                greeting={slide.greeting}
                headline={slide.headline}
                supporting={slide.supporting}
              />
            ) : (
              <ScrollView
                contentContainerStyle={styles.pageScroll}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <View style={styles.panel}>
                  <View style={{ height: Math.min(screenW * 0.72, 320) }}>
                    <FeatureVisual id={slide.id} />
                  </View>

                  <View style={styles.copy}>
                    <Text style={[styles.eyebrow, dir === 'rtl' && styles.rtlText]}>
                      {slide.eyebrow}
                    </Text>
                    <Text
                      style={[
                        styles.title,
                        { color: titleColor },
                        dir === 'rtl' && styles.rtlText,
                      ]}
                    >
                      {slide.title}
                    </Text>
                    <Text
                      style={[
                        styles.body,
                        { color: bodyColor },
                        dir === 'rtl' && styles.rtlText,
                      ]}
                    >
                      {slide.description}
                    </Text>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        ))}
      </WelcomePager>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <View style={styles.footerRow}>
          <View style={styles.dots}>
            {slides.map((slide, i) => (
              <Dot key={slide.id} index={i} progress={progress} />
            ))}
          </View>

          <Pressable
            onPress={goNext}
            accessibilityRole="button"
            style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
          >
            <View style={[styles.cta, { backgroundColor: tscTheme.primary }]}>
              <Text style={styles.ctaLabel}>{ctaLabel}</Text>
            </View>
          </Pressable>
        </View>

        {isLast ? (
          <Text style={[styles.footerHint, { color: bodyColor }]}>{chrome.trialHint}</Text>
        ) : (
          <View style={{ height: 18 }} />
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 12,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  skip: {
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: 4,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  pageScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  panel: {
    overflow: 'hidden',
  },
  copy: {
    paddingHorizontal: 12,
    paddingTop: 18,
    paddingBottom: 22,
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: tscTheme.primary,
    textAlign: 'center',
  },
  title: {
    marginTop: 10,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  body: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  rtlText: {
    writingDirection: 'rtl',
  },
  footer: {
    paddingHorizontal: 24,
    gap: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 10,
    flex: 1,
  },
  dot: {
    height: 8,
    borderRadius: 999,
  },
  cta: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  ctaLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  footerHint: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
})
