import { useCallback, useEffect, useState } from 'react'
import { FlatList, RefreshControl, Text, View } from 'react-native'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { StackScreen } from '@/components/layout/StackScreen'
import {
  formatActionLabel,
  formatShortTime,
  StatusBadge,
} from '@/components/dashboard/logDisplay'
import { BodyText, Card, MutedText } from '@/components/ui'
import { tscTheme } from '@/lib/tscTheme'

interface ActivityRow {
  id: string
  action: string
  status: string
  created_at: string
  error_message?: string | null
}

export default function ActivitiesScreen() {
  const { user } = useAuth()
  const [rows, setRows] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('trade_execution_logs')
      .select('id, action, status, created_at, error_message')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setRows((data ?? []) as ActivityRow[])
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <StackScreen title="Copier engine" subtitle="Trade activities and management events">
      <FlatList
        className="mt-4"
        data={rows}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={tscTheme.primary} />
        }
        contentContainerClassName="gap-3 pb-24"
        ListEmptyComponent={
          !loading ? (
            <Card>
              <BodyText>No activities yet.</BodyText>
            </Card>
          ) : null
        }
        renderItem={({ item }) => (
          <Card>
            <View className="flex-row items-start justify-between gap-2">
              <Text className="flex-1 text-base font-semibold text-neutral-900 dark:text-neutral-50">
                {formatActionLabel(item.action)}
              </Text>
              <StatusBadge status={item.status} />
            </View>
            <MutedText className="mt-2 text-xs">{formatShortTime(item.created_at)}</MutedText>
            {item.error_message ? (
              <BodyText className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{item.error_message}</BodyText>
            ) : null}
          </Card>
        )}
      />
    </StackScreen>
  )
}
