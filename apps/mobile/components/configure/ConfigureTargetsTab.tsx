import { Pressable, Switch, Text, View } from 'react-native'
import { Trash2 } from 'lucide-react-native'
import type { ManualSettings, ManualTpLot } from '@tscopier/shared'
import {
  DEFAULT_COPY_LIMITS,
  normalizeCopyLimits,
  type CopyLimitPeriod,
  type CopyLimitsConfig,
  type MaxRiskRule,
  type ProfitTargetRule,
} from '@tscopier/web-lib/copyLimitTypes'
import {
  ConfigSection,
  NumberField,
  SegmentedControl,
  SwitchRow,
  TextField,
  numberToInput,
  parseOptionalNumber,
} from '@/components/configure/formControls'
import { tscTheme } from '@/lib/tscTheme'

interface ConfigureTargetsTabProps {
  settings: ManualSettings
  onChange: (patch: Partial<ManualSettings>) => void
}

const PERIODS: Array<{ id: CopyLimitPeriod; label: string }> = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'overall', label: 'Overall' },
]

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function ConfigureTargetsTab({ settings, onChange }: ConfigureTargetsTabProps) {
  const tpLots = (settings.tp_lots?.length
    ? settings.tp_lots
    : [
        { label: 'TP1', lot: 0.01, percent: 50, enabled: true },
        { label: 'TP2', lot: 0.01, percent: 30, enabled: true },
        { label: 'TP3', lot: 0.01, percent: 20, enabled: true },
      ]) as ManualTpLot[]

  const predefinedTps = (settings.predefined_tp_pips ?? [20, 40, 60]).join(', ')
  const limits = normalizeCopyLimits(settings.copy_limits ?? DEFAULT_COPY_LIMITS)

  const patchLimits = (patch: Partial<CopyLimitsConfig>) => {
    onChange({ copy_limits: normalizeCopyLimits({ ...limits, ...patch }) })
  }

  const updateTpLot = (index: number, patch: Partial<ManualTpLot>) => {
    const next = tpLots.map((row, i) => (i === index ? { ...row, ...patch } : row))
    onChange({ tp_lots: next })
  }

  return (
    <>
      <ConfigSection
        title="TP distribution"
        subtitle="How Multi Trades allocate size across take-profit levels (percent of total)."
      >
        {tpLots.map((row, index) => (
          <View
            key={`${row.label}-${index}`}
            className="gap-3 rounded-xl border border-neutral-100 p-3 dark:border-neutral-800"
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                {row.label || `TP${index + 1}`}
              </Text>
              <Switch
                value={row.enabled !== false}
                onValueChange={next => updateTpLot(index, { enabled: next })}
                trackColor={{ false: '#d4d4d4', true: tscTheme.primary }}
                thumbColor="#ffffff"
              />
            </View>
            <NumberField
              label="Percent"
              value={numberToInput(row.percent, '0')}
              onChange={raw => {
                const n = parseOptionalNumber(raw)
                if (n != null) updateTpLot(index, { percent: n })
              }}
            />
          </View>
        ))}
      </ConfigSection>

      <ConfigSection title="Predefined SL / TP" subtitle="Override signal stops with fixed pip distances from entry.">
        <SwitchRow
          label="Use predefined SL"
          value={settings.use_predefined_sl_pips === true}
          onValueChange={next => onChange({ use_predefined_sl_pips: next })}
        />
        {settings.use_predefined_sl_pips ? (
          <NumberField
            label="SL pips"
            value={numberToInput(settings.predefined_sl_pips, '30')}
            onChange={raw => {
              const n = parseOptionalNumber(raw)
              if (n != null) onChange({ predefined_sl_pips: n })
            }}
          />
        ) : null}
        <SwitchRow
          label="Use predefined TPs"
          value={settings.use_predefined_tp_pips === true}
          onValueChange={next => onChange({ use_predefined_tp_pips: next })}
        />
        {settings.use_predefined_tp_pips ? (
          <TextField
            label="TP pips (comma-separated)"
            value={predefinedTps}
            onChange={raw => {
              const list = raw
                .split(/[,\s]+/)
                .map(part => Number(part.trim()))
                .filter(n => Number.isFinite(n) && n > 0)
              onChange({ predefined_tp_pips: list.length ? list : [20, 40, 60] })
            }}
            hint="Example: 20, 40, 60"
          />
        ) : null}
      </ConfigSection>

      <ConfigSection title="R:R fallbacks" subtitle="Build SL/TP from risk-reward when the signal omits levels.">
        <SwitchRow
          label="R:R for SL"
          value={settings.rr_for_sl_enabled === true}
          onValueChange={next => onChange({ rr_for_sl_enabled: next })}
        />
        {settings.rr_for_sl_enabled ? (
          <NumberField
            label="SL R:R"
            value={numberToInput(settings.rr_for_sl, '1')}
            onChange={raw => {
              const n = parseOptionalNumber(raw)
              if (n != null) onChange({ rr_for_sl: n })
            }}
          />
        ) : null}
        <SwitchRow
          label="R:R for TPs"
          value={settings.rr_for_tps_enabled === true}
          onValueChange={next => onChange({ rr_for_tps_enabled: next })}
        />
        {settings.rr_for_tps_enabled ? (
          <TextField
            label="TP R:R list"
            value={(settings.rr_for_tps ?? [1, 2, 3]).join(', ')}
            onChange={raw => {
              const list = raw
                .split(/[,\s]+/)
                .map(part => Number(part.trim()))
                .filter(n => Number.isFinite(n) && n > 0)
              onChange({ rr_for_tps: list.length ? list : [1, 2, 3] })
            }}
          />
        ) : null}
      </ConfigSection>

      <ConfigSection title="Profit targets" subtitle="Pause copying when period profit reaches a target.">
        <SwitchRow
          label="Enable profit targets"
          value={limits.profit_targets_enabled}
          onValueChange={next => patchLimits({ profit_targets_enabled: next })}
        />
        {limits.profit_targets.map((row, index) => (
          <LimitRuleRow
            key={row.id}
            row={row}
            onChange={patch => {
              const next = limits.profit_targets.map((item, i) => (i === index ? { ...item, ...patch } : item))
              patchLimits({ profit_targets: next })
            }}
            onRemove={() =>
              patchLimits({ profit_targets: limits.profit_targets.filter((_, i) => i !== index) })
            }
          />
        ))}
        {limits.profit_targets.length < PERIODS.length ? (
          <Pressable
            onPress={() => {
              const used = new Set(limits.profit_targets.map(r => r.period))
              const period = PERIODS.find(p => !used.has(p.id))?.id ?? 'daily'
              const row: ProfitTargetRule = {
                id: newId('pt'),
                enabled: true,
                period,
                value_type: 'amount',
                value: 100,
              }
              patchLimits({ profit_targets: [...limits.profit_targets, row] })
            }}
            className="items-center rounded-xl border border-dashed border-neutral-300 py-3 dark:border-neutral-700"
          >
            <Text className="text-sm font-medium text-teal-600 dark:text-teal-400">Add profit target</Text>
          </Pressable>
        ) : null}
      </ConfigSection>

      <ConfigSection title="Maximum risk" subtitle="Pause copying when drawdown reaches a limit.">
        <SwitchRow
          label="Enable max risk"
          value={limits.max_risk_enabled}
          onValueChange={next => patchLimits({ max_risk_enabled: next })}
        />
        {limits.max_risks.map((row, index) => (
          <LimitRuleRow
            key={row.id}
            row={row}
            onChange={patch => {
              const next = limits.max_risks.map((item, i) => (i === index ? { ...item, ...patch } : item))
              patchLimits({ max_risks: next })
            }}
            onRemove={() => patchLimits({ max_risks: limits.max_risks.filter((_, i) => i !== index) })}
          />
        ))}
        {limits.max_risks.length < PERIODS.length ? (
          <Pressable
            onPress={() => {
              const used = new Set(limits.max_risks.map(r => r.period))
              const period = PERIODS.find(p => !used.has(p.id))?.id ?? 'daily'
              const row: MaxRiskRule = {
                id: newId('mr'),
                enabled: true,
                period,
                value_type: 'percent',
                value: 5,
              }
              patchLimits({ max_risks: [...limits.max_risks, row] })
            }}
            className="items-center rounded-xl border border-dashed border-neutral-300 py-3 dark:border-neutral-700"
          >
            <Text className="text-sm font-medium text-teal-600 dark:text-teal-400">Add max risk rule</Text>
          </Pressable>
        ) : null}
      </ConfigSection>
    </>
  )
}

