import { Stack } from 'expo-router'
import { useTheme } from '@/context/ThemeContext'
import { pageBackground } from '@/lib/tscTheme'

export default function AuthLayout() {
  const { isDark } = useTheme()

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: pageBackground(isDark) },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="verify-email" />
    </Stack>
  )
}
