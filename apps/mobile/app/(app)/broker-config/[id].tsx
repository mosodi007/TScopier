import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import {
  Coins,
  Filter,
  Pencil,
  Plus,
  Radio,
  ScrollText,
  Settings2,
  Sparkles,
  Target,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react-native'
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
import { ConfigureSignalExamplesTab } from '@/components/configure/ConfigureSignalExamplesTab'
import { ConfigureTargetsTab } from '@/components/configure/ConfigureTargetsTab'
import { TextField } from '@/components/configure/formControls'
import { AddTelegramChannelModal } from '@/components/channels/AddTelegramChannelModal'
import { useConfigureSectionPager } from '@/components/configure/useConfigureSectionPager'
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
  | 'signal_examples'
  | 'symbols'
  | 'instructions'
  | 'risk'
  | 'stops'
  | 'management'
  | 'filters'

interface ChannelOption {
  id: string
  display_name: string | null
}

const TABS: Array<{ id: ConfigTab; label: string; icon: LucideIcon }> = [
  { id: 'signal_examples', label: 'Signal Examples', icon: Sparkles },
  { id: 'symbols', label: 'Symbols', icon: Coins },
  { id: 'instructions', label: 'Instructions', icon: ScrollText },
  { id: 'risk', label: 'Risk', icon: Wallet },
  { id: 'stops', label: 'Targets', icon: Target },
  { id: 'management', label: 'Management', icon: Settings2 },
  { id: 'filters', label: 'Filters', icon: Filter },
]

const TAB_IDS = TABS.map(tab => tab.id)

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
  const [draftChannelIds, setDraftChannelIds] = useState<string[]>([])
  const [channelLinkEditMode, setChannelLinkEditMode] = useState(false)
  const [addChannelOpen, setAddChannelOpen] = useState(false)
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, ManualSettings>>({})
  const [filterDrafts, setFilterDrafts] = useState<Record<string, ChannelFilters>>({})
  const pager = useConfigureSectionPager(TAB_IDS)

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
    setDraftChannelIds(linkedIds)
    setChannelLinkEditMode(false)
    setDrafts(nextDrafts)
    setFilterDrafts(nextFilters)
    setSelectedChannelId(linkedIds[0] ?? null)
    setLoading(false)
  }, [id, user?.id, keywordFiltersEnabled])

  useEffect(() => {
    void load()
  }, [load])

  const linkedChannels = useMemo(() => {
    const ids = new Set(draftChannelIds)
    return channels.filter(ch => ids.has(ch.id))
  }, [channels, draftChannelIds])

  const selectedChannel = linkedChannels.find(ch => ch.id === selectedChannelId) ?? null
  const accountType = broker ? resolveBrokerAccountType(broker) : undefined
  const settings =
    (selectedChannelId ? drafts[selectedChannelId] : null) ??
    ensurePersistedManualSettings(DEFAULT_MANUAL_SETTINGS)
  const channelFilters =
    (selectedChannelId ? filterDrafts[selectedChannelId] : null) ??
    defaultChannelFiltersForPlan(keywordFiltersEnabled)

  const ensureChannelDrafts = (channelId: string) => {
    setDrafts(prev => {
      if (prev[channelId]) return prev
      return {
        ...prev,
        [channelId]: ensurePersistedManualSettings(DEFAULT_MANUAL_SETTINGS),
      }
    })
    setFilterDrafts(prev => {
      if (prev[channelId]) return prev
      return {
        ...prev,
        [channelId]: defaultChannelFiltersForPlan(keywordFiltersEnabled),
      }
    })
  }

  const toggleDraftChannel = (channelId: string) => {
    const linked = draftChannelIds.includes(channelId)
    const next = linked
      ? draftChannelIds.filter(id => id !== channelId)
      : [...draftChannelIds, channelId]

    if (!linked) ensureChannelDrafts(channelId)

    setDraftChannelIds(next)
    if (!linked && !selectedChannelId) setSelectedChannelId(channelId)
    if (linked && selectedChannelId === channelId) setSelectedChannelId(next[0] ?? null)
  }

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

  const selectChannel = (channelId: string) => {
    setSelectedChannelId(channelId)
    pager.resetTo('signal_examples')
  }

  const save = async () => {
    if (!user?.id || !broker) return
    const linkedIds = draftChannelIds
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
        pager.scrollToSection('risk')
        return
      }
      if (draft.trade_style === 'multi' && !allowMultiTrade) {
        setError('Multi Trades requires an Advanced plan.')
        setSelectedChannelId(channelId)
        pager.scrollToSection('risk')
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
          signal_channel_ids: linkedIds,
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

      <View className="border-b border-neutral-100 bg-neutral-50 px-2 py-2 dark:border-neutral-800 dark:bg-neutral-900/60">
        <View className="mb-2 flex-row items-center justify-between px-2">
          <MutedText className="text-xs font-semibold uppercase tracking-wide">Channels</MutedText>
          <View className="flex-row items-center gap-1">
            <Pressable
              onPress={() => setAddChannelOpen(true)}
              hitSlop={8}
              className="h-8 flex-row items-center gap-1 rounded-md px-2 active:bg-neutral-100 dark:active:bg-neutral-800"
              accessibilityLabel="Add channel"
            >
              <Plus size={14} color="#a3a3a3" />
              <Text className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Add Channel</Text>
            </Pressable>
            {channels.length > 0 ? (
              <Pressable
                onPress={() => setChannelLinkEditMode(v => !v)}
                hitSlop={8}
                className={cn(
                  'h-8 flex-row items-center gap-1 rounded-md px-2',
                  channelLinkEditMode
                    ? 'bg-teal-100 dark:bg-teal-950/60'
                    : 'active:bg-neutral-100 dark:active:bg-neutral-800',
                )}
                accessibilityLabel={
                  channelLinkEditMode ? 'Done editing channels' : 'Edit linked channels'
                }
                accessibilityState={{ selected: channelLinkEditMode }}
              >
                <Pencil
                  size={14}
                  color={channelLinkEditMode ? tscTheme.primary : '#a3a3a3'}
                />
                <Text
                  className={cn(
                    'text-xs font-medium',
                    channelLinkEditMode
                      ? 'text-teal-700 dark:text-teal-300'
                      : 'text-neutral-500 dark:text-neutral-400',
                  )}
                >
                  {channelLinkEditMode ? 'Done' : 'Edit'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-1">
          {channels.length === 0 ? (
            <MutedText className="px-2 py-2">No channels connected. Tap + to add one.</MutedText>
          ) : channelLinkEditMode ? (
            channels.map(channel => {
              const linked = draftChannelIds.includes(channel.id)
              const selected = channel.id === selectedChannelId
              return (
                <View key={channel.id} className="flex-row items-center gap-1">
                  <Pressable
                    onPress={() => toggleDraftChannel(channel.id)}
                    hitSlop={6}
                    className="h-8 w-8 items-center justify-center rounded-md border border-neutral-200 dark:border-neutral-700"
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: linked }}
                    accessibilityLabel={linked ? 'Unlink channel' : 'Link channel'}
                  >
                    <Text className="text-sm font-semibold text-teal-700 dark:text-teal-300">
                      {linked ? '✓' : ''}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      if (!linked) toggleDraftChannel(channel.id)
                      else selectChannel(channel.id)
                    }}
                    className={cn(
                      'min-h-[44px] min-w-[160px] max-w-[220px] flex-row items-center gap-2 rounded-lg border px-2.5 py-2',
                      selected
                        ? 'border-teal-100 bg-white shadow-sm dark:border-teal-900/50 dark:bg-neutral-900'
                        : linked
                          ? 'border-transparent bg-transparent'
                          : 'border-dashed border-neutral-200 dark:border-neutral-700',
                    )}
                  >
                    <Radio
                      size={16}
                      color={selected ? tscTheme.primary : linked ? '#a3a3a3' : '#d4d4d4'}
                    />
                    <Text
                      numberOfLines={1}
                      className={cn(
                        'min-w-0 flex-1 text-sm',
                        selected
                          ? 'font-medium text-teal-700 dark:text-teal-300'
                          : 'text-neutral-700 dark:text-neutral-300',
                      )}
                    >
                      {channel.display_name ?? 'Channel'}
                    </Text>
                  </Pressable>
                </View>
              )
            })
          ) : linkedChannels.length === 0 ? (
            <MutedText className="px-2 py-2">No channels linked. Tap the pencil to link channels.</MutedText>
          ) : (
            linkedChannels.map(channel => {
              const selected = channel.id === selectedChannelId
              const radioColor = selected ? tscTheme.primary : '#a3a3a3'
              return (
                <Pressable
                  key={channel.id}
                  onPress={() => selectChannel(channel.id)}
                  className={cn(
                    'min-h-[44px] min-w-[160px] max-w-[220px] flex-row items-center gap-2 rounded-lg border px-2.5 py-2',
                    selected
                      ? 'border-teal-100 bg-white shadow-sm dark:border-teal-900/50 dark:bg-neutral-900'
                      : 'border-transparent bg-transparent',
                  )}
                >
                  <Radio size={16} color={radioColor} />
                  <Text
                    numberOfLines={1}
                    className={cn(
                      'min-w-0 flex-1 text-sm',
                      selected
                        ? 'font-medium text-teal-700 dark:text-teal-300'
                        : 'text-neutral-700 dark:text-neutral-300',
                    )}
                  >
                    {channel.display_name ?? 'Channel'}
                  </Text>
                  <BrokerBadge label="Connected" tone={selected ? 'primary' : 'neutral'} />
                </Pressable>
              )
            })
          )}
        </ScrollView>
        {channelLinkEditMode ? (
          <MutedText className="mt-1 px-2 text-xs">
            {draftChannelIds.length} channel{draftChannelIds.length === 1 ? '' : 's'} selected
          </MutedText>
        ) : null}
      </View>

      {selectedChannelId ? (
        <View className="border-b border-neutral-100 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <ScrollView
            ref={pager.tabScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="flex-row items-stretch px-2"
          >
            {TABS.map(tab => {
              const active = tab.id === pager.activeId
              const Icon = tab.icon
              const iconColor = active ? tscTheme.primary : '#a3a3a3'
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => pager.scrollToSection(tab.id)}
                  onLayout={e => pager.onTabLayout(tab.id, e.nativeEvent.layout.x)}
                  className={cn(
                    'h-12 flex-row items-center gap-1.5 border-b-2 px-3',
                    active ? 'border-teal-600' : 'border-transparent',
                  )}
                >
                  <Icon size={14} color={iconColor} />
                  <Text
                    className={cn(
                      'text-sm',
                      active
                        ? 'font-medium text-teal-700 dark:text-teal-400'
                        : 'text-neutral-500 dark:text-neutral-400',
                    )}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>
        </View>
      ) : null}

      <ScrollView
        ref={pager.scrollRef}
        className="flex-1"
        contentContainerClassName="px-4 py-4 pb-32"
        keyboardShouldPersistTaps="handled"
        onScroll={pager.onBodyScroll}
        scrollEventThrottle={16}
      >
        {!selectedChannelId ? (
          <Card>
            <MutedText>Select a linked channel to configure trading settings.</MutedText>
          </Card>
        ) : (
          <>
            <View
              collapsable={false}
              className="mb-8"
              onLayout={e => pager.onSectionLayout('signal_examples', e.nativeEvent.layout.y)}
            >
              <HeadingText className="mb-3 text-base">Signal Examples</HeadingText>
              {user?.id ? (
                <ConfigureSignalExamplesTab channelId={selectedChannelId} userId={user.id} />
              ) : null}
            </View>

            <View
              collapsable={false}
              className="mb-8"
              onLayout={e => pager.onSectionLayout('symbols', e.nativeEvent.layout.y)}
            >
              <HeadingText className="mb-3 text-base">Symbols</HeadingText>
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
            </View>

            <View
              collapsable={false}
              className="mb-8"
              onLayout={e => pager.onSectionLayout('instructions', e.nativeEvent.layout.y)}
            >
              <HeadingText className="mb-3 text-base">Instructions</HeadingText>
              <ConfigureInstructionsTab
                filters={channelFilters}
                onChange={setChannelFilters}
                keywordFiltersEnabled={keywordFiltersEnabled}
              />
            </View>

            <View
              collapsable={false}
              className="mb-8"
              onLayout={e => pager.onSectionLayout('risk', e.nativeEvent.layout.y)}
            >
              <HeadingText className="mb-3 text-base">Risk</HeadingText>
              <ConfigureRiskTab
                settings={settings}
                onChange={patchSettings}
                allowMultiTrade={allowMultiTrade}
                accountBalance={resolveBrokerTotalBalance(broker)}
                currency={broker.last_currency}
              />
            </View>

            <View
              collapsable={false}
              className="mb-8"
              onLayout={e => pager.onSectionLayout('stops', e.nativeEvent.layout.y)}
            >
              <HeadingText className="mb-3 text-base">Targets</HeadingText>
              <ConfigureTargetsTab settings={settings} onChange={patchSettings} />
            </View>

            <View
              collapsable={false}
              className="mb-8"
              onLayout={e => pager.onSectionLayout('management', e.nativeEvent.layout.y)}
            >
              <HeadingText className="mb-3 text-base">Management</HeadingText>
              <ConfigureManagementTab settings={settings} onChange={patchSettings} />
            </View>

            <View
              collapsable={false}
              className="mb-8"
              onLayout={e => pager.onSectionLayout('filters', e.nativeEvent.layout.y)}
            >
              <HeadingText className="mb-3 text-base">Filters</HeadingText>
              <ConfigureFiltersTab settings={settings} onChange={patchSettings} />
            </View>
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

      <AddTelegramChannelModal
        visible={addChannelOpen}
        onClose={() => setAddChannelOpen(false)}
        onAdded={row => {
          setChannels(prev => {
            if (prev.some(c => c.id === row.id)) {
              return prev.map(c =>
                c.id === row.id ? { id: row.id, display_name: row.display_name } : c,
              )
            }
            return [{ id: row.id, display_name: row.display_name }, ...prev]
          })
          // Newly added channels are available to link; enter edit mode so the user can select them.
          setChannelLinkEditMode(true)
          if (!draftChannelIds.includes(row.id)) {
            ensureChannelDrafts(row.id)
            setDraftChannelIds(prev => [...prev, row.id])
            if (!selectedChannelId) setSelectedChannelId(row.id)
          }
        }}
      />
    </Screen>
  )
}