function LimitRuleRow({
  row,
  onChange,
  onRemove,
}: {
  row: ProfitTargetRule | MaxRiskRule
  onChange: (patch: Partial<ProfitTargetRule & MaxRiskRule>) => void
  onRemove: () => void
}) {
  return (
    <View className="gap-3 rounded-xl border border-neutral-100 p-3 dark:border-neutral-800">
      <View className="flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
            Enabled
          </Text>
        </View>
        <Switch
          value={row.enabled}
          onValueChange={next => onChange({ enabled: next })}
          trackColor={{ false: '#d4d4d4', true: tscTheme.primary }}
          thumbColor="#ffffff"
        />
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Remove rule"
          className="rounded-lg p-2"
        >
          <Trash2 size={16} color="#dc2626" />
        </Pressable>
      </View>
      <SegmentedControl
        value={row.period}
        onChange={next => onChange({ period: next })}
        options={PERIODS}
      />
      <SegmentedControl
        value={row.value_type}
        onChange={next => onChange({ value_type: next })}
        options={[
          { id: 'amount', label: 'Amount ($)' },
          { id: 'percent', label: 'Percent (%)' },
        ]}
      />
      <NumberField
        label="Value"
        value={numberToInput(row.value, '0')}
        onChange={raw => {
          const n = parseOptionalNumber(raw)
          if (n != null) onChange({ value: n })
        }}
      />
    </View>
  )
}
