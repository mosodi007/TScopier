import { Text, View } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { Screen, Subtitle, Title, Button } from '@/components/ui'

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>()

  return (
    <Screen className="justify-center">
      <Title>Verify your email</Title>
      <Subtitle>
        We sent a confirmation link{email ? ` to ${email}` : ''}. Open it on this device to continue.
      </Subtitle>
      <View className="mt-8">
        <Button label="Back to sign in" onPress={() => router.replace('/(auth)/login')} />
      </View>
      <Text className="mt-4 text-sm text-neutral-500">
        Trading involves risk. See our risk disclaimer at tscopier.ai/risk-disclaimer
      </Text>
    </Screen>
  )
}
