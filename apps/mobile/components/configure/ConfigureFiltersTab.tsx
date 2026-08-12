import { Pressable, Text, View } from 'react-native'
import type { ManualSettings } from '@tscopier/shared'
import {
  ConfigSection,
  NumberField,
  SwitchRow,
  TextField,
  numberToInput,
  parseOptionalNumber,
} from '@/components/configure/formControls'
import { cn } from '@/lib/cn'

interface ConfigureFiltersTabProps {
  settings: ManualSettings
  onChange: (patch: Partial<ManualSettings>) => void
}

const WEEK_DAYS: Array<{ id: number; label: string }> = [
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
  { id: 0, label: 'Sun' },
]

const NEWS_IMPACTS: Array<{ id: 'high' | 'medium' | 'low'; label: string }> = [
  { id: 'high', label: 'High' },
  { id: 'medium', label: 'Medium' },
  { id: 'low', label: 'Low' },
]

export function ConfigureFiltersTab({ settings, onChange }: ConfigureFiltersTabProps) {
  const tradeDays = settings.trade_days ?? [1, 2, 3, 4, 5]
  const impacts = settings.news_avoid_impacts ?? ['high']

  const toggleDay = (day: number) => {
    const next = tradeDays.includes(day)
      ? tradeDays.filter(d => d !== day)
      : [...tradeDays, day].sort((a, b) => a - b)
    onChange({ trade_days: next })
  }

  const toggleImpact = (impact: 'high' | 'medium' | 'low') => {
    const next = impacts.includes(impact)
      ? impacts.filter(i => i !== impact)
      : [...impacts, impact]
    onChange({ news_avoid_impacts: next })
  }

  return (
    <>
      <ConfigSection title="Time window" subtitle="Only copy signals inside this local time range.">
        <SwitchRow
          label="Enable time filter"
          value={settings.time_filter_enabled === true}
          onValueChange={next => onChange({ time_filter_enabled: next })}
        />
        {settings.time_filter_enabled ? (
          <View className="flex-row gap-3">
            <View className="flex-1">
              <TextField
                label="Start (HH:MM)"
                value={settings.trade_start_time ?? '00:00'}
                onChange={next => onChange({ trade_start_time: next })}
                placeholder="00:00"
              />
            </View>
            <View className="flex-1">
              <TextField
                label="End (HH:MM)"
                value={settings.trade_end_time ?? '23:59'}
                onChange={next => onChange({ trade_end_time: next })}
                placeholder="23:59"
              />
            </View>
          </View>
        ) : null}
      </ConfigSection>

      <ConfigSection title="Trading days" subtitle="Days of the week when copying is allowed.">
        <SwitchRow
          label="Enable day filter"
          value={settings.days_filter_enabled === true}
          onValueChange={next => onChange({ days_filter_enabled: next })}
        />
        {settings.days_filter_enabled ? (
          <View className="flex-row flex-wrap gap-2">
            {WEEK_DAYS.map(day => {
              const selected = tradeDays.includes(day.id)
              return (
                <Pressable
                  key={day.id}
                  onPress={() => toggleDay(day.id)}
                  className={cn(
                    'rounded-full border px-3 py-1.5',
                    selected
                      ? 'border-teal-600 bg-teal-50 dark:border-teal-500 dark:bg-teal-950/50'
                      : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900',
                  )}
                >
                  <Text
                    className={cn(
                      'text-xs font-medium',
                      selected ? 'text-teal-700 dark:text-teal-400' : 'text-neutral-600 dark:text-neutral-300',
                    )}
                  >
                    {day.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        ) : null}
      </ConfigSection>

      <ConfigSection
        title="News filter"
        subtitle="Skip or pause around economic calendar events when news trading is off."
      >
        <SwitchRow
          label="Allow news trading"
          hint="When off, avoid selected impact levels around news."
          value={settings.news_trading_enabled !== false}
          onValueChange={next =>
            onChange({
              news_trading_enabled: next,
              allow_high_impact_news: next,
            })
          }
        />
        {settings.news_trading_enabled === false ? (
          <>
            <Text className="text-sm text-neutral-600 dark:text-neutral-300">Avoid impacts</Text>
            <View className="flex-row flex-wrap gap-2">
              {NEWS_IMPACTS.map(impact => {
                const selected = impacts.includes(impact.id)
                return (
                  <Pressable
                    key={impact.id}
                    onPress={() => toggleImpact(impact.id)}
                    className={cn(
                      'rounded-full border px-3 py-1.5',
                      selected
                        ? 'border-teal-600 bg-teal-50 dark:border-teal-500 dark:bg-teal-950/50'
                        : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900',
                    )}
                  >
                    <Text
                      className={cn(
                        'text-xs font-medium',
                        selected ? 'text-teal-700 dark:text-teal-400' : 'text-neutral-600 dark:text-neutral-300',
                      )}
                    >
                      {impact.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
            <NumberField
              label="Close before news (minutes)"
              value={numberToInput(settings.close_before_news_minutes, '30')}
              decimal={false}
              onChange={raw => {
                const n = parseOptionalNumber(raw)
                if (n != null) onChange({ close_before_news_minutes: n })
              }}
            />
            <NumberField
              label="Resume after news (minutes)"
              value={numberToInput(settings.resume_after_news_minutes, '15')}
              decimal={false}
              onChange={raw => {
                const n = parseOptionalNumber(raw)
                if (n != null) onChange({ resume_after_news_minutes: n })
              }}
            />
          </>
        ) : null}
      </ConfigSection>
    </>
  )
}
