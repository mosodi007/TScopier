import { Image, StyleSheet, Text, View } from 'react-native'
import { Layers, Radio, Scale } from 'lucide-react-native'
import { useLocale } from '@/context/LocaleContext'
import { useTheme } from '@/context/ThemeContext'
import { tscTheme } from '@/lib/tscTheme'

const mt4 = require('@/assets/images/MT4.png')
const mt5 = require('@/assets/images/MT5.png')

export function WelcomeCopierVisual() {
  const { isDark } = useTheme()
  const v = useLocale().landing.features.visuals.copier
  const surface = isDark ? '#1e293b' : '#ffffff'
  const border = isDark ? '#334155' : '#e2e8f0'
  const text = isDark ? '#f1f5f9' : '#1e293b'
  const muted = isDark ? '#94a3b8' : '#64748b'

  return (
    <View style={styles.wrap}>
      <View style={[styles.pulse, { borderColor: 'rgba(45, 212, 191, 0.28)' }]} />

      <View style={[styles.node, styles.telegram, { backgroundColor: isDark ? 'rgba(4,47,46,0.45)' : 'rgba(240,253,250,0.9)', borderColor: isDark ? 'rgba(45,212,191,0.28)' : 'rgba(153,246,228,0.9)' }]}>
        <Text style={styles.nodeLabel}>{v.telegramLabel}</Text>
        <Text style={[styles.nodeTitle, { color: text }]}>{v.channelName}</Text>
        <Text style={[styles.nodeMeta, { color: muted }]}>{v.channelMeta}</Text>
      </View>

      <View style={styles.hub}>
        <Text style={styles.hubText}>{v.hubLabel}</Text>
      </View>

      <View style={styles.brokerRow}>
        <View style={[styles.node, styles.broker, { backgroundColor: surface, borderColor: border }]}>
          <Image source={mt5} style={styles.brokerLogo} resizeMode="contain" />
          <Text style={[styles.brokerTitle, { color: text }]}>{v.mt5Label}</Text>
          <Text style={[styles.brokerMeta, { color: muted }]}>{v.mt5Meta}</Text>
        </View>
        <View style={[styles.node, styles.broker, { backgroundColor: surface, borderColor: border }]}>
          <Image source={mt4} style={styles.brokerLogo} resizeMode="contain" />
          <Text style={[styles.brokerTitle, { color: text }]}>{v.mt4Label}</Text>
          <Text style={[styles.brokerMeta, { color: muted }]}>{v.mt4Meta}</Text>
        </View>
      </View>

      <View style={[styles.float, styles.floatTl, { backgroundColor: isDark ? '#334155' : '#1e293b' }]}>
        <Layers size={10} color="#fff" />
        <Text style={styles.floatText}>{v.pillLayering}</Text>
      </View>
      <View style={[styles.float, styles.floatTr, { backgroundColor: isDark ? '#334155' : '#1e293b' }]}>
        <Scale size={10} color="#fff" />
        <Text style={styles.floatText}>{v.pillLots}</Text>
      </View>
      <View style={[styles.float, styles.floatBl, { backgroundColor: isDark ? '#334155' : '#1e293b' }]}>
        <Radio size={10} color="#fff" />
        <Text style={styles.floatText}>{v.pillChannels}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  pulse: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 999,
    borderWidth: 1,
  },
  node: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: '78%',
    maxWidth: 220,
    zIndex: 2,
  },
  telegram: {
    marginBottom: 10,
  },
  nodeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: tscTheme.primary,
  },
  nodeTitle: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
  },
  nodeMeta: {
    marginTop: 2,
    fontSize: 11,
  },
  hub: {
    zIndex: 2,
    backgroundColor: tscTheme.primary,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginBottom: 10,
  },
  hubText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  brokerRow: {
    zIndex: 2,
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    maxWidth: 280,
  },
  broker: {
    flex: 1,
    width: undefined,
    maxWidth: undefined,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  brokerLogo: {
    width: 28,
    height: 28,
  },
  brokerTitle: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  brokerMeta: {
    marginTop: 2,
    fontSize: 9,
    textAlign: 'center',
  },
  float: {
    position: 'absolute',
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  floatTl: { left: 4, top: 10 },
  floatTr: { right: 4, top: 36 },
  floatBl: { left: 12, bottom: 12 },
  floatText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
})
