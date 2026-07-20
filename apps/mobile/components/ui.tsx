import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  type PressableProps,
  type TextInputProps,
  type TextProps,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { cn } from '@/lib/cn'

export function Screen({
  children,
  className,
  /** When false, omit default horizontal padding (edge-to-edge content). */
  padded = true,
}: {
  children: React.ReactNode
  className?: string
  padded?: boolean
}) {
  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      className={cn(
        'flex-1 bg-neutral-50 font-sans dark:bg-neutral-950',
        padded && 'px-4',
        className,
      )}
    >
      {children}
    </SafeAreaView>
  )
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <View
      className={cn(
        'rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900',
        className,
      )}
    >
      {children}
    </View>
  )
}

export function Title({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Text className={cn('text-2xl font-semibold text-neutral-900 dark:text-neutral-50 font-sans', className)}>
      {children}
    </Text>
  )
}

export function Subtitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Text className={cn('mt-1 text-sm text-neutral-500 dark:text-neutral-400 font-sans', className)}>
      {children}
    </Text>
  )
}

export function HeadingText({ children, className }: TextProps & { className?: string }) {
  return (
    <Text className={cn('font-semibold text-neutral-900 dark:text-neutral-50 font-sans', className)}>
      {children}
    </Text>
  )
}

export function BodyText({ children, className }: TextProps & { className?: string }) {
  return (
    <Text className={cn('text-neutral-700 dark:text-neutral-300 font-sans', className)}>{children}</Text>
  )
}

export function MutedText({ children, className }: TextProps & { className?: string }) {
  return (
    <Text className={cn('text-neutral-500 dark:text-neutral-400', className)}>{children}</Text>
  )
}

export function LabelText({ children, className }: TextProps & { className?: string }) {
  return (
    <Text className={cn('text-xs text-neutral-500 dark:text-neutral-400', className)}>{children}</Text>
  )
}

export function ValueText({ children, className }: TextProps & { className?: string }) {
  return (
    <Text className={cn('text-base text-neutral-900 dark:text-neutral-50', className)}>{children}</Text>
  )
}

export function AccentText({ children, className }: TextProps & { className?: string }) {
  return (
    <Text className={cn('text-teal-600 dark:text-teal-400', className)}>{children}</Text>
  )
}

export function pnlTextClass(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value === 0) {
    return 'text-neutral-900 dark:text-neutral-50'
  }
  return value > 0 ? 'text-teal-600 dark:text-teal-400' : 'text-[#737373]'
}

export function Button({
  label,
  variant = 'primary',
  loading,
  className,
  disabled,
  ...props
}: PressableProps & {
  label: string
  variant?: 'primary' | 'secondary' | 'danger'
  loading?: boolean
}) {
  const base = 'rounded-xl px-4 py-3 items-center justify-center flex-row'
  const styles =
    variant === 'primary'
      ? 'bg-teal-600 active:bg-teal-700'
      : variant === 'danger'
        ? 'bg-error-600'
        : 'border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800'

  const labelClass =
    variant === 'secondary'
      ? 'font-semibold text-neutral-900 dark:text-neutral-50'
      : 'font-semibold text-white'

  return (
    <Pressable
      className={cn(base, styles, (disabled || loading) && 'opacity-60', className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text className={labelClass}>{label}</Text>
      )}
    </Pressable>
  )
}

export function Field({
  label,
  className,
  ...inputProps
}: TextInputProps & { label: string; className?: string }) {
  return (
    <View className={cn('mb-4', className)}>
      <Text className="mb-1 text-sm text-neutral-600 dark:text-neutral-300">{label}</Text>
      <TextInput
        className="rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base text-neutral-900 font-sans dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
        placeholderTextColor="#64748b"
        {...inputProps}
      />
    </View>
  )
}

export function ErrorText({ children }: { children?: string | null }) {
  if (!children) return null
  return <Text className="mb-3 text-sm text-error-600">{children}</Text>
}
