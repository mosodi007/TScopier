import { useState } from 'react'
import { Text, View } from 'react-native'
import { router } from 'expo-router'
import { ShieldCheck } from 'lucide-react-native'
import { supabase } from '@/lib/supabase'
import { AuthAlert } from '@/components/auth/AuthAlert'
import { AuthHeading, AuthLink, AuthSubtitle } from '@/components/auth/AuthField'
import { AuthScreen } from '@/components/auth/AuthScreen'
import { PasswordField } from '@/components/auth/PasswordField'
import { Button } from '@/components/ui'
import { tscTheme } from '@/lib/tscTheme'

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async () => {
    setError(null)
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    router.replace({ pathname: '/(auth)/login', params: { reset: 'success' } })
  }

  return (
    <AuthScreen>
      <AuthHeading>Set a new password</AuthHeading>
      <AuthSubtitle>Choose a strong password for your TScopier account.</AuthSubtitle>

      <View className="mb-5 flex-row gap-3 rounded-xl border border-teal-100 bg-teal-50/80 p-3 dark:border-teal-900/40 dark:bg-teal-950/30">
        <ShieldCheck size={18} color={tscTheme.primary} style={{ marginTop: 2 }} />
        <Text className="flex-1 text-sm leading-5 text-teal-900 dark:text-teal-100">
          You will be signed out everywhere after updating. Sign in again with your new password.
        </Text>
      </View>

      {error ? <AuthAlert>{error}</AuthAlert> : null}

      <View className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
        <PasswordField
          label="New password"
          value={password}
          onChangeText={setPassword}
          placeholder="Enter a new password"
          hint="At least 6 characters"
          autoComplete="new-password"
        />
        <PasswordField
          label="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Re-enter your new password"
          autoComplete="new-password"
          className="mb-0"
        />
      </View>

      <Button
        label="Update password"
        loading={loading}
        onPress={() => void onSubmit()}
        className="mt-6 rounded-lg"
      />

      <View className="mt-6 items-center">
        <AuthLink onPress={() => router.replace('/(auth)/login')}>Back to login</AuthLink>
      </View>
    </AuthScreen>
  )
}
