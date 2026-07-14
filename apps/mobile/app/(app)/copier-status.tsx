import { useCallback, useEffect, useState } from 'react'
import { RefreshControl, ScrollView, Text, View } from 'react-native'
import { router } from 'expo-router'
import { whenRealtimeReady } from '@tscopier/shared'
import type { BrokerAccount } from '@tscopier/shared'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button, Card, Screen, Subtitle, Title } from '@/components/ui'

interface TelegramChannelRow {
  id: string
  display_name: string | null
  is_active: boolean | null
  last_live_at: string | null
}

export default function CopierStatusScreen() {
  const { user } = useAuth()
  const [channels, setChannels] = useState<TelegramChannelRow[]>([])
  const [brokers, setBrokers] = useState<BrokerAccount[]>([])
  const [listenerLive, setListenerLive] = useState<boolean | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!user?.id) return
    const [chRes, brRes, leaseRes] = await Promise.all([
      supabase.from('telegram_channels').select('id, display_name, is_active, last_live_at').eq('user_id', user.id),
      supabase.from('broker_accounts').select('id, label, connection_status, fxsocket_status, signal_channel_ids').eq('user_id', user.id),
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
        .channel(`copier_status:${user.id}`)
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
    <Screen>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#14b8a6" />}
        contentContainerClassName="gap-4 pb-24"
      >
        <Title>Copier status</Title>
        <Subtitle>Telegram listener and channel configuration</Subtitle>

        <Card>
          <Text className="text-sm text-neutral-400">Telegram listener</Text>
          <Text className={`mt-1 text-lg ${listenerLive ? 'text-teal-400' : 'text-amber-400'}`}>
            {listenerLive ? 'Live' : 'Not connected'}
          </Text>
        </Card>

        <Card>
          <Text className="mb-2 font-semibold text-white">Channels ({channels.length})</Text>
          {channels.length === 0 ? (
            <Text className="text-neutral-400">No channels linked yet.</Text>
          ) : (
            channels.map(ch => (
              <View key={ch.id} className="mb-2 border-b border-neutral-800 pb-2">
                <Text className="text-white">{ch.display_name ?? ch.id}</Text>
                <Text className="text-xs text-neutral-500">
                  {ch.is_active ? 'Active' : 'Inactive'}
                  {ch.last_live_at ? ` · last live ${new Date(ch.last_live_at).toLocaleString()}` : ''}
                </Text>
              </View>
            ))
          )}
        </Card>

        <Card>
          <Text className="mb-2 font-semibold text-white">Broker channel links</Text>
          {brokers.map(b => (
            <View key={b.id} className="mb-2">
              <Text className="text-white">{b.label}</Text>
              <Text className="text-xs text-neutral-500">
                {(b.signal_channel_ids ?? []).length} channel(s) selected
              </Text>
            </View>
          ))}
        </Card>

        <Button label="Link Telegram" onPress={() => router.push('/(app)/telegram-link')} />
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </ScrollView>
    </Screen>
  )
}
