import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { Radio } from 'lucide-react-native'
import { whenRealtimeReady } from '@tscopier/shared'
import { useAuth } from '@/context/AuthContext'
import {
  AddTelegramChannelModal,
  type TelegramChannelRow,
} from '@/components/channels/AddTelegramChannelModal'
import { BrokerBadge } from '@/components/brokers/BrokerBadge'
import { FloatingActionButton } from '@/components/layout/FloatingActionButton'
import { Button, Card, MutedText } from '@/components/ui'
import { invalidateTgChannelsCache } from '@/lib/tgChannelsCache'
import { supabase } from '@/lib/supabase'
import { tscTheme } from '@/lib/tscTheme'

export type { TelegramChannelRow }

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
  const [pickerOpen, setPickerOpen] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const loadConfigured = useCallback(async () => {
    if (!user?.id) return false
    const [chRes, sessionRes, leaseRes] = await Promise.all([
      supabase
        .from('telegram_channels')
        .select('id, channel_id, display_name, channel_username, is_active, last_live_at')
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
    return !!sessionRes.data
  }, [user?.id])

  useEffect(() => {
    if (!enabled) return
    void loadConfigured()
    if (!user?.id) return
    let channel: ReturnType<typeof supabase.channel> | null = null
    void whenRealtimeReady(supabase, user.id).then(() => {
      if (!enabled) return
      channel = supabase
        .channel(`home_channels:${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'telegram_channels', filter: `user_id=eq.${user.id}` },
          () => void loadConfigured(),
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'telegram_sessions', filter: `user_id=eq.${user.id}` },
          () => {
            void loadConfigured().then(linked => {
              if (!linked) {
                invalidateTgChannelsCache(user.id)
                setPickerOpen(false)
              }
            })
          },
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'worker_session_leases', filter: `user_id=eq.${user.id}` },
          () => void loadConfigured(),
        )
        .subscribe()
    })
    return () => {
      if (channel) void supabase.removeChannel(channel)
    }
  }, [user?.id, loadConfigured, enabled])

  const onRefresh = async () => {
    setRefreshing(true)
    await loadConfigured()
    setRefreshing(false)
  }

  const openPicker = useCallback(() => {
    if (!hasTgSession) {
      router.push('/(app)/telegram-link')
      return
    }
    setPickerOpen(true)
  }, [hasTgSession])

  const toggleChannel = async (id: string, isActive: boolean) => {
    setTogglingId(id)
    setChannels(prev => prev.map(c => (c.id === id ? { ...c, is_active: isActive } : c)))
    await supabase.from('telegram_channels').update({ is_active: isActive }).eq('id', id)
    setTogglingId(null)
  }

  return (
    <View className="flex-1">
      <ScrollView
        style={{ flex: 1 }}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
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
            <View className="flex-row flex-wrap items-center gap-1.5">
              <BrokerBadge label="Connected" tone="primary" />
              {listenerLive ? (
                <BrokerBadge label="Copier engine live" tone="primary" />
              ) : (
                <BrokerBadge label="Listener offline" tone="neutral" />
              )}
            </View>

            <Card className="overflow-hidden p-0">
              <View className="flex-row items-center justify-between gap-3 border-b border-neutral-100 px-4 py-2.5 dark:border-neutral-800">
                <View className="min-w-0 flex-1">
                  <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                    Active channels
                  </Text>
                  <MutedText className="text-xs">
                    {channels.length} configured
                  </MutedText>
                </View>
              </View>

              {channels.length === 0 ? (
                <View className="items-center px-4 py-8">
                  <Radio size={28} color={tscTheme.textMuted.light} />
                  <Text className="mt-2 text-sm font-medium text-neutral-400">No channels configured</Text>
                  <MutedText className="mt-1 text-center text-xs">
                    Tap + to add a channel from your connected Telegram.
                  </MutedText>
                </View>
              ) : (
                <View className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {channels.map(ch => {
                    const active = ch.is_active !== false
                    const username = ch.channel_username?.replace(/^@/, '')
                    return (
                      <View key={ch.id} className="flex-row items-center gap-3 px-4 py-3.5">
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
                          {username ? <MutedText className="text-xs">@{username}</MutedText> : null}
                        </View>
                        <Switch
                          value={active}
                          disabled={togglingId === ch.id}
                          onValueChange={next => void toggleChannel(ch.id, next)}
                          trackColor={{ false: '#d4d4d4', true: tscTheme.primary }}
                          thumbColor="#ffffff"
                        />
                      </View>
                    )
                  })}
                </View>
              )}
            </Card>
          </>
        )}
      </ScrollView>

      <AddTelegramChannelModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onAdded={row => {
          setChannels(prev => {
            const exists = prev.find(c => c.channel_id === row.channel_id)
            return exists
              ? prev.map(c => (c.channel_id === row.channel_id ? row : c))
              : [row, ...prev]
          })
        }}
      />

      <FloatingActionButton
        accessibilityLabel="Add channel from Telegram"
        onPress={openPicker}
        disabled={loading}
      />
    </View>
  )
}
