import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '@/context/ThemeContext'
import { WelcomePlatformFlow } from '@/components/welcome/visuals/WelcomePlatformFlow'

interface WelcomeIntroVisualProps {
  greeting: string
  headline: string
  supporting: string
}

/**
 * Welcome intro: landing HeroPlatformFlow (Telegram → TScopier → MT5), then copy.
 */
export function WelcomeIntroVisual({
  greeting,
  headline,
  supporting,
}: WelcomeIntroVisualProps) {
  const { isDark } = useTheme()
  const titleColor = isDark ? '#f8fafc' : '#0f172a'
  const bodyColor = isDark ? '#94a3b8' : '#64748b'

  return (
    <View style={styles.root}>
      <View style={styles.flowWrap}>
        <WelcomePlatformFlow />
      </View>

      <Text style={[styles.greeting, { color: titleColor }]}>{greeting}</Text>
      <Text style={[styles.headline, { color: titleColor }]}>{headline}</Text>
      <Text style={[styles.supporting, { color: bodyColor }]}>{supporting}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  flowWrap: {
    marginBottom: 36,
    alignItems: 'center',
  },
  greeting: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  headline: {
    marginTop: 14,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  supporting: {
    marginTop: 16,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 340,
  },
})
