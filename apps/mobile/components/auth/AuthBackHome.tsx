import { Pressable, Text } from 'react-native'
import { router } from 'expo-router'
import { ArrowLeft } from 'lucide-react-native'
import { useTheme } from '@/context/ThemeContext'

interface AuthBackHomeProps {
  label?: string
}

/** Web-parity “← Back to home” — returns to the welcome slider. */
export function AuthBackHome({ label = 'Back to home' }: AuthBackHomeProps) {
  const { isDark } = useTheme()
  const color = isDark ? '#a3a3a3' : '#525252'

  return (
    <Pressable
      onPress={() => router.replace('/welcome')}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      className="mb-4 flex-row items-center gap-1.5 self-start active:opacity-70"
    >
      <ArrowLeft size={16} color={color} />
      <Text className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{label}</Text>
    </Pressable>
  )
}
