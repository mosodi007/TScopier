import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Radio, RefreshCw, X } from 'lucide-react-native'
import { callTelegramAuth, getSupabaseUrl, whenRealtimeReady } from '@tscopier/shared'
import { maxTelegramChannels } from '@tscopier/web-lib/planLimits'
import { prepareChannelSubscriptionUpsert } from '@tscopier/web-lib/signalChannelRegistry'
import { removeStaleDuplicateChannels } from '@tscopier/web-lib/telegramChannelReconcile'
import { useAuth } from '@/context/AuthContext'
import { useSubscription } from '@/context/SubscriptionContext'
import { useTheme } from '@/context/ThemeContext'
import { BrokerBadge } from '@/components/brokers/BrokerBadge'
import { FloatingActionButton } from '@/components/layout/FloatingActionButton'
import { Button, Card, MutedText } from '@/components/ui'
import {
  getCachedTgChannels,
  invalidateTgChannelsCache,
  setCachedTgChannels,
  type TgChannelListItem,
} from '@/lib/tgChannelsCache'
import { supabase } from '@/lib/supabase'
import { tscTheme } from '@/lib/tscTheme'

export interface TelegramChannelRow {
  id: string
  channel_id: string
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
  const { user, session } = useAuth()
  const { isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const { subscription, hasActiveSubscription } = useSubscription()
  const [channels, setChannels] = useState<TelegramChannelRow[]>([])
  const [tgChannels, setTgChannels] = useState<TgChannelListItem[]>([])
  const [tgSearch, setTgSearch] = useState('')
  const [hasTgSession, setHasTgSession] = useState(false)
  const [listenerLive, setListenerLive] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingTg, setLoadingTg] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const edgeUrl = `${getSupabaseUrl()}/functions/v1/telegram-auth`
  const channelLimit = maxTelegramChannels(
    subscription?.plan === 'advanced' || subscription?.plan === 'basic'
      ? subscription.plan
      : subscription?.plan === 'trial'
        ? 'basic'
        : null,
  )

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

  const fetchTgChannels = useCallback(
    async (opts?: { force?: boolean }) => {
      if (!user?.id || !session?.access_token) return
      if (!opts?.force) {
        const cached = getCachedTgChannels(user.id)
        if (cached) {
          setTgChannels(cached)
          return
        }
      }

      setLoadingTg(true)
      setError(null)
      try {
        const { ok, status, data } = await callTelegramAuth<{
          channels?: TgChannelListItem[]
          error?: string
          code?: string
        }>(edgeUrl, session.access_token, 'list_channels', {})

        if (data.code === 'TELEGRAM_SESSION_INVALID' || status === 401) {
          setHasTgSession(false)
          setTgChannels([])
          invalidateTgChannelsCache(user.id)
          setError(
            typeof data.error === 'string'
              ? data.error
              : 'Telegram session expired. Link Telegram again.',
          )
          return
        }

        if (!ok || data.error) {
          setError(typeof data.error === 'string' ? data.error : 'Could not load Telegram channels')
          return
        }

        const list = (data.channels ?? []) as TgChannelListItem[]
        setTgChannels(list)
        setCachedTgChannels(user.id, list)
        setError(null)
      } catch {
        setError('Could not load Telegram channels')
      } finally {
        setLoadingTg(false)
      }
    },
    [edgeUrl, session?.access_token, user?.id],
  )

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
                setTgChannels([])
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

