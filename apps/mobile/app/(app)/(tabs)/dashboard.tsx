import { useCallback, useRef, useState } from 'react'
import {
  RefreshControl,
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  type NativeSyntheticEvent,
} from 'react-native'
import PagerView from 'react-native-pager-view'
import { TscopierLogo } from '@/components/branding/TscopierLogo'
import { router } from 'expo-router'
import type { BrokerAccount } from '@tscopier/shared'
import { useAuth } from '@/context/AuthContext'
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics'
import { useDashboardExtras } from '@/hooks/useDashboardExtras'
import { useDashboardCharts } from '@/hooks/useDashboardCharts'
import { LinkedAccountCard } from '@/components/dashboard/LinkedAccountCard'
import { BrokerStatsModal } from '@/components/dashboard/BrokerStatsModal'
import { OverviewStat, StatBlock } from '@/components/dashboard/StatBlock'
import { DashboardPanel } from '@/components/dashboard/DashboardPanel'
import { TradeVolumeChart } from '@/components/dashboard/TradeVolumeChart'
import { ChannelProfitChart } from '@/components/dashboard/ChannelProfitChart'
import { CopierEngineActivityRow } from '@/components/dashboard/CopierEngineActivityRow'
import {
  HomeSectionTabs,
  HOME_SECTION_TAB_ORDER,
  type HomeSectionTab,
} from '@/components/home/HomeSectionTabs'
import { HomeBrokersSection } from '@/components/home/HomeBrokersSection'
import { HomeChannelsSection } from '@/components/home/HomeChannelsSection'
import {
  formatShortTime,
  StatusBadge,
} from '@/components/dashboard/logDisplay'
import { AppScreen } from '@/components/layout/AppScreen'
import { HomeSectionTitle } from '@/components/home/HomeSectionTitle'
import { CopierPauseToggle } from '@/components/dashboard/CopierPauseToggle'
import { Button, Card, HeadingText, pnlTextClass, MutedText } from '@/components/ui'
import { formatMoney, formatSignedMoney, formatVsYesterdayDelta } from '@/lib/formatMoney'
import { tscTheme } from '@/lib/tscTheme'

function homeTabIndex(tab: HomeSectionTab): number {
  const index = HOME_SECTION_TAB_ORDER.indexOf(tab)
  return index >= 0 ? index : 0
}

export default function DashboardScreen() {
  const { user } = useAuth()
  const pagerRef = useRef<PagerView>(null)
  const [homeTab, setHomeTab] = useState<HomeSectionTab>('dashboard')
  const [statsBroker, setStatsBroker] = useState<BrokerAccount | null>(null)
  const metrics = useDashboardMetrics(user?.id)
  const {
    brokers,
    liveByBroker,
    activeChannels,
    tradesCopiedToday,
    aggregate,
    loading,
    refreshing,
    refresh,
  } = metrics
  const { copierLogs, copierEngineActivities, refreshExtras } = useDashboardExtras(user?.id)
  const {
    tradeVolume7Day,
    channelProfit7d,
    analytics,
    loading: chartsLoading,
    refreshCharts,
  } = useDashboardCharts(user?.id, brokers)

  const onRefresh = async () => {
    await Promise.all([refresh(), refreshExtras(), refreshCharts({ silent: true })])
  }

  const handleTabPress = useCallback((tab: HomeSectionTab) => {
    setHomeTab(tab)
    pagerRef.current?.setPage(homeTabIndex(tab))
  }, [])

  const handlePageSelected = useCallback((event: NativeSyntheticEvent<{ position: number }>) => {
    const nextTab = HOME_SECTION_TAB_ORDER[event.nativeEvent.position]
    if (nextTab) setHomeTab(nextTab)
  }, [])

  const tradesSub =
    analytics.tradesTaken === 0
      ? 'No closed trades today'
      : `${analytics.tradesWon} won · ${analytics.tradesLost} lost${
          analytics.tradesBreakeven > 0 ? ` · ${analytics.tradesBreakeven} BE` : ''
        }`

  const openPnlSub =
    aggregate.openTrades > 0
      ? `Across ${brokers.filter(b => (liveByBroker[b.id]?.openTrades ?? 0) > 0).length || brokers.length} account(s)`
      : 'No open positions'

  return (
    <AppScreen title={<TscopierLogo />}>
      <View className="mb-3">
        <HomeSectionTabs value={homeTab} onChange={handleTabPress} />
      </View>

      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        onPageSelected={handlePageSelected}
      >
        <View key="dashboard" style={{ flex: 1 }}>
          <HomeSectionTitle
            title="Dashboard"
            action={
              <CopierPauseToggle
                brokers={brokers}
                brokersLoading={loading}
                liveByBroker={liveByBroker}
              />
            }
          />
          <ScrollView
            style={{ flex: 1 }}
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
                      value={formatSignedMoney(analytics.todayProfit)}
                      sub={formatVsYesterdayDelta(analytics.todayProfit, analytics.yesterdayProfit)}
                      valueClassName={pnlTextClass(analytics.todayProfit)}
                      subClassName={
                        analytics.todayProfit - analytics.yesterdayProfit < 0
                          ? 'text-[#737373]'
                          : 'text-neutral-500 dark:text-neutral-400'
                      }
                    />
                  </View>
                  <View className="w-1/2 border-r border-neutral-100 dark:border-neutral-800">
                    <StatBlock
                      label="Trades Completed Today"
                      value={String(analytics.tradesTaken)}
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
            )}

            <TradeVolumeChart data={tradeVolume7Day} loading={chartsLoading} />
            <ChannelProfitChart data={channelProfit7d} loading={chartsLoading} />

            <DashboardPanel
              title="Copier engine"
              onViewAll={() => router.push('/(app)/activities')}
              isEmpty={(copierEngineActivities ?? []).length === 0}
              emptyMessage="No copier engine activity yet."
            >
              <View className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {(copierEngineActivities ?? []).map(row => (
                  <CopierEngineActivityRow key={row.id} activity={row} variant="compact" />
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
                      onPress={() => setStatsBroker(broker)}
                    />
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </View>

        <View key="brokers" style={{ flex: 1 }}>
          <HomeBrokersSection metrics={metrics} />
        </View>

        <View key="channels" style={{ flex: 1 }}>
          <HomeChannelsSection />
        </View>
      </PagerView>

      <BrokerStatsModal
        broker={statsBroker}
        live={statsBroker ? liveByBroker[statsBroker.id] : undefined}
        visible={statsBroker != null}
        onClose={() => setStatsBroker(null)}
      />
    </AppScreen>
  )
}
