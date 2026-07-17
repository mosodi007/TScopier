import '../lib/env'
import '../global.css'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import { enableFreeze } from 'react-native-screens'
import { SafeAreaProvider } from 'react-native-safe-area-context'

/** Freeze inactive native screens so background tabs stop re-rendering. */
enableFreeze(true)
import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
  InstrumentSans_700Bold,
  useFonts,
} from '@expo-google-fonts/instrument-sans'
import { AuthProvider } from '@/context/AuthContext'
import { SubscriptionProvider } from '@/context/SubscriptionContext'
import { NotificationsProvider } from '@/context/NotificationsContext'
import { ThemeProvider, useTheme } from '@/context/ThemeContext'
import { useAuthDeepLink } from '@/hooks/useAuthDeepLink'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { pageBackground } from '@/lib/tscTheme'
import { applyDefaultAppFont } from '@/lib/setupDefaultFont'

SplashScreen.preventAutoHideAsync()

function ThemedStatusBar() {
  const { isDark } = useTheme()
  return <StatusBar style={isDark ? 'light' : 'dark'} />
}

function RootNavigation() {
  useAuthDeepLink()
  usePushNotifications()
  const { isDark } = useTheme()

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: pageBackground(isDark) },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  )
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
    InstrumentSans_700Bold,
  })

  useEffect(() => {
    if (fontsLoaded) {
      applyDefaultAppFont()
    }
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded, fontError])

  if (!fontsLoaded && !fontError) {
    return null
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <NotificationsProvider>
              <ThemedStatusBar />
              <RootNavigation />
            </NotificationsProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
