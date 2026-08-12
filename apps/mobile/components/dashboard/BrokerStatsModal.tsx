import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { RefreshCw, X } from 'lucide-react-native'
import type { BrokerAccount } from '@tscopier/shared'
import { resolveAccountLogin, inferBrokerLabelFromServer } from '@tscopier/web-lib/brokerFromServer'
import {
  brokerAccountTypeLabel,
  brokerConnectionLabel,
  resolveBrokerAccountType,
} from '@/lib/brokerLabels'
import { useBrokerStats } from '@/hooks/useBrokerStats'
import type { BrokerLiveSnapshot } from '@/lib/dashboardStats'
import { formatMoney, formatSignedMoney } from '@/lib/formatMoney'
import { cn } from '@/lib/cn'
import { pnlTextClass } from '@/components/ui'
import { useTheme } from '@/context/ThemeContext'
import { tscTheme } from '@/lib/tscTheme'
import { router } from 'expo-router'

interface BrokerStatsModalProps {
  broker: BrokerAccount | null
  live?: BrokerLiveSnapshot
  visible: boolean
  onClose: () => void
}

function formatPct(value: number | null | undefined, digits = 0): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${value.toFixed(digits)}%`
}

function formatConnectedAt(iso: string | null | undefined): string {
  if (!iso) return '—'
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return '—'
  return new Date(ms).toLocaleString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StatTile({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <View className="min-w-[30%] flex-1 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/40">
      <Text className="text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </Text>
      <Text
        className={cn(
          'mt-1 text-base font-semibold tabular-nums text-neutral-900 dark:text-neutral-50',
          valueClassName,
        )}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  )
}

export function BrokerStatsModal({ broker, live, visible, onClose }: BrokerStatsModalProps) {
  const { isDark } = useTheme()
  const { stats, perf, loading, refreshing, error, refresh, currency } = useBrokerStats(
    visible ? broker : null,
    live,
  )

  if (!broker) return null

  const accountLabel = broker.label?.trim() || 'Unnamed account'
  const platform = (broker.platform ?? '').trim().toUpperCase() || 'MT'
  const login = resolveAccountLogin(broker) ?? ''
  const platformLine = login ? `${platform} • ${login}` : platform
  const brokerLabel =
    broker.broker_name?.trim() ||
    inferBrokerLabelFromServer(broker.broker_server ?? '') ||
    'Broker'
  const accountType = resolveBrokerAccountType(broker)
  const accountTypeLabel = brokerAccountTypeLabel(broker)
  const connectedAtDisplay = formatConnectedAt(
    stats?.connectedAt ?? broker.performance_baseline_captured_at ?? null,
  )
  const connectionLabel = brokerConnectionLabel(broker)
  const iconColor = isDark ? tscTheme.textMuted.dark : tscTheme.textMuted.light
  const showSkeleton = loading && !stats

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/55">
        <Pressable className="absolute inset-0" onPress={onClose} accessibilityLabel="Close" />
        <View className="max-h-[92%] rounded-t-3xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <View className="flex-row items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
            <View className="min-w-0 flex-1">
              <Text
                className="text-lg font-semibold text-neutral-900 dark:text-neutral-50"
                numberOfLines={1}
              >
                {accountLabel}
              </Text>
              <Text className="mt-0.5 text-xs font-medium uppercase text-teal-600 dark:text-teal-400">
                {platformLine}
              </Text>
              <Text className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400" numberOfLines={2}>
                {brokerLabel}
                {' · '}
                <Text
                  className={cn(
                    'font-semibold',
                    accountType === 'Live' && 'text-teal-700 dark:text-teal-300',
                    accountType === 'Demo' && 'text-amber-700 dark:text-amber-300',
                  )}
                >
                  {accountTypeLabel}
                </Text>
                {' · '}
                {connectionLabel}
                {connectedAtDisplay !== '—' ? ` ${connectedAtDisplay}` : ''}
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Pressable
                accessibilityLabel="Refresh"
                onPress={() => void refresh()}
                disabled={loading || refreshing}
                className="h-9 w-9 items-center justify-center rounded-lg"
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color={tscTheme.primary} />
                ) : (
                  <RefreshCw size={18} color={iconColor} />
                )}
              </Pressable>
              <Pressable
                accessibilityLabel="Close"
                onPress={onClose}
                className="h-9 w-9 items-center justify-center rounded-lg"
              >
                <X size={20} color={iconColor} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            contentContainerClassName="gap-6 px-5 py-5 pb-10"
            showsVerticalScrollIndicator={false}
          >
            {error ? (
              <Text className="text-sm text-red-600 dark:text-red-400">{error}</Text>
            ) : null}

            {showSkeleton ? (
              <View className="flex-row flex-wrap gap-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <View
                    key={i}
                    className="h-[72px] min-w-[30%] flex-1 rounded-xl bg-neutral-100 dark:bg-neutral-800"
                  />
                ))}
              </View>
            ) : stats ? (
              <>
                <View className="flex-row flex-wrap gap-3">
                  <StatTile
                    label="Initial balance"
                    value={
                      stats.initialBalance != null
                        ? formatMoney(stats.initialBalance, currency)
                        : '—'
                    }
                  />
                  <StatTile
                    label="Current balance"
                    value={
                      stats.currentBalance != null
                        ? formatMoney(stats.currentBalance, currency)
                        : '—'
                    }
                  />
                  <StatTile
                    label="Current equity"
                    value={
                      stats.currentEquity != null
                        ? formatMoney(stats.currentEquity, currency)
                        : '—'
                    }
                  />
                  <StatTile
                    label="Total profit / loss"
                    value={formatSignedMoney(stats.totalProfit, currency)}
                    valueClassName={pnlTextClass(stats.totalProfit)}
                  />
                  <StatTile
                    label="Profit today"
                    value={formatSignedMoney(stats.todayProfit, currency)}
                    valueClassName={pnlTextClass(stats.todayProfit)}
                  />
                  <StatTile label="Win rate" value={formatPct(perf?.winRate, 0)} />
                  <StatTile label="Max drawdown" value={formatPct(perf?.maxDrawdownPct)} />
                  <StatTile
                    label="ROI"
                    value={
                      perf?.roi != null && Number.isFinite(perf.roi)
                        ? `${perf.roi > 0 ? '+' : ''}${perf.roi.toFixed(1)}%`
                        : '—'
                    }
                    valueClassName={perf?.roi != null ? pnlTextClass(perf.roi) : undefined}
                  />
                  <StatTile label="Closed deals" value={String(stats.closedDealCount)} />
                </View>

                <View>
                  <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                    Connected signal channels
                  </Text>
                  <Text className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                    Lifetime P/L from trades copied from each connected Telegram channel (realized
                    closed deals plus open positions).
                  </Text>
                  {stats.profitByChannel.length === 0 ? (
                    <Text className="mt-3 text-sm text-neutral-400 dark:text-neutral-500">
                      No signal channels linked to this account.
                    </Text>
                  ) : (
                    <View className="mt-3 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
                      {stats.profitByChannel.map((row, index) => (
                        <View
                          key={row.key}
                          className={cn(
                            'flex-row items-center justify-between gap-3 bg-white px-4 py-3 dark:bg-neutral-900',
                            index > 0 && 'border-t border-neutral-100 dark:border-neutral-800',
                          )}
                        >
                          <View className="min-w-0 flex-1">
                            <Text
                              className="text-sm font-medium text-neutral-900 dark:text-neutral-50"
                              numberOfLines={1}
                            >
                              {row.label}
                            </Text>
                            <Text className="text-xs text-neutral-400">
                              {row.count} trade{row.count === 1 ? '' : 's'}
                            </Text>
                          </View>
                          <Text
                            className={cn(
                              'shrink-0 text-sm font-semibold tabular-nums',
                              pnlTextClass(row.pnl),
                            )}
                          >
                            {formatSignedMoney(row.pnl, currency)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <View className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                  {stats.activeSignalTrades.length === 0 ? (
                    <Text className="text-sm text-neutral-400 dark:text-neutral-500">
                      No open signal-channel positions.
                    </Text>
                  ) : (
                    <View className="gap-3">
                      <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                        Open signal positions
                      </Text>
                      {stats.activeSignalTrades.map(row => (
                        <View
                          key={row.channelId}
                          className="flex-row items-center justify-between gap-3"
                        >
                          <View className="min-w-0 flex-1">
                            <Text
                              className="text-sm font-medium text-neutral-900 dark:text-neutral-50"
                              numberOfLines={1}
                            >
                              {row.channelLabel}
                            </Text>
                            <Text className="text-xs text-neutral-400">
                              {row.positionCount} position{row.positionCount === 1 ? '' : 's'} ·{' '}
                              {row.totalLots} lots
                            </Text>
                          </View>
                          <Text
                            className={cn(
                              'shrink-0 text-sm font-semibold tabular-nums',
                              pnlTextClass(row.pnl),
                            )}
                          >
                            {formatSignedMoney(row.pnl, currency)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <View className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="min-w-0 flex-1">
                      <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                        Last signal trade
                      </Text>
                      <Text className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                        Most recent closed trade from a Telegram signal, with total P/L for that
                        signal (all copies and TPs).
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => {
                        onClose()
                        router.push('/(app)/(tabs)/trades')
                      }}
                    >
                      <Text className="text-xs font-semibold text-teal-600 dark:text-teal-400">
                        See all
                      </Text>
                    </Pressable>
                  </View>

                  {stats.lastSignalTrade ? (
                    <View className="mt-3 flex-row flex-wrap">
                      <View className="mb-3 w-1/2 pr-2">
                        <Text className="text-xs text-neutral-400">Channel</Text>
                        <Text
                          className="font-medium text-neutral-900 dark:text-neutral-50"
                          numberOfLines={1}
                        >
                          {stats.lastSignalTrade.channelLabel}
                        </Text>
                      </View>
                      <View className="mb-3 w-1/2 pl-2">
                        <Text className="text-xs text-neutral-400">Symbol</Text>
                        <Text className="font-medium text-neutral-900 dark:text-neutral-50">
                          {stats.lastSignalTrade.symbol}
                        </Text>
                      </View>
                      <View className="w-1/2 pr-2">
                        <Text className="text-xs text-neutral-400">Signal total P/L</Text>
                        <Text
                          className={cn(
                            'font-semibold tabular-nums',
                            pnlTextClass(stats.lastSignalTrade.pnl),
                          )}
                        >
                          {formatSignedMoney(stats.lastSignalTrade.pnl, currency)}
                        </Text>
                      </View>
                      <View className="w-1/2 pl-2">
                        <Text className="text-xs text-neutral-400">Closed</Text>
                        <Text className="font-medium tabular-nums text-neutral-900 dark:text-neutral-50">
                          {new Date(stats.lastSignalTrade.closedAt).toLocaleString([], {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <Text className="mt-3 text-sm text-neutral-400 dark:text-neutral-500">
                      No closed signal trades yet.
                    </Text>
                  )}
                </View>
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}
