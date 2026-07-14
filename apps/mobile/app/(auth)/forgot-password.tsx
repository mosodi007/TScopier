import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { router } from 'expo-router'
import { sendPasswordResetEmail } from '@tscopier/shared'
import { makeDeepLink } from '@/lib/linking'
import { ThemeToggle } from '@/components/ThemeToggle'
import { AccentText, BodyText, Button, ErrorText, Field, Screen, Subtitle, Title } from '@/components/ui'

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
      <View className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </View>
      <ScrollView contentContainerClassName="flex-grow justify-center pb-8">
        <Title>Reset password</Title>
        <Subtitle>We will email you a secure reset link</Subtitle>
        <View className="mt-8">
          {sent ? (
            <BodyText>Check your inbox for a reset link.</BodyText>
          ) : (
            <>
              <Field label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
              <ErrorText>{error}</ErrorText>
              <Button label="Send reset link" loading={loading} onPress={onSubmit} />
            </>
          )}
          <View className="mt-6">
            <AccentText onPress={() => router.back()}>Back to sign in</AccentText>
          </View>
        </View>
      </ScrollView>
    </Screen>
  )
}
