import { useCallback, useEffect, useState } from 'react'
import { RefreshControl, ScrollView, Text, View } from 'react-native'
import { router } from 'expo-router'
import type { BrokerAccount } from '@tscopier/shared'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { useDashboardRealtime } from '@/hooks/useDashboardRealtime'
import { useFxsocketStream } from '@/hooks/useFxsocketStream'
import {
  BodyText,
  Button,
  Card,
  HeadingText,
  LabelText,
  MutedText,
  Screen,
  Subtitle,
  Title,
  ValueText,
} from '@/components/ui'
import { tscTheme } from '@/lib/tscTheme'

export default function DashboardScreen() {
  const { user } = useAuth()
  const [brokers, setBrokers] = useState<BrokerAccount[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [liveBalances, setLiveBalances] = useState<Record<string, { balance?: number; equity?: number }>>({})

  const loadBrokers = useCallback(async () => {
    if (!user?.id) return
    const { data } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
    setBrokers((data ?? []) as BrokerAccount[])
  }, [user?.id])

  useEffect(() => {
    void loadBrokers()
  }, [loadBrokers])

  useDashboardRealtime(user?.id, loadBrokers, broker => {
    setBrokers(prev => prev.map(b => (b.id === broker.id ? { ...b, ...broker } : b)))
  })

  useFxsocketStream(brokers, {
    onAccount: (brokerId, data) => {
      setLiveBalances(prev => ({
        ...prev,
        [brokerId]: {
          balance: typeof data.balance === 'number' ? data.balance : prev[brokerId]?.balance,
          equity: typeof data.equity === 'number' ? data.equity : prev[brokerId]?.equity,
        },
      }))
    },
  })

  const onRefresh = async () => {
    setRefreshing(true)
    await loadBrokers()
    setRefreshing(false)
  }

  return (
    <Screen>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tscTheme.primary} />
        }
        contentContainerClassName="pb-24"
      >
        <Title>Dashboard</Title>
        <Subtitle>Live broker status and account overview</Subtitle>

        <View className="mt-4 flex-row gap-2">
          <Button label="Copier" variant="secondary" className="flex-1" onPress={() => router.push('/(app)/copier-status')} />
          <Button label="Link Telegram" variant="secondary" className="flex-1" onPress={() => router.push('/(app)/telegram-link')} />
        </View>

        <View className="mt-3">
          <Button label="Connect broker" onPress={() => router.push('/(app)/broker-connect')} />
        </View>

        <View className="mt-6 gap-3">
          {brokers.length === 0 ? (
            <Card>
              <BodyText>No broker accounts yet. Connect one to start copying.</BodyText>
            </Card>
          ) : (
            brokers.map(broker => {
              const live = liveBalances[broker.id]
              const balance = live?.balance ?? broker.last_balance
              const equity = live?.equity ?? broker.last_equity
              const connected =
                broker.connection_status === 'connected' || broker.fxsocket_status === 'connected'
              return (
                <Card key={broker.id}>
                  <HeadingText className="text-lg">{broker.label}</HeadingText>
                  <MutedText className="mt-1 text-sm">{broker.broker_server ?? broker.platform}</MutedText>
                  <View className="mt-3 flex-row justify-between">
                    <View>
                      <LabelText>Balance</LabelText>
                      <ValueText>{balance != null ? balance.toFixed(2) : '—'}</ValueText>
                    </View>
                    <View>
                      <LabelText>Equity</LabelText>
                      <ValueText>{equity != null ? equity.toFixed(2) : '—'}</ValueText>
                    </View>
                    <View>
                      <LabelText>Status</LabelText>
                      <Text className={connected ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400'}>
                        {connected ? 'Connected' : 'Offline'}
                      </Text>
                    </View>
                  </View>
                </Card>
              )
            })
          )}
        </View>
      </ScrollView>
    </Screen>
  )
}
