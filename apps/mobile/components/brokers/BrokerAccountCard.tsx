import { ActivityIndicator, Alert, Pressable, Switch, Text, View } from 'react-native'
import type { BrokerAccount } from '@tscopier/shared'
import { ChevronRight, Trash2 } from 'lucide-react-native'
import { BrokerBadge } from '@/components/brokers/BrokerBadge'
import { cn } from '@/lib/cn'
import type { BrokerChannelOption } from '@/lib/brokerListFilters'
import { getBrokerSignalChannelsLabel, resolveBrokerFilterLabel } from '@/lib/brokerListFilters'
import {
  brokerAccountTypeClass,
  brokerAccountTypeLabel,
  brokerConnectionLabel,
  brokerConnectionTone,
  brokerHealthLabel,
  brokerHealthTone,
  resolveBrokerAccountType,
} from '@/lib/brokerLabels'
import { resolveBrokerSnapshot, type BrokerLiveSnapshot } from '@/lib/dashboardStats'
import { resolveBrokerTotalBalance } from '@tscopier/web-lib/effectiveBrokerBalance'
import { formatMoney } from '@/lib/formatMoney'
import { tscTheme } from '@/lib/tscTheme'

interface BrokerAccountCardProps {
  broker: BrokerAccount
  live?: BrokerLiveSnapshot
  channels: BrokerChannelOption[]
  toggling?: boolean
  onPress: () => void
  onConfigure: () => void
  onToggleActive: (active: boolean) => void
  onDelete: () => void
}

function DetailCell({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <View className="min-w-[50%] flex-1 border-t border-neutral-100 px-3 py-2.5 dark:border-neutral-800">
      <Text className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{label}</Text>
      <Text className={cn('mt-0.5 text-sm font-medium text-neutral-900 dark:text-neutral-50', valueClassName)} numberOfLines={2}>
        {value}
      </Text>
    </View>
  )
}

export function BrokerAccountCard({
  broker,
  live,
  channels,
  toggling,
  onPress,
  onConfigure,
  onToggleActive,
  onDelete,
}: BrokerAccountCardProps) {
  const snap = resolveBrokerSnapshot(broker, live)
  const currency = broker.last_currency ?? snap.currency ?? 'USD'
  const brokerLabel = resolveBrokerFilterLabel(broker)
  const accountType = resolveBrokerAccountType(broker)
  const healthLabel = brokerHealthLabel(broker)
  const healthTone = brokerHealthTone(broker)

  const confirmDelete = () => {
    Alert.alert(
      'Remove broker',
      `Remove ${broker.label}? This disconnects the account from TScopier.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: onDelete },
      ],
    )
  }

  return (
    <Pressable
      onPress={onPress}
      className="overflow-hidden rounded-2xl border border-neutral-200 bg-white active:opacity-95 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <View className="gap-3 p-4">
        <View className="flex-row items-start gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/60">
            <Text className="text-xs font-bold text-teal-700 dark:text-teal-400">
              {(broker.platform ?? 'MT').toUpperCase().slice(0, 3)}
            </Text>
          </View>

          <View className="min-w-0 flex-1">
            <View className="flex-row flex-wrap items-center gap-1.5">
              <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{broker.label}</Text>
              <BrokerBadge label={brokerConnectionLabel(broker)} tone={brokerConnectionTone(broker)} />
              {healthLabel && healthTone ? <BrokerBadge label={healthLabel} tone={healthTone} /> : null}
              <BrokerBadge label={(broker.platform ?? 'MT').toUpperCase()} />
              {brokerLabel ? <BrokerBadge label={brokerLabel} /> : null}
              <ChevronRight size={14} color={tscTheme.primary} />
            </View>
            {broker.broker_server ? (
              <Text className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400" numberOfLines={1}>
                {broker.broker_server}
              </Text>
            ) : null}
          </View>
        </View>

        <View className="flex-row flex-wrap items-center gap-2">
          <View className="flex-row items-center gap-2 border-r border-neutral-200 pr-2 dark:border-neutral-700">
            <Text className="text-xs text-neutral-500 dark:text-neutral-400">Copy trades</Text>
            {toggling ? (
              <ActivityIndicator size="small" color={tscTheme.primary} />
            ) : (
              <Switch
                value={broker.is_active}
                onValueChange={onToggleActive}
                trackColor={{ false: '#d4d4d4', true: '#99f6e4' }}
                thumbColor={broker.is_active ? '#0d9488' : '#f4f4f5'}
              />
            )}
          </View>

          <Pressable
            onPress={e => {
              e.stopPropagation?.()
              onConfigure()
            }}
            className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 dark:border-teal-800 dark:bg-teal-950/50"
          >
            <Text className="text-xs font-semibold text-teal-800 dark:text-teal-300">Configure</Text>
          </Pressable>

          <Pressable
            onPress={e => {
              e.stopPropagation?.()
              confirmDelete()
            }}
            className="rounded-lg p-1.5"
            hitSlop={8}
          >
            <Trash2 size={16} color="#94a3b8" />
          </Pressable>
        </View>
      </View>

      <View className="flex-row flex-wrap bg-neutral-50 dark:bg-neutral-800/60">
        <DetailCell label="Login" value={broker.account_login || '—'} />
        <DetailCell
          label="Account type"
          value={brokerAccountTypeLabel(broker)}
          valueClassName={brokerAccountTypeClass(accountType)}
        />
        <DetailCell label="Server" value={broker.broker_server || '—'} />
        <DetailCell label="Signal channels" value={getBrokerSignalChannelsLabel(broker, channels)} />
        <DetailCell
          label="Balance"
          value={formatMoney(resolveBrokerTotalBalance(broker) ?? 0, currency)}
        />
        <DetailCell
          label="Equity"
          value={broker.last_equity != null ? formatMoney(broker.last_equity, currency) : '—'}
        />
      </View>
    </Pressable>
  )
}
