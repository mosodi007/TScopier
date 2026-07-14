import '../lib/env'
import '../global.css'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from '@/context/AuthContext'
import { SubscriptionProvider } from '@/context/SubscriptionContext'
import { NotificationsProvider } from '@/context/NotificationsContext'
import { useAuthDeepLink } from '@/hooks/useAuthDeepLink'
import { usePushNotifications } from '@/hooks/usePushNotifications'

SplashScreen.preventAutoHideAsync()

function RootNavigation() {
  useAuthDeepLink()
  usePushNotifications()

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#020617' } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  )
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync()
  }, [])

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SubscriptionProvider>
          <NotificationsProvider>
            <StatusBar style="light" />
            <RootNavigation />
          </NotificationsProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </SafeAreaProvider>
  )
}
