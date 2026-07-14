import { useState } from 'react'
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native'
import { useAuth } from '@/context/AuthContext'
import { formatShortTime } from '@/components/dashboard/logDisplay'
import { AppScreen } from '@/components/layout/AppScreen'
import { BodyText, Card, MutedText } from '@/components/ui'
import { useManageSignals, type SignalDateFilter } from '@/hooks/useManageSignals'
import { openWebAppPath } from '@/lib/openWebApp'
import { tscTheme } from '@/lib/tscTheme'

const FILTERS: Array<{ id: SignalDateFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 days' },
]

export default function SignalsScreen() {
  const { user } = useAuth()
  const [dateFilter, setDateFilter] = useState<SignalDateFilter>('all')
  const { rows, loading, refresh } = useManageSignals(user?.id, dateFilter)

  return (
    <AppScreen
      title="Signals"
      subtitle="Trade signals from your connected Telegram channels"
    >
      <View className="mt-4 flex-row gap-2">
        {FILTERS.map(filter => {
          const active = dateFilter === filter.id
          return (
            <Pressable
              key={filter.id}
              onPress={() => setDateFilter(filter.id)}
              className={`rounded-full px-3 py-1.5 ${active ? 'bg-teal-50 dark:bg-teal-950/50' : 'bg-neutral-100 dark:bg-neutral-800'}`}
            >
              <Text
                className={`text-xs font-semibold ${active ? 'text-teal-700 dark:text-teal-400' : 'text-neutral-600 dark:text-neutral-300'}`}
              >
                {filter.label}
              </Text>
            </Pressable>
          )
        })}
        <Pressable
          onPress={() => void openWebAppPath('/manage-signals')}
          className="ml-auto rounded-full bg-neutral-100 px-3 py-1.5 dark:bg-neutral-800"
        >
          <Text className="text-xs font-semibold text-teal-700 dark:text-teal-400">Open full editor</Text>
        </Pressable>
      </View>

      <FlatList
        className="mt-4"
        data={rows}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={tscTheme.primary} />
        }
        contentContainerClassName="gap-3 pb-24"
        ListEmptyComponent={
          !loading ? (
            <Card>
              <BodyText>
                Trade signals from your Telegram channels will appear here — entries, closes, and SL/TP updates.
              </BodyText>
            </Card>
          ) : null
        }
        renderItem={({ item }) => (
          <Card className="gap-1">
            <View className="flex-row items-start justify-between gap-2">
              <Text className="flex-1 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                {item.summary}
              </Text>
              <Text className="text-xs font-medium uppercase text-teal-700 dark:text-teal-400">
                {item.action.replace(/_/g, ' ')}
              </Text>
            </View>
            <MutedText className="text-xs">{item.channelName}</MutedText>
            <MutedText className="text-xs">{formatShortTime(item.created_at)}</MutedText>
          </Card>
        )}
      />
    </AppScreen>
  )
}
