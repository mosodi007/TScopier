import { Text, View } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { Mail } from 'lucide-react-native'
import { AuthHeading } from '@/components/auth/AuthField'
import { AuthScreen } from '@/components/auth/AuthScreen'
import { Button } from '@/components/ui'

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>()

  return (
    <AuthScreen>
      <View className="items-center py-4">
        <View className="mb-5 h-14 w-14 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/40">
          <Mail size={26} color="#d97706" />
        </View>
        <AuthHeading>Check your email</AuthHeading>
        <Text className="mt-2 text-center text-sm text-neutral-500 dark:text-neutral-400">
          {email
            ? `We just sent a verification link to ${email}.`
            : 'We just sent a verification link to your email.'}
        </Text>
        <Text className="mt-3 text-center text-sm leading-5 text-neutral-500 dark:text-neutral-400">
          Open the link in that email to activate your account. You cannot use TScopier until
          verification is complete.
        </Text>
      </View>

      <Button
        label="Back to login"
        variant="secondary"
        onPress={() => router.replace('/(auth)/login')}
        className="mt-6 rounded-lg"
      />
    </AuthScreen>
  )
}
