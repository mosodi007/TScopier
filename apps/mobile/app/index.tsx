import { useEffect, useState } from 'react'
import { Redirect } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '@/context/AuthContext'
import { hasSeenWelcome } from '@/lib/welcomeSeen'
import { tscTheme } from '@/lib/tscTheme'

export default function Index() {
  const { user, loading } = useAuth()
  const [welcomeChecked, setWelcomeChecked] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    let cancelled = false
    void hasSeenWelcome().then(seen => {
      if (cancelled) return
      setShowWelcome(!seen)
      setWelcomeChecked(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading || !welcomeChecked) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <ActivityIndicator color={tscTheme.primary} size="large" />
      </View>
    )
  }

  if (user) {
    return <Redirect href="/(app)/(tabs)/dashboard" />
  }

  if (showWelcome) {
    return <Redirect href="/welcome" />
  }

  return <Redirect href="/(auth)/login" />
}
