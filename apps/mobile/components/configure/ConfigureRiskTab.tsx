import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { ManualSettings } from '@tscopier/shared'
import {
  estimateMultiTradeOrderCount,
  formatMultiTradeTotalOpenTradesPreview,
} from '@tscopier/web-lib/estimateMultiTradeOrders'
import {
  computeMinMultiTradeLegPercent,
  resolveMultiTradePerLegLot,
} from '@tscopier/web-lib/multiTradeLegUnits'
import {
  formatPreviewLotSize,
  resolvePreviewManualLot,
} from '@tscopier/web-lib/manualLotSizing'
import { formatMoney } from '@/lib/formatMoney'
import { MutedText } from '@/components/ui'
import { RiskLotCalculatorModal } from '@/components/configure/RiskLotCalculatorModal'
import {
  ConfigPanel,
  MonoPreview,
  NumberField,
  SelectField,
  SwitchRow,
  TogglePanel,
  numberToInput,
  parseOptionalNumber,
} from '@/components/configure/formControls'

interface ConfigureRiskTabProps {
  settings: ManualSettings
  onChange: (patch: Partial<ManualSettings>) => void
  allowMultiTrade: boolean
  accountBalance?: number | null
  currency?: string | null
}

export function ConfigureRiskTab({
  settings,
  onChange,
  allowMultiTrade,
  accountBalance,
  currency,
}: ConfigureRiskTabProps) {
  const [lotCalcOpen, setLotCalcOpen] = useState(false)

  const tradeStyle = settings.trade_style === 'multi' ? 'multi' : 'single'
  const riskMode =
    settings.risk_mode === 'dynamic_balance_percent' ? 'dynamic_balance_percent' : 'fixed_lot'
  const singleTp = settings.single_tp_target ?? 'farthest'

  const previewManualLot = useMemo(
    () =>
      resolvePreviewManualLot({
        manualSettings: settings,
        accountBalance,
      }),
    [settings, accountBalance],
  )

  const minLegPercent = useMemo(
    () => computeMinMultiTradeLegPercent(previewManualLot),
    [previewManualLot],
  )

  const legPercent = Number(settings.multi_trade_leg_percent ?? 5) || 5

  const dynamicLotPreview = useMemo(() => {
    if (riskMode !== 'dynamic_balance_percent') return null
    const lotLabel = formatPreviewLotSize(previewManualLot)
    const balance = Number(accountBalance ?? 0)
    const percent = Number(settings.dynamic_balance_percent ?? 1) || 1
    const hint =
      balance > 0
        ? `${lotLabel} lots from ${percent}% of ${formatMoney(balance, currency ?? 'USD')} balance`
        : `${lotLabel} lots (using fixed-lot fallback — account balance not loaded)`
    return { lotLabel, hint }
  }, [riskMode, previewManualLot, accountBalance, settings.dynamic_balance_percent, currency])

  const multiPreview = useMemo(() => {
    return estimateMultiTradeOrderCount({
      manualLot: previewManualLot,
      legPercent,
      range: settings.range_trading
        ? {
            enabled: true,
            percent: Number(settings.range_percent ?? 50) || 50,
            stepPips: Number(settings.range_step_pips ?? 3) || 3,
            distancePips: Number(settings.range_distance_pips ?? 30) || 30,
          }
        : undefined,
    })
  }, [
    previewManualLot,
    legPercent,
    settings.range_trading,
    settings.range_percent,
    settings.range_step_pips,
    settings.range_distance_pips,
  ])

  const totalOpenTradesLabel = useMemo(() => {
    const perLeg = resolveMultiTradePerLegLot({
      manualLot: previewManualLot,
      legPercent,
    })
    return formatMultiTradeTotalOpenTradesPreview(
      perLeg,
      multiPreview,
      {
        fallbackSingle:
          '{lot} lots x 1 trade (split not possible at 0.01 min / 0.01 step preview)',
        lotsXTrades: '{lot} lots x {total} trades',
        lotsXTradesLayered:
          '{lot} lots x {total} trades ({immediate} instant + {pending} for layering)',
      },
      formatPreviewLotSize,
    )
  }, [previewManualLot, legPercent, multiPreview])

  const symbolHint =
    settings.symbol_to_trade?.trim().split(/[,;\s]+/).filter(Boolean)[0]?.toUpperCase() ?? ''

  return (
    <View className="gap-4">
      {riskMode === 'fixed_lot' ? (
        <View className="flex-row justify-end">
          <Pressable onPress={() => setLotCalcOpen(true)} hitSlop={8}>
            <Text className="text-sm text-teal-600 underline dark:text-teal-400">
              Calculate risk / lot size
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View className="gap-3">
        <SelectField
          label="Trade Style"
          hint="Single Entry: one order at your full configured lot. Range Trading: splits that lot into many smaller orders across the signal's take-profit levels."
          value={tradeStyle}
          onChange={next => {
            if (next === 'multi' && !allowMultiTrade) return
            if (next === 'multi') {
              onChange({ trade_style: next, use_signal_entry_price: false })
            } else {
              onChange({ trade_style: next, range_trading: false })
            }
          }}
          options={
            allowMultiTrade
              ? [
                  { id: 'single', label: 'Single Entry' },
                  { id: 'multi', label: 'Range Trading' },
                ]
              : [{ id: 'single', label: 'Single Entry' }]
          }
        />
        {!allowMultiTrade ? (
          <MutedText className="text-xs">
            Only Single trade mode allowed. Multi-Trade and Range Layering settings are available on
            the Advanced plan.
          </MutedText>
        ) : null}

        <SelectField
          label="Risk Mode"
          value={riskMode}
          onChange={next => onChange({ risk_mode: next })}
          options={[
            { id: 'fixed_lot', label: 'Fixed Lot' },
            { id: 'dynamic_balance_percent', label: 'Dynamic (% Balance)' },
          ]}
        />

        {riskMode === 'dynamic_balance_percent' ? (
          <>
            <NumberField
              label="Dynamic (% Balance)"
              value={numberToInput(settings.dynamic_balance_percent, '1')}
              onChange={raw => {
                const n = parseOptionalNumber(raw)
                if (n != null) onChange({ dynamic_balance_percent: n })
              }}
              placeholder="1"
            />
            <MonoPreview
              label="Lot size for this signal"
              value={dynamicLotPreview?.lotLabel ?? '—'}
              hint={dynamicLotPreview?.hint}
            />
          </>
        ) : (
          <NumberField
            label="Fixed Lot"
            value={numberToInput(settings.fixed_lot, '0.01')}
            onChange={raw => {
              const n = parseOptionalNumber(raw)
              if (n != null && n > 0) onChange({ fixed_lot: n })
            }}
            placeholder="0.01"
          />
        )}
      </View>

      {tradeStyle !== 'multi' ? (
        <View className="gap-4">
          <SelectField
            label="Single TP target"
            hint="Choose which TP the broker order should target in Single Trade mode. Earlier TP levels can still trigger partial closes based on your TP distribution."
            value={singleTp}
            onChange={next => onChange({ single_tp_target: next })}
            options={[
              { id: 'farthest', label: 'Farthest TP (auto)' },
              { id: 'tp1', label: 'TP1' },
              { id: 'tp2', label: 'TP2' },
              { id: 'tp3', label: 'TP3' },
            ]}
          />

          <ConfigPanel title="Signal entry execution">
            <TogglePanel
              label="Use Signal Entry Price"
              value={settings.use_signal_entry_price === true}
              onValueChange={next => onChange({ use_signal_entry_price: next })}
            >
              <NumberField
                label="Pip tolerance"
                hint="Allowed distance from the signal entry level before entry is deferred."
                value={numberToInput(settings.signal_entry_pip_tolerance, '10')}
                onChange={raw => {
                  const n = parseOptionalNumber(raw)
                  if (n != null) onChange({ signal_entry_pip_tolerance: Math.max(0, n) })
                }}
                decimal={false}
              />
            </TogglePanel>
          </ConfigPanel>
        </View>
      ) : (
        <View className={allowMultiTrade ? 'gap-4' : 'relative gap-4 opacity-60'}>
          <ConfigPanel
            title="Range Trading"
            subtitle="Splits your fixed lot into many smaller orders across the signal's TPs."
          >
            <NumberField
              label="Per-leg size (% of fixed lot)"
              value={numberToInput(settings.multi_trade_leg_percent, '5')}
              onChange={raw => {
                const n = parseOptionalNumber(raw)
                if (n == null) return
                onChange({
                  multi_trade_leg_percent: Math.max(minLegPercent, Math.min(100, n)),
                })
              }}
              disabled={!allowMultiTrade}
            />
            <MonoPreview
              label="Total Open Trades"
              value={totalOpenTradesLabel}
              hint="How many trades the copier plans to open for one signal. Based on your configured lot size and per-leg size."
            />
          </ConfigPanel>

          <TogglePanel
            label="Trade Signal Range Only"
            value={settings.use_signal_entry_range === true}
            onValueChange={next => onChange({ use_signal_entry_range: next })}
            disabled={!allowMultiTrade}
          >
            <NumberField
              label="Pip tolerance"
              hint="Extra pips beyond the zone bounds within which entry may still trigger."
              value={numberToInput(settings.signal_entry_pip_tolerance, '10')}
              onChange={raw => {
                const n = parseOptionalNumber(raw)
                if (n != null) onChange({ signal_entry_pip_tolerance: Math.max(0, n) })
              }}
              decimal={false}
            />
          </TogglePanel>

          <TogglePanel
            label="Range Layering"
            value={settings.range_trading === true}
            onValueChange={next => onChange({ range_trading: next })}
            disabled={!allowMultiTrade}
          >
            <NumberField
              label="Reserved lot (% of total)"
              hint="Share of total legs reserved as pendings."
              value={numberToInput(settings.range_percent, '50')}
              onChange={raw => {
                const n = parseOptionalNumber(raw)
                if (n != null) onChange({ range_percent: Math.max(0, Math.min(100, n)) })
              }}
            />
            <NumberField
              label="Step (pips per layering)"
              hint="Pips between pendings."
              value={numberToInput(settings.range_step_pips, '3')}
              onChange={raw => {
                const n = parseOptionalNumber(raw)
                if (n != null) onChange({ range_step_pips: Math.max(1, n) })
              }}
              decimal={false}
            />
            <NumberField
              label="Range distance (pips)"
              hint={
                settings.use_signal_entry_range
                  ? 'Depth is taken from the signal entry zone when the signal includes one.'
                  : 'How far the trade is layered from entry.'
              }
              value={numberToInput(settings.range_distance_pips, '30')}
              onChange={raw => {
                const n = parseOptionalNumber(raw)
                if (n != null) onChange({ range_distance_pips: Math.max(1, n) })
              }}
              decimal={false}
              disabled={settings.use_signal_entry_range === true}
            />
            <SwitchRow
              label="Layer till close"
              hint="On: range pending orders keep opening until the whole trade is closed. Off: pendings cancel after the first take-profit."
              value={settings.range_layer_till_close === true}
              onValueChange={next => onChange({ range_layer_till_close: next })}
            />
          </TogglePanel>

          {!allowMultiTrade ? (
            <View className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 dark:border-amber-900 dark:bg-amber-950/40">
              <Text className="text-sm text-amber-900 dark:text-amber-200">
                Only Single trade mode allowed. Multi-Trade and Range Layering settings are available
                on the Advanced plan.
              </Text>
            </View>
          ) : null}
        </View>
      )}

      <RiskLotCalculatorModal
        open={lotCalcOpen}
        onClose={() => setLotCalcOpen(false)}
        onApply={onChange}
        manualSettings={settings}
        initialBalance={accountBalance ?? null}
        currency={currency}
        symbol={symbolHint}
        allowMultiTrade={allowMultiTrade}
      />
    </View>
  )
}
