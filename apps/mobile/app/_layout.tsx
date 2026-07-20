import '../lib/env'
import '../global.css'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
  InstrumentSans_700Bold,
  useFonts,
} from '@expo-google-fonts/instrument-sans'
import { AuthProvider } from '@/context/AuthContext'
import { LocaleProvider } from '@/context/LocaleContext'
import { SubscriptionProvider } from '@/context/SubscriptionContext'
import { NotificationsProvider } from '@/context/NotificationsContext'
import { ThemeProvider, useTheme } from '@/context/ThemeContext'
import { MissingConfigScreen } from '@/components/layout/MissingConfigScreen'
import { useAuthDeepLink } from '@/hooks/useAuthDeepLink'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useOTAUpdates } from '@/hooks/useOTAUpdates'
import { isSupabaseConfigured, supabaseConfigMessage } from '@/lib/supabase'
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
  useOTAUpdates()
  const { isDark } = useTheme()

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: pageBackground(isDark) },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
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

  if (!isSupabaseConfigured) {
    return (
      <SafeAreaProvider>
        <MissingConfigScreen message={supabaseConfigMessage ?? 'Missing Supabase config.'} />
      </SafeAreaProvider>
    )
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LocaleProvider>
          <AuthProvider>
            <SubscriptionProvider>
              <NotificationsProvider>
                <ThemedStatusBar />
                <RootNavigation />
              </NotificationsProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </LocaleProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
