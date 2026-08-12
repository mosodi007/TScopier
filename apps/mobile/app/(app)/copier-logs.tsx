import { useCallback, useEffect, useState } from 'react'
import { FlatList, RefreshControl, Text, View } from 'react-native'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { StackScreen } from '@/components/layout/StackScreen'
import { formatShortTime, StatusBadge } from '@/components/dashboard/logDisplay'
import { BodyText, Card, MutedText } from '@/components/ui'
import { tscTheme } from '@/lib/tscTheme'

interface CopierLogRow {
  id: string
  status: string | null
  created_at: string
  channel_id: string | null
  parsed_data: { symbol?: string; action?: string } | null
  skip_reason?: string | null
}

function buildChannelNames(
  channels: Array<{ id: string; display_name?: string | null; channel_username?: string | null }>,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const channel of channels) {
    const name = channel.display_name?.trim()
    const username = channel.channel_username?.trim().replace(/^@/, '')
    out[channel.id] = name || (username ? `@${username}` : 'Unnamed channel')
  }
  return out
}

export default function CopierLogsScreen() {
  const { user } = useAuth()
  const [rows, setRows] = useState<CopierLogRow[]>([])
  const [channelNames, setChannelNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    const [signalsRes, channelsRes] = await Promise.all([
      supabase
        .from('signals')
        .select('id, status, created_at, channel_id, parsed_data, skip_reason')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('telegram_channels')
        .select('id, display_name, channel_username')
        .eq('user_id', user.id),
    ])
    setRows((signalsRes.data ?? []) as CopierLogRow[])
    setChannelNames(buildChannelNames(channelsRes.data ?? []))
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <StackScreen title="Copier logs" subtitle="Signal parsing and execution history">
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
              <BodyText>No copier logs yet.</BodyText>
            </Card>
          ) : null
        }
        renderItem={({ item }) => {
          const channel = item.channel_id ? channelNames[item.channel_id] ?? '—' : '—'
          const symbol = item.parsed_data?.symbol ?? '—'
          const action = item.parsed_data?.action?.toUpperCase() ?? '—'
          return (
            <Card>
              <View className="flex-row items-center justify-between gap-2">
                <StatusBadge status={item.status ?? 'pending'} />
                <MutedText className="text-xs">{formatShortTime(item.created_at)}</MutedText>
              </View>
              <Text className="mt-2 text-base font-semibold text-neutral-900 dark:text-neutral-50">
                {channel} · {symbol} · {action}
              </Text>
              {item.skip_reason ? (
                <BodyText className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{item.skip_reason}</BodyText>
              ) : null}
            </Card>
          )
        }}
      />
    </StackScreen>
  )
}
