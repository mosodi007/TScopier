import { useState } from 'react'
import { Text, View } from 'react-native'
import { router } from 'expo-router'
import { Mail } from 'lucide-react-native'
import { sendPasswordResetEmail } from '@tscopier/shared'
import { makeDeepLink } from '@/lib/linking'
import { AuthAlert } from '@/components/auth/AuthAlert'
import { AuthField, AuthHeading, AuthLink, AuthSubtitle } from '@/components/auth/AuthField'
import { AuthScreen } from '@/components/auth/AuthScreen'
import { Button } from '@/components/ui'
import { tscTheme } from '@/lib/tscTheme'

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
      setError(result.error ?? 'Could not send reset email. Please try again in a moment.')
      return
    }
    setSent(true)
  }

  return (
    <AuthScreen>
      {sent ? (
        <View className="items-center py-6">
          <View className="mb-5 h-14 w-14 items-center justify-center rounded-full bg-teal-50 dark:bg-teal-950/50">
            <Mail size={26} color={tscTheme.primary} />
          </View>
          <AuthHeading>Check your email</AuthHeading>
          <Text className="mt-2 text-center text-sm text-neutral-500 dark:text-neutral-400">
            {`If an account exists for ${email}, you will receive a password reset link shortly.`}
          </Text>
          <Text className="mt-3 text-center text-xs text-neutral-400 dark:text-neutral-500">
            Check your spam folder if you do not see it within a few minutes.
          </Text>
        </View>
      ) : (
        <>
          <AuthHeading>Reset your password</AuthHeading>
          <AuthSubtitle>
            Enter the email for your account. If it exists, we will send a link to reset your
            password.
          </AuthSubtitle>

          {error ? <AuthAlert>{error}</AuthAlert> : null}

          <AuthField
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
          />
          <Button
            label="Send reset link"
            loading={loading}
            onPress={() => void onSubmit()}
            className="rounded-lg"
          />
        </>
      )}

      <View className="mt-6 items-center">
        <AuthLink onPress={() => router.replace('/(auth)/login')}>Back to login</AuthLink>
      </View>
    </AuthScreen>
  )
}
