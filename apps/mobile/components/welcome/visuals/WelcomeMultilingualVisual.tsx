import { StyleSheet, Text, View } from 'react-native'
import { Check } from 'lucide-react-native'
import { useLocale } from '@/context/LocaleContext'
import { useTheme } from '@/context/ThemeContext'
import { tscTheme } from '@/lib/tscTheme'

export function WelcomeMultilingualVisual() {
  const { isDark } = useTheme()
  const v = useLocale().landing.features.visuals.multilingual
  const signals = v.signals.slice(0, 3)
  const surface = isDark ? '#0f172a' : '#ffffff'
  const border = isDark ? '#1e293b' : '#e5e5e5'
  const text = isDark ? '#f1f5f9' : '#334155'
  const muted = isDark ? '#94a3b8' : '#737373'

  return (
    <View style={styles.wrap}>
      <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(4,47,46,0.55)' : '#f0fdfa' }]}>
        <Text style={styles.badgeText}>{v.languagesBadge}</Text>
      </View>
      {signals.map((signal, i) => (
        <View
          key={signal.language}
          style={[
            styles.card,
            {
              backgroundColor: surface,
              borderColor: border,
              marginTop: i === 0 ? 0 : -8,
              zIndex: signals.length - i,
              transform: [{ translateX: i === 1 ? 10 : i === 2 ? -6 : 0 }],
            },
          ]}
        >
          <View style={styles.cardTop}>
            <Text style={[styles.lang, { color: text }]}>{signal.language}</Text>
            <View style={[styles.parsed, { backgroundColor: isDark ? 'rgba(4,47,46,0.55)' : '#f0fdfa' }]}>
              <Check size={10} color={tscTheme.primary} />
              <Text style={styles.parsedText}>{v.parsedLabel}</Text>
            </View>
          </View>
          <Text style={[styles.message, { color: muted }]} numberOfLines={2}>
            {signal.message}
          </Text>
          <Text style={styles.action}>{signal.parsedAction}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  badge: {
    alignSelf: 'center',
    marginBottom: 12,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeText: {
    color: tscTheme.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  lang: {
    fontSize: 12,
    fontWeight: '600',
  },
  parsed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  parsedText: {
    fontSize: 9,
    fontWeight: '700',
    color: tscTheme.primary,
    textTransform: 'uppercase',
  },
  message: {
    marginTop: 6,
    fontSize: 11,
    lineHeight: 15,
  },
  action: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    color: tscTheme.primary,
  },
})
