import { Redirect } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '@/context/AuthContext'

export default function Index() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-950">
        <ActivityIndicator color="#14b8a6" size="large" />
      </View>
    )
  }

  if (user) {
    return <Redirect href="/(app)/(tabs)/dashboard" />
  }

  return <Redirect href="/(auth)/login" />
}
