import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { ArrowDownRight, ArrowUpRight, Minus, Radio, X } from 'lucide-react-native'
import type { MtTrade } from '@/lib/mtTrade'
import {
  formatTradeLots,
  formatTradePrice,
  getTradeDisplayMeta,
} from '@/lib/tradeDisplay'
import {
  formatSignalInstructions,
  resolveTradeSignalContext,
  type TradeSignalContext,
} from '@/lib/tradeSignalLink'
import { cn } from '@/lib/cn'
import { pnlTextClass } from '@/components/ui'
import { useTheme } from '@/context/ThemeContext'
import { tscTheme } from '@/lib/tscTheme'

interface TradeDetailModalProps {
  trade: MtTrade | null
  userId: string | undefined
  visible: boolean
  onClose: () => void
}

export function TradeDetailModal({ trade, userId, visible, onClose }: TradeDetailModalProps) {
  const { isDark } = useTheme()
  const iconMuted = isDark ? tscTheme.textMuted.dark : tscTheme.textMuted.light
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [context, setContext] = useState<TradeSignalContext | null | undefined>(undefined)

  useEffect(() => {
    if (!visible || !trade) {
      setContext(undefined)
      setLoadError('')
      setLoading(false)
      return
    }
    if (!userId) {
      setContext(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setLoadError('')
    setContext(undefined)

    void (async () => {
      try {
        const result = await resolveTradeSignalContext(userId, trade)
        if (!cancelled) setContext(result)
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Could not load signal details.')
          setContext(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [trade, userId, visible])

  const display = useMemo(() => (trade ? getTradeDisplayMeta(trade) : null), [trade])

  const instructionLines = useMemo(() => {
    if (!context?.signal) return []
    return formatSignalInstructions(context.signal.parsed_data, context.signal.raw_message, {
      action: 'Action',
      symbol: 'Symbol',
      entry: 'Entry',
      entryZone: 'Entry zone',
      sl: 'Stop loss',
      tp: 'Take profit',
      lotSize: 'Lot size',
      message: 'Instruction',
    })
  }, [context?.signal])

  if (!trade || !display) return null

  const channelLabel = (() => {
    const ch = context?.channel
    if (!ch) return null
    const name = ch.display_name?.trim()
    const username = ch.channel_username?.trim().replace(/^@/, '')
    if (name && username) return `${name} (@${username})`
    if (name) return name
    if (username) return `@${username}`
    return null
  })()

  const rawMessage = context?.signal.raw_message?.trim()
  const messageBody = rawMessage || (context?.signal.raw_image_url ? '(image signal)' : '')
  const dirColor = display.isBuy
    ? tscTheme.primary
    : display.isSell
      ? '#dc2626'
      : iconMuted

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/55">
        <Pressable className="absolute inset-0" onPress={onClose} accessibilityLabel="Close" />
        <View className="max-h-[92%] rounded-t-3xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <View className="flex-row items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
            <View className="min-w-0 flex-1">
              <Text
                className="text-lg font-semibold text-neutral-900 dark:text-neutral-50"
                numberOfLines={1}
              >
                {trade.symbol || '—'}
              </Text>
              <Text className="text-xs tabular-nums text-neutral-400">#{trade.ticket}</Text>
            </View>
            <Pressable
              onPress={onClose}
              className="rounded-lg p-2 active:bg-neutral-100 dark:active:bg-neutral-800"
              accessibilityLabel="Close"
            >
              <X size={20} color={iconMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerClassName="gap-5 p-5 pb-10" showsVerticalScrollIndicator={false}>
            <View className="gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
              <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Trade
              </Text>
              <View className="flex-row flex-wrap items-center gap-2">
                <View
                  className={cn(
                    'rounded-full px-2 py-0.5',
                    display.status.variant === 'open'
                      ? 'bg-teal-100 dark:bg-teal-900/50'
                      : 'bg-neutral-100 dark:bg-neutral-800',
                  )}
                >
                  <Text
                    className={cn(
                      'text-[11px] font-semibold uppercase tracking-wide',
                      display.status.variant === 'open'
                        ? 'text-teal-800 dark:text-teal-200'
                        : 'text-neutral-600 dark:text-neutral-300',
                    )}
                  >
                    {display.status.label}
                  </Text>
                </View>
                <View className="flex-row items-center gap-1">
                  {display.isBuy ? (
                    <ArrowUpRight size={14} color={dirColor} />
                  ) : display.isSell ? (
                    <ArrowDownRight size={14} color={dirColor} />
                  ) : (
                    <Minus size={14} color={dirColor} />
                  )}
                  <Text
                    className={cn(
                      'text-sm font-medium',
                      display.isBuy && 'text-teal-600 dark:text-teal-400',
                      display.isSell && 'text-red-600 dark:text-red-400',
                      !display.isBuy && !display.isSell && 'text-neutral-500',
                    )}
                  >
                    {display.directionLabel}
                  </Text>
                </View>
                <Text
                  className={cn(
                    'ml-auto text-sm font-semibold tabular-nums',
                    pnlTextClass(display.profit),
                  )}
                >
                  {display.profit == null
                    ? '—'
                    : `${display.profit > 0 ? '+' : ''}${display.profit.toFixed(2)}`}
                </Text>
              </View>

              <View className="flex-row flex-wrap gap-x-4 gap-y-2">
                <DetailCell label="Broker" value={display.broker} />
                <DetailCell label="Lots" value={formatTradeLots(trade.lot_size)} />
                <DetailCell label="Entry" value={formatTradePrice(trade.entry_price)} />
                <DetailCell label="Date & Time" value={display.timeLabel} />
                <DetailCell label="SL" value={formatTradePrice(trade.sl)} />
                <DetailCell label="TP" value={formatTradePrice(trade.tp)} />
              </View>
            </View>

            {loading ? (
              <View className="flex-row items-center gap-2 py-4">
                <ActivityIndicator color={tscTheme.primary} size="small" />
                <Text className="text-sm text-neutral-500">Loading signal…</Text>
              </View>
            ) : loadError ? (
              <Text className="text-sm text-red-600 dark:text-red-400">{loadError}</Text>
            ) : !context ? (
              <View className="rounded-xl bg-neutral-50 px-4 py-3 dark:bg-neutral-800/40">
                <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                  No linked TScopier signal for this trade.
                </Text>
              </View>
            ) : (
              <>
                <View className="gap-2 rounded-xl border border-teal-200/80 bg-teal-50/40 p-4 dark:border-teal-900/60 dark:bg-teal-950/20">
                  <View className="flex-row items-center gap-2">
                    <Radio size={16} color={tscTheme.primary} />
                    <Text className="text-xs font-semibold uppercase tracking-wide text-teal-800 dark:text-teal-300">
                      Signal channel
                    </Text>
                  </View>
                  <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    {channelLabel ?? '—'}
                  </Text>
                  <Text className="text-xs tabular-nums text-neutral-500">
                    Signal received:{' '}
                    {new Date(context.signal.created_at).toLocaleString([], {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>

                {messageBody ? (
                  <View className="gap-2">
                    <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Telegram message
                    </Text>
                    <Text className="rounded-xl border border-neutral-200 bg-neutral-50/80 px-4 py-3 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-800/30 dark:text-neutral-300">
                      {messageBody}
                    </Text>
                    {context.signal.raw_image_url ? (
                      <Pressable
                        onPress={() => void Linking.openURL(context.signal.raw_image_url!)}
                      >
                        <Text className="text-xs text-teal-600 dark:text-teal-400" numberOfLines={1}>
                          {context.signal.raw_image_url}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}

                {instructionLines.length > 0 ? (
                  <View className="gap-2">
                    <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Parsed instruction
                    </Text>
                    <View className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
                      {instructionLines.map((line, index) => (
                        <View
                          key={line.label}
                          className={cn(
                            'flex-row justify-between gap-3 px-4 py-2.5',
                            index > 0 && 'border-t border-neutral-100 dark:border-neutral-800',
                          )}
                        >
                          <Text className="shrink-0 text-sm text-neutral-500">{line.label}</Text>
                          <Text className="flex-1 text-right text-sm font-medium tabular-nums text-neutral-800 dark:text-neutral-200">
                            {line.value}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <View className="w-[45%] min-w-[40%]">
      <Text className="text-[10px] uppercase tracking-wide text-neutral-400">{label}</Text>
      <Text
        className="mt-0.5 text-xs tabular-nums text-neutral-700 dark:text-neutral-300"
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  )
}
