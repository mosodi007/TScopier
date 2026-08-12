import { Text, View } from 'react-native'
import { cn } from '@/lib/cn'

interface AuthAlertProps {
  children: string
  variant?: 'error' | 'success'
}

export function AuthAlert({ children, variant = 'error' }: AuthAlertProps) {
  return (
    <View
      className={cn(
        'mb-5 rounded-lg border px-3 py-2.5',
        variant === 'error'
          ? 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/40'
          : 'border-teal-200 bg-teal-50 dark:border-teal-900/50 dark:bg-teal-950/40',
      )}
    >
      <Text
        className={cn(
          'text-sm',
          variant === 'error'
            ? 'text-red-700 dark:text-red-300'
            : 'text-teal-800 dark:text-teal-200',
        )}
      >
        {children}
      </Text>
    </View>
  )
}
