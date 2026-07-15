import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { X } from 'lucide-react-native'
import type { BrokerAccount, ManualSettings } from '@tscopier/shared'
import { useAuth } from '@/context/AuthContext'
import { Screen, Button, Card, MutedText, HeadingText, ErrorText } from '@/components/ui'
import { BrokerBadge } from '@/components/brokers/BrokerBadge'
import { supabase } from '@/lib/supabase'
import { tscTheme } from '@/lib/tscTheme'
import { formatMoney } from '@/lib/formatMoney'
import {
  brokerAccountTypeClass,
  brokerAccountTypeLabel,
  resolveBrokerAccountType,
} from '@/lib/brokerLabels'
import { normalizeBrokerChannelIds } from '@/lib/brokerListFilters'
import { resolveBrokerTotalBalance } from '@tscopier/web-lib/effectiveBrokerBalance'
import { DEFAULT_MANUAL_SETTINGS } from '@tscopier/web-lib/defaultManualSettings'
import {
  fetchBrokerChannelTradingConfigRows,
  mergeBrokerWithChannelTradingConfigRows,
  upsertBrokerChannelTradingConfigs,
} from '@tscopier/web-lib/brokerChannelTradingConfigs'
import {
  buildDefaultChannelTradingConfig,
  normalizeChannelTradingConfigsMap,
  resolveChannelConfigEntry,
} from '@tscopier/web-lib/channelTradingConfig'
import { parseSymbolToTradeList } from '@tscopier/web-lib/channelSymbolDetection'
import { cn } from '@/lib/cn'

type SupabaseClientLike = Parameters<typeof fetchBrokerChannelTradingConfigRows>[0]

type ConfigTab = 'symbols' | 'instructions' | 'signal_examples'

interface ChannelOption {
  id: string
  display_name: string | null
}

function symbolsToInput(value: string | null | undefined): string {
  if (!value?.trim()) return ''
  return value.trim()
}

function symbolsExcludeToInput(value: string[] | null | undefined): string {
  if (!value?.length) return ''
  return value.join(', ')
}

function symbolsFromInput(raw: string): string | null {
  const list = parseSymbolToTradeList(raw)
  if (!list.length) return null
  return list.join(', ')
}

function symbolsExcludeFromInput(raw: string): string[] {
  return parseSymbolToTradeList(raw)
}

