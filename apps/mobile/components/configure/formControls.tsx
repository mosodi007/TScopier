import { Pressable, Switch, Text, TextInput, View } from 'react-native'
import { cn } from '@/lib/cn'
import { tscTheme } from '@/lib/tscTheme'
import { Card, HeadingText, MutedText } from '@/components/ui'

export function ConfigSection({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <Card className="gap-3">
      <View>
        <HeadingText className="text-base">{title}</HeadingText>
        {subtitle ? <MutedText className="mt-1 text-xs">{subtitle}</MutedText> : null}
      </View>
      {children}
    </Card>
  )
}

export function SwitchRow({
  label,
  hint,
  value,
  onValueChange,
  disabled,
}: {
  label: string
  hint?: string
  value: boolean
  onValueChange: (next: boolean) => void
  disabled?: boolean
}) {
  return (
    <View className="flex-row items-center gap-3 py-1">
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{label}</Text>
        {hint ? <MutedText className="mt-0.5 text-xs">{hint}</MutedText> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: '#d4d4d4', true: tscTheme.primary }}
        thumbColor="#ffffff"
      />
    </View>
  )
}

export function NumberField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  decimal = true,
  disabled,
}: {
  label: string
  value: string
  onChange: (next: string) => void
  placeholder?: string
  hint?: string
  decimal?: boolean
  disabled?: boolean
}) {
  return (
    <View>
      <Text className="mb-1 text-sm text-neutral-600 dark:text-neutral-300">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        editable={!disabled}
        className={cn(
          'rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50',
          disabled && 'opacity-50',
        )}
      />
      {hint ? <MutedText className="mt-1 text-xs">{hint}</MutedText> : null}
    </View>
  )
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  multiline,
}: {
  label: string
  value: string
  onChange: (next: string) => void
  placeholder?: string
  hint?: string
  multiline?: boolean
}) {
  return (
    <View>
      <Text className="mb-1 text-sm text-neutral-600 dark:text-neutral-300">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        multiline={multiline}
        className={cn(
          'rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50',
          multiline && 'min-h-[88px]',
        )}
      />
      {hint ? <MutedText className="mt-1 text-xs">{hint}</MutedText> : null}
    </View>
  )
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ id: T; label: string }>
  value: T
  onChange: (next: T) => void
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map(option => {
        const selected = option.id === value
        return (
          <Pressable
            key={option.id}
            onPress={() => onChange(option.id)}
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
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export function parseOptionalNumber(raw: string): number | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : undefined
}

export function numberToInput(value: number | null | undefined, fallback = ''): string {
  if (value == null || !Number.isFinite(value)) return fallback
  return String(value)
}
