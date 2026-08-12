import { Stack } from 'expo-router'
import { useTheme } from '@/context/ThemeContext'

export default function AuthLayout() {
  const { isDark } = useTheme()

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: isDark ? '#0a0a0a' : '#ffffff' },
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
