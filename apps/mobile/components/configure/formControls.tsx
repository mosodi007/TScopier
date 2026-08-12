import { Pressable, Switch, Text, TextInput, View } from 'react-native'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react-native'
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

/** Web-style bordered panel used for nested risk/settings groups. */
export function ConfigPanel({
  title,
  subtitle,
  children,
  className,
}: {
  title?: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <View
      className={cn(
        'gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800',
        className,
      )}
    >
      {title ? (
        <View>
          <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{title}</Text>
          {subtitle ? <MutedText className="mt-1 text-xs">{subtitle}</MutedText> : null}
        </View>
      ) : null}
      {children}
    </View>
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

/** Web-style toggle row inside a bordered card, with optional expanded body. */
export function TogglePanel({
  label,
  value,
  onValueChange,
  children,
  disabled,
}: {
  label: string
  value: boolean
  onValueChange: (next: boolean) => void
  children?: React.ReactNode
  disabled?: boolean
}) {
  return (
    <View className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
      <View className="flex-row items-center justify-between gap-3 bg-white px-3 py-2.5 dark:bg-neutral-900">
        <Text className="min-w-0 flex-1 text-sm font-medium text-neutral-900 dark:text-neutral-50">
          {label}
        </Text>
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{ false: '#d4d4d4', true: tscTheme.primary }}
          thumbColor="#ffffff"
        />
      </View>
      {value && children ? (
        <View className="gap-2 border-t border-neutral-200 bg-neutral-50 px-3 py-3 dark:border-neutral-800 dark:bg-neutral-800/80">
          {children}
        </View>
      ) : null}
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
  label?: string
  value: string
  onChange: (next: string) => void
  placeholder?: string
  hint?: string
  decimal?: boolean
  disabled?: boolean
}) {
  return (
    <View>
      {label ? (
        <Text className="mb-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</Text>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        editable={!disabled}
        className={cn(
          'rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50',
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
      <Text className="mb-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        multiline={multiline}
        className={cn(
          'rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50',
          multiline && 'min-h-[88px]',
        )}
      />
      {hint ? <MutedText className="mt-1 text-xs">{hint}</MutedText> : null}
    </View>
  )
}

/** Web-style select: collapsed control that expands options on press. */
export function SelectField<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string
  hint?: string
  value: T
  options: Array<{ id: T; label: string }>
  onChange: (next: T) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <View className={cn(disabled && 'opacity-60')}>
      <Text className="mb-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</Text>
      <View className="overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
        <Pressable
          disabled={disabled}
          onPress={() => setOpen(v => !v)}
          className="flex-row items-center justify-between px-3 py-2.5"
        >
          <Text className="text-sm text-neutral-900 dark:text-neutral-50">
            {options.find(o => o.id === value)?.label ?? value}
          </Text>
          <ChevronDown size={16} color="#94a3b8" />
        </Pressable>
        {open ? (
          <View className="gap-1 border-t border-neutral-100 p-1.5 dark:border-neutral-800">
            {options.map(option => {
              const selected = option.id === value
              return (
                <Pressable
                  key={option.id}
                  disabled={disabled}
                  onPress={() => {
                    onChange(option.id)
                    setOpen(false)
                  }}
                  className={cn(
                    'rounded-md px-2.5 py-2',
                    selected ? 'bg-teal-50 dark:bg-teal-950/50' : 'bg-transparent',
                  )}
                >
                  <Text
                    className={cn(
                      'text-sm',
                      selected
                        ? 'font-medium text-teal-700 dark:text-teal-300'
                        : 'text-neutral-700 dark:text-neutral-300',
                    )}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        ) : null}
      </View>
      {hint ? <MutedText className="mt-1 text-xs">{hint}</MutedText> : null}
    </View>
  )
}

export function MonoPreview({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <View>
      <Text className="mb-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</Text>
      <View className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-800/50">
        <Text className="font-mono text-sm text-neutral-900 dark:text-neutral-50">{value}</Text>
      </View>
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
