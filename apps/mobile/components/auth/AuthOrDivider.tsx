import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '@/context/ThemeContext'

export function AuthOrDivider() {
  const { isDark } = useTheme()
  const lineColor = isDark ? '#404040' : '#e5e5e5'
  const labelColor = isDark ? '#737373' : '#a3a3a3'

  return (
    <View style={styles.row}>
      <View style={[styles.line, { backgroundColor: lineColor }]} />
      <Text style={[styles.label, { color: labelColor }]}>or</Text>
      <View style={[styles.line, { backgroundColor: lineColor }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    marginVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  line: {
    height: StyleSheet.hairlineWidth,
    flex: 1,
  },
  label: {
    paddingHorizontal: 12,
    fontSize: 12,
  },
})
