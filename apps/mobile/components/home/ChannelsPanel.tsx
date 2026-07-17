import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, RefreshControl, ScrollView, Switch, Text, View } from 'react-native'
import { router } from 'expo-router'
import { Radio } from 'lucide-react-native'
import { whenRealtimeReady } from '@tscopier/shared'
import { useAuth } from '@/context/AuthContext'
import { BrokerBadge } from '@/components/brokers/BrokerBadge'
import { Button, Card, MutedText } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { tscTheme } from '@/lib/tscTheme'

export interface TelegramChannelRow {
  id: string
  display_name: string | null
  channel_username: string | null
  is_active: boolean | null
  last_live_at: string | null
}

interface ChannelsPanelProps {
  /** When false, skip fetch + realtime. */
  enabled?: boolean
  contentContainerClassName?: string
}

export function ChannelsPanel({
  enabled = true,
  contentContainerClassName = 'gap-4 pb-24',
}: ChannelsPanelProps) {
  const { user } = useAuth()
  const [channels, setChannels] = useState<TelegramChannelRow[]>([])
  const [hasTgSession, setHasTgSession] = useState(false)
  const [listenerLive, setListenerLive] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user?.id) return
    const [chRes, sessionRes, leaseRes] = await Promise.all([
      supabase
        .from('telegram_channels')
        .select('id, display_name, channel_username, is_active, last_live_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('telegram_sessions').select('id').eq('user_id', user.id).maybeSingle(),
      supabase.from('worker_session_leases').select('user_id, expires_at').eq('user_id', user.id).maybeSingle(),
    ])
    setChannels((chRes.data ?? []) as TelegramChannelRow[])
    setHasTgSession(!!sessionRes.data)
    const lease = leaseRes.data as { expires_at?: string } | null
    setListenerLive(lease?.expires_at ? new Date(lease.expires_at).getTime() > Date.now() : false)
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    if (!enabled) return
    void load()
    if (!user?.id) return
    let channel: ReturnType<typeof supabase.channel> | null = null
    void whenRealtimeReady(supabase, user.id).then(() => {
      if (!enabled) return
      channel = supabase
        .channel(`home_channels:${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'telegram_channels', filter: `user_id=eq.${user.id}` },
          () => void load(),
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'telegram_sessions', filter: `user_id=eq.${user.id}` },
          () => void load(),
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'worker_session_leases', filter: `user_id=eq.${user.id}` },
          () => void load(),
        )
        .subscribe()
    })
    return () => {
      if (channel) void supabase.removeChannel(channel)
    }
  }, [user?.id, load, enabled])

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const toggleChannel = async (id: string, isActive: boolean) => {
    setTogglingId(id)
    setChannels(prev => prev.map(c => (c.id === id ? { ...c, is_active: isActive } : c)))
    await supabase.from('telegram_channels').update({ is_active: isActive }).eq('id', id)
    setTogglingId(null)
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      nestedScrollEnabled
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={tscTheme.primary} />
      }
      contentContainerClassName={contentContainerClassName}
      showsVerticalScrollIndicator={false}
    >
      {loading ? (
        <View className="items-center py-16">
          <ActivityIndicator color={tscTheme.primary} size="large" />
        </View>
      ) : !hasTgSession ? (
        <Card className="items-center gap-3 py-8">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#229ED9]/15">
            <Radio size={22} color="#229ED9" />
          </View>
          <Text className="text-center text-base font-semibold text-neutral-900 dark:text-neutral-50">
            Telegram not connected
          </Text>
          <MutedText className="px-4 text-center text-sm">
            Connect Telegram to load and manage your signal channel list.
          </MutedText>
          <Button label="Link Telegram" onPress={() => router.push('/(app)/telegram-link')} />
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden p-0">
            <View className="flex-row items-center gap-3 border-b border-neutral-100 bg-[#229ED9]/10 px-4 py-3 dark:border-neutral-800 dark:bg-[#229ED9]/15">
              <View className="h-9 w-9 items-center justify-center rounded-xl border border-neutral-100 bg-white dark:border-neutral-700 dark:bg-neutral-800">
                <Radio size={18} color="#229ED9" />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                  Your Telegram channels
                </Text>
                <MutedText className="text-xs">Add channels to start copying signals</MutedText>
              </View>
            </View>
            <View className="flex-row flex-wrap gap-1.5 px-4 py-3">
              <BrokerBadge label="Connected" tone="primary" />
              {listenerLive ? (
                <BrokerBadge label="Copier engine live" tone="primary" />
              ) : (
                <BrokerBadge label="Listener offline" tone="neutral" />
              )}
              <BrokerBadge label={`${channels.length} channel${channels.length === 1 ? '' : 's'}`} />
            </View>
          </Card>

          {channels.length === 0 ? (
            <Card className="items-center py-8">
              <Radio size={36} color={tscTheme.textMuted.light} />
              <Text className="mt-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                No channels yet
              </Text>
              <MutedText className="mt-1 text-center text-xs">
                Add a signal channel to start monitoring
              </MutedText>
            </Card>
          ) : (
            <View className="gap-2">
              {channels.map(ch => {
                const active = ch.is_active !== false
                const username = ch.channel_username?.replace(/^@/, '')
                return (
                  <Card key={ch.id} className="overflow-hidden p-0">
                    <View className="flex-row items-center gap-3 px-4 py-3.5">
                      <View className="h-9 w-9 items-center justify-center rounded-lg bg-teal-50 dark:bg-teal-950/60">
                        <Radio size={16} color={tscTheme.primary} />
                      </View>
                      <View className="min-w-0 flex-1">
                        <View className="flex-row flex-wrap items-center gap-1.5">
                          <Text
                            className="text-sm font-medium text-neutral-900 dark:text-neutral-50"
                            numberOfLines={1}
                          >
                            {ch.display_name?.trim() || 'Unnamed channel'}
                          </Text>
                          {!active ? <BrokerBadge label="Paused" /> : null}
                        </View>
                        {username ? (
                          <MutedText className="text-xs">@{username}</MutedText>
                        ) : ch.last_live_at ? (
                          <MutedText className="text-xs">
                            Last live {new Date(ch.last_live_at).toLocaleString()}
                          </MutedText>
                        ) : null}
                      </View>
                      <Switch
                        value={active}
                        disabled={togglingId === ch.id}
                        onValueChange={next => void toggleChannel(ch.id, next)}
                        trackColor={{ false: '#d4d4d4', true: tscTheme.primary }}
                        thumbColor="#ffffff"
                      />
                    </View>
                  </Card>
                )
              })}
            </View>
          )}
        </>
      )}
    </ScrollView>
  )
}
