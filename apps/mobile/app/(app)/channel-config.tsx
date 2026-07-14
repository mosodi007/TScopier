import { useCallback, useEffect, useState } from 'react'
import { ScrollView, Text, View, Pressable } from 'react-native'
import { router } from 'expo-router'
import type { BrokerAccount } from '@tscopier/shared'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button, Card, Screen, Subtitle, Title } from '@/components/ui'

interface ChannelRow {
  id: string
  display_name: string | null
}

export default function ChannelConfigScreen() {
  const { user } = useAuth()
  const [brokers, setBrokers] = useState<BrokerAccount[]>([])
  const [channels, setChannels] = useState<ChannelRow[]>([])
  const [selectedBrokerId, setSelectedBrokerId] = useState<string | null>(null)
  const [selectedChannelIds, setSelectedChannelIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user?.id) return
    const [bRes, cRes] = await Promise.all([
      supabase.from('broker_accounts').select('*').eq('user_id', user.id).eq('is_active', true),
      supabase.from('telegram_channels').select('id, display_name').eq('user_id', user.id),
    ])
    setBrokers((bRes.data ?? []) as BrokerAccount[])
    setChannels((cRes.data ?? []) as ChannelRow[])
  }, [user?.id])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const broker = brokers.find(b => b.id === selectedBrokerId)
    if (!broker) {
      setSelectedChannelIds(new Set())
      return
    }
    setSelectedChannelIds(new Set(broker.signal_channel_ids ?? []))
  }, [selectedBrokerId, brokers])

  const toggleChannel = (channelId: string) => {
    setSelectedChannelIds(prev => {
      const next = new Set(prev)
      if (next.has(channelId)) next.delete(channelId)
      else next.add(channelId)
      return next
    })
  }

  const save = async () => {
    if (!selectedBrokerId) return
    setSaving(true)
    setMessage(null)
    const { error } = await supabase
      .from('broker_accounts')
      .update({ signal_channel_ids: [...selectedChannelIds] })
      .eq('id', selectedBrokerId)
    setSaving(false)
    if (error) {
      setMessage(error.message)
      return
    }
    setMessage('Channel selection saved.')
    void load()
  }

  return (
    <Screen>
      <ScrollView contentContainerClassName="gap-4 pb-24">
        <Title>Channel config</Title>
        <Subtitle>Select which signal channels each broker copies</Subtitle>

        <Card>
          <Text className="mb-2 font-semibold text-white">Broker</Text>
          {brokers.map(b => (
            <Pressable key={b.id} onPress={() => setSelectedBrokerId(b.id)} className="mb-2 py-2">
              <Text className={selectedBrokerId === b.id ? 'text-teal-400' : 'text-neutral-300'}>
                {b.label}
              </Text>
            </Pressable>
          ))}
        </Card>

        {selectedBrokerId ? (
          <Card>
            <Text className="mb-2 font-semibold text-white">Channels</Text>
            {channels.map(ch => (
              <Pressable key={ch.id} onPress={() => toggleChannel(ch.id)} className="mb-2 py-2">
                <Text className={selectedChannelIds.has(ch.id) ? 'text-teal-400' : 'text-neutral-400'}>
                  {selectedChannelIds.has(ch.id) ? '✓ ' : '○ '}{ch.display_name ?? ch.id}
                </Text>
              </Pressable>
            ))}
            <Button label="Save channels" loading={saving} onPress={save} />
            {message ? <Text className="mt-2 text-sm text-teal-400">{message}</Text> : null}
          </Card>
        ) : null}

        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </ScrollView>
    </Screen>
  )
}
