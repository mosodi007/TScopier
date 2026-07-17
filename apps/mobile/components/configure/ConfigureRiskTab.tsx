import type { ManualSettings } from '@tscopier/shared'
import {
  ConfigSection,
  NumberField,
  SegmentedControl,
  SwitchRow,
  numberToInput,
  parseOptionalNumber,
} from '@/components/configure/formControls'
import { MutedText } from '@/components/ui'

interface ConfigureRiskTabProps {
  settings: ManualSettings
  onChange: (patch: Partial<ManualSettings>) => void
  allowMultiTrade: boolean
}

export function ConfigureRiskTab({ settings, onChange, allowMultiTrade }: ConfigureRiskTabProps) {
  const tradeStyle = settings.trade_style === 'multi' ? 'multi' : 'single'
  const riskMode = settings.risk_mode === 'dynamic_balance_percent' ? 'dynamic_balance_percent' : 'fixed_lot'
  const singleTp = settings.single_tp_target ?? 'farthest'

  return (
    <>
      <ConfigSection
        title="Trade style"
        subtitle="Single Trade closes into one target. Multi Trades can split size across TP levels and optional range layering."
      >
        <SegmentedControl
          value={tradeStyle}
          onChange={next => {
            if (next === 'multi' && !allowMultiTrade) return
            onChange({
              trade_style: next,
              range_trading: next === 'multi' ? settings.range_trading : false,
            })
          }}
          options={[
            { id: 'single', label: 'Single Trade' },
            { id: 'multi', label: allowMultiTrade ? 'Multi Trades' : 'Multi Trades (Advanced)' },
          ]}
        />
        {!allowMultiTrade ? (
          <MutedText className="text-xs">Multi Trades / Range Trading requires an Advanced plan.</MutedText>
        ) : null}
      </ConfigSection>

      <ConfigSection title="Risk mode" subtitle="How lot size is calculated for new entries.">
        <SegmentedControl
          value={riskMode}
          onChange={next => onChange({ risk_mode: next })}
          options={[
            { id: 'fixed_lot', label: 'Fixed lot' },
            { id: 'dynamic_balance_percent', label: '% of balance' },
          ]}
        />
        {riskMode === 'fixed_lot' ? (
          <NumberField
            label="Fixed lot"
            value={numberToInput(settings.fixed_lot, '0.01')}
            onChange={raw => {
              const n = parseOptionalNumber(raw)
              if (n != null) onChange({ fixed_lot: n })
            }}
            placeholder="0.01"
            hint="Required. Must be greater than 0."
          />
        ) : (
          <NumberField
            label="Balance percent"
            value={numberToInput(settings.dynamic_balance_percent, '1')}
            onChange={raw => {
              const n = parseOptionalNumber(raw)
              if (n != null) onChange({ dynamic_balance_percent: n })
            }}
            placeholder="1"
            hint="Percent of account balance used to size the trade."
          />
        )}
      </ConfigSection>

      {tradeStyle === 'single' ? (
        <ConfigSection title="Single TP target" subtitle="Which take-profit level a single trade aims for.">
          <SegmentedControl
            value={singleTp}
            onChange={next => onChange({ single_tp_target: next })}
            options={[
              { id: 'farthest', label: 'Farthest TP' },
              { id: 'tp1', label: 'TP1' },
              { id: 'tp2', label: 'TP2' },
              { id: 'tp3', label: 'TP3' },
            ]}
          />
          <SwitchRow
            label="Use signal entry price"
            hint="Compare live quote to signal entry ± pip tolerance before market fill."
            value={settings.use_signal_entry_price === true}
            onValueChange={next => onChange({ use_signal_entry_price: next })}
          />
          {settings.use_signal_entry_price ? (
            <NumberField
              label="Entry pip tolerance"
              value={numberToInput(settings.signal_entry_pip_tolerance, '10')}
              onChange={raw => {
                const n = parseOptionalNumber(raw)
                if (n != null) onChange({ signal_entry_pip_tolerance: n })
              }}
            />
          ) : null}
        </ConfigSection>
      ) : (
        <ConfigSection title="Multi Trades" subtitle="Split size across legs and optional range layering.">
          <NumberField
            label="Leg size (% of lot)"
            value={numberToInput(settings.multi_trade_leg_percent, '5')}
            onChange={raw => {
              const n = parseOptionalNumber(raw)
              if (n != null) onChange({ multi_trade_leg_percent: n })
            }}
            hint="Each leg uses this percent of the resolved fixed lot."
          />
          <SwitchRow
            label="Use signal entry range"
            hint="Wait for price/zone ± tolerance before filling multi-trade legs."
            value={settings.use_signal_entry_range === true}
            onValueChange={next => onChange({ use_signal_entry_range: next })}
          />
          <SwitchRow
            label="Range trading"
            hint="Reserve part of the basket for pending range layering."
            value={settings.range_trading === true}
            onValueChange={next => onChange({ range_trading: next })}
          />
          {settings.range_trading ? (
            <>
              <NumberField
                label="Range percent"
                value={numberToInput(settings.range_percent, '50')}
                onChange={raw => {
                  const n = parseOptionalNumber(raw)
                  if (n != null) onChange({ range_percent: n })
                }}
              />
              <NumberField
                label="Range step (pips)"
                value={numberToInput(settings.range_step_pips, '3')}
                onChange={raw => {
                  const n = parseOptionalNumber(raw)
                  if (n != null) onChange({ range_step_pips: n })
                }}
              />
              <NumberField
                label="Range distance (pips)"
                value={numberToInput(settings.range_distance_pips, '30')}
                onChange={raw => {
                  const n = parseOptionalNumber(raw)
                  if (n != null) onChange({ range_distance_pips: n })
                }}
              />
              <SwitchRow
                label="Layer until basket flat"
                value={settings.range_layer_till_close === true}
                onValueChange={next => onChange({ range_layer_till_close: next })}
              />
            </>
          ) : null}
          <SwitchRow
            label="Close worse entries"
            hint="Auto-close immediate legs at a pip distance from the signal anchor."
            value={settings.close_worse_entries === true}
            onValueChange={next => onChange({ close_worse_entries: next })}
          />
          {settings.close_worse_entries ? (
            <NumberField
              label="Close worse entries (pips)"
              value={numberToInput(settings.close_worse_entries_pips, '30')}
              onChange={raw => {
                const n = parseOptionalNumber(raw)
                if (n != null) onChange({ close_worse_entries_pips: n })
              }}
            />
          ) : null}
        </ConfigSection>
      )}
    </>
  )
}
