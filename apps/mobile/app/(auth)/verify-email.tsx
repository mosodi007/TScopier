import { View } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { ThemeToggle } from '@/components/ThemeToggle'
import { BodyText, Button, Screen, Subtitle, Title } from '@/components/ui'

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>()

  return (
    <Screen className="justify-center">
      <View className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </View>
      <Title>Verify your email</Title>
      <Subtitle>
        We sent a confirmation link{email ? ` to ${email}` : ''}. Open it on this device to continue.
      </Subtitle>
      <View className="mt-8">
        <Button label="Back to sign in" onPress={() => router.replace('/(auth)/login')} />
      </View>
      <BodyText className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
        Trading involves risk. See our risk disclaimer at tscopier.ai/risk-disclaimer
      </BodyText>
    </Screen>
  )
}
