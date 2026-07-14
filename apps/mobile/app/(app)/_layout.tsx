import { Redirect, Stack } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '@/context/AuthContext'

export default function AppLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-950">
        <ActivityIndicator color="#14b8a6" size="large" />
      </View>
    )
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#020617' } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="broker-connect" options={{ presentation: 'modal', title: 'Connect broker' }} />
      <Stack.Screen name="telegram-link" options={{ presentation: 'modal', title: 'Link Telegram' }} />
      <Stack.Screen name="billing" options={{ presentation: 'modal', title: 'Billing' }} />
      <Stack.Screen name="copier-status" options={{ title: 'Copier status' }} />
      <Stack.Screen name="channel-config" options={{ title: 'Channel config' }} />
    </Stack>
  )
}
