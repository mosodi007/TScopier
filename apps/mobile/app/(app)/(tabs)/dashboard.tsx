import { useCallback, useEffect, useState } from 'react'
import { RefreshControl, ScrollView, Text, View } from 'react-native'
import { router } from 'expo-router'
import type { BrokerAccount } from '@tscopier/shared'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { useDashboardRealtime } from '@/hooks/useDashboardRealtime'
import { useFxsocketStream } from '@/hooks/useFxsocketStream'
import { Button, Card, Screen, Subtitle, Title } from '@/components/ui'

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#14b8a6" />}
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
              <Text className="text-neutral-300">No broker accounts yet. Connect one to start copying.</Text>
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
                  <Text className="text-lg font-semibold text-white">{broker.label}</Text>
                  <Text className="mt-1 text-sm text-neutral-400">{broker.broker_server ?? broker.platform}</Text>
                  <View className="mt-3 flex-row justify-between">
                    <View>
                      <Text className="text-xs text-neutral-500">Balance</Text>
                      <Text className="text-base text-white">{balance != null ? balance.toFixed(2) : '—'}</Text>
                    </View>
                    <View>
                      <Text className="text-xs text-neutral-500">Equity</Text>
                      <Text className="text-base text-white">{equity != null ? equity.toFixed(2) : '—'}</Text>
                    </View>
                    <View>
                      <Text className="text-xs text-neutral-500">Status</Text>
                      <Text className={connected ? 'text-teal-400' : 'text-amber-400'}>
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
