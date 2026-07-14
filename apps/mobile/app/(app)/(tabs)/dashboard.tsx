import { RefreshControl, ScrollView, View, Text, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/context/AuthContext'
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics'
import { useDashboardExtras } from '@/hooks/useDashboardExtras'
import { LinkedAccountCard } from '@/components/dashboard/LinkedAccountCard'
import { OverviewStat, StatBlock } from '@/components/dashboard/StatBlock'
import { DashboardPanel } from '@/components/dashboard/DashboardPanel'
import { DashboardChartPlaceholder } from '@/components/dashboard/DashboardChartPlaceholder'
import {
  formatActionLabel,
  formatShortTime,
  StatusBadge,
} from '@/components/dashboard/logDisplay'
import { AppScreen } from '@/components/layout/AppScreen'
import { Button, Card, HeadingText, pnlTextClass, MutedText } from '@/components/ui'
import { formatMoney, formatSignedMoney, formatVsYesterdayDelta } from '@/lib/formatMoney'
import { tscTheme } from '@/lib/tscTheme'

export default function DashboardScreen() {
  const { user } = useAuth()
  const {
    brokers,
    liveByBroker,
    activeChannels,
    tradesCopiedToday,
    todaySummary,
    yesterdaySummary,
    aggregate,
    loading,
    refreshing,
    refresh,
  } = useDashboardMetrics(user?.id)
  const { copierLogs, activities, refreshExtras } = useDashboardExtras(user?.id)

  const onRefresh = async () => {
    await Promise.all([refresh(), refreshExtras()])
  }

  const tradesSub =
    todaySummary.taken === 0
      ? 'No closed trades today'
      : `${todaySummary.won} won · ${todaySummary.lost} lost${
          todaySummary.breakeven > 0 ? ` · ${todaySummary.breakeven} BE` : ''
        }`

  const openPnlSub =
    aggregate.openTrades > 0
      ? `Across ${brokers.filter(b => (liveByBroker[b.id]?.openTrades ?? 0) > 0).length || brokers.length} account(s)`
      : 'No open positions'

  return (
    <AppScreen title="Dashboard" subtitle="Portfolio overview and linked accounts">
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={tscTheme.primary} />
        }
        contentContainerClassName="gap-4 pb-24"
        showsVerticalScrollIndicator={false}
      >
        {loading && brokers.length === 0 ? (
          <View className="items-center py-16">
            <ActivityIndicator color={tscTheme.primary} size="large" />
          </View>
        ) : (
          <>
            <Card className="overflow-hidden p-0">
              <View className="flex-row flex-wrap">
                <View className="w-1/2 border-b border-r border-neutral-100 dark:border-neutral-800">
                  <StatBlock
                    label="Total Balance"
                    value={formatMoney(aggregate.totalEquity)}
                    sub={`Across ${aggregate.accountsConnected} connected account${aggregate.accountsConnected === 1 ? '' : 's'}`}
                  />
                </View>
                <View className="w-1/2 border-b border-neutral-100 dark:border-neutral-800">
                  <StatBlock
                    label="Today's Profit"
                    value={formatSignedMoney(todaySummary.netPnl)}
                    sub={formatVsYesterdayDelta(todaySummary.netPnl, yesterdaySummary.netPnl)}
                    valueClassName={pnlTextClass(todaySummary.netPnl)}
                    subClassName={
                      todaySummary.netPnl - yesterdaySummary.netPnl < 0
                        ? 'text-[#737373]'
                        : 'text-neutral-500 dark:text-neutral-400'
                    }
                  />
                </View>
                <View className="w-1/2 border-r border-neutral-100 dark:border-neutral-800">
                  <StatBlock
                    label="Trades Completed Today"
                    value={String(todaySummary.taken)}
                    sub={tradesSub}
                  />
                </View>
                <View className="w-1/2">
                  <StatBlock
                    label="Open P/L"
                    value={formatSignedMoney(aggregate.openPnl)}
                    sub={openPnlSub}
                    valueClassName={pnlTextClass(aggregate.openPnl)}
                  />
                </View>
              </View>

              <View className="border-t border-neutral-100 p-4 dark:border-neutral-800">
                <View className="flex-row flex-wrap">
                  <View className="mb-4 w-1/2">
                    <OverviewStat label="Active Signal Channels" value={String(activeChannels)} />
                  </View>
                  <View className="mb-4 w-1/2">
                    <OverviewStat label="Open Trades" value={String(aggregate.openTrades)} />
                  </View>
                  <View className="w-1/2">
                    <OverviewStat label="Trading Accounts" value={String(aggregate.accountsConnected)} />
                  </View>
                  <View className="w-1/2">
                    <OverviewStat label="Trades Copied Today" value={String(tradesCopiedToday)} />
                  </View>
                </View>
              </View>
            </Card>

            <DashboardChartPlaceholder
              title="Trade volume (7 days)"
              subtitle="Chart preview — open web dashboard for full analytics."
            />
            <DashboardChartPlaceholder
              title="Channel profit (7 days)"
              subtitle="Per-channel performance summary on web."
            />

            <DashboardPanel
              title="Trade activities"
              onViewAll={() => router.push('/(app)/activities')}
              isEmpty={activities.length === 0}
              emptyMessage="No trade activities yet."
            >
              <View className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {activities.map(row => (
                  <View key={row.id} className="gap-1 px-4 py-3">
                    <View className="flex-row items-center justify-between gap-2">
                      <Text className="flex-1 text-sm font-medium text-neutral-900 dark:text-neutral-50" numberOfLines={1}>
                        {formatActionLabel(row.action)}
                      </Text>
                      <StatusBadge status={row.status} />
                    </View>
                    <MutedText className="text-xs">{formatShortTime(row.created_at)}</MutedText>
                  </View>
                ))}
              </View>
            </DashboardPanel>

            <DashboardPanel
              title="Copier logs"
              onViewAll={() => router.push('/(app)/copier-logs')}
              isEmpty={copierLogs.length === 0}
              emptyMessage="No copier logs yet."
            >
              <View className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {copierLogs.map(row => (
                  <View key={row.id} className="gap-1 px-4 py-3">
                    <View className="flex-row items-center justify-between gap-2">
                      <StatusBadge status={row.status ?? 'pending'} />
                      <MutedText className="text-xs">{formatShortTime(row.created_at)}</MutedText>
                    </View>
                    <Text className="text-sm text-neutral-900 dark:text-neutral-50" numberOfLines={1}>
                      {row.channel_name ?? '—'} · {row.symbol ?? '—'} · {(row.action ?? '—').toUpperCase()}
                    </Text>
                  </View>
                ))}
              </View>
            </DashboardPanel>

            <View>
              <View className="mb-3 flex-row items-center justify-between">
                <HeadingText>Linked accounts</HeadingText>
                <Text
                  className="text-sm text-teal-600 dark:text-teal-400"
                  onPress={() => router.push('/(app)/broker-connect')}
                >
                  + Add account
                </Text>
              </View>

              {brokers.length === 0 ? (
                <Card>
                  <Text className="mb-3 text-neutral-600 dark:text-neutral-300">
                    Connect a broker to see live balances and copy signals.
                  </Text>
                  <Button label="Connect broker" onPress={() => router.push('/(app)/broker-connect')} />
                </Card>
              ) : (
                <View className="gap-3">
                  {brokers.map(broker => (
                    <LinkedAccountCard
                      key={broker.id}
                      broker={broker}
                      live={liveByBroker[broker.id]}
                      onPress={() => router.push('/(app)/(tabs)/brokers')}
                    />
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </AppScreen>
  )
}