export default function BrokerConfigScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [broker, setBroker] = useState<BrokerAccount | null>(null)
  const [channels, setChannels] = useState<ChannelOption[]>([])
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ConfigTab>('symbols')
  const [symbolsToTrade, setSymbolsToTrade] = useState('')
  const [symbolsToAvoid, setSymbolsToAvoid] = useState('')
  const [instructions, setInstructions] = useState('')

  const load = useCallback(async () => {
    if (!user?.id || !id) return
    setLoading(true)
    setError(null)

    const [brokerRes, channelsRes, configRes] = await Promise.all([
      supabase.from('broker_accounts').select('*').eq('id', id).eq('user_id', user.id).maybeSingle(),
      supabase.from('telegram_channels').select('id, display_name').eq('user_id', user.id),
      fetchBrokerChannelTradingConfigRows(supabase as unknown as SupabaseClientLike, id),
    ])

    if (brokerRes.error || !brokerRes.data) {
      setError(brokerRes.error?.message ?? 'Broker not found')
      setLoading(false)
      return
    }

    const channelRows = (channelsRes.data ?? []) as ChannelOption[]
    const mergedBroker = mergeBrokerWithChannelTradingConfigRows(
      brokerRes.data as BrokerAccount,
      configRes.rows,
    )

    setBroker(mergedBroker)
    setChannels(channelRows)

    const linkedIds = normalizeBrokerChannelIds(mergedBroker)
    const initialChannelId = linkedIds[0] ?? channelRows[0]?.id ?? null
    setSelectedChannelId(initialChannelId)
    setLoading(false)
  }, [id, user?.id])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!broker || !selectedChannelId) {
      setSymbolsToTrade('')
      setSymbolsToAvoid('')
      setInstructions('')
      return
    }

    const configs = normalizeChannelTradingConfigsMap(broker.channel_trading_configs)
    const entry = resolveChannelConfigEntry(configs, selectedChannelId) ?? buildDefaultChannelTradingConfig()
    const manual = (entry.manual_settings ?? DEFAULT_MANUAL_SETTINGS) as ManualSettings

    setSymbolsToTrade(symbolsToInput(manual.symbol_to_trade))
    setSymbolsToAvoid(symbolsExcludeToInput(manual.symbols_exclude))

    const filters = broker.channel_message_filters as Record<string, { instructions?: string }> | null
    setInstructions(String(filters?.[selectedChannelId]?.instructions ?? ''))
  }, [broker, selectedChannelId])

  const linkedChannels = useMemo(() => {
    if (!broker) return []
    const ids = new Set(normalizeBrokerChannelIds(broker))
    return channels.filter(ch => ids.has(ch.id))
  }, [broker, channels])

  const selectedChannel = linkedChannels.find(ch => ch.id === selectedChannelId) ?? null
  const accountType = broker ? resolveBrokerAccountType(broker) : undefined

  const save = async () => {
    if (!user?.id || !broker || !selectedChannelId) return
    setSaving(true)
    setError(null)

    const configs = normalizeChannelTradingConfigsMap(broker.channel_trading_configs)
    const existing = resolveChannelConfigEntry(configs, selectedChannelId) ?? buildDefaultChannelTradingConfig()
    const manual = { ...(existing.manual_settings as ManualSettings) }

    manual.symbol_to_trade = symbolsFromInput(symbolsToTrade)
    manual.symbols_exclude = symbolsExcludeFromInput(symbolsToAvoid)

    const nextConfigs = {
      ...configs,
      [selectedChannelId]: {
        ...existing,
        manual_settings: manual,
      },
    }

    const filters =
      (broker.channel_message_filters as Record<string, Record<string, unknown>> | null) ?? {}
    const channelFilters = { ...(filters[selectedChannelId] ?? {}), instructions: instructions.trim() || undefined }

    const [{ error: configError }, { error: brokerError }] = await Promise.all([
      upsertBrokerChannelTradingConfigs(supabase as unknown as SupabaseClientLike, user.id, broker.id, nextConfigs),
      supabase
        .from('broker_accounts')
        .update({
          channel_trading_configs: nextConfigs,
          channel_message_filters: { ...filters, [selectedChannelId]: channelFilters },
        })
        .eq('id', broker.id)
        .eq('user_id', user.id),
    ])

    setSaving(false)
    if (configError || brokerError) {
      setError(configError ?? brokerError?.message ?? 'Save failed')
      return
    }
    router.back()
  }

  if (loading) {
    return (
      <Screen className="items-center justify-center">
        <ActivityIndicator color={tscTheme.primary} size="large" />
      </Screen>
    )
  }

  if (!broker) {
    return (
      <Screen>
        <ErrorText>{error ?? 'Broker not found'}</ErrorText>
        <Button label="Close" variant="secondary" onPress={() => router.back()} />
      </Screen>
    )
  }

  const tabs: Array<{ id: ConfigTab; label: string }> = [
    { id: 'signal_examples', label: 'Signal Examples' },
    { id: 'symbols', label: 'Symbols' },
    { id: 'instructions', label: 'Instructions' },
  ]

  return (
    <Screen className="px-0">
      <View className="border-b border-neutral-200 px-4 pb-3 dark:border-neutral-800">
        <View className="flex-row items-center justify-between">
          <HeadingText>Configure Trading</HeadingText>
          <Pressable onPress={() => router.back()} hitSlop={12} className="rounded-full p-1">
            <X size={22} color="#737373" />
          </Pressable>
        </View>

        <View className="mt-3 rounded-2xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
          <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">{broker.label}</Text>
          <View className="mt-2 flex-row flex-wrap gap-x-3 gap-y-1">
            <MutedText className="text-xs">Login {broker.account_login ?? '—'}</MutedText>
            <Text className={cn('text-xs font-medium', brokerAccountTypeClass(accountType))}>
              {brokerAccountTypeLabel(broker)}
            </Text>
            <MutedText className="text-xs">
              Balance {formatMoney(resolveBrokerTotalBalance(broker) ?? 0, broker.last_currency ?? 'USD')}
            </MutedText>
          </View>
          {selectedChannel ? (
            <View className="mt-2 flex-row items-center gap-2">
              <BrokerBadge label={selectedChannel.display_name ?? 'Channel'} tone="primary" />
              <MutedText className="text-xs">Connected</MutedText>
            </View>
          ) : null}
        </View>
      </View>

      <View className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <MutedText className="mb-2 text-xs font-semibold uppercase tracking-wide">Channels</MutedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          {linkedChannels.length === 0 ? (
            <MutedText>No channels linked to this broker.</MutedText>
          ) : (
            linkedChannels.map(channel => {
              const selected = channel.id === selectedChannelId
              return (
                <Pressable
                  key={channel.id}
                  onPress={() => setSelectedChannelId(channel.id)}
                  className={cn(
                    'rounded-full border px-3 py-1.5',
                    selected
                      ? 'border-teal-600 bg-teal-50 dark:border-teal-500 dark:bg-teal-950/50'
                      : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900',
                  )}
                >
                  <Text
                    className={cn(
                      'text-xs font-medium',
                      selected ? 'text-teal-700 dark:text-teal-400' : 'text-neutral-600 dark:text-neutral-300',
                    )}
                  >
                    {channel.display_name ?? 'Channel'}
                  </Text>
                </Pressable>
              )
            })
          )}
        </ScrollView>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="border-b border-neutral-200 dark:border-neutral-800">
        <View className="flex-row px-4">
          {tabs.map(tab => {
            const active = tab.id === activeTab
            return (
              <Pressable key={tab.id} onPress={() => setActiveTab(tab.id)} className="mr-4 py-3">
                <Text
                  className={cn(
                    'text-sm font-medium',
                    active ? 'text-teal-600 dark:text-teal-400' : 'text-neutral-500 dark:text-neutral-400',
                  )}
                >
                  {tab.label}
                </Text>
                {active ? <View className="mt-1 h-0.5 rounded-full bg-teal-600 dark:bg-teal-400" /> : null}
              </Pressable>
            )
          })}
        </View>
      </ScrollView>

      <ScrollView contentContainerClassName="gap-4 px-4 py-4 pb-28" keyboardShouldPersistTaps="handled">
        {activeTab === 'symbols' ? (
          <Card>
            <HeadingText className="mb-1">Symbol filters</HeadingText>
            <MutedText className="mb-4">Limit which symbols this channel copies on this account.</MutedText>
            <Text className="mb-1 text-sm text-neutral-600 dark:text-neutral-300">Symbols to trade</Text>
            <TextInput
              value={symbolsToTrade}
              onChangeText={setSymbolsToTrade}
              placeholder="e.g. XAUUSD, EURUSD"
              placeholderTextColor="#94a3b8"
              multiline
              className="min-h-[88px] rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            />
            <Text className="mb-1 mt-4 text-sm text-neutral-600 dark:text-neutral-300">Symbols to avoid</Text>
            <TextInput
              value={symbolsToAvoid}
              onChangeText={setSymbolsToAvoid}
              placeholder="e.g. BTCUSD, US30"
              placeholderTextColor="#94a3b8"
              multiline
              className="min-h-[88px] rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            />
          </Card>
        ) : null}

        {activeTab === 'instructions' ? (
          <Card>
            <HeadingText className="mb-1">Channel instructions</HeadingText>
            <MutedText className="mb-4">Extra parsing rules for this Telegram channel on this account.</MutedText>
            <TextInput
              value={instructions}
              onChangeText={setInstructions}
              placeholder="Optional instructions for the copier..."
              placeholderTextColor="#94a3b8"
              multiline
              className="min-h-[140px] rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            />
          </Card>
        ) : null}

        {activeTab === 'signal_examples' ? (
          <Card>
            <HeadingText className="mb-2">Signal examples</HeadingText>
            <MutedText>
              Signal example training is available on the web app. Use Symbols and Instructions here for quick mobile edits.
            </MutedText>
          </Card>
        ) : null}

        <ErrorText>{error}</ErrorText>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-4 dark:border-neutral-800 dark:bg-neutral-950">
        <Button label="Save" loading={saving} onPress={() => void save()} disabled={!selectedChannelId} />
        <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
      </View>
    </Screen>
  )
}
