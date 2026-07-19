import { useEffect, useMemo } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native'
import { router } from 'expo-router'
import {
  ArrowUpRight,
  Check,
  CircleCheck,
  Layers,
  Pencil,
} from 'lucide-react-native'
import type { LucideIcon } from 'lucide-react-native'
import { groupNotificationsByDay } from '@tscopier/web-lib/notificationDayGroups'
import { formatRelative } from '@tscopier/web-lib/formatRelative'
import type { TradeNotification, TradeNotificationHeadline } from '@tscopier/web-lib/tradeNotifications'
import { useNotifications } from '@/context/NotificationsContext'
import { StackScreen } from '@/components/layout/StackScreen'
import { BodyText, Button, Card, MutedText } from '@/components/ui'
import { cn } from '@/lib/cn'
import { tscTheme } from '@/lib/tscTheme'
import { useTheme } from '@/context/ThemeContext'

function headlineMeta(headline: TradeNotificationHeadline): {
  icon: LucideIcon
} {
  switch (headline) {
    case 'execution_completed':
      return { icon: ArrowUpRight }
    case 'modification_completed':
      return { icon: Pencil }
    case 'layering_completed':
      return { icon: Layers }
    case 'trades_closed':
      return { icon: Check }
  }
}

type ListRow =
  | { type: 'day'; key: string; label: string }
  | { type: 'item'; key: string; item: TradeNotification }

function NotificationRow({ item }: { item: TradeNotification }) {
  const { isDark } = useTheme()
  const meta = headlineMeta(item.headline)
  const Icon = meta.icon
  const iconColor = isDark ? tscTheme.textMuted.dark : '#404040'
  const iconBg = isDark ? 'bg-neutral-800' : 'bg-neutral-100'

  return (
    <View className="flex-row gap-3 px-1 py-3">
      <View className={cn('mt-0.5 h-8 w-8 items-center justify-center rounded-lg', iconBg)}>
        <Icon size={16} color={iconColor} />
      </View>
      <View className="min-w-0 flex-1">
        <View className="flex-row items-start justify-between gap-2">
          <Text className="min-w-0 flex-1 text-xs font-semibold uppercase tracking-wide text-neutral-700 dark:text-neutral-200">
            {item.title}
            {item.symbol ? (
              <Text className="font-mono text-xs font-normal normal-case tracking-normal text-neutral-500 dark:text-neutral-400">
                {`  ${item.symbol}`}
              </Text>
            ) : null}
          </Text>
          <Text className="shrink-0 text-[11px] tabular-nums text-neutral-400 dark:text-neutral-500">
            {formatRelative(Date.parse(item.createdAt))}
          </Text>
        </View>
        <Text className="mt-1 text-sm leading-snug text-neutral-600 dark:text-neutral-300">
          {item.body}
        </Text>
      </View>
    </View>
  )
}

export default function AlertsScreen() {
  const { items, loading, markAllRead, unreadCount, refresh } = useNotifications()

  useEffect(() => {
    markAllRead()
  }, [markAllRead])

  const rows = useMemo((): ListRow[] => {
    const groups = groupNotificationsByDay(items, {
      today: 'Today',
      yesterday: 'Yesterday',
      locale: 'en-US',
    })
    const out: ListRow[] = []
    for (const group of groups) {
      out.push({ type: 'day', key: `day:${group.dayKey}`, label: group.label })
      for (const item of group.items) {
        out.push({ type: 'item', key: item.id, item })
      }
    }
    return out
  }, [items])

  return (
    <StackScreen
      title="Notifications"
      subtitle={
        unreadCount > 0
          ? `${unreadCount} unread`
          : items.length > 0
            ? 'Trade activity from your copier'
            : undefined
      }
    >
      {items.length > 0 ? (
        <View className="mt-1 flex-row justify-end">
          <Button
            label="Mark all read"
            variant="secondary"
            onPress={markAllRead}
            className="px-3 py-2"
          />
        </View>
      ) : null}

      <FlatList
        className="mt-3"
        data={rows}
        keyExtractor={row => row.key}
        refreshing={loading && items.length > 0}
        onRefresh={() => void refresh()}
        contentContainerClassName="pb-24"
        ListEmptyComponent={
          loading ? (
            <View className="items-center py-16">
              <ActivityIndicator color={tscTheme.primary} />
              <MutedText className="mt-3">Loading notifications…</MutedText>
            </View>
          ) : (
            <Card className="items-center py-10">
              <CircleCheck size={32} color="#d4d4d4" />
              <BodyText className="mt-2 text-center text-sm text-neutral-500">
                No recent trade activity yet.
              </BodyText>
            </Card>
          )
        }
        ListFooterComponent={
          items.length > 0 ? (
            <Pressable
              onPress={() => router.push('/(app)/(tabs)/trades')}
              className="mt-4 items-center rounded-xl border border-neutral-200 py-3 dark:border-neutral-800"
            >
              <Text className="text-sm font-semibold text-teal-700 dark:text-teal-400">
                View trades
              </Text>
            </Pressable>
          ) : null
        }
        renderItem={({ item: row }) => {
          if (row.type === 'day') {
            return (
              <Text className="mb-1 mt-4 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {row.label}
              </Text>
            )
          }
          return (
            <View className="border-b border-neutral-100 dark:border-neutral-800">
              <NotificationRow item={row.item} />
            </View>
          )
        }}
      />
    </StackScreen>
  )
}
