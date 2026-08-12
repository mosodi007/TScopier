import { Text, View } from 'react-native'
import { cn } from '@/lib/cn'

export function statusBadgeClass(status: string): string {
  const normalized = status.toLowerCase()
  if (normalized === 'executed' || normalized === 'success' || normalized === 'successful') {
    return 'bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-400'
  }
  if (normalized === 'failed' || normalized === 'error') {
    return 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'
  }
  if (normalized === 'skipped' || normalized === 'warning') {
    return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
  }
  return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Text className={cn('rounded-full px-2 py-0.5 text-xs font-medium capitalize', statusBadgeClass(status), className)}>
      {status.replace(/_/g, ' ')}
    </Text>
  )
}

export function formatShortTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatActionLabel(action: string): string {
  return action.replace(/_/g, ' ')
}
