import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Crosshair,
  History,
  Radio,
  RefreshCw,
} from 'lucide-react-native'
import { router } from 'expo-router'
import { useAuth } from '@/context/AuthContext'
import { useSubscription } from '@/context/SubscriptionContext'
import { useTheme } from '@/context/ThemeContext'
import { useBacktestFlow } from '@/hooks/useBacktestFlow'
import { BacktestHistoryModal } from '@/components/backtest/BacktestHistoryModal'
import { BacktestTradeDetailModal } from '@/components/backtest/BacktestTradeDetailModal'
import { BacktestTradeRowCard } from '@/components/backtest/BacktestTradeRowCard'
import { StackScreen } from '@/components/layout/StackScreen'
import { BodyText, Button, Card, MutedText, pnlTextClass } from '@/components/ui'
import type { BacktestTradeRow } from '@/lib/backtestTypes'
import { formatPipValue } from '@/lib/backtestDisplay'
import { cn } from '@/lib/cn'
import { tscTheme } from '@/lib/tscTheme'

function ProgressBar({ pct }: { pct: number }) {
  const width = Math.min(100, Math.max(pct, 4))
  return (
    <View className="h-2 overflow-hidden rounded-full bg-teal-100 dark:bg-teal-900">
      <View className="h-full rounded-full bg-teal-500" style={{ width: `${width}%` }} />
    </View>
  )
}

function StatTile({
  label,
  value,
  valueClassName,
  wide,
}: {
  label: string
  value: string
  valueClassName?: string
  wide?: boolean
}) {
  return (
    <View
      className={cn(
        'rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900',
        wide ? 'w-full' : 'w-[48%]',
      )}
    >
      <Text className="text-[10px] font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </Text>
      <Text
        className={cn(
          'mt-1 text-2xl font-bold tabular-nums text-neutral-900 dark:text-neutral-50',
          valueClassName,
        )}
      >
        {value}
      </Text>
    </View>
  )
}

