import { StyleSheet, Text, View } from 'react-native'
import { useLocale } from '@/context/LocaleContext'
import { useTheme } from '@/context/ThemeContext'

export function WelcomeFiltersVisual() {
  const { isDark } = useTheme()
  const v = useLocale().landing.features.visuals.filters
  const rules = v.rules.slice(0, 4)
  const surface = isDark ? '#0f172a' : '#ffffff'
  const border = isDark ? '#1e293b' : '#e5e5e5'
  const text = isDark ? '#f1f5f9' : '#1e293b'
  const muted = isDark ? '#94a3b8' : '#737373'
  const toggleBg = isDark ? '#1e293b' : '#f8fafc'

  return (
    <View style={styles.wrap}>
      {rules.map(rule => {
        const allow = rule.decision === 'allow'
        return (
          <View
            key={rule.label}
            style={[styles.row, { backgroundColor: surface, borderColor: border }]}
          >
            <View style={styles.copy}>
              <Text style={[styles.label, { color: text }]} numberOfLines={1}>
                {rule.label}
              </Text>
              <Text style={[styles.example, { color: muted }]} numberOfLines={1}>
                {rule.example}
              </Text>
            </View>
            <View style={[styles.toggle, { backgroundColor: toggleBg, borderColor: border }]}>
              <Text
                style={[
                  styles.toggleOpt,
                  allow && styles.toggleActive,
                  allow && { backgroundColor: isDark ? '#0f172a' : '#fff', color: text },
                ]}
              >
                {v.allowLabel}
              </Text>
              <Text
                style={[
                  styles.toggleOpt,
                  !allow && styles.toggleIgnore,
                ]}
              >
                {v.ignoreLabel}
              </Text>
            </View>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
  example: {
    marginTop: 2,
    fontSize: 10,
  },
  toggle: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    padding: 2,
  },
  toggleOpt: {
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    color: '#94a3b8',
    overflow: 'hidden',
  },
  toggleActive: {
    fontWeight: '600',
  },
  toggleIgnore: {
    color: '#b45309',
  },
})
