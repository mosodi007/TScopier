import { useState } from 'react'
import { Text, View } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { Mail } from 'lucide-react-native'
import { sendVerificationEmail } from '@tscopier/shared'
import { supabase } from '@/lib/supabase'
import { webAppUrl } from '@/lib/openWebApp'
import { AuthAlert } from '@/components/auth/AuthAlert'
import { AuthHeading } from '@/components/auth/AuthField'
import { AuthScreen } from '@/components/auth/AuthScreen'
import { Button } from '@/components/ui'

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>()
  const [resending, setResending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onResend = async () => {
    if (!email) {
      setError('Missing email address. Go back and sign up again.')
      return
    }
    setResending(true)
    setError(null)
    setMessage(null)
    const redirectTo = webAppUrl('auth/confirmed')
    const sent = await sendVerificationEmail({ email, redirectTo })
    if (!sent.ok) {
      const fallback = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: redirectTo },
      })
      setResending(false)
      if (fallback.error) {
        setError(sent.error ?? fallback.error.message)
        return
      }
    } else {
      setResending(false)
    }
    setMessage('Verification email sent. Check your inbox and spam folder.')
  }

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

      {error ? <AuthAlert>{error}</AuthAlert> : null}
      {message ? (
        <Text className="mb-3 text-center text-sm text-teal-700 dark:text-teal-300">{message}</Text>
      ) : null}

      <Button
        label="Resend verification email"
        variant="secondary"
        loading={resending}
        onPress={() => void onResend()}
        className="mt-2 rounded-lg"
      />
      <Button
        label="Back to login"
        variant="secondary"
        onPress={() => router.replace('/(auth)/login')}
        className="mt-3 rounded-lg"
      />
    </AuthScreen>
  )
}
