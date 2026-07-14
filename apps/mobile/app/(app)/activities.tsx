import { useCallback, useEffect, useState } from 'react'
import { FlatList, RefreshControl, View } from 'react-native'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { CopierEngineActivityRow } from '@/components/dashboard/CopierEngineActivityRow'
import { StackScreen } from '@/components/layout/StackScreen'
import { BodyText, Card } from '@/components/ui'
import {
  buildChannelDisplayNames,
  buildCopierEngineActivities,
  toCopierEngineListItem,
  TRADE_ACTIVITY_FETCH_LIMIT,
  TRADE_EXECUTION_LOG_SELECT,
  type CopierEngineListItem,
  type TradeActivityLogRow,
} from '@/lib/copierEngineActivities'
import { tscTheme } from '@/lib/tscTheme'

export default function ActivitiesScreen() {
  const { user } = useAuth()
  const [rows, setRows] = useState<CopierEngineListItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    const [channelsRes, logsRes] = await Promise.all([
      supabase
        .from('telegram_channels')
        .select('id, display_name, channel_username')
        .eq('user_id', user.id),
      supabase
        .from('trade_execution_logs')
        .select(TRADE_EXECUTION_LOG_SELECT)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(TRADE_ACTIVITY_FETCH_LIMIT),
    ])

    const channelNames = buildChannelDisplayNames(
      (channelsRes.data ?? []).map(ch => ({
        id: ch.id,
        display_name: ch.display_name ?? '',
        channel_username: ch.channel_username,
      })),
    )

    setRows(
      buildCopierEngineActivities((logsRes.data ?? []) as TradeActivityLogRow[], channelNames).map(
        toCopierEngineListItem,
      ),
    )
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <StackScreen
      title="Copier engine"
      subtitle="Copier engine activity from your signal channels"
    >
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
              <BodyText>
                Copier engine activity will appear here once your copier executes actions from signal
                channels.
              </BodyText>
            </Card>
          ) : null
        }
        renderItem={({ item }) => (
          <Card className="overflow-hidden p-0">
            <CopierEngineActivityRow activity={item} variant="full" />
          </Card>
        )}
        ItemSeparatorComponent={() => <View className="h-0" />}
      />
    </StackScreen>
  )
}
