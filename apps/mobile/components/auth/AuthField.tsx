import type { ReactNode } from 'react'
import { Text, TextInput, View, type TextInputProps } from 'react-native'
import { cn } from '@/lib/cn'

interface AuthFieldProps extends TextInputProps {
  label: string
  className?: string
}

/** Auth form field styled to match web Input (rounded-lg, teal-friendly borders). */
export function AuthField({ label, className, ...inputProps }: AuthFieldProps) {
  return (
    <View className={cn('mb-4', className)}>
      <Text className="mb-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</Text>
      <TextInput
        className="rounded-lg border border-neutral-200 bg-white px-3 py-3 text-base text-neutral-900 font-sans dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
        placeholderTextColor="#94a3b8"
        {...inputProps}
      />
    </View>
  )
}

export function AuthHeading({ children }: { children: string }) {
  return (
    <Text className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
      {children}
    </Text>
  )
}

export function AuthSubtitle({ children }: { children: ReactNode }) {
  return <Text className="mt-2 mb-8 text-sm text-neutral-500 dark:text-neutral-400">{children}</Text>
}

export function AuthLink({ children, onPress }: { children: string; onPress: () => void }) {
  return (
    <Text
      onPress={onPress}
      className="font-medium text-teal-600 dark:text-teal-400"
      accessibilityRole="link"
    >
      {children}
    </Text>
  )
}
