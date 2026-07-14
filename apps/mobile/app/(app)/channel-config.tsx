import { useCallback, useEffect, useState } from 'react'
import { ScrollView, Text, View, Pressable } from 'react-native'
import { router } from 'expo-router'
import type { BrokerAccount } from '@tscopier/shared'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { AccentText, Button, Card, HeadingText, Screen, Subtitle, Title } from '@/components/ui'
import { cn } from '@/lib/cn'

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

  const selectionClass = (selected: boolean) =>
    cn(
      selected ? 'text-teal-600 dark:text-teal-400' : 'text-neutral-600 dark:text-neutral-400',
    )

  return (
    <Screen>
      <ScrollView contentContainerClassName="gap-4 pb-24">
        <Title>Channel config</Title>
        <Subtitle>Select which signal channels each broker copies</Subtitle>

        <Card>
          <HeadingText className="mb-2">Broker</HeadingText>
          {brokers.map(b => (
            <Pressable key={b.id} onPress={() => setSelectedBrokerId(b.id)} className="mb-2 py-2">
              <Text className={selectionClass(selectedBrokerId === b.id)}>{b.label}</Text>
            </Pressable>
          ))}
        </Card>

        {selectedBrokerId ? (
          <Card>
            <HeadingText className="mb-2">Channels</HeadingText>
            {channels.map(ch => (
              <Pressable key={ch.id} onPress={() => toggleChannel(ch.id)} className="mb-2 py-2">
                <Text className={selectionClass(selectedChannelIds.has(ch.id))}>
                  {selectedChannelIds.has(ch.id) ? '✓ ' : '○ '}{ch.display_name ?? ch.id}
                </Text>
              </Pressable>
            ))}
            <Button label="Save channels" loading={saving} onPress={save} />
            {message ? <AccentText className="mt-2 text-sm">{message}</AccentText> : null}
          </Card>
        ) : null}

        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </ScrollView>
    </Screen>
  )
}
