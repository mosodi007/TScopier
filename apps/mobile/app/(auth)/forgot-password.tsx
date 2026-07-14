import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { router } from 'expo-router'
import { sendPasswordResetEmail } from '@tscopier/shared'
import { makeDeepLink } from '@/lib/linking'
import { Button, ErrorText, Field, Screen, Subtitle, Title } from '@/components/ui'

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const onSubmit = async () => {
    setLoading(true)
    setError(null)
    const result = await sendPasswordResetEmail({
      email,
      redirectTo: makeDeepLink('reset-password'),
    })
    setLoading(false)
    if (!result.ok) {
      setError(result.error ?? 'Could not send reset email')
      return
    }
    setSent(true)
  }

  return (
    <Screen className="justify-center">
      <ScrollView contentContainerClassName="flex-grow justify-center pb-8">
        <Title>Reset password</Title>
        <Subtitle>We will email you a secure reset link</Subtitle>
        <View className="mt-8">
          {sent ? (
            <Text className="text-neutral-200">Check your inbox for a reset link.</Text>
          ) : (
            <>
              <Field label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
              <ErrorText>{error}</ErrorText>
              <Button label="Send reset link" loading={loading} onPress={onSubmit} />
            </>
          )}
          <View className="mt-6">
            <Text className="text-teal-400" onPress={() => router.back()}>Back to sign in</Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  )
}
