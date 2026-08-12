import { StyleSheet, Text, View } from 'react-native'
import { Clock } from 'lucide-react-native'
import { useLocale } from '@/context/LocaleContext'
import { useTheme } from '@/context/ThemeContext'
import { tscTheme } from '@/lib/tscTheme'

const TYPE_LABEL: Record<string, string> = {
  buy: 'BUY',
  sell: 'SELL',
  close: 'CLOSE',
  breakeven: 'BE',
  modify: 'MODIFY',
}

export function WelcomeLogsVisual() {
  const { isDark } = useTheme()
  const rows = useLocale().landing.features.visuals.logs.rows.slice(0, 4)
  const surface = isDark ? '#0f172a' : '#ffffff'
  const border = isDark ? '#1e293b' : '#e5e5e5'
  const text = isDark ? '#f8fafc' : '#0f172a'
  const muted = isDark ? '#94a3b8' : '#a3a3a3'

  return (
    <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
      <View style={[styles.header, { borderBottomColor: border }]}>
        <Clock size={14} color={tscTheme.primary} />
        <Text style={[styles.headerTitle, { color: text }]}>Copier logs</Text>
      </View>
      {rows.map((row, i) => {
        const typeColor =
          row.type === 'buy'
            ? tscTheme.primary
            : row.type === 'sell'
              ? '#dc2626'
              : muted
        return (
          <View
            key={`${row.symbol}-${row.time}-${i}`}
            style={[styles.row, i < rows.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: border }]}
          >
            <Text style={[styles.time, { color: muted }]}>{row.time}</Text>
            <View style={styles.mid}>
              <Text style={[styles.symbol, { color: text }]} numberOfLines={1}>
                {row.symbol}
              </Text>
            </View>
            <Text style={[styles.type, { color: typeColor }]}>
              {TYPE_LABEL[row.type] ?? String(row.type).toUpperCase()}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    marginHorizontal: 8,
    marginVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  time: {
    width: 52,
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },
  mid: {
    flex: 1,
    minWidth: 0,
  },
  symbol: {
    fontSize: 12,
    fontWeight: '600',
  },
  type: {
    fontSize: 10,
    fontWeight: '700',
  },
})
