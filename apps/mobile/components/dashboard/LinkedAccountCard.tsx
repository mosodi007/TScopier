import { Pressable, View, Text } from 'react-native'
import type { BrokerAccount } from '@tscopier/shared'
import { formatMoney, formatSignedMoney } from '@/lib/formatMoney'
import { isBrokerConnected, resolveBrokerSnapshot, type BrokerLiveSnapshot } from '@/lib/dashboardStats'
import { pnlTextClass } from '@/components/ui'
import { cn } from '@/lib/cn'

interface LinkedAccountCardProps {
  broker: BrokerAccount
  live?: BrokerLiveSnapshot
  onPress?: () => void
}

export function LinkedAccountCard({ broker, live, onPress }: LinkedAccountCardProps) {
  const snap = resolveBrokerSnapshot(broker, live)
  const connected = isBrokerConnected(broker)
  const currency = snap.currency ?? 'USD'
  const openPnl = snap.openPnl

  return (
    <Pressable
      onPress={onPress}
      className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 active:opacity-90"
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50" numberOfLines={1}>
            {broker.label}
          </Text>
          <Text className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400" numberOfLines={1}>
            {broker.platform?.toUpperCase() ?? 'MT'} · {broker.broker_server ?? broker.broker_name ?? 'Broker'}
          </Text>
        </View>
        <View
          className={cn(
            'rounded-full px-2.5 py-1',
            connected ? 'bg-teal-50 dark:bg-teal-950/60' : 'bg-amber-50 dark:bg-amber-950/40',
          )}
        >
          <Text
            className={cn(
              'text-xs font-medium',
              connected ? 'text-teal-700 dark:text-teal-400' : 'text-amber-700 dark:text-amber-400',
            )}
          >
            {connected ? 'Connected' : 'Offline'}
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row">
        <View className="flex-1">
          <Text className="text-xs text-neutral-500 dark:text-neutral-400">Balance</Text>
          <Text className="mt-0.5 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            {snap.balance != null ? formatMoney(snap.balance, currency) : '—'}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-xs text-neutral-500 dark:text-neutral-400">Equity</Text>
          <Text className="mt-0.5 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            {snap.equity != null ? formatMoney(snap.equity, currency) : '—'}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-xs text-neutral-500 dark:text-neutral-400">Open P/L</Text>
          <Text className={cn('mt-0.5 text-sm font-semibold', pnlTextClass(openPnl ?? null))}>
            {openPnl != null ? formatSignedMoney(openPnl, currency) : '—'}
          </Text>
        </View>
      </View>
    </Pressable>
  )
}
