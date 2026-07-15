import { useCallback, useEffect, useState } from 'react'
import { RefreshControl, ScrollView, Text, View } from 'react-native'
import { router } from 'expo-router'
import { whenRealtimeReady } from '@tscopier/shared'
import type { BrokerAccount } from '@tscopier/shared'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  Button,
  Card,
  HeadingText,
  LabelText,
  MutedText,
  ValueText,
} from '@/components/ui'
import { openWebAppPath } from '@/lib/openWebApp'
import { tscTheme } from '@/lib/tscTheme'

interface TelegramChannelRow {
  id: string
  display_name: string | null
  is_active: boolean | null
  last_live_at: string | null
}

export function HomeChannelsSection() {
  const { user } = useAuth()
  const [channels, setChannels] = useState<TelegramChannelRow[]>([])
  const [brokers, setBrokers] = useState<BrokerAccount[]>([])
  const [listenerLive, setListenerLive] = useState<boolean | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!user?.id) return
    const [chRes, brRes, leaseRes] = await Promise.all([
      supabase.from('telegram_channels').select('id, display_name, is_active, last_live_at').eq('user_id', user.id),
      supabase
        .from('broker_accounts')
        .select('id, label, connection_status, fxsocket_status, signal_channel_ids')
        .eq('user_id', user.id),
      supabase.from('worker_session_leases').select('user_id, expires_at').eq('user_id', user.id).maybeSingle(),
    ])
    setChannels((chRes.data ?? []) as TelegramChannelRow[])
    setBrokers((brRes.data ?? []) as BrokerAccount[])
    const lease = leaseRes.data as { expires_at?: string } | null
    setListenerLive(lease?.expires_at ? new Date(lease.expires_at).getTime() > Date.now() : false)
  }, [user?.id])

  useEffect(() => {
    void load()
    if (!user?.id) return
    let channel: ReturnType<typeof supabase.channel> | null = null
    void whenRealtimeReady(supabase, user.id).then(() => {
      channel = supabase
        .channel(`home_channels:${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'telegram_channels', filter: `user_id=eq.${user.id}` }, () => void load())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'worker_session_leases', filter: `user_id=eq.${user.id}` }, () => void load())
        .subscribe()
    })
    return () => {
      if (channel) void supabase.removeChannel(channel)
    }
  }, [user?.id, load])

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  return (
    <ScrollView
      nestedScrollEnabled
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={tscTheme.primary} />
      }
      contentContainerClassName="gap-4 pb-24"
      showsVerticalScrollIndicator={false}
    >
      <Card>
        <LabelText>Telegram listener</LabelText>
        <Text className={`mt-1 text-lg ${listenerLive ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400'}`}>
          {listenerLive ? 'Live' : 'Not connected'}
        </Text>
      </Card>

      <Card>
        <HeadingText className="mb-2">Channels ({channels.length})</HeadingText>
        {channels.length === 0 ? (
          <MutedText>No channels linked yet.</MutedText>
        ) : (
          channels.map(ch => (
            <View key={ch.id} className="mb-2 border-b border-neutral-200 pb-2 dark:border-neutral-800">
              <ValueText>{ch.display_name ?? ch.id}</ValueText>
              <MutedText className="text-xs">
                {ch.is_active ? 'Active' : 'Inactive'}
                {ch.last_live_at ? ` · last live ${new Date(ch.last_live_at).toLocaleString()}` : ''}
              </MutedText>
            </View>
          ))
        )}
      </Card>

      <Card>
        <HeadingText className="mb-2">Broker channel links</HeadingText>
        {brokers.length === 0 ? (
          <MutedText>No brokers connected.</MutedText>
        ) : (
          brokers.map(b => (
            <View key={b.id} className="mb-2">
              <ValueText>{b.label}</ValueText>
              <MutedText className="text-xs">{(b.signal_channel_ids ?? []).length} channel(s) selected</MutedText>
            </View>
          ))
        )}
      </Card>

      <View className="gap-2">
        <Button label="Link Telegram" onPress={() => router.push('/(app)/telegram-link')} />
        <Button label="Channel config" variant="secondary" onPress={() => router.push('/(app)/channel-config')} />
        <Button label="Full channel settings" variant="secondary" onPress={() => void openWebAppPath('/channels')} />
      </View>
    </ScrollView>
  )
}
