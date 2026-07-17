import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { X } from 'lucide-react-native'
import type { BrokerAccount, ManualSettings } from '@tscopier/shared'
import {
  type ChannelFilters,
  defaultChannelFiltersForPlan,
  normalizeChannelFilters,
  normalizeChannelMessageFiltersMap,
} from '@tscopier/web-lib/channelMessageFilters'
import { useAuth } from '@/context/AuthContext'
import { useSubscription } from '@/context/SubscriptionContext'
import { Screen, Button, Card, MutedText, HeadingText, ErrorText } from '@/components/ui'
import { BrokerBadge } from '@/components/brokers/BrokerBadge'
import { ConfigureFiltersTab } from '@/components/configure/ConfigureFiltersTab'
import { ConfigureInstructionsTab } from '@/components/configure/ConfigureInstructionsTab'
import { ConfigureManagementTab } from '@/components/configure/ConfigureManagementTab'
import { ConfigureRiskTab } from '@/components/configure/ConfigureRiskTab'
import { ConfigureTargetsTab } from '@/components/configure/ConfigureTargetsTab'
import { TextField } from '@/components/configure/formControls'
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
import {
  DEFAULT_MANUAL_SETTINGS,
  ensurePersistedManualSettings,
} from '@tscopier/web-lib/defaultManualSettings'
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
import {
  canUseFeature,
  normalizeManualSettingsForPlan,
  type SubscriptionPlan,
} from '@tscopier/web-lib/planLimits'
import { cn } from '@/lib/cn'

type SupabaseClientLike = Parameters<typeof fetchBrokerChannelTradingConfigRows>[0]

type ConfigTab =
  | 'risk'
  | 'stops'
  | 'management'
  | 'filters'
  | 'symbols'
  | 'instructions'
  | 'signal_examples'

interface ChannelOption {
  id: string
  display_name: string | null
}

const TABS: Array<{ id: ConfigTab; label: string }> = [
  { id: 'risk', label: 'Risk' },
  { id: 'stops', label: 'Targets' },
  { id: 'management', label: 'Management' },
  { id: 'filters', label: 'Filters' },
  { id: 'symbols', label: 'Symbols' },
  { id: 'instructions', label: 'Instructions' },
  { id: 'signal_examples', label: 'Examples' },
]

function symbolsToInput(value: string | null | undefined): string {
  return value?.trim() ?? ''
}

function symbolsExcludeToInput(value: string[] | null | undefined): string {
  return value?.length ? value.join(', ') : ''
}

function resolvePlan(
  subscriptionPlan: string | null | undefined,
  isAdmin: boolean,
): SubscriptionPlan | null {
  if (isAdmin) return 'advanced'
  if (subscriptionPlan === 'advanced' || subscriptionPlan === 'basic') return subscriptionPlan
  if (subscriptionPlan === 'trial') return 'basic'
  return null
}

