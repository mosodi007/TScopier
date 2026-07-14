import { FlatList, RefreshControl, Text, View } from 'react-native'
import { useAuth } from '@/context/AuthContext'
import { useTradesData } from '@/hooks/useTradesData'
import { AppScreen } from '@/components/layout/AppScreen'
import {
  BodyText,
  Card,
  HeadingText,
  MutedText,
  pnlTextClass,
} from '@/components/ui'
import { tscTheme } from '@/lib/tscTheme'

export default function TradesScreen() {
  const { user } = useAuth()
  const { trades, loading, refresh, error } = useTradesData(user?.id)

  return (
    <AppScreen title="Trades" subtitle="Recent copied trades from your brokers">
      {error ? <Text className="mt-2 text-error-600">{error}</Text> : null}
      <FlatList
        className="mt-4"
        data={trades}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={tscTheme.primary} />
        }
        contentContainerClassName="gap-3 pb-24"
        ListEmptyComponent={
          !loading ? (
            <Card>
              <BodyText>No trades yet.</BodyText>
            </Card>
          ) : null
        }
        renderItem={({ item }) => (
          <Card>
            <View className="flex-row items-center justify-between">
              <HeadingText className="text-lg">{item.symbol ?? '—'}</HeadingText>
              <Text className={pnlTextClass(item.profit)}>{item.profit != null ? item.profit.toFixed(2) : '—'}</Text>
            </View>
            <MutedText className="mt-1 text-sm capitalize">
              {item.side ?? '—'} · {item.status ?? 'open'}
            </MutedText>
            <MutedText className="mt-1 text-xs">{item.open_time ?? '—'}</MutedText>
          </Card>
        )}
      />
    </AppScreen>
  )
}
