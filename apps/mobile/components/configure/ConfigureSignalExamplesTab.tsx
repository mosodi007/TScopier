import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import {
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react-native'
import { Button, Card, ErrorText, HeadingText, MutedText } from '@/components/ui'
import { BrokerBadge } from '@/components/brokers/BrokerBadge'
import { TextField } from '@/components/configure/formControls'
import { cn } from '@/lib/cn'
import { tscTheme } from '@/lib/tscTheme'
import { useColorScheme } from '@/components/useColorScheme'
import {
  deleteChannelSignalExample,
  fetchChannelSignalExamples,
  formDraftFromIntent,
  formatTradeIntentSummary,
  intentFromFormDraft,
  parseCustomSignalExample,
  saveChannelSignalExample,
  triggerChannelAiTraining,
  type ChannelSignalExampleLabel,
  type ChannelSignalExampleRow,
  type SignalExampleFormDraft,
} from '@/lib/channelSignalExamples'
import { emptySignalExampleFormDraft } from '@tscopier/web-lib/tradeIntent'

const LABELS = {
  signalExamplesTitle: 'Signal examples',
  signalExamplesIntro:
    'Labeled messages from this channel teach the copier how to read its signals in any language.',
  signalExamplesEmpty: 'No signal examples yet',
  signalExamplesEmptyHint:
    'Train this channel to analyze recent messages and build labeled examples for its signal format.',
  signalExamplesRefresh: 'Refresh',
  signalExamplesCount: (count: number) => `${count} examples from channel training`,
  signalExamplesLoadError: 'Could not load signal examples',
  exampleLabelEntry: 'Entry',
  exampleLabelUpdate: 'Trade update',
  exampleLabelIgnore: 'Ignore',
  trainButton: 'Auto detect',
  training: 'Detecting...',
  autoTrainingDone: 'Training finished. Examples refreshed.',
  trainFailed: 'Training failed',
  loadingExisting: 'Loading existing training...',
  addCustomExample: 'Add custom example',
  customExampleTitle: 'Custom signal example',
  customExampleEditTitle: 'Edit signal example',
  pasteSignalPlaceholder: 'Paste one channel message here…',
  analyzeExample: 'Analyze',
  analyzingExample: 'Analyzing…',
  saveExample: 'Save example',
  signalTypeLabel: 'Signal type',
  signalTypeAuto: 'Auto-detect',
  signalTypeEntry: 'Entry',
  signalTypeUpdate: 'Trade update',
  updateKindLabel: 'Update type',
  updateKindModify: 'Modify SL/TP',
  updateKindClose: 'Close',
  updateKindBreakeven: 'Breakeven',
  updateKindPartial: 'Partial close',
  sideLabel: 'Side',
  sideBuy: 'Buy',
  sideSell: 'Sell',
  sideNone: 'None',
  fieldSymbol: 'Symbol',
  fieldEntry: 'Entry',
  fieldEntryZoneLow: 'Entry zone low',
  fieldEntryZoneHigh: 'Entry zone high',
  fieldSl: 'Stop loss',
  fieldTp: 'Take profit',
  addTp: 'Add TP',
  exampleRejectedCommentary: 'This looks like commentary, not a tradable signal.',
  exampleRejectedEmpty: 'Paste a signal message first.',
  exampleRejectedMissingSide: 'Choose Buy or Sell for entry examples.',
  exampleRejectedMissingPrices: 'Add at least an entry, SL, or TP.',
  exampleRejectedGeneric: 'Could not analyze this message. Check and try again.',
  exampleSaved: 'Example saved.',
  deleteExample: 'Delete',
  editExample: 'Edit',
  manualBadge: 'Manual',
  deleteExampleConfirm: 'Delete this signal example?',
  cancel: 'Cancel',
  multilingualRetrainHint:
    'Re-run Auto detect after major format changes so the copier stays aligned with this channel.',
} as const

function labelText(label: ChannelSignalExampleLabel): string {
  if (label === 'entry') return LABELS.exampleLabelEntry
  if (label === 'update') return LABELS.exampleLabelUpdate
  return LABELS.exampleLabelIgnore
}

function labelTone(label: ChannelSignalExampleLabel): 'primary' | 'neutral' | 'error' {
  if (label === 'entry') return 'primary'
  if (label === 'update') return 'neutral'
  return 'neutral'
}

function rejectedMessage(reason: string | null | undefined): string {
  switch (reason) {
    case 'commentary_not_trade_signal':
      return LABELS.exampleRejectedCommentary
    case 'empty_message':
      return LABELS.exampleRejectedEmpty
    case 'entry_missing_side':
      return LABELS.exampleRejectedMissingSide
    case 'entry_missing_prices':
      return LABELS.exampleRejectedMissingPrices
    default:
      return LABELS.exampleRejectedGeneric
  }
}

function ChipRow<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string
  value: T
  options: Array<{ id: T; label: string }>
  onChange: (next: T) => void
  disabled?: boolean
}) {
  return (
    <View>
      <Text className="mb-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map(opt => {
          const active = opt.id === value
          return (
            <Pressable
              key={opt.id}
              disabled={disabled}
              onPress={() => onChange(opt.id)}
              className={cn(
                'rounded-full border px-3 py-1.5',
                active
                  ? 'border-teal-600 bg-teal-50 dark:border-teal-500 dark:bg-teal-950/50'
                  : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900',
                disabled && 'opacity-50',
              )}
            >
              <Text
                className={cn(
                  'text-xs font-medium',
                  active
                    ? 'text-teal-700 dark:text-teal-300'
                    : 'text-neutral-600 dark:text-neutral-300',
                )}
              >
                {opt.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

function CustomSignalExampleModal({
  open,
  channelId,
  userId,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean
  channelId: string
  userId: string
  initial: ChannelSignalExampleRow | null
  onClose: () => void
  onSaved: (row: ChannelSignalExampleRow) => void
}) {
  const [draft, setDraft] = useState<SignalExampleFormDraft>(emptySignalExampleFormDraft())
  const [analyzed, setAnalyzed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (initial) {
      setDraft(formDraftFromIntent(initial.raw_message, initial.label, initial.intent))
      setAnalyzed(true)
      setSummary(formatTradeIntentSummary(initial.intent))
    } else {
      setDraft(emptySignalExampleFormDraft())
      setAnalyzed(false)
      setSummary(null)
    }
    setError('')
    setBusy(false)
    setAnalyzing(false)
  }, [open, initial])

  const handleAnalyze = async () => {
    const raw = draft.rawMessage.trim()
    if (!raw) {
      setError(LABELS.exampleRejectedEmpty)
      return
    }
    setError('')
    setAnalyzing(true)
    try {
      const hint = draft.signalType === 'auto' ? null : draft.signalType
      const result = await parseCustomSignalExample(channelId, raw, hint)
      if (!result.ok) {
        setError(rejectedMessage(result.rejected_reason))
        setAnalyzed(false)
        return
      }
      const next = formDraftFromIntent(raw, result.label, result.intent)
      if (draft.signalType !== 'auto') next.signalType = draft.signalType
      setDraft(next)
      setSummary(formatTradeIntentSummary(result.intent))
      setAnalyzed(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : LABELS.exampleRejectedGeneric)
      setAnalyzed(false)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSave = async () => {
    setError('')
    const mapped = intentFromFormDraft(draft)
    if (mapped.error) {
      setError(rejectedMessage(mapped.error))
      return
    }
    setBusy(true)
    try {
      const row = await saveChannelSignalExample({
        channelId,
        userId,
        rawMessage: draft.rawMessage,
        label: mapped.label,
        intent: mapped.intent,
        sortOrder: initial?.sort_order ?? 0,
        existingId: initial?.id ?? null,
      })
      onSaved(row)
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : LABELS.exampleRejectedGeneric
      setError(rejectedMessage(msg) === LABELS.exampleRejectedGeneric ? msg : rejectedMessage(msg))
    } finally {
      setBusy(false)
    }
  }

  const showFields = analyzed || Boolean(initial)
  const title = initial ? LABELS.customExampleEditTitle : LABELS.customExampleTitle

  // Avoid pageSheet under Expo Router modal — it drops navigation context on iOS.
  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <View className="flex-row items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <HeadingText className="text-lg">{title}</HeadingText>
          <Pressable onPress={onClose} hitSlop={12} disabled={busy || analyzing} className="rounded-lg p-2">
            <X size={20} color="#94a3b8" />
          </Pressable>
        </View>

        <ScrollView
          contentContainerClassName="gap-4 px-4 py-4 pb-10"
          keyboardShouldPersistTaps="handled"
        >
          {error ? <ErrorText>{error}</ErrorText> : null}

          <TextField
            label={LABELS.pasteSignalPlaceholder}
            value={draft.rawMessage}
            onChange={raw => {
              setDraft(d => ({ ...d, rawMessage: raw }))
              setAnalyzed(false)
            }}
            placeholder={LABELS.pasteSignalPlaceholder}
            multiline
          />

          <ChipRow
            label={LABELS.signalTypeLabel}
            value={draft.signalType}
            disabled={busy || analyzing}
            onChange={signalType => setDraft(d => ({ ...d, signalType }))}
            options={[
              { id: 'auto', label: LABELS.signalTypeAuto },
              { id: 'entry', label: LABELS.signalTypeEntry },
              { id: 'update', label: LABELS.signalTypeUpdate },
            ]}
          />

          <Button
            label={analyzing ? LABELS.analyzingExample : LABELS.analyzeExample}
            variant="secondary"
            loading={analyzing}
            disabled={busy || !draft.rawMessage.trim()}
            onPress={() => void handleAnalyze()}
          />

          {showFields ? (
            <Card className="gap-3">
              {summary ? (
                <Text className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                  {summary}
                </Text>
              ) : null}

              {(draft.signalType === 'entry' || draft.signalType === 'auto') ? (
                <ChipRow
                  label={LABELS.sideLabel}
                  value={draft.side}
                  disabled={busy}
                  onChange={side =>
                    setDraft(d => ({
                      ...d,
                      side,
                      signalType:
                        d.signalType === 'auto' && (side === 'BUY' || side === 'SELL')
                          ? 'entry'
                          : d.signalType,
                    }))
                  }
                  options={[
                    { id: 'NONE', label: LABELS.sideNone },
                    { id: 'BUY', label: LABELS.sideBuy },
                    { id: 'SELL', label: LABELS.sideSell },
                  ]}
                />
              ) : null}

              {draft.signalType === 'update' ? (
                <ChipRow
                  label={LABELS.updateKindLabel}
                  value={draft.updateKind}
                  disabled={busy}
                  onChange={updateKind => setDraft(d => ({ ...d, updateKind }))}
                  options={[
                    { id: 'modify', label: LABELS.updateKindModify },
                    { id: 'close', label: LABELS.updateKindClose },
                    { id: 'breakeven', label: LABELS.updateKindBreakeven },
                    { id: 'partial_close', label: LABELS.updateKindPartial },
                  ]}
                />
              ) : null}

              <TextField
                label={LABELS.fieldSymbol}
                value={draft.symbol}
                onChange={symbol => setDraft(d => ({ ...d, symbol }))}
              />
              <TextField
                label={LABELS.fieldEntry}
                value={draft.entryPrice}
                onChange={entryPrice =>
                  setDraft(d => ({ ...d, entryPrice, entryZoneLow: '', entryZoneHigh: '' }))
                }
              />
              <TextField
                label={LABELS.fieldSl}
                value={draft.sl}
                onChange={sl => setDraft(d => ({ ...d, sl }))}
              />
              <TextField
                label={LABELS.fieldEntryZoneLow}
                value={draft.entryZoneLow}
                onChange={entryZoneLow =>
                  setDraft(d => ({ ...d, entryZoneLow, entryPrice: '' }))
                }
              />
              <TextField
                label={LABELS.fieldEntryZoneHigh}
                value={draft.entryZoneHigh}
                onChange={entryZoneHigh =>
                  setDraft(d => ({ ...d, entryZoneHigh, entryPrice: '' }))
                }
              />
              {draft.tpLevels.map((tp, index) => (
                <TextField
                  key={`tp-${index}`}
                  label={`${LABELS.fieldTp}${draft.tpLevels.length > 1 ? ` ${index + 1}` : ''}`}
                  value={tp}
                  onChange={next =>
                    setDraft(d => ({
                      ...d,
                      tpLevels: d.tpLevels.map((v, i) => (i === index ? next : v)),
                    }))
                  }
                />
              ))}
              <Pressable
                onPress={() => setDraft(d => ({ ...d, tpLevels: [...d.tpLevels, ''] }))}
                className="self-start"
              >
                <Text className="text-sm font-medium text-teal-600 dark:text-teal-400">
                  {LABELS.addTp}
                </Text>
              </Pressable>
            </Card>
          ) : null}

          <Button
            label={LABELS.saveExample}
            loading={busy}
            disabled={analyzing || !showFields}
            onPress={() => void handleSave()}
          />
          <Button label={LABELS.cancel} variant="secondary" disabled={busy || analyzing} onPress={onClose} />
        </ScrollView>
      </View>
    </Modal>
  )
}

export function ConfigureSignalExamplesTab({
  channelId,
  userId,
}: {
  channelId: string
  userId: string
}) {
  const scheme = useColorScheme()
  const mutedIcon = scheme === 'dark' ? '#94a3b8' : '#a3a3a3'
  const [examples, setExamples] = useState<ChannelSignalExampleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [trainFeedback, setTrainFeedback] = useState<{
    variant: 'success' | 'error'
    message: string
  } | null>(null)
  const [training, setTraining] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ChannelSignalExampleRow | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const loadExamples = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const rows = await fetchChannelSignalExamples(channelId)
      if (mounted.current) setExamples(rows)
    } catch (err) {
      if (mounted.current) {
        setLoadError(err instanceof Error ? err.message : LABELS.signalExamplesLoadError)
        setExamples([])
      }
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [channelId])

  useEffect(() => {
    void loadExamples()
    setTrainFeedback(null)
  }, [loadExamples])

  const handleRetrain = useCallback(async () => {
    if (training) return
    setTrainFeedback(null)
    setTraining(true)
    try {
      const result = await triggerChannelAiTraining(channelId)
      if (result.error) {
        setTrainFeedback({ variant: 'error', message: result.error })
        return
      }
      if (result.trained) {
        setTrainFeedback({ variant: 'success', message: LABELS.autoTrainingDone })
        await loadExamples()
        return
      }
      setTrainFeedback({ variant: 'error', message: LABELS.trainFailed })
    } catch (err) {
      setTrainFeedback({
        variant: 'error',
        message: err instanceof Error ? err.message : LABELS.trainFailed,
      })
    } finally {
      setTraining(false)
    }
  }, [channelId, loadExamples, training])

  const handleDelete = useCallback(
    (row: ChannelSignalExampleRow) => {
      Alert.alert(LABELS.deleteExample, LABELS.deleteExampleConfirm, [
        { text: LABELS.cancel, style: 'cancel' },
        {
          text: LABELS.deleteExample,
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setDeletingId(row.id)
              setTrainFeedback(null)
              try {
                await deleteChannelSignalExample(row.id)
                setExamples(prev => prev.filter(e => e.id !== row.id))
              } catch (err) {
                setTrainFeedback({
                  variant: 'error',
                  message: err instanceof Error ? err.message : LABELS.signalExamplesLoadError,
                })
              } finally {
                setDeletingId(null)
              }
            })()
          },
        },
      ])
    },
    [],
  )

  return (
    <View className="gap-4">
      <Card className="gap-3">
        <View className="flex-row items-start gap-2">
          <Sparkles size={18} color={tscTheme.primary} />
          <View className="min-w-0 flex-1">
            <HeadingText className="text-base">{LABELS.signalExamplesTitle}</HeadingText>
            <MutedText className="mt-1 text-xs">{LABELS.signalExamplesIntro}</MutedText>
          </View>
        </View>

        <View className="flex-row flex-wrap gap-2">
          <Pressable
            onPress={() => void loadExamples()}
            disabled={loading || training}
            className="flex-row items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
          >
            <RefreshCw size={14} color={mutedIcon} />
            <Text className="text-xs font-semibold text-neutral-800 dark:text-neutral-100">
              {LABELS.signalExamplesRefresh}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setEditing(null)
              setModalOpen(true)
            }}
            disabled={training}
            className="flex-row items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-2"
          >
            <Plus size={14} color="#fff" />
            <Text className="text-xs font-semibold text-white">{LABELS.addCustomExample}</Text>
          </Pressable>
          <Pressable
            onPress={() => void handleRetrain()}
            disabled={training}
            className="flex-row items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
          >
            {training ? (
              <ActivityIndicator size="small" color={tscTheme.primary} />
            ) : (
              <Sparkles size={14} color={mutedIcon} />
            )}
            <Text className="text-xs font-semibold text-neutral-800 dark:text-neutral-100">
              {training ? LABELS.training : LABELS.trainButton}
            </Text>
          </Pressable>
        </View>
      </Card>

      {trainFeedback ? (
        <View
          className={cn(
            'rounded-xl border px-3 py-2',
            trainFeedback.variant === 'success'
              ? 'border-teal-200 bg-teal-50 dark:border-teal-900 dark:bg-teal-950/40'
              : 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40',
          )}
        >
          <Text
            className={cn(
              'text-sm',
              trainFeedback.variant === 'success'
                ? 'text-teal-800 dark:text-teal-200'
                : 'text-red-700 dark:text-red-300',
            )}
          >
            {trainFeedback.message}
          </Text>
        </View>
      ) : null}

      {loadError ? <ErrorText>{loadError}</ErrorText> : null}

      {loading && examples.length === 0 ? (
        <MutedText>{LABELS.loadingExisting}</MutedText>
      ) : null}

      {!loading && examples.length === 0 && !loadError ? (
        <Card className="items-center gap-3 py-8">
          <Sparkles size={32} color={mutedIcon} />
          <HeadingText className="text-center text-base">{LABELS.signalExamplesEmpty}</HeadingText>
          <MutedText className="text-center text-xs">{LABELS.signalExamplesEmptyHint}</MutedText>
          <View className="mt-1 w-full gap-2">
            <Button
              label={LABELS.addCustomExample}
              onPress={() => {
                setEditing(null)
                setModalOpen(true)
              }}
              disabled={training}
            />
            <Button
              label={training ? LABELS.training : LABELS.trainButton}
              variant="secondary"
              loading={training}
              onPress={() => void handleRetrain()}
            />
          </View>
        </Card>
      ) : null}

      {examples.length > 0 ? (
        <View className="gap-3">
          <MutedText className="text-xs">{LABELS.signalExamplesCount(examples.length)}</MutedText>
          {examples.map(example => {
            const summary = formatTradeIntentSummary(example.intent)
            return (
              <View
                key={example.id}
                className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900/50"
              >
                <View className="flex-row flex-wrap items-center gap-2 border-b border-neutral-100 bg-neutral-50/80 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-800/40">
                  <BrokerBadge label={labelText(example.label)} tone={labelTone(example.label)} />
                  {example.source === 'manual' ? (
                    <BrokerBadge label={LABELS.manualBadge} tone="primary" />
                  ) : null}
                  {summary ? (
                    <Text
                      className="max-w-full flex-1 text-xs font-medium text-neutral-600 dark:text-neutral-300"
                      numberOfLines={1}
                    >
                      {summary}
                    </Text>
                  ) : null}
                  <View className="ml-auto flex-row items-center gap-1">
                    <Pressable
                      onPress={() => {
                        setEditing(example)
                        setModalOpen(true)
                      }}
                      className="rounded-md p-1.5"
                      hitSlop={8}
                    >
                      <Pencil size={14} color={mutedIcon} />
                    </Pressable>
                    <Pressable
                      onPress={() => handleDelete(example)}
                      disabled={deletingId === example.id}
                      className="rounded-md p-1.5"
                      hitSlop={8}
                    >
                      {deletingId === example.id ? (
                        <ActivityIndicator size="small" color="#ef4444" />
                      ) : (
                        <Trash2 size={14} color="#ef4444" />
                      )}
                    </Pressable>
                  </View>
                </View>
                <Text className="px-3 py-3 text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">
                  {example.raw_message}
                </Text>
              </View>
            )
          })}
          <MutedText className="text-xs">{LABELS.multilingualRetrainHint}</MutedText>
        </View>
      ) : null}

      <CustomSignalExampleModal
        open={modalOpen}
        channelId={channelId}
        userId={userId}
        initial={editing}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        onSaved={row => {
          setTrainFeedback({ variant: 'success', message: LABELS.exampleSaved })
          setExamples(prev => {
            const without = prev.filter(e => e.id !== row.id)
            return [row, ...without].sort((a, b) => a.sort_order - b.sort_order)
          })
        }}
      />
    </View>
  )
}