export default function BacktestScreen() {
  const { user } = useAuth()
  const { isDark } = useTheme()
  const {
    hasActiveSubscription,
    isAdmin,
    loading: subscriptionLoading,
  } = useSubscription()
  const hasBacktestAccess = isAdmin || hasActiveSubscription
  const iconMuted = isDark ? tscTheme.textMuted.dark : tscTheme.textMuted.light

  const flow = useBacktestFlow(user?.id, { hasBacktestAccess, isAdmin })
  const [historyOpen, setHistoryOpen] = useState(false)
  const [selectedTrade, setSelectedTrade] = useState<BacktestTradeRow | null>(null)

  const signalListLabel = useMemo(() => {
    const n = flow.trades.length
    return n === 1 ? '1 signal' : `${n} signals`
  }, [flow.trades.length])

  return (
    <StackScreen title="Backtest">
      <View className="mb-3 flex-row items-center justify-end">
        <Pressable
          onPress={() => setHistoryOpen(true)}
          disabled={(flow.isBusy && !historyOpen) || flow.loadingHistoryRun}
          className={cn(
            'flex-row items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-800',
            ((flow.isBusy && !historyOpen) || flow.loadingHistoryRun) && 'opacity-50',
          )}
        >
          {flow.loadingHistoryRun ? (
            <ActivityIndicator size="small" color={iconMuted} />
          ) : (
            <History size={16} color={iconMuted} />
          )}
          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            History
          </Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 pb-8"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!subscriptionLoading && !hasBacktestAccess ? (
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
            <Text className="text-sm font-medium text-amber-900 dark:text-amber-200">
              An active subscription is required to run backtests.
            </Text>
            <Button
              label="View billing"
              className="mt-3"
              variant="secondary"
              onPress={() => router.push('/(app)/billing')}
            />
          </Card>
        ) : null}

        {flow.error ? (
          <View className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950/30">
            <Text className="text-sm text-red-700 dark:text-red-300">{flow.error}</Text>
          </View>
        ) : null}

        {flow.activeRun?.status === 'failed' && flow.activeRun.error_message ? (
          <View className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950/30">
            <Text className="text-sm text-red-700 dark:text-red-300">
              {flow.activeRun.error_message}
            </Text>
          </View>
        ) : null}

        {flow.step === 'configure' ? (
          <Card className="gap-5">
            <MutedText className="text-sm">
              Choose a channel and date range, then pull signals to profile symbols.
            </MutedText>

            <View>
              <View className="mb-2 flex-row items-center gap-1.5">
                <Radio size={14} color={iconMuted} />
                <Text className="text-xs font-medium text-neutral-500">Signal channel</Text>
              </View>
              {flow.channels.length === 0 ? (
                <MutedText className="text-sm">
                  No active channels. Add a channel first.
                </MutedText>
              ) : (
                <View className="flex-row flex-wrap gap-2">
                  {flow.channels.map(ch => {
                    const selected = flow.selectedChannelId === ch.id
                    return (
                      <Pressable
                        key={ch.id}
                        disabled={flow.isBusy}
                        onPress={() => {
                          flow.setSelectedChannelId(prev => (prev === ch.id ? null : ch.id))
                          flow.setError('')
                        }}
                        className={cn(
                          'rounded-xl border px-3 py-2',
                          selected
                            ? 'border-teal-500 bg-teal-500'
                            : 'border-neutral-200 dark:border-neutral-700',
                          flow.isBusy && 'opacity-50',
                        )}
                      >
                        <Text
                          className={cn(
                            'text-sm',
                            selected
                              ? 'font-medium text-white'
                              : 'text-neutral-700 dark:text-neutral-300',
                          )}
                        >
                          {ch.display_name}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
              )}
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-xs font-medium text-neutral-500">From</Text>
                <TextInput
                  editable={!flow.isBusy}
                  value={flow.dateFrom}
                  onChangeText={flow.setDateFrom}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="mt-1.5 rounded-xl border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 dark:border-neutral-700 dark:text-neutral-50"
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-medium text-neutral-500">To</Text>
                <TextInput
                  editable={!flow.isBusy}
                  value={flow.dateTo}
                  onChangeText={flow.setDateTo}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="mt-1.5 rounded-xl border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 dark:border-neutral-700 dark:text-neutral-50"
                />
              </View>
            </View>

            <Pressable
              onPress={() => void flow.profileSignals()}
              disabled={!flow.canProfile}
              className={cn(
                'flex-row items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3',
                !flow.canProfile && 'opacity-50',
              )}
            >
              {flow.profiling ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <RefreshCw size={16} color="#fff" />
              )}
              <Text className="font-semibold text-white">
                {flow.profiling
                  ? flow.profileProgress.message || 'Pulling signals…'
                  : 'Pull & profile signals'}
              </Text>
              {!flow.profiling ? <ArrowRight size={16} color="#fff" /> : null}
            </Pressable>

            {flow.profiling ? <ProgressBar pct={flow.profileProgress.pct} /> : null}
          </Card>
        ) : null}

        {flow.step === 'symbol' ? (
          <Card className="gap-5">
            <View className="flex-row items-start justify-between gap-3">
              <View className="min-w-0 flex-1">
                <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                  Ready to backtest
                </Text>
                <MutedText className="mt-1 text-sm">
                  {flow.channelName} · {flow.profiledSignals.length} signals · {flow.dateFrom} →{' '}
                  {flow.dateTo}
                </MutedText>
              </View>
              <Pressable
                onPress={() => flow.setStep('configure')}
                className="flex-row items-center gap-1 py-1"
              >
                <ArrowLeft size={16} color={iconMuted} />
                <Text className="text-sm text-neutral-500">Back</Text>
              </Pressable>
            </View>

            {flow.profileNote ? (
              <View className="rounded-xl bg-neutral-50 px-4 py-3 dark:bg-neutral-800/50">
                <BodyText className="text-sm">{flow.profileNote}</BodyText>
              </View>
            ) : null}

            <View>
              <Text className="mb-3 text-xs font-medium text-neutral-500">
                Symbol to backtest
              </Text>
              {flow.symbolProfiles.length === 0 ? (
                <View className="rounded-xl border border-dashed border-neutral-200 px-4 py-6 dark:border-neutral-700">
                  <MutedText className="text-center text-sm">
                    No symbols in this range. Try a wider date range or another channel.
                  </MutedText>
                </View>
              ) : (
                <View className="flex-row flex-wrap gap-2">
                  {flow.symbolProfiles.map(({ symbol, count }) => {
                    const selected = flow.selectedSymbol === symbol
                    return (
                      <Pressable
                        key={symbol}
                        onPress={() => {
                          flow.setSelectedSymbol(symbol)
                          flow.clearResults()
                        }}
                        className={cn(
                          'rounded-xl border px-4 py-2.5',
                          selected
                            ? 'border-teal-500 bg-teal-500'
                            : 'border-neutral-200 dark:border-neutral-700',
                        )}
                      >
                        <Text
                          className={cn(
                            'text-sm font-medium',
                            selected ? 'text-white' : 'text-neutral-700 dark:text-neutral-300',
                          )}
                        >
                          {symbol}
                          <Text
                            className={cn(
                              'text-xs',
                              selected ? 'text-teal-100' : 'text-neutral-400',
                            )}
                          >
                            {' '}
                            {count}
                          </Text>
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
              )}
            </View>

            {flow.resultReady ? (
              <View className="gap-3 rounded-xl border border-teal-200 bg-teal-50/50 p-4 dark:border-teal-900 dark:bg-teal-950/20">
                <Text className="text-sm text-teal-800 dark:text-teal-200">
                  Results are ready.
                </Text>
                <Pressable
                  onPress={flow.showResults}
                  className="flex-row items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3"
                >
                  <BarChart3 size={16} color="#fff" />
                  <Text className="font-semibold text-white">See backtest result</Text>
                </Pressable>
              </View>
            ) : flow.isBacktestActive ? (
              <View className="gap-3 rounded-xl border border-teal-200 bg-teal-50/50 p-4 dark:border-teal-900 dark:bg-teal-950/20">
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator size="small" color={tscTheme.primary} />
                  <Text className="flex-1 text-sm text-teal-800 dark:text-teal-200">
                    {flow.activeRun?.progress_message ?? 'Running backtest…'}
                  </Text>
                </View>
                {flow.activeRun?.progress_pct != null ? (
                  <ProgressBar pct={flow.activeRun.progress_pct} />
                ) : null}
              </View>
            ) : (
              <Pressable
                onPress={() => void flow.startBacktest()}
                disabled={!flow.canBacktest}
                className={cn(
                  'flex-row items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3',
                  !flow.canBacktest && 'opacity-50',
                )}
              >
                <Crosshair size={16} color="#fff" />
                <Text className="font-semibold text-white">
                  Run backtest
                  {flow.selectedSymbol ? ` · ${flow.selectedSymbol}` : ''}
                </Text>
              </Pressable>
            )}
          </Card>
        ) : null}

        {flow.step === 'results' ? (
          <View className="gap-4">
            <View className="flex-row items-start justify-between gap-3">
              <View className="min-w-0 flex-1">
                <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                  Results
                </Text>
                <MutedText className="mt-0.5 text-sm">
                  {flow.selectedSymbol ?? '—'} · {flow.channelName}
                </MutedText>
              </View>
              <Pressable
                onPress={() => {
                  flow.setStep('symbol')
                  flow.clearResults()
                }}
                className="flex-row items-center gap-1 py-1"
              >
                <ArrowLeft size={16} color={iconMuted} />
                <Text className="text-sm text-neutral-500">New run</Text>
              </Pressable>
            </View>

            <View className="flex-row flex-wrap justify-between gap-y-3">
              <StatTile
                label="Total pips"
                value={formatPipValue(flow.totalPips)}
                valueClassName={cn('text-3xl', pnlTextClass(flow.totalPips))}
                wide
              />
              {flow.summary ? (
                <>
                  <StatTile
                    label="Win rate"
                    value={`${(flow.summary.winRate * 100).toFixed(0)}%`}
                  />
                  <StatTile
                    label="Win / Loss"
                    value={`${flow.summary.wins}/${flow.summary.losses}`}
                  />
                  <StatTile
                    label="Signals"
                    value={String(flow.summary.tradedSignals)}
                    wide
                  />
                </>
              ) : null}
            </View>

            <View className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <View className="border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
                <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                  {signalListLabel}
                </Text>
              </View>
              {flow.trades.length === 0 ? (
                <MutedText className="px-4 py-8 text-center text-sm">No trades in this run.</MutedText>
              ) : (
                flow.trades.map(trade => (
                  <BacktestTradeRowCard
                    key={trade.id}
                    trade={trade}
                    onPress={() => setSelectedTrade(trade)}
                  />
                ))
              )}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <BacktestTradeDetailModal
        trade={selectedTrade}
        visible={selectedTrade != null}
        onClose={() => setSelectedTrade(null)}
      />

      <BacktestHistoryModal
        visible={historyOpen}
        userId={user?.id}
        channelNames={flow.channelNameMap}
        onClose={() => setHistoryOpen(false)}
        onSelectRun={run => {
          setHistoryOpen(false)
          void flow.openHistoryRun(run)
        }}
      />
    </StackScreen>
  )
}

