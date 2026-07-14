import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  type PressableProps,
  type TextInputProps,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { cn } from '@/lib/cn'

export function Screen({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} className={cn('flex-1 bg-neutral-950 px-4', className)}>
      {children}
    </SafeAreaView>
  )
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <View className={cn('rounded-2xl border border-neutral-800 bg-neutral-900 p-4', className)}>
      {children}
    </View>
  )
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text className="text-2xl font-semibold text-white">{children}</Text>
}

export function Subtitle({ children }: { children: React.ReactNode }) {
  return <Text className="mt-1 text-sm text-neutral-400">{children}</Text>
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
      ? 'bg-teal-700'
      : variant === 'danger'
        ? 'bg-red-900'
        : 'border border-neutral-700 bg-neutral-800'

  return (
    <Pressable
      className={cn(base, styles, (disabled || loading) && 'opacity-60', className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text className="font-semibold text-white">{label}</Text>
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
      <Text className="mb-1 text-sm text-neutral-300">{label}</Text>
      <TextInput
        className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-3 text-base text-white"
        placeholderTextColor="#64748b"
        {...inputProps}
      />
    </View>
  )
}

export function ErrorText({ children }: { children?: string | null }) {
  if (!children) return null
  return <Text className="mb-3 text-sm text-red-400">{children}</Text>
}
