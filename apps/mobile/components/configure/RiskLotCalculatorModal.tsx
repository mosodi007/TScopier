import { useEffect, useMemo, useState } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native'
import {
  Calculator,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react-native'
import type { ManualSettings } from '@tscopier/shared'
import { pipCalculator, type PipQuote } from '@tscopier/web-lib/pipCalculator'
import { classifySymbol } from '@tscopier/web-lib/pipMath'
import {
  computeRiskLotCalculator,
  manualSettingsFromRiskCalc,
  riskCalcStateFromManualSettings,
  roundLots2,
  type RiskLotCalculatorFormState,
} from '@tscopier/web-lib/riskLotCalculator'
import { computeMinMultiTradeLegPercent } from '@tscopier/web-lib/multiTradeLegUnits'
import { formatMoneyWithCode } from '@tscopier/web-lib/currency'
import { cn } from '@/lib/cn'
import { tscTheme } from '@/lib/tscTheme'
import { Button, HeadingText, MutedText } from '@/components/ui'
import {
  NumberField,
  SelectField,
  SwitchRow,
  TextField,
  numberToInput,
} from '@/components/configure/formControls'

const COPY = {
  title: 'Risk & lot size calculator',
  intro:
    'Estimate how much you risk per signal and what you could earn at your take-profit levels. Adjust inputs until the risk fits your account, then apply to this channel.',
  accountBalance: 'Starting account balance',
  symbol: 'Symbol',
  symbolHint: 'Used for pip value estimates. Defaults from Symbol to Trade when set.',
  slPips: 'Stop loss (pips)',
  usePredefinedSl: 'Use as Predefined SL',
  usePredefinedTp: 'Use as Predefined TP',
  tpLevelsTitle: 'Take-profit levels',
  tpLevelsHint:
    'Pips = distance from entry for each TP. % target = share of volume (single) or legs (multi) closed at that TP.',
  tpPipsCol: 'Pips',
  tpPercentCol: '% target',
  tpLabel: (index: number) => `TP${index}`,
  tpPercentTotal: 'Enabled total',
  tpUnallocated: (pct: number) => `${pct}% unallocated`,
  tpOverCap: 'Total exceeds 100%',
  addTp: 'Add TP',
  remove: 'Remove',
  tradeStyle: 'Trade style',
  singleTrade: 'Single entry',
  multiTrades: 'Range trading (multi)',
  perLegSize: 'Per-leg size (% of fixed lot)',
  rangeLayering: 'Range layering',
  rangePercent: 'Reserved lot (% of legs)',
  rangeStep: 'Step (pips)',
  rangeDistance: 'Range distance (pips)',
  fixedLot: 'Fixed lot',
  targetRiskPct: 'Target risk (% of balance)',
  targetRiskHint:
    'Optional — suggests a lot size that stays near this risk per signal (worst case).',
  useSuggestedLot: 'Use suggested lot',
  enabled: 'On',
  advanced: 'Advanced',
  winRate: 'Assumed win rate (%)',
  winRateHint:
    'Optional. Estimates probability of ruin using your computed reward:risk and a fixed risk per signal. Not a guarantee.',
  resultsTitle: 'Results',
  riskImmediate: 'Risk if SL hit (immediate legs only)',
  riskPct: 'Risk % of balance',
  rewardTotal: 'Best-case reward (all TPs)',
  rewardRiskRatio: 'Reward : risk',
  legSummary: 'Leg breakdown',
  legSummarySingle: (lot: string) => `1 order at ${lot} lots`,
  legSummaryMulti: (total: string, lot: string, immediate: string, pending: string) =>
    `${total} orders × ${lot} lots (${immediate} immediate + ${pending} pending)`,
  legSummaryRange: (distance: string, pending: string, step: string) =>
    `Ladder span ~${distance} pips (${pending} pending × ${step} pips)`,
  lossesToRuin: 'Consecutive full-SL hits to wipe account',
  riskOfRuin: 'Estimated risk of ruin',
  perTpReward: 'Reward by TP (pips × % target)',
  brokerPreviewNote:
    'Leg counts use 0.01 min lot / 0.01 step preview defaults. Your broker symbol settings may differ slightly.',
  fallbackSingleNote:
    'Per-leg size is below broker minimum — copier would open a single full-size trade instead.',
  riskWarningModerate: 'Above 1% risk per signal — consider reducing lot size.',
  riskWarningHigh: 'Above 2% risk per signal — high drawdown risk.',
  riskWarningExtreme: 'Above 5% risk per signal — dangerous for most accounts.',
  apply: 'Apply settings',
  cancel: 'Cancel',
  close: 'Close',
} as const

function sumEnabledTpPercents(rows: { enabled?: boolean; percent?: number }[]): number {
  return rows.reduce(
    (s, r) => (r.enabled !== false ? s + (Number(r.percent) || 0) : s),
    0,
  )
}

function pipQuoteForSymbol(symbol: string): PipQuote {
  const upper = symbol.trim().toUpperCase()
  if (!upper) return pipCalculator('EURUSD', 0.00001, 5)
  const klass = classifySymbol(upper)
  let point = 0.0001
  let digits = 5
  switch (klass) {
    case 'fx_jpy':
      point = 0.001
      digits = 3
      break
    case 'fx_major':
      point = 0.00001
      digits = 5
      break
    case 'metal':
      point = 0.01
      digits = 2
      break
    case 'index':
      point = 1
      digits = 0
      break
    case 'crypto':
      point = 0.01
      digits = 2
      break
    case 'energy':
      point = 0.01
      digits = 2
      break
    default:
      point = 0.00001
      digits = 5
      break
  }
  return pipCalculator(upper, point, digits)
}

function riskPctTone(pct: number): string {
  if (pct > 5) return 'border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-950/40'
  if (pct > 2) return 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/40'
  if (pct > 1) return 'border-yellow-200 bg-yellow-50 dark:border-yellow-900/40 dark:bg-yellow-950/30'
  return 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/40'
}

function riskPctTextTone(pct: number): string {
  if (pct > 5) return 'text-red-900 dark:text-red-200'
  if (pct > 2) return 'text-amber-900 dark:text-amber-200'
  if (pct > 1) return 'text-yellow-900 dark:text-yellow-200'
  return 'text-emerald-900 dark:text-emerald-200'
}

function CheckboxRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <Pressable onPress={() => onChange(!value)} className="flex-row items-center gap-2">
      <View
        className={cn(
          'h-5 w-5 items-center justify-center rounded border',
          value
            ? 'border-teal-600 bg-teal-600'
            : 'border-neutral-300 bg-white dark:border-neutral-600 dark:bg-neutral-900',
        )}
      >
        {value ? <Text className="text-[11px] font-bold text-white">✓</Text> : null}
      </View>
      <Text className="flex-1 text-sm text-neutral-700 dark:text-neutral-300">{label}</Text>
    </Pressable>
  )
}

