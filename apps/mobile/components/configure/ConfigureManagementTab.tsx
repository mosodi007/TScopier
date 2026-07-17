import type { ManualSettings } from '@tscopier/shared'
import {
  ConfigSection,
  NumberField,
  SegmentedControl,
  SwitchRow,
  numberToInput,
  parseOptionalNumber,
} from '@/components/configure/formControls'

interface ConfigureManagementTabProps {
  settings: ManualSettings
  onChange: (patch: Partial<ManualSettings>) => void
}

export function ConfigureManagementTab({ settings, onChange }: ConfigureManagementTabProps) {
  const beMode = settings.move_sl_to_entry_after_mode ?? 'none'
  const beType = settings.move_sl_to_entry_type === 'sl_and_close_half' ? 'sl_and_close_half' : 'sl_only'
  const isMulti = settings.trade_style === 'multi'

  return (
    <>
      <ConfigSection
        title="Move SL / breakeven"
        subtitle="After price moves in your favor, move stop loss to entry (optionally with a partial close)."
      >
        <SegmentedControl
          value={beMode}
          onChange={next => onChange({ move_sl_to_entry_after_mode: next })}
          options={[
            { id: 'none', label: 'Off' },
            { id: 'pips', label: 'Pips' },
            { id: 'rr', label: 'R:R' },
            { id: 'money', label: '$' },
            { id: 'tp_hit', label: 'TP hit' },
          ]}
        />
        {beMode !== 'none' ? (
          <>
            {beMode === 'tp_hit' ? (
              <NumberField
                label="TP index"
                value={numberToInput(settings.move_sl_to_entry_tp_index, '1')}
                decimal={false}
                onChange={raw => {
                  const n = parseOptionalNumber(raw)
                  if (n != null) onChange({ move_sl_to_entry_tp_index: Math.max(1, Math.round(n)) })
                }}
              />
            ) : (
              <NumberField
                label={beMode === 'rr' ? 'R:R value' : beMode === 'money' ? 'Profit ($)' : 'Pips'}
                value={numberToInput(settings.move_sl_to_entry_after_value, beMode === 'rr' ? '1' : '10')}
                onChange={raw => {
                  const n = parseOptionalNumber(raw)
                  if (n != null) onChange({ move_sl_to_entry_after_value: n })
                }}
              />
            )}
            <SegmentedControl
              value={beType}
              onChange={next => onChange({ move_sl_to_entry_type: next })}
              options={[
                { id: 'sl_only', label: 'Move SL only' },
                { id: 'sl_and_close_half', label: 'SL + partial close' },
              ]}
            />
            <NumberField
              label="Breakeven offset (pips)"
              value={numberToInput(settings.breakeven_offset_pips, '3')}
              onChange={raw => {
                const n = parseOptionalNumber(raw)
                if (n != null) onChange({ breakeven_offset_pips: n })
              }}
            />
            {beType === 'sl_and_close_half' ? (
              <NumberField
                label="Partial close %"
                value={numberToInput(settings.partial_close_percent ?? settings.half_close_percent, '50')}
                onChange={raw => {
                  const n = parseOptionalNumber(raw)
                  if (n != null) onChange({ partial_close_percent: n, half_close_percent: n })
                }}
              />
            ) : null}
          </>
        ) : null}
      </ConfigSection>

      <ConfigSection
        title="Trailing stop"
        subtitle={isMulti ? 'Trailing is available for Single Trade only.' : 'Ratchet stop loss as price moves in your favor.'}
      >
        <SwitchRow
          label="Enable trailing"
          value={settings.trailing_enabled === true && !isMulti}
          disabled={isMulti}
          onValueChange={next => onChange({ trailing_enabled: next })}
        />
        {settings.trailing_enabled && !isMulti ? (
          <>
            <NumberField
              label="Start (pips)"
              value={numberToInput(settings.trailing_start_pips, '20')}
              onChange={raw => {
                const n = parseOptionalNumber(raw)
                if (n != null) onChange({ trailing_start_pips: n })
              }}
            />
            <NumberField
              label="Step (pips)"
              value={numberToInput(settings.trailing_step_pips, '5')}
              onChange={raw => {
                const n = parseOptionalNumber(raw)
                if (n != null) onChange({ trailing_step_pips: n })
              }}
            />
            <NumberField
              label="Distance (pips)"
              value={numberToInput(settings.trailing_distance_pips, '10')}
              onChange={raw => {
                const n = parseOptionalNumber(raw)
                if (n != null) onChange({ trailing_distance_pips: n })
              }}
            />
          </>
        ) : null}
      </ConfigSection>

      <ConfigSection title="Signal behavior" subtitle="How new and opposite signals interact with open trades.">
        <SwitchRow
          label="Reverse signal"
          hint="Flip buy/sell direction from the channel."
          value={settings.reverse_signal === true}
          onValueChange={next => onChange({ reverse_signal: next })}
        />
        <SwitchRow
          label="Add to existing"
          hint="Allow additional entries while a position is already open."
          value={settings.add_new_trades_to_existing !== false}
          onValueChange={next => onChange({ add_new_trades_to_existing: next })}
        />
        <SwitchRow
          label="Close on opposite signal"
          value={settings.close_on_opposite_signal === true}
          onValueChange={next => onChange({ close_on_opposite_signal: next })}
        />
        <SwitchRow
          label="Order comments"
          hint="Include TScopier metadata in MT order comments."
          value={settings.order_comments_enabled !== false}
          onValueChange={next => onChange({ order_comments_enabled: next })}
        />
        <NumberField
          label="Pending expiry (hours)"
          value={numberToInput(settings.pending_expiry_hours, '1')}
          onChange={raw => {
            const n = parseOptionalNumber(raw)
            if (n != null) onChange({ pending_expiry_hours: n })
          }}
        />
      </ConfigSection>
    </>
  )
}
