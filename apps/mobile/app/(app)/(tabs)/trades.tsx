import { FlatList, RefreshControl, Text, View } from 'react-native'
import { useAuth } from '@/context/AuthContext'
import { useTradesData } from '@/hooks/useTradesData'
import { Card, Screen, Subtitle, Title } from '@/components/ui'

export default function TradesScreen() {
  const { user } = useAuth()
  const { trades, loading, refresh, error } = useTradesData(user?.id)

  return (
    <Screen>
      <Title>Trades</Title>
      <Subtitle>Recent copied trades from your brokers</Subtitle>
      {error ? <Text className="mt-2 text-red-400">{error}</Text> : null}
      <FlatList
        className="mt-4"
        data={trades}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#14b8a6" />}
        contentContainerClassName="gap-3 pb-24"
        ListEmptyComponent={
          !loading ? (
            <Card>
              <Text className="text-neutral-300">No trades yet.</Text>
            </Card>
          ) : null
        }
        renderItem={({ item }) => (
          <Card>
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-white">{item.symbol ?? '—'}</Text>
              <Text className={item.profit != null && item.profit >= 0 ? 'text-teal-400' : 'text-red-400'}>
                {item.profit != null ? item.profit.toFixed(2) : '—'}
              </Text>
            </View>
            <Text className="mt-1 text-sm capitalize text-neutral-400">
              {item.side ?? '—'} · {item.status ?? 'open'}
            </Text>
            <Text className="mt-1 text-xs text-neutral-500">{item.open_time ?? '—'}</Text>
          </Card>
        )}
      />
    </Screen>
  )
}
