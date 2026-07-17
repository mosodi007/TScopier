import { useMemo, useState } from 'react'
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native'
import { ArrowUpRight, RefreshCw } from 'lucide-react-native'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { useTradesData } from '@/hooks/useTradesData'
import { TradeDetailModal } from '@/components/trades/TradeDetailModal'
import { TradeRowCard } from '@/components/trades/TradeRowCard'
import { AppScreen } from '@/components/layout/AppScreen'
import { BodyText } from '@/components/ui'
import type { MtTrade } from '@/lib/mtTrade'
import { cn } from '@/lib/cn'
import { tscTheme } from '@/lib/tscTheme'

type Filter = 'all' | 'open' | 'closed'

export default function TradesScreen() {
  const { user } = useAuth()
  const { isDark } = useTheme()
  const { trades, loading, refreshing, error, refresh } = useTradesData(user?.id)
  const [filter, setFilter] = useState<Filter>('all')
  const [selectedTrade, setSelectedTrade] = useState<MtTrade | null>(null)

  const filters = useMemo(
    () => [
      { value: 'all' as const, label: 'All', count: trades.length },
      {
        value: 'open' as const,
        label: 'Open',
        count: trades.filter(tr => tr.status === 'open').length,
      },
      {
        value: 'closed' as const,
        label: 'Closed',
        count: trades.filter(tr => tr.status === 'closed').length,
      },
    ],
    [trades],
  )

  const visibleTrades = useMemo(
    () => (filter === 'all' ? trades : trades.filter(tr => tr.status === filter)),
    [trades, filter],
  )

  const showInitialSkeleton = loading && trades.length === 0
  const showEmpty = !loading && !showInitialSkeleton && visibleTrades.length === 0
  const showListChrome = showInitialSkeleton || visibleTrades.length > 0
  const iconColor = isDark ? tscTheme.textMuted.dark : tscTheme.textMuted.light

  return (
    <AppScreen pageTitle="Trades" noPadding>
      <View className="mb-3 flex-row items-center gap-2">
        <Pressable
          onPress={refresh}
          disabled={refreshing || showInitialSkeleton}
          className={cn(
            'flex-row items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-800',
            (refreshing || showInitialSkeleton) && 'opacity-50',
          )}
        >
          <RefreshCw size={14} color={iconColor} />
          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Refresh
          </Text>
        </Pressable>

        <View className="flex-1 flex-row overflow-hidden rounded-lg border border-neutral-200 bg-white p-0.5 dark:border-neutral-800 dark:bg-neutral-900">
          {filters.map(f => (
            <Pressable
              key={f.value}
              onPress={() => setFilter(f.value)}
              className={cn(
                'flex-1 items-center rounded-md px-2 py-2',
                filter === f.value && 'bg-teal-600',
              )}
            >
              <Text
                className={cn(
                  'text-sm font-medium',
                  filter === f.value
                    ? 'text-white'
                    : 'text-neutral-600 dark:text-neutral-400',
                )}
                numberOfLines={1}
              >
                {f.label}
                <Text
                  className={cn(
                    'text-xs',
                    filter === f.value ? 'text-teal-100' : 'text-neutral-400',
                  )}
                >
                  {' '}
                  {f.count}
                </Text>
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {error && !showInitialSkeleton ? (
        <Text className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</Text>
      ) : null}

      <View
        className={cn(
          'flex-1 overflow-hidden',
          showListChrome &&
            'rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900',
        )}
      >
        <FlatList
          data={visibleTrades}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl
              refreshing={loading || refreshing}
              onRefresh={refresh}
              tintColor={tscTheme.primary}
            />
          }
          contentContainerClassName={cn('pb-24', showEmpty && 'flex-grow justify-center')}
          ListEmptyComponent={
            showInitialSkeleton ? (
              <View>
                {[0, 1, 2, 3].map(i => (
                  <View
                    key={i}
                    className="gap-3 border-b border-neutral-100 px-4 py-4 dark:border-neutral-800"
                  >
                    <View className="flex-row justify-between">
                      <View className="h-5 w-24 rounded bg-neutral-100 dark:bg-neutral-800" />
                      <View className="h-5 w-16 rounded bg-neutral-100 dark:bg-neutral-800" />
                    </View>
                    <View className="h-4 w-full rounded bg-neutral-100 dark:bg-neutral-800" />
                    <View className="h-4 w-3/4 rounded bg-neutral-100 dark:bg-neutral-800" />
                  </View>
                ))}
              </View>
            ) : showEmpty ? (
              <View className="items-center px-6 py-16">
                <ArrowUpRight size={40} color={isDark ? '#404040' : '#e5e5e5'} />
                <Text className="mt-3 text-sm font-medium text-neutral-400">No trades to show</Text>
                <BodyText className="mt-1 text-center text-xs text-neutral-300">
                  {filter === 'open'
                    ? 'No open positions on any of your linked broker accounts.'
                    : filter === 'closed'
                      ? 'No recent closed orders in this MT session.'
                      : 'Connect a broker account to see live trades here.'}
                </BodyText>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <TradeRowCard trade={item} onPress={() => setSelectedTrade(item)} />
          )}
        />
      </View>

      <TradeDetailModal
        trade={selectedTrade}
        userId={user?.id}
        visible={selectedTrade != null}
        onClose={() => setSelectedTrade(null)}
      />
    </AppScreen>
  )
}