export default function BrokerConfigScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const { subscription, isAdmin, hasActiveSubscription } = useSubscription()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [broker, setBroker] = useState<BrokerAccount | null>(null)
  const [channels, setChannels] = useState<ChannelOption[]>([])
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ConfigTab>('risk')
  const [drafts, setDrafts] = useState<Record<string, ManualSettings>>({})
  const [filterDrafts, setFilterDrafts] = useState<Record<string, ChannelFilters>>({})

  const plan = resolvePlan(subscription?.plan, isAdmin)
  const status = hasActiveSubscription || isAdmin ? subscription?.status ?? 'active' : null
  const allowMultiTrade = canUseFeature(plan, status, 'multi_trade_style', subscription?.trial_ends_at)
  const keywordFiltersEnabled = canUseFeature(
    plan,
    status,
    'channel_keyword_filters',
    subscription?.trial_ends_at,
  )

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
    const configs = normalizeChannelTradingConfigsMap(mergedBroker.channel_trading_configs)
    const messageFilters = normalizeChannelMessageFiltersMap(mergedBroker.channel_message_filters)
    const linkedIds = normalizeBrokerChannelIds(mergedBroker)

    const nextDrafts: Record<string, ManualSettings> = {}
    const nextFilters: Record<string, ChannelFilters> = {}
    for (const channelId of linkedIds) {
      const entry = resolveChannelConfigEntry(configs, channelId) ?? buildDefaultChannelTradingConfig()
      nextDrafts[channelId] = ensurePersistedManualSettings({
        ...DEFAULT_MANUAL_SETTINGS,
        ...(entry.manual_settings as ManualSettings),
      })
      nextFilters[channelId] = normalizeChannelFilters(
        messageFilters[channelId] ?? defaultChannelFiltersForPlan(keywordFiltersEnabled),
      )
    }

    setBroker(mergedBroker)
    setChannels(channelRows)
    setDrafts(nextDrafts)
    setFilterDrafts(nextFilters)
    setSelectedChannelId(linkedIds[0] ?? null)
    setLoading(false)
  }, [id, user?.id, keywordFiltersEnabled])

  useEffect(() => {
    void load()
  }, [load])

  const linkedChannels = useMemo(() => {
    if (!broker) return []
    const ids = new Set(normalizeBrokerChannelIds(broker))
    return channels.filter(ch => ids.has(ch.id))
  }, [broker, channels])

  const selectedChannel = linkedChannels.find(ch => ch.id === selectedChannelId) ?? null
  const accountType = broker ? resolveBrokerAccountType(broker) : undefined
  const settings =
    (selectedChannelId ? drafts[selectedChannelId] : null) ??
    ensurePersistedManualSettings(DEFAULT_MANUAL_SETTINGS)
  const channelFilters =
    (selectedChannelId ? filterDrafts[selectedChannelId] : null) ??
    defaultChannelFiltersForPlan(keywordFiltersEnabled)

  const patchSettings = (patch: Partial<ManualSettings>) => {
    if (!selectedChannelId) return
    setDrafts(prev => ({
      ...prev,
      [selectedChannelId]: ensurePersistedManualSettings({
        ...(prev[selectedChannelId] ?? DEFAULT_MANUAL_SETTINGS),
        ...patch,
      }),
    }))
  }

  const setChannelFilters = (next: ChannelFilters) => {
    if (!selectedChannelId) return
    setFilterDrafts(prev => ({ ...prev, [selectedChannelId]: next }))
  }

  const save = async () => {
    if (!user?.id || !broker) return
    const linkedIds = normalizeBrokerChannelIds(broker)
    if (linkedIds.length === 0) {
      setError('Link at least one channel to this broker before saving.')
      return
    }

    for (const channelId of linkedIds) {
      const draft = drafts[channelId] ?? DEFAULT_MANUAL_SETTINGS
      const lot = Number(draft.fixed_lot ?? 0)
      if (!(lot > 0) && draft.risk_mode !== 'dynamic_balance_percent') {
        setError('Each channel needs a fixed lot greater than 0 (or % of balance risk mode).')
        setSelectedChannelId(channelId)
        setActiveTab('risk')
        return
      }
      if (draft.trade_style === 'multi' && !allowMultiTrade) {
        setError('Multi Trades requires an Advanced plan.')
        setSelectedChannelId(channelId)
        setActiveTab('risk')
        return
      }
    }

    setSaving(true)
    setError(null)

    const configs = normalizeChannelTradingConfigsMap(broker.channel_trading_configs)
    const nextConfigs: Record<string, ReturnType<typeof buildDefaultChannelTradingConfig>> = {
      ...configs,
    }
    const nextFilters = normalizeChannelMessageFiltersMap(broker.channel_message_filters)

    for (const channelId of linkedIds) {
      const existing = resolveChannelConfigEntry(configs, channelId) ?? buildDefaultChannelTradingConfig()
      const normalized = normalizeManualSettingsForPlan(
        plan,
        status,
        (drafts[channelId] ?? DEFAULT_MANUAL_SETTINGS) as ManualSettings & Record<string, unknown>,
        subscription?.trial_ends_at,
      ) as ManualSettings
      nextConfigs[channelId] = {
        ...existing,
        manual_settings: ensurePersistedManualSettings(normalized),
      }
      nextFilters[channelId] = keywordFiltersEnabled
        ? filterDrafts[channelId] ?? defaultChannelFiltersForPlan(true)
        : defaultChannelFiltersForPlan(false)
    }

    const fallbackChannelId = selectedChannelId ?? linkedIds[0]
    const fallbackManual =
      (fallbackChannelId ? nextConfigs[fallbackChannelId]?.manual_settings : null) ??
      DEFAULT_MANUAL_SETTINGS

    const [{ error: configError }, { error: brokerError }] = await Promise.all([
      upsertBrokerChannelTradingConfigs(
        supabase as unknown as SupabaseClientLike,
        user.id,
        broker.id,
        nextConfigs,
      ),
      supabase
        .from('broker_accounts')
        .update({
          channel_trading_configs: nextConfigs,
          channel_message_filters: nextFilters,
          manual_settings: fallbackManual,
          copier_mode: 'manual',
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
          <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            {broker.label}
          </Text>
          <View className="mt-2 flex-row flex-wrap gap-x-3 gap-y-1">
            <MutedText className="text-xs">Login {broker.account_login ?? '—'}</MutedText>
            <Text className={cn('text-xs font-medium', brokerAccountTypeClass(accountType))}>
              {brokerAccountTypeLabel(broker)}
            </Text>
            <MutedText className="text-xs">
              Balance{' '}
              {formatMoney(resolveBrokerTotalBalance(broker) ?? 0, broker.last_currency ?? 'USD')}
            </MutedText>
          </View>
          {selectedChannel ? (
            <View className="mt-2 flex-row items-center gap-2">
              <BrokerBadge label={selectedChannel.display_name ?? 'Channel'} tone="primary" />
              <MutedText className="text-xs">Editing this channel</MutedText>
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
                      selected
                        ? 'text-teal-700 dark:text-teal-400'
                        : 'text-neutral-600 dark:text-neutral-300',
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="border-b border-neutral-200 dark:border-neutral-800"
      >
        <View className="flex-row px-4">
          {TABS.map(tab => {
            const active = tab.id === activeTab
            return (
              <Pressable key={tab.id} onPress={() => setActiveTab(tab.id)} className="mr-4 py-3">
                <Text
                  className={cn(
                    'text-sm font-medium',
                    active
                      ? 'text-teal-600 dark:text-teal-400'
                      : 'text-neutral-500 dark:text-neutral-400',
                  )}
                >
                  {tab.label}
                </Text>
                {active ? (
                  <View className="mt-1 h-0.5 rounded-full bg-teal-600 dark:bg-teal-400" />
                ) : null}
              </Pressable>
            )
          })}
        </View>
      </ScrollView>

      <ScrollView
        contentContainerClassName="gap-4 px-4 py-4 pb-32"
        keyboardShouldPersistTaps="handled"
      >
        {!selectedChannelId ? (
          <Card>
            <MutedText>Select a linked channel to configure trading settings.</MutedText>
          </Card>
        ) : (
          <>
            {activeTab === 'risk' ? (
              <ConfigureRiskTab
                settings={settings}
                onChange={patchSettings}
                allowMultiTrade={allowMultiTrade}
              />
            ) : null}
            {activeTab === 'stops' ? (
              <ConfigureTargetsTab settings={settings} onChange={patchSettings} />
            ) : null}
            {activeTab === 'management' ? (
              <ConfigureManagementTab settings={settings} onChange={patchSettings} />
            ) : null}
            {activeTab === 'filters' ? (
              <ConfigureFiltersTab settings={settings} onChange={patchSettings} />
            ) : null}
            {activeTab === 'symbols' ? (
              <Card className="gap-3">
                <HeadingText className="text-base">Symbol filters</HeadingText>
                <MutedText className="text-xs">
                  Limit which symbols this channel copies on this account.
                </MutedText>
                <TextField
                  label="Symbols to trade"
                  value={symbolsToInput(settings.symbol_to_trade)}
                  onChange={raw => {
                    const list = parseSymbolToTradeList(raw)
                    patchSettings({ symbol_to_trade: list.length ? list.join(', ') : null })
                  }}
                  placeholder="e.g. XAUUSD, EURUSD"
                  multiline
                />
                <TextField
                  label="Symbols to avoid"
                  value={symbolsExcludeToInput(settings.symbols_exclude)}
                  onChange={raw => patchSettings({ symbols_exclude: parseSymbolToTradeList(raw) })}
                  placeholder="e.g. BTCUSD, US30"
                  multiline
                />
              </Card>
            ) : null}
            {activeTab === 'instructions' ? (
              <ConfigureInstructionsTab
                filters={channelFilters}
                onChange={setChannelFilters}
                keywordFiltersEnabled={keywordFiltersEnabled}
              />
            ) : null}
            {activeTab === 'signal_examples' ? (
              <Card className="gap-2">
                <HeadingText className="text-base">Signal examples</HeadingText>
                <MutedText>
                  AI signal-example training still runs on the web Configure modal. Risk, Targets,
                  Management, Filters, Symbols, and Instructions are fully editable here.
                </MutedText>
              </Card>
            ) : null}
          </>
        )}

        {error ? <ErrorText>{error}</ErrorText> : null}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-4 dark:border-neutral-800 dark:bg-neutral-950">
        <Button
          label="Save"
          loading={saving}
          onPress={() => void save()}
          disabled={!selectedChannelId}
        />
        <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
      </View>
    </Screen>
  )
}
