import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Radio, RefreshCw, X } from 'lucide-react-native'
import { callTelegramAuth, getSupabaseUrl } from '@tscopier/shared'
import { maxTelegramChannels } from '@tscopier/web-lib/planLimits'
import { prepareChannelSubscriptionUpsert } from '@tscopier/web-lib/signalChannelRegistry'
import { removeStaleDuplicateChannels } from '@tscopier/web-lib/telegramChannelReconcile'
import { useAuth } from '@/context/AuthContext'
import { useSubscription } from '@/context/SubscriptionContext'
import { useTheme } from '@/context/ThemeContext'
import { Button, MutedText } from '@/components/ui'
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

interface AddTelegramChannelModalProps {
  visible: boolean
  onClose: () => void
  /** Called after a channel is successfully added/upserted. */
  onAdded?: (row: TelegramChannelRow) => void
}

export function AddTelegramChannelModal({
  visible,
  onClose,
  onAdded,
}: AddTelegramChannelModalProps) {
  const { user, session } = useAuth()
  const { isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const { subscription, hasActiveSubscription } = useSubscription()

  const [configured, setConfigured] = useState<TelegramChannelRow[]>([])
  const [tgChannels, setTgChannels] = useState<TgChannelListItem[]>([])
  const [tgSearch, setTgSearch] = useState('')
  const [hasTgSession, setHasTgSession] = useState(false)
  const [loadingTg, setLoadingTg] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sessionChecked, setSessionChecked] = useState(false)

  const edgeUrl = `${getSupabaseUrl()}/functions/v1/telegram-auth`
  const channelLimit = maxTelegramChannels(
    subscription?.plan === 'advanced' || subscription?.plan === 'basic'
      ? subscription.plan
      : subscription?.plan === 'trial'
        ? 'basic'
        : null,
  )

  const sheetBg = isDark ? tscTheme.surface.dark : '#ffffff'
  const mutedIcon = isDark ? tscTheme.textMuted.dark : tscTheme.textMuted.light

  const loadSessionAndConfigured = useCallback(async () => {
    if (!user?.id) return false
    const [chRes, sessionRes] = await Promise.all([
      supabase
        .from('telegram_channels')
        .select('id, channel_id, display_name, channel_username, is_active, last_live_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('telegram_sessions').select('id').eq('user_id', user.id).maybeSingle(),
    ])
    setConfigured((chRes.data ?? []) as TelegramChannelRow[])
    const linked = !!sessionRes.data
    setHasTgSession(linked)
    setSessionChecked(true)
    return linked
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
    if (!visible) return
    setError(null)
    setTgSearch('')
    setSessionChecked(false)
    void loadSessionAndConfigured().then(linked => {
      if (!linked) return
      void fetchTgChannels()
    })
  }, [visible, loadSessionAndConfigured, fetchTgChannels])

  const close = () => {
    setTgSearch('')
    setError(null)
    onClose()
  }

  const goLinkTelegram = () => {
    close()
    router.push('/(app)/telegram-link')
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

  const addFromTg = async (ch: TgChannelListItem) => {
    if (!user?.id) return
    setError(null)
    const alreadyLinked = configured.some(row => row.channel_id === ch.id)
    if (
      hasActiveSubscription &&
      !alreadyLinked &&
      channelLimit != null &&
      configured.length >= channelLimit
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
        setConfigured(prev => {
          const exists = prev.find(c => c.channel_id === upserted.channel_id)
          return exists
            ? prev.map(c => (c.channel_id === upserted.channel_id ? upserted : c))
            : [upserted, ...prev]
        })
        onAdded?.(upserted)
      }
    } finally {
      setAddingId(null)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View className="flex-1 justify-end bg-black/40">
        <Pressable className="flex-1" onPress={close} accessibilityLabel="Dismiss" />
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
            {hasTgSession ? (
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
            ) : null}
            <Pressable
              onPress={close}
              className="rounded-lg p-2 active:opacity-70"
              accessibilityLabel="Close"
            >
              <X size={18} color={mutedIcon} />
            </Pressable>
          </View>

          {!sessionChecked ? (
            <View className="items-center py-12">
              <ActivityIndicator color={tscTheme.primary} />
            </View>
          ) : !hasTgSession ? (
            <View className="items-center gap-3 px-4 py-10">
              <Text className="text-center text-base font-semibold text-neutral-900 dark:text-neutral-50">
                Telegram not connected
              </Text>
              <MutedText className="text-center text-sm">
                Connect Telegram to load and add signal channels.
              </MutedText>
              <Button label="Link Telegram" onPress={goLinkTelegram} />
            </View>
          ) : (
            <>
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
                      const alreadyAdded = configured.some(c => c.channel_id === ch.id)
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
            </>
          )}
        </View>
      </View>
    </Modal>
  )
}
