import { Pressable, Text } from 'react-native'
import { Moon, Sun } from 'lucide-react-native'
import { useTheme } from '@/context/ThemeContext'
import { cn } from '@/lib/cn'

interface ThemeToggleProps {
  className?: string
  size?: number
}

export function ThemeToggle({ className, size = 20 }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme()

  return (
    <Pressable
      onPress={toggleTheme}
      className={cn(
        'rounded-xl border border-neutral-200 bg-white p-2.5 dark:border-neutral-700 dark:bg-neutral-800',
        className,
      )}
      accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun color="#94a3b8" size={size} />
      ) : (
        <Moon color="#64748b" size={size} />
      )}
    </Pressable>
  )
}

interface ThemeOptionProps {
  label: string
  selected: boolean
  onPress: () => void
}

export function ThemeOption({ label, selected, onPress }: ThemeOptionProps) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'flex-1 rounded-xl border px-3 py-2.5',
        selected
          ? 'border-teal-600 bg-teal-50 dark:border-teal-400 dark:bg-teal-950/60'
          : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800',
      )}
    >
      <Text
        className={cn(
          'text-center text-sm font-medium',
          selected
            ? 'text-teal-800 dark:text-teal-400'
            : 'text-neutral-600 dark:text-neutral-300',
        )}
      >
        {label}
      </Text>
    </Pressable>
  )
}
