import { RefreshControl, ScrollView, View, Text, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/context/AuthContext'
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics'
import { LinkedAccountCard } from '@/components/dashboard/LinkedAccountCard'
import { OverviewStat, StatBlock } from '@/components/dashboard/StatBlock'
import { Button, Card, HeadingText, Screen, Subtitle, Title, pnlTextClass } from '@/components/ui'
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
    <Screen>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={tscTheme.primary} />
        }
        contentContainerClassName="gap-4 pb-24"
      >
        <View>
          <Title>Dashboard</Title>
          <Subtitle>Portfolio overview and linked accounts</Subtitle>
        </View>

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

            <View className="flex-row gap-2">
              <Button
                label="Copier"
                variant="secondary"
                className="flex-1"
                onPress={() => router.push('/(app)/copier-status')}
              />
              <Button
                label="Link Telegram"
                variant="secondary"
                className="flex-1"
                onPress={() => router.push('/(app)/telegram-link')}
              />
            </View>

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
                      onPress={() => router.push('/(app)/(tabs)/settings')}
                    />
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  )
}
