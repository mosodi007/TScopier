import { useCallback, useState } from 'react'
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native'
import { Pause, Play } from 'lucide-react-native'
import { useTheme } from '@/context/ThemeContext'
import { useSubscription } from '@/context/SubscriptionContext'
import { useCopierPause } from '@/hooks/useCopierPause'
import { useCopierStartBlocked } from '@/hooks/useCopierStartBlocked'
import type { BrokerAccount } from '@tscopier/shared'
import type { BrokerLiveSnapshot } from '@/lib/dashboardStats'
import { cn } from '@/lib/cn'
import { tscTheme } from '@/lib/tscTheme'

const COPY = {
  statusRunning: 'Copier Running',
  statusPaused: 'Copier Paused',
  statusCopierStopped: 'Copier Stopped',
  pausedHint: 'Signal copying is paused',
  stoppedHintSubscription: 'Subscribe to start the copier',
  stoppedHintSetup: 'Connect Telegram, add channels, and link a broker to start the copier',
  stopCopier: 'Pause Copier',
  pauseLabel: 'Pause copying',
  resumeLabel: 'Resume copying',
  confirmTitle: 'Pause copier',
  confirmBody: 'Signal copying, trade execution, and copier logs will stop until you resume.',
  cancel: 'Cancel',
  pastDueHint: 'Update payment to resume the copier',
}

function CopierActiveIndicator() {
  return <View className="h-2.5 w-2.5 rounded-full bg-teal-500 dark:bg-teal-400" />
}

function CopierStoppedIndicator() {
  return <View className="h-2.5 w-2.5 rounded-full bg-[#737373]" />
}

interface CopierPauseToggleProps {
  brokers?: BrokerAccount[]
  brokersLoading?: boolean
  liveByBroker?: Record<string, BrokerLiveSnapshot>
}

export function CopierPauseToggle({ brokers, brokersLoading, liveByBroker }: CopierPauseToggleProps) {
  const { isDark } = useTheme()
  const { subscription } = useSubscription()
  const { copierPaused, patchPaused, persistPaused } = useCopierPause()
  const { copierStartBlocked, copierStartBlockedReason, listenerLive, resolving } =
    useCopierStartBlocked({
      brokers,
      brokersLoading,
      liveByBroker,
    })
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const isPastDue = subscription?.status === 'past_due'
  const lockedStopped =
    copierStartBlocked && !resolving && !copierPaused && !listenerLive
  const showStopped = lockedStopped || copierPaused

  const stoppedHint = lockedStopped
    ? copierStartBlockedReason === 'subscription'
      ? isPastDue
        ? COPY.pastDueHint
        : COPY.stoppedHintSubscription
      : COPY.stoppedHintSetup
    : COPY.pausedHint

  const stoppedLabel = lockedStopped ? COPY.statusCopierStopped : COPY.statusPaused

  const setPaused = useCallback(
    async (next: boolean) => {
      if (saving || lockedStopped) return
      setSaving(true)
      patchPaused(next)
      try {
        await persistPaused(next)
      } catch {
        patchPaused(!next)
      } finally {
        setSaving(false)
      }
    },
    [lockedStopped, patchPaused, persistPaused, saving],
  )

  const confirmPause = useCallback(async () => {
    await setPaused(true)
    setConfirmOpen(false)
  }, [setPaused])

  const handlePress = useCallback(() => {
    if (saving || lockedStopped) return
    if (copierPaused) {
      void setPaused(false)
      return
    }
    setConfirmOpen(true)
  }, [copierPaused, lockedStopped, saving, setPaused])

  const runningStyles = isDark
    ? 'bg-neutral-800/80 active:bg-neutral-800'
    : 'bg-neutral-100 active:bg-neutral-200'
  const pausedStyles = isDark
    ? 'bg-teal-950/40 active:bg-teal-950/60'
    : 'bg-teal-50 active:bg-teal-100'
  const stoppedStyles = isDark ? 'bg-neutral-800/60' : 'bg-neutral-100'

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          lockedStopped
            ? `${COPY.statusCopierStopped}. ${stoppedHint}`
            : showStopped
              ? `${stoppedLabel}. ${COPY.resumeLabel}`
              : `${COPY.statusRunning}. ${COPY.stopCopier}`
        }
        accessibilityState={{ disabled: saving || lockedStopped }}
        disabled={saving || lockedStopped || resolving}
        onPress={handlePress}
        className={cn(
          'shrink-0 flex-row items-center gap-1.5 rounded-lg px-2 py-1.5',
          lockedStopped ? stoppedStyles : showStopped ? pausedStyles : runningStyles,
          (saving || lockedStopped || resolving) && 'opacity-60',
        )}
      >
        {saving || resolving ? (
          <ActivityIndicator size="small" color={tscTheme.primary} />
        ) : showStopped ? (
          lockedStopped ? (
            <CopierStoppedIndicator />
          ) : (
            <Play size={14} color={isDark ? tscTheme.primaryMuted.dark : tscTheme.primary} strokeWidth={2.25} />
          )
        ) : (
          <CopierActiveIndicator />
        )}
        <Text
          className={cn(
            'text-xs font-medium',
            lockedStopped
              ? 'text-[#737373]'
              : showStopped
                ? 'text-teal-700 dark:text-teal-300'
                : 'text-neutral-600 dark:text-neutral-300',
          )}
          numberOfLines={1}
        >
          {lockedStopped ? stoppedLabel : showStopped ? stoppedLabel : COPY.statusRunning}
        </Text>
      </Pressable>

      <Modal visible={confirmOpen} transparent animationType="fade" onRequestClose={() => setConfirmOpen(false)}>
        <Pressable
          className="flex-1 justify-end bg-black/40"
          onPress={() => {
            if (!saving) setConfirmOpen(false)
          }}
        >
          <Pressable
            className="rounded-t-3xl bg-white p-4 dark:bg-neutral-900"
            onPress={e => e.stopPropagation()}
          >
            <View className="flex-row items-start gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
                <Pause size={20} color={isDark ? tscTheme.textMuted.dark : tscTheme.textMuted.light} />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                  {COPY.confirmTitle}
                </Text>
                <Text className="mt-1 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                  {COPY.confirmBody}
                </Text>
              </View>
            </View>

            <View className="mt-4 flex-row gap-2">
              <Pressable
                disabled={saving}
                onPress={() => setConfirmOpen(false)}
                className="flex-1 items-center rounded-xl border border-neutral-200 py-3 dark:border-neutral-700"
              >
                <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{COPY.cancel}</Text>
              </Pressable>
              <Pressable
                disabled={saving}
                onPress={() => void confirmPause()}
                className="flex-1 items-center rounded-xl bg-teal-600 py-3"
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-sm font-semibold text-white">{COPY.pauseLabel}</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}