function ResultCard({
  label,
  value,
  hint,
  valueClassName,
  className,
}: {
  label: string
  value: string
  hint?: string
  valueClassName?: string
  className?: string
}) {
  return (
    <View
      className={cn(
        'rounded-lg border border-neutral-200 bg-white px-3 py-2.5 dark:border-neutral-700 dark:bg-neutral-900',
        className,
      )}
    >
      <Text className="text-xs text-neutral-500 dark:text-neutral-400">{label}</Text>
      <Text className={cn('mt-0.5 text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-50', valueClassName)}>
        {value}
      </Text>
      {hint ? <Text className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{hint}</Text> : null}
    </View>
  )
}

export interface RiskLotCalculatorModalProps {
  open: boolean
  onClose: () => void
  onApply: (patch: Partial<ManualSettings>) => void
  manualSettings: ManualSettings
  initialBalance: number | null
  currency?: string | null
  symbol?: string
  allowMultiTrade?: boolean
}

export function RiskLotCalculatorModal({
  open,
  onClose,
  onApply,
  manualSettings,
  initialBalance,
  currency,
  symbol: initialSymbol = '',
  allowMultiTrade = true,
}: RiskLotCalculatorModalProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [form, setForm] = useState<RiskLotCalculatorFormState>(() =>
    riskCalcStateFromManualSettings(manualSettings, initialBalance),
  )

  useEffect(() => {
    if (!open) return
    const next = riskCalcStateFromManualSettings(manualSettings, initialBalance)
    if (!next.symbol && initialSymbol) next.symbol = initialSymbol.trim().toUpperCase()
    if (!allowMultiTrade) {
      next.tradeStyle = 'single'
      next.rangeTrading = false
    }
    setForm(next)
    setAdvancedOpen(false)
  }, [open, manualSettings, initialBalance, initialSymbol, allowMultiTrade])

  const effectiveSymbol = (form.symbol || initialSymbol || 'EURUSD').trim().toUpperCase()
  const quote = useMemo(() => pipQuoteForSymbol(effectiveSymbol), [effectiveSymbol])
  const minLegPercent = useMemo(
    () => computeMinMultiTradeLegPercent(form.fixedLot),
    [form.fixedLot],
  )

  const result = useMemo(
    () =>
      computeRiskLotCalculator(
        {
          accountBalance: form.accountBalance,
          slPips: form.slPips,
          tpPips: form.tpPips,
          tradeStyle: form.tradeStyle,
          legPercent: form.legPercent,
          rangeTrading: form.rangeTrading,
          rangePercent: form.rangePercent,
          rangeStepPips: form.rangeStepPips,
          rangeDistancePips: form.rangeDistancePips,
          fixedLot: form.fixedLot,
          tpLots: form.tpLots,
          winRatePct: form.winRatePct,
          targetRiskPct: form.targetRiskPct,
        },
        quote,
      ),
    [form, quote],
  )

  const fmtMoney = (n: number) =>
    formatMoneyWithCode(n, quote.quoteCurrency ?? currency ?? undefined, { nullAsDash: false })

  const patchForm = (patch: Partial<RiskLotCalculatorFormState>) => {
    setForm(prev => ({ ...prev, ...patch }))
  }

  const setTpPipAt = (idx: number, raw: string) => {
    const n = Math.max(1, Number(raw) || 0)
    setForm(prev => {
      const tpPips = [...prev.tpPips]
      tpPips[idx] = n
      return { ...prev, tpPips }
    })
  }

  const addTpRow = () => {
    setForm(prev => {
      const nextIndex = prev.tpPips.length + 1
      const lastPip = prev.tpPips[prev.tpPips.length - 1] ?? 20
      return {
        ...prev,
        tpPips: [...prev.tpPips, lastPip + 20],
        tpLots: [
          ...prev.tpLots,
          {
            label: `TP${nextIndex}`,
            lot: 0.01,
            percent: 0,
            enabled: true,
          },
        ],
      }
    })
  }

  const removeTpRow = (idx: number) => {
    setForm(prev => ({
      ...prev,
      tpPips: prev.tpPips.filter((_, i) => i !== idx),
      tpLots: prev.tpLots.filter((_, i) => i !== idx),
    }))
  }

  const setTpLotPercent = (idx: number, raw: string) => {
    const n = Math.max(0, Math.min(100, Number(raw) || 0))
    setForm(prev => {
      const tpLots = prev.tpLots.map((r, i) => (i === idx ? { ...r, percent: n } : r))
      return { ...prev, tpLots }
    })
  }

  const toggleTpRow = (idx: number, enabled: boolean) => {
    setForm(prev => {
      const tpLots = prev.tpLots.map((r, i) => (i === idx ? { ...r, enabled } : r))
      return { ...prev, tpLots }
    })
  }

  const tpPercentTotal = useMemo(() => sumEnabledTpPercents(form.tpLots), [form.tpLots])

  const riskWarning =
    result.riskPctFull > 5
      ? COPY.riskWarningExtreme
      : result.riskPctFull > 2
        ? COPY.riskWarningHigh
        : result.riskPctFull > 1
          ? COPY.riskWarningModerate
          : null

  const handleApply = () => {
    onApply({
      ...manualSettingsFromRiskCalc(form),
      risk_mode: 'fixed_lot',
    })
    onClose()
  }

  // Avoid presentationStyle="pageSheet" — Configure Trading is already an Expo Router
  // modal; a nested pageSheet detaches the navigation tree on iOS.
  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-white dark:bg-neutral-900">
        {/* Header */}
        <View className="border-b border-neutral-100 px-4 py-4 dark:border-neutral-800">
          <View className="flex-row items-start gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/40">
              <Calculator size={20} color={tscTheme.primary} />
            </View>
            <View className="min-w-0 flex-1">
              <HeadingText className="text-base">{COPY.title}</HeadingText>
              <MutedText className="mt-1 text-sm leading-relaxed">{COPY.intro}</MutedText>
            </View>
            <Pressable onPress={onClose} hitSlop={12} className="rounded-lg p-2" accessibilityLabel={COPY.close}>
              <X size={16} color="#94a3b8" />
            </Pressable>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="pb-4"
          keyboardShouldPersistTaps="handled"
        >
          {/* Inputs */}
          <View className="gap-4 border-b border-neutral-100 p-4 dark:border-neutral-800">
            <NumberField
              label={COPY.accountBalance}
              value={numberToInput(form.accountBalance, '0')}
              onChange={raw => patchForm({ accountBalance: Math.max(0, Number(raw) || 0) })}
            />
            <TextField
              label={COPY.symbol}
              value={form.symbol || initialSymbol}
              onChange={raw => patchForm({ symbol: raw.toUpperCase() })}
              hint={COPY.symbolHint}
              placeholder="XAUUSD"
            />

            <NumberField
              label={COPY.fixedLot}
              value={numberToInput(form.fixedLot, '0.01')}
              onChange={raw => patchForm({ fixedLot: Math.max(0.01, Number(raw) || 0.01) })}
            />
            <NumberField
              label={COPY.targetRiskPct}
              value={form.targetRiskPct != null ? String(form.targetRiskPct) : ''}
              onChange={raw =>
                patchForm({
                  targetRiskPct: raw.trim() === '' ? null : Math.max(0, Number(raw) || 0),
                })
              }
              hint={COPY.targetRiskHint}
            />

            {result.suggestedLot != null && form.targetRiskPct != null ? (
              <View className="flex-row flex-wrap items-center gap-2 rounded-lg border border-teal-200 bg-teal-50/80 px-3 py-2 dark:border-teal-900/50 dark:bg-teal-950/30">
                <Text className="flex-1 text-sm text-teal-900 dark:text-teal-200">
                  {COPY.useSuggestedLot}:{' '}
                  <Text className="font-semibold">{result.suggestedLot.toFixed(2)}</Text>
                </Text>
                <Pressable
                  onPress={() =>
                    patchForm({ fixedLot: result.suggestedLot!, targetRiskPct: null })
                  }
                  className="rounded-lg px-2 py-1"
                >
                  <Text className="text-sm font-semibold text-teal-700 dark:text-teal-300">
                    {COPY.useSuggestedLot}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            <SelectField
              label={COPY.tradeStyle}
              value={form.tradeStyle}
              onChange={v =>
                patchForm({
                  tradeStyle: v,
                  rangeTrading: v === 'multi' ? form.rangeTrading : false,
                })
              }
              options={
                allowMultiTrade
                  ? [
                      { id: 'single', label: COPY.singleTrade },
                      { id: 'multi', label: COPY.multiTrades },
                    ]
                  : [{ id: 'single', label: COPY.singleTrade }]
              }
            />

            {form.tradeStyle === 'multi' ? (
              <View className="gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                <NumberField
                  label={COPY.perLegSize}
                  value={numberToInput(form.legPercent, '5')}
                  onChange={raw => {
                    const n = Number(raw)
                    const next = Number.isFinite(n)
                      ? Math.max(minLegPercent, Math.min(100, n))
                      : minLegPercent
                    patchForm({ legPercent: next })
                  }}
                />
                <SwitchRow
                  label={COPY.rangeLayering}
                  value={form.rangeTrading}
                  onValueChange={v => patchForm({ rangeTrading: v })}
                />
                {form.rangeTrading ? (
                  <>
                    <NumberField
                      label={COPY.rangePercent}
                      value={numberToInput(form.rangePercent, '50')}
                      onChange={raw => patchForm({ rangePercent: Number(raw) || 0 })}
                    />
                    <NumberField
                      label={COPY.rangeStep}
                      value={numberToInput(form.rangeStepPips, '3')}
                      onChange={raw =>
                        patchForm({ rangeStepPips: Math.max(1, Number(raw) || 1) })
                      }
                      decimal={false}
                    />
                    <NumberField
                      label={COPY.rangeDistance}
                      value={numberToInput(form.rangeDistancePips, '30')}
                      onChange={raw =>
                        patchForm({ rangeDistancePips: Math.max(1, Number(raw) || 1) })
                      }
                      decimal={false}
                    />
                  </>
                ) : null}
              </View>
            ) : null}

            <View className="gap-2">
              <View className="flex-row items-center justify-between gap-3">
                <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {COPY.slPips}
                </Text>
                <CheckboxRow
                  label={COPY.usePredefinedSl}
                  value={form.usePredefinedSl}
                  onChange={v => patchForm({ usePredefinedSl: v })}
                />
              </View>
              <NumberField
                value={numberToInput(form.slPips, '30')}
                onChange={raw => patchForm({ slPips: Math.max(1, Number(raw) || 1) })}
                decimal={false}
              />
            </View>

            {/* TP levels */}
            <View className="gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
              <View className="gap-2">
                <View className="flex-row items-start justify-between gap-2">
                  <View className="min-w-0 flex-1">
                    <Text className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                      {COPY.tpLevelsTitle}
                    </Text>
                    <MutedText className="mt-0.5 text-xs">{COPY.tpLevelsHint}</MutedText>
                  </View>
                </View>
                <View className="flex-row flex-wrap items-center justify-between gap-2">
                  <CheckboxRow
                    label={COPY.usePredefinedTp}
                    value={form.usePredefinedTp}
                    onChange={v => patchForm({ usePredefinedTp: v })}
                  />
                  <Pressable onPress={addTpRow} className="rounded-lg px-2 py-1">
                    <Text className="text-sm font-semibold text-teal-700 dark:text-teal-300">
                      {COPY.addTp}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {form.tpPips.map((pips, idx) => {
                const row = form.tpLots[idx] ?? {
                  label: `TP${idx + 1}`,
                  lot: 0.01,
                  percent: 0,
                  enabled: true,
                }
                return (
                  <View
                    key={`calc-tp-${idx}`}
                    className="gap-2 rounded-lg border border-neutral-100 bg-neutral-50/80 p-2.5 dark:border-neutral-800 dark:bg-neutral-800/40"
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        {row.label || COPY.tpLabel(idx + 1)}
                      </Text>
                      <View className="flex-row items-center gap-3">
                        <View className="flex-row items-center gap-1.5">
                          <Text className="text-xs text-neutral-500">{COPY.enabled}</Text>
                          <Switch
                            value={row.enabled !== false}
                            onValueChange={v => toggleTpRow(idx, v)}
                            trackColor={{ false: '#d4d4d4', true: tscTheme.primary }}
                            thumbColor="#ffffff"
                          />
                        </View>
                        <Pressable
                          disabled={form.tpPips.length <= 1}
                          onPress={() => removeTpRow(idx)}
                          className={cn(form.tpPips.length <= 1 && 'opacity-40')}
                        >
                          <Text className="text-xs font-medium text-neutral-500">{COPY.remove}</Text>
                        </Pressable>
                      </View>
                    </View>
                    <View className="flex-row gap-2">
                      <View className="flex-1">
                        <NumberField
                          label={COPY.tpPipsCol}
                          value={String(pips)}
                          onChange={raw => setTpPipAt(idx, raw)}
                          decimal={false}
                        />
                      </View>
                      <View className="flex-1">
                        <NumberField
                          label={COPY.tpPercentCol}
                          value={String(row.percent ?? 0)}
                          onChange={raw => setTpLotPercent(idx, raw)}
                          disabled={row.enabled === false}
                        />
                      </View>
                    </View>
                  </View>
                )
              })}

              <View className="flex-row flex-wrap items-center justify-between gap-2 border-t border-neutral-200 pt-2 dark:border-neutral-700">
                <Text className="text-xs text-neutral-600 dark:text-neutral-400">
                  {COPY.tpPercentTotal}{' '}
                  <Text
                    className={cn(
                      'font-semibold',
                      tpPercentTotal === 100 ? 'text-emerald-600' : 'text-amber-600',
                    )}
                  >
                    {tpPercentTotal}%
                  </Text>{' '}
                  / 100%
                </Text>
                {tpPercentTotal !== 100 ? (
                  <Text className="text-xs text-amber-600 dark:text-amber-400">
                    {tpPercentTotal < 100
                      ? COPY.tpUnallocated(100 - tpPercentTotal)
                      : COPY.tpOverCap}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Advanced */}
            <View className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
              <Pressable
                onPress={() => setAdvancedOpen(v => !v)}
                className="flex-row items-center justify-between px-3 py-2.5"
              >
                <Text className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                  {COPY.advanced}
                </Text>
                {advancedOpen ? (
                  <ChevronUp size={16} color="#94a3b8" />
                ) : (
                  <ChevronDown size={16} color="#94a3b8" />
                )}
              </Pressable>
              {advancedOpen ? (
                <View className="border-t border-neutral-200 px-3 py-3 dark:border-neutral-800">
                  <NumberField
                    label={COPY.winRate}
                    value={form.winRatePct != null ? String(form.winRatePct) : ''}
                    onChange={raw =>
                      patchForm({
                        winRatePct:
                          raw.trim() === ''
                            ? null
                            : Math.max(1, Math.min(99, Number(raw) || 0)),
                      })
                    }
                    hint={COPY.winRateHint}
                    decimal={false}
                  />
                </View>
              ) : null}
            </View>
          </View>

          {/* Results */}
          <View className="bg-neutral-50 dark:bg-neutral-800/30">
            <Text className="border-b border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-900 dark:border-neutral-700 dark:text-neutral-50">
              {COPY.resultsTitle}
            </Text>
            <View className="gap-3 p-4">
              <View className={cn('rounded-lg border px-3 py-2.5', riskPctTone(result.riskPctFull))}>
                <Text className={cn('text-xs uppercase tracking-wide opacity-80', riskPctTextTone(result.riskPctFull))}>
                  {COPY.riskPct}
                </Text>
                <Text className={cn('text-2xl font-semibold tabular-nums', riskPctTextTone(result.riskPctFull))}>
                  {result.riskPctFull.toFixed(2)}%
                </Text>
                <Text className={cn('mt-1 text-sm tabular-nums', riskPctTextTone(result.riskPctFull))}>
                  {fmtMoney(result.riskFullBasket)}
                </Text>
                {riskWarning ? (
                  <Text className={cn('mt-2 text-xs', riskPctTextTone(result.riskPctFull))}>
                    {riskWarning}
                  </Text>
                ) : null}
              </View>

              {result.riskImmediateOnly != null ? (
                <ResultCard
                  label={COPY.riskImmediate}
                  value={fmtMoney(result.riskImmediateOnly)}
                  hint={
                    result.riskPctImmediate != null
                      ? `${result.riskPctImmediate.toFixed(2)}%`
                      : undefined
                  }
                />
              ) : null}

              <ResultCard
                label={COPY.rewardTotal}
                value={fmtMoney(result.totalReward)}
                hint={
                  result.rewardRiskRatio != null
                    ? `${COPY.rewardRiskRatio}: 1:${result.rewardRiskRatio.toFixed(2)}`
                    : undefined
                }
              />

              <View className="rounded-lg border border-neutral-200 bg-white px-3 py-2.5 dark:border-neutral-700 dark:bg-neutral-900">
                <Text className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  {COPY.legSummary}
                </Text>
                {result.legs.fallsBackSingle || form.tradeStyle === 'single' ? (
                  <Text className="mt-1 text-sm text-neutral-900 dark:text-neutral-50">
                    {COPY.legSummarySingle(String(form.fixedLot))}
                  </Text>
                ) : (
                  <>
                    <Text className="mt-1 text-sm text-neutral-900 dark:text-neutral-50">
                      {COPY.legSummaryMulti(
                        String(result.legs.totalLegs),
                        String(result.legs.perLegLot),
                        String(result.legs.immediateLegs),
                        String(result.legs.pendingLegs),
                      )}
                    </Text>
                    {form.rangeTrading && result.legs.effectiveRangeSpanPips != null ? (
                      <Text className="mt-1 text-xs text-neutral-500">
                        {COPY.legSummaryRange(
                          String(result.legs.effectiveRangeSpanPips),
                          String(result.legs.pendingLegs),
                          String(form.rangeStepPips),
                        )}
                      </Text>
                    ) : null}
                  </>
                )}
              </View>

              {result.lossesToRuin != null ? (
                <ResultCard
                  label={COPY.lossesToRuin}
                  value={String(result.lossesToRuin)}
                  valueClassName="text-lg text-[#737373]"
                />
              ) : null}

              {result.riskOfRuinPct != null ? (
                <ResultCard
                  label={COPY.riskOfRuin}
                  value={`${result.riskOfRuinPct.toFixed(1)}%`}
                  valueClassName="text-lg"
                />
              ) : null}

              {result.rewardRows.length > 0 ? (
                <View className="rounded-lg border border-neutral-200 bg-white px-3 py-2.5 dark:border-neutral-700 dark:bg-neutral-900">
                  <Text className="mb-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    {COPY.perTpReward}
                  </Text>
                  {result.rewardRows.map(row => (
                    <View
                      key={`${row.label}-${row.pips}-${row.percent}`}
                      className="mb-1 flex-row justify-between gap-2"
                    >
                      <Text className="flex-1 text-xs tabular-nums text-neutral-700 dark:text-neutral-300">
                        {row.label}: {roundLots2(row.lots)} lots @ {row.pips}p ({row.percent}%)
                      </Text>
                      <Text className="text-xs tabular-nums text-neutral-900 dark:text-neutral-50">
                        {fmtMoney(Number(row.reward.toFixed(2)))}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {result.notes.includes('multi_trade_fallback_min_lot') ? (
                <Text className="text-xs text-amber-700 dark:text-amber-300">
                  {COPY.fallbackSingleNote}
                </Text>
              ) : null}
              <MutedText className="text-xs">{COPY.brokerPreviewNote}</MutedText>
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View className="flex-row gap-2 border-t border-neutral-100 px-4 py-4 dark:border-neutral-800">
          <View className="flex-1">
            <Button label={COPY.cancel} variant="secondary" onPress={onClose} />
          </View>
          <View className="flex-1">
            <Button label={COPY.apply} onPress={handleApply} />
          </View>
        </View>
      </View>
    </Modal>
  )
}