  useEffect(() => {
    if (!pickerOpen || !hasTgSession) return
    void fetchTgChannels()
  }, [pickerOpen, hasTgSession, fetchTgChannels])

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
    setError(null)
    setTgSearch('')
    setPickerOpen(true)
  }, [hasTgSession])

  const closePicker = () => {
    setPickerOpen(false)
    setTgSearch('')
  }

  const filteredTgChannels = useMemo(() => {
    const q = tgSearch.trim().toLowerCase()
    if (!q) return tgChannels
    return tgChannels.filter(ch => {
      const title = (ch.title ?? '').toLowerCase()
      const username = (ch.username ?? '').toLowerCase().replace(/^@/, '')
      return title.includes(q) || username.includes(q) || `@${username}`.includes(q)
    })
  }, [tgChannels, tgSearch])

  const toggleChannel = async (id: string, isActive: boolean) => {
    setTogglingId(id)
    setChannels(prev => prev.map(c => (c.id === id ? { ...c, is_active: isActive } : c)))
    await supabase.from('telegram_channels').update({ is_active: isActive }).eq('id', id)
    setTogglingId(null)
  }

  const addFromTg = async (ch: TgChannelListItem) => {
    if (!user?.id) return
    setError(null)
    const alreadyLinked = channels.some(row => row.channel_id === ch.id)
    if (
      hasActiveSubscription &&
      !alreadyLinked &&
      channelLimit != null &&
      channels.length >= channelLimit
    ) {
      setError(`Your plan allows up to ${channelLimit} Telegram channels.`)
      return
    }

    setAddingId(ch.id)
    try {
      await removeStaleDuplicateChannels(supabase as never, user.id, { id: ch.id, title: ch.title })
      const prepared = await prepareChannelSubscriptionUpsert(supabase as never, {
        userId: user.id,
        telegramChatId: ch.id,
        channelUsername: ch.username,
        displayName: ch.title,
      })
      if (prepared.error) {
        setError(prepared.error)
        return
      }
      const { data, error: dbErr } = await supabase
        .from('telegram_channels')
        .upsert(prepared.row, { onConflict: 'user_id,channel_id' })
        .select('id, channel_id, display_name, channel_username, is_active, last_live_at')
        .single()
      if (dbErr) {
        setError(dbErr.message)
        return
      }
      if (data) {
        const upserted = data as TelegramChannelRow
        setChannels(prev => {
          const exists = prev.find(c => c.channel_id === upserted.channel_id)
          return exists
            ? prev.map(c => (c.channel_id === upserted.channel_id ? upserted : c))
            : [upserted, ...prev]
        })
      }
    } finally {
      setAddingId(null)
    }
  }

  const sheetBg = isDark ? tscTheme.surface.dark : '#ffffff'
  const mutedIcon = isDark ? tscTheme.textMuted.dark : tscTheme.textMuted.light

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

      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={closePicker}>
        <View className="flex-1 justify-end bg-black/40">
          <Pressable className="flex-1" onPress={closePicker} accessibilityLabel="Dismiss" />
          <View
            className="max-h-[88%] overflow-hidden rounded-t-3xl"
            style={{
              backgroundColor: sheetBg,
              paddingBottom: Math.max(insets.bottom, 12),
            }}
          >
            <View className="items-center pt-2 pb-1">
              <View className="h-1 w-10 rounded-full bg-neutral-300 dark:bg-neutral-600" />
            </View>

            <View className="flex-row items-center gap-3 border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
              <View className="h-9 w-9 items-center justify-center rounded-xl border border-neutral-100 bg-[#229ED9]/15 dark:border-neutral-700">
                <Radio size={18} color="#229ED9" />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                  Your Telegram channels
                </Text>
                <MutedText className="text-xs">Add channels to start copying signals</MutedText>
              </View>
              <Pressable
                onPress={() => void fetchTgChannels({ force: true })}
                disabled={loadingTg}
                className="rounded-lg p-2 active:opacity-70"
                accessibilityLabel="Refresh Telegram channels"
              >
                {loadingTg ? (
                  <ActivityIndicator size="small" color={tscTheme.primary} />
                ) : (
                  <RefreshCw size={16} color={mutedIcon} />
                )}
              </Pressable>
              <Pressable
                onPress={closePicker}
                className="rounded-lg p-2 active:opacity-70"
                accessibilityLabel="Close"
              >
                <X size={18} color={mutedIcon} />
              </Pressable>
            </View>

            {tgChannels.length > 0 ? (
              <View className="border-b border-neutral-100 px-4 py-2 dark:border-neutral-800">
                <TextInput
                  value={tgSearch}
                  onChangeText={setTgSearch}
                  placeholder="Search channels…"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300"
                />
              </View>
            ) : null}

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerClassName="pb-4"
            >
              {error ? (
                <View className="gap-2 px-4 py-6">
                  <Text className="text-center text-sm text-red-600 dark:text-red-400">{error}</Text>
                  <Button
                    label="Retry"
                    variant="secondary"
                    onPress={() => void fetchTgChannels({ force: true })}
                  />
                </View>
              ) : loadingTg && tgChannels.length === 0 ? (
                <View className="items-center py-12">
                  <ActivityIndicator color={tscTheme.primary} />
                  <MutedText className="mt-2 text-xs">Loading channels from Telegram…</MutedText>
                </View>
              ) : tgChannels.length === 0 ? (
                <View className="items-center px-4 py-10">
                  <Radio size={28} color={tscTheme.textMuted.light} />
                  <Text className="mt-2 text-sm text-neutral-400">No Telegram channels found</Text>
                  <MutedText className="mt-1 text-center text-xs">
                    Join signal channels in Telegram, then refresh.
                  </MutedText>
                </View>
              ) : filteredTgChannels.length === 0 ? (
                <View className="items-center px-4 py-10">
                  <Text className="text-sm text-neutral-400">No channels match your search</Text>
                </View>
              ) : (
                <View className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {filteredTgChannels.map(ch => {
                    const alreadyAdded = channels.some(c => c.channel_id === ch.id)
                    const username = ch.username?.replace(/^@/, '')
                    const busy = addingId === ch.id
                    return (
                      <View key={ch.id} className="flex-row items-center gap-3 px-4 py-3">
                        <View className="h-8 w-8 items-center justify-center rounded-lg bg-teal-50 dark:bg-teal-950/60">
                          <Radio size={14} color={tscTheme.primary} />
                        </View>
                        <View className="min-w-0 flex-1">
                          <Text
                            className="text-sm font-medium text-neutral-900 dark:text-neutral-50"
                            numberOfLines={1}
                          >
                            {ch.title || 'Untitled'}
                          </Text>
                          {username ? <MutedText className="text-xs">@{username}</MutedText> : null}
                        </View>
                        {ch.members_count > 0 ? (
                          <MutedText className="text-xs">{ch.members_count.toLocaleString()}</MutedText>
                        ) : null}
                        <Pressable
                          disabled={alreadyAdded || busy}
                          onPress={() => void addFromTg(ch)}
                          className={`rounded-lg border px-3 py-1.5 ${
                            alreadyAdded
                              ? 'border-neutral-200 dark:border-neutral-800'
                              : 'border-teal-500'
                          }`}
                        >
                          {busy ? (
                            <ActivityIndicator size="small" color={tscTheme.primary} />
                          ) : (
                            <Text
                              className={`text-xs font-medium ${
                                alreadyAdded
                                  ? 'text-neutral-400'
                                  : 'text-teal-600 dark:text-teal-400'
                              }`}
                            >
                              {alreadyAdded ? 'Added' : 'Add'}
                            </Text>
                          )}
                        </Pressable>
                      </View>
                    )
                  })}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <FloatingActionButton
        accessibilityLabel="Add channel from Telegram"
        onPress={openPicker}
        disabled={loading}
      />
    </View>
  )
}
