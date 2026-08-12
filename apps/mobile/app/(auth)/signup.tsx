import { useState } from 'react'
import { Linking, Text, View } from 'react-native'
import Constants from 'expo-constants'
import { router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { sendVerificationEmail } from '@tscopier/shared'
import { makeDeepLink, parseAuthTokensFromUrl } from '@/lib/linking'
import { webAppUrl } from '@/lib/openWebApp'
import { supabase } from '@/lib/supabase'
import { AuthAlert } from '@/components/auth/AuthAlert'
import { AuthBackHome } from '@/components/auth/AuthBackHome'
import { AuthField, AuthHeading, AuthLink, AuthSubtitle } from '@/components/auth/AuthField'
import { AuthOrDivider } from '@/components/auth/AuthOrDivider'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { AuthScreen } from '@/components/auth/AuthScreen'
import { PasswordField } from '@/components/auth/PasswordField'
import { Button } from '@/components/ui'

export default function SignupScreen() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const extra = Constants.expoConfig?.extra as {
    privacyPolicyUrl?: string
    termsUrl?: string
  } | undefined

  const onSignup = async () => {
    setError(null)
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail.includes('@')) {
      setError('Enter a valid email address')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    // Prefer HTTPS redirect so Supabase allow-list + email clients work; app opens via universal link.
    const redirectTo = webAppUrl('auth/confirmed')
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        },
      },
    })
    if (signUpError) {
      setLoading(false)
      setError(signUpError.message)
      return
    }

    if (data.user) {
      // Same path as web: branded Resend email via edge function (Supabase built-in mail is not used).
      const sent = await sendVerificationEmail({
        email: data.user.email ?? trimmedEmail,
        accessToken: data.session?.access_token,
        redirectTo,
      })
      if (!sent.ok) {
        const fallback = await supabase.auth.resend({
          type: 'signup',
          email: trimmedEmail,
          options: { emailRedirectTo: redirectTo },
        })
        if (fallback.error) {
          setLoading(false)
          setError(sent.error ?? fallback.error.message)
          return
        }
      }

      // Keep the user signed out until they confirm (matches web).
      if (!data.user.email_confirmed_at) {
        await supabase.auth.signOut()
      }
    }

    setLoading(false)
    router.replace({ pathname: '/(auth)/verify-email', params: { email: trimmedEmail } })
  }

  const onGoogle = async () => {
    setError(null)
    setGoogleLoading(true)
    try {
      const redirectTo = makeDeepLink('auth/callback')
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      })
      if (oauthError || !data.url) {
        setError(oauthError?.message ?? 'Google sign-in failed')
        return
      }
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
      if (result.type === 'success' && result.url) {
        const tokens = parseAuthTokensFromUrl(result.url)
        if (tokens.accessToken && tokens.refreshToken) {
          await supabase.auth.setSession({
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken,
          })
        }
        router.replace('/(app)/(tabs)/dashboard')
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <AuthScreen>
      <AuthBackHome />
      <AuthHeading>Create your account</AuthHeading>
      <AuthSubtitle>
        Already have an account?{' '}
        <AuthLink onPress={() => router.push('/(auth)/login')}>Sign in</AuthLink>
      </AuthSubtitle>

      {error ? <AuthAlert>{error}</AuthAlert> : null}

      <GoogleSignInButton onPress={() => void onGoogle()} loading={googleLoading} disabled={loading} />
      <AuthOrDivider />

      <View className="flex-row gap-3">
        <AuthField
          label="First name"
          className="mb-4 flex-1"
          value={firstName}
          onChangeText={setFirstName}
          placeholder="First name"
          autoComplete="given-name"
        />
        <AuthField
          label="Last name"
          className="mb-4 flex-1"
          value={lastName}
          onChangeText={setLastName}
          placeholder="Last name"
          autoComplete="family-name"
        />
      </View>

      <AuthField
        label="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
      />
      <PasswordField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Choose a password"
        hint="At least 6 characters"
        autoComplete="new-password"
      />
      <PasswordField
        label="Confirm password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Re-enter your password"
        autoComplete="new-password"
      />

      <Button
        label="Create account"
        loading={loading}
        disabled={googleLoading}
        onPress={() => void onSignup()}
        className="mt-2 rounded-lg"
      />

      <Text className="mt-5 text-center text-xs leading-5 text-neutral-500 dark:text-neutral-400">
        By signing up, you agree to our{' '}
        {extra?.termsUrl ? (
          <Text
            className="font-medium text-teal-600 dark:text-teal-400"
            onPress={() => void Linking.openURL(extra.termsUrl!)}
          >
            Terms of Service
          </Text>
        ) : (
          'Terms of Service'
        )}
        {' & '}
        {extra?.privacyPolicyUrl ? (
          <Text
            className="font-medium text-teal-600 dark:text-teal-400"
            onPress={() => void Linking.openURL(extra.privacyPolicyUrl!)}
          >
            Privacy Policy
          </Text>
        ) : (
          'Privacy Policy'
        )}
      </Text>
    </AuthScreen>
  )
}
