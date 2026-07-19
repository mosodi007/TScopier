import { useState } from 'react'
import { View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { makeDeepLink, parseAuthTokensFromUrl } from '@/lib/linking'
import { supabase } from '@/lib/supabase'
import { AuthAlert } from '@/components/auth/AuthAlert'
import { AuthField, AuthHeading, AuthLink, AuthSubtitle } from '@/components/auth/AuthField'
import { AuthOrDivider } from '@/components/auth/AuthOrDivider'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { AuthScreen } from '@/components/auth/AuthScreen'
import { PasswordField } from '@/components/auth/PasswordField'
import { Button } from '@/components/ui'

export default function LoginScreen() {
  const { reset } = useLocalSearchParams<{ reset?: string }>()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const onLogin = async () => {
    setLoading(true)
    setError(null)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (signInError) {
      setError(signInError.message)
      return
    }
    router.replace('/(app)/(tabs)/dashboard')
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
      <AuthHeading>Log in to TScopier</AuthHeading>
      <AuthSubtitle>
        Don't have an account?{' '}
        <AuthLink onPress={() => router.push('/(auth)/signup')}>Sign up</AuthLink>
      </AuthSubtitle>

      {reset === 'success' ? (
        <AuthAlert variant="success">
          Your password has been updated. You can sign in now.
        </AuthAlert>
      ) : null}
      {error ? <AuthAlert>{error}</AuthAlert> : null}

      <GoogleSignInButton onPress={() => void onGoogle()} loading={googleLoading} disabled={loading} />
      <AuthOrDivider />

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
        placeholder="Enter your password"
        autoComplete="password"
      />

      <View className="-mt-1 mb-6 items-end">
        <AuthLink onPress={() => router.push('/(auth)/forgot-password')}>Forgot password?</AuthLink>
      </View>

      <Button
        label="Sign in"
        loading={loading}
        disabled={googleLoading}
        onPress={() => void onLogin()}
        className="rounded-lg"
      />
    </AuthScreen>
  )
}
