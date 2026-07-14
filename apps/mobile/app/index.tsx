import { Redirect } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '@/context/AuthContext'
import { tscTheme } from '@/lib/tscTheme'

export default function Index() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <ActivityIndicator color={tscTheme.primary} size="large" />
      </View>
    )
  }

  if (user) {
    return <Redirect href="/(app)/(tabs)/dashboard" />
  }

  return <Redirect href="/(auth)/login" />
}
