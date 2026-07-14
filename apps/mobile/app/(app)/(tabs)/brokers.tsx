import { RefreshControl, ScrollView, Text, View, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/context/AuthContext'
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics'
import { LinkedAccountCard } from '@/components/dashboard/LinkedAccountCard'
import { AppScreen } from '@/components/layout/AppScreen'
import { Button, Card, HeadingText } from '@/components/ui'
import { openWebAppPath } from '@/lib/openWebApp'
import { tscTheme } from '@/lib/tscTheme'

export default function BrokersScreen() {
  const { user } = useAuth()
  const { brokers, liveByBroker, loading, refreshing, refresh } = useDashboardMetrics(user?.id)

  return (
    <AppScreen title="Brokers" subtitle="Linked trading accounts and connection status">
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={tscTheme.primary} />
        }
        contentContainerClassName="gap-4 pb-24"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row gap-2">
          <Button
            label="Connect account"
            className="flex-1"
            onPress={() => router.push('/(app)/broker-connect')}
          />
          <Button
            label="Full settings"
            variant="secondary"
            className="flex-1"
            onPress={() => void openWebAppPath('/brokers')}
          />
        </View>

        {loading && brokers.length === 0 ? (
          <View className="items-center py-16">
            <ActivityIndicator color={tscTheme.primary} size="large" />
          </View>
        ) : brokers.length === 0 ? (
          <Card>
            <HeadingText className="mb-2">No brokers linked</HeadingText>
            <Text className="mb-4 text-neutral-600 dark:text-neutral-300">
              Connect MetaTrader or cTrader to start copying signals from your Telegram channels.
            </Text>
            <Button label="Connect broker" onPress={() => router.push('/(app)/broker-connect')} />
          </Card>
        ) : (
          <View className="gap-3">
            <HeadingText>{brokers.length} linked account{brokers.length === 1 ? '' : 's'}</HeadingText>
            {brokers.map(broker => (
              <LinkedAccountCard
                key={broker.id}
                broker={broker}
                live={liveByBroker[broker.id]}
                onPress={() => void openWebAppPath('/brokers')}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </AppScreen>
  )
}
