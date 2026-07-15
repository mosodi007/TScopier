import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'
import { router } from 'expo-router'
import type { BrokerAccount } from '@tscopier/shared'
import { callEdgeFunction } from '@tscopier/shared'
import { useAuth } from '@/context/AuthContext'
import { BrokerAccountCard } from '@/components/brokers/BrokerAccountCard'
import { BrokerTabToolbar } from '@/components/brokers/BrokerTabToolbar'
import { HomeSectionTitle } from '@/components/home/HomeSectionTitle'
import { Button, Card, HeadingText, MutedText } from '@/components/ui'
import type { DashboardMetricsState } from '@/hooks/useDashboardMetrics'
import {
  filterBrokers,
  type BrokerChannelOption,
  uniqueBrokerFilterOptions,
} from '@/lib/brokerListFilters'
import { supabase } from '@/lib/supabase'
import { tscTheme } from '@/lib/tscTheme'

interface HomeBrokersSectionProps {
  metrics: Pick<DashboardMetricsState, 'brokers' | 'liveByBroker' | 'loading' | 'refreshing' | 'refresh'>
}

export function HomeBrokersSection({ metrics }: HomeBrokersSectionProps) {
  const { user } = useAuth()
  const { brokers, liveByBroker, loading, refresh } = metrics
  const [searchQuery, setSearchQuery] = useState('')
  const [brokerFilter, setBrokerFilter] = useState('all')
  const [channels, setChannels] = useState<BrokerChannelOption[]>([])
  const [togglingBrokerId, setTogglingBrokerId] = useState<string | null>(null)

  const loadChannels = useCallback(async () => {
    if (!user?.id) return
    const { data } = await supabase
      .from('telegram_channels')
      .select('id, display_name')
      .eq('user_id', user.id)
      .order('display_name', { ascending: true })
    setChannels((data ?? []) as BrokerChannelOption[])
  }, [user?.id])

  useEffect(() => {
    void loadChannels()
  }, [loadChannels])

  const brokerFilterOptions = useMemo(() => uniqueBrokerFilterOptions(brokers), [brokers])
  const filteredBrokers = useMemo(
    () => filterBrokers(brokers, searchQuery, brokerFilter),
    [brokers, searchQuery, brokerFilter],
  )

  const openConfigure = (brokerId: string) => {
    router.push(`/(app)/broker-config/${brokerId}`)
  }

  const toggleBrokerActive = async (broker: BrokerAccount, isActive: boolean) => {
    if (!user?.id) return
    setTogglingBrokerId(broker.id)
    const { error } = await supabase
      .from('broker_accounts')
      .update({ is_active: isActive })
      .eq('id', broker.id)
      .eq('user_id', user.id)
    setTogglingBrokerId(null)
    if (error) return
    await refresh()
  }

  const deleteBroker = async (broker: BrokerAccount) => {
    if (!user?.id) return
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (token) {
        await callEdgeFunction('fxsocket-broker', {
          accessToken: token,
          body: { action: 'delete', broker_id: broker.id },
        })
      }
    } catch {
      await supabase.from('broker_accounts').delete().eq('id', broker.id).eq('user_id', user.id)
    }
    await refresh()
  }

  return (
    <View className="flex-1">
      <HomeSectionTitle
        title="Brokers"
        action={
          <BrokerTabToolbar
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            brokerFilter={brokerFilter}
            onBrokerFilterChange={setBrokerFilter}
            brokerFilterOptions={brokerFilterOptions}
            onAddAccount={() => router.push('/(app)/broker-connect')}
          />
        }
      />

      <ScrollView style={{ flex: 1 }} contentContainerClassName="gap-4 pb-24" showsVerticalScrollIndicator={false}>
        <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Connected accounts — {brokers.length}
        </Text>

        {loading && brokers.length === 0 ? (
          <View className="items-center py-16">
            <ActivityIndicator color={tscTheme.primary} size="large" />
          </View>
        ) : brokers.length === 0 ? (
          <Card>
            <HeadingText className="mb-2">No brokers linked</HeadingText>
            <MutedText className="mb-4">
              Connect MetaTrader or cTrader to start copying signals from your Telegram channels.
            </MutedText>
            <Button label="Connect broker" onPress={() => router.push('/(app)/broker-connect')} />
          </Card>
        ) : filteredBrokers.length === 0 ? (
          <Card className="items-center border-dashed py-8">
            <MutedText className="text-center">
              {searchQuery.trim() ? 'No accounts match your search.' : 'No accounts match this broker filter.'}
            </MutedText>
          </Card>
        ) : (
          <View className="gap-3">
            {filteredBrokers.map(broker => (
              <BrokerAccountCard
                key={broker.id}
                broker={broker}
                live={liveByBroker[broker.id]}
                channels={channels}
                toggling={togglingBrokerId === broker.id}
                onPress={() => openConfigure(broker.id)}
                onConfigure={() => openConfigure(broker.id)}
                onToggleActive={isActive => void toggleBrokerActive(broker, isActive)}
                onDelete={() => void deleteBroker(broker)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  )
}
