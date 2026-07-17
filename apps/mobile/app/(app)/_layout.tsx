import { Redirect, Stack } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { pageBackground, tscTheme } from '@/lib/tscTheme'

export default function AppLayout() {
  const { user, loading } = useAuth()
  const { isDark } = useTheme()

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <ActivityIndicator color={tscTheme.primary} size="large" />
      </View>
    )
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        freezeOnBlur: false,
        contentStyle: { backgroundColor: pageBackground(isDark) },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="alerts" options={{ title: 'Alerts' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      <Stack.Screen name="activities" options={{ title: 'Copier engine' }} />
      <Stack.Screen name="copier-logs" options={{ title: 'Copier logs' }} />
      <Stack.Screen name="broker-connect" options={{ presentation: 'modal', title: 'Connect broker' }} />
      <Stack.Screen name="telegram-link" options={{ presentation: 'modal', title: 'Link Telegram' }} />
      <Stack.Screen name="billing" options={{ presentation: 'modal', title: 'Billing' }} />
      <Stack.Screen name="copier-status" options={{ title: 'Copier status' }} />
      <Stack.Screen name="channel-config" options={{ title: 'Channel config' }} />
      <Stack.Screen name="broker-config/[id]" options={{ presentation: 'modal', title: 'Configure trading' }} />
    </Stack>
  )
}
