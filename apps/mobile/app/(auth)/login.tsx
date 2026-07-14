import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { Link, router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { makeDeepLink, parseAuthTokensFromUrl } from '@/lib/linking'
import { supabase } from '@/lib/supabase'
import { ThemeToggle } from '@/components/ThemeToggle'
import { AccentText, Button, ErrorText, Field, Screen, Subtitle, Title } from '@/components/ui'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
  }

  return (
    <Screen className="justify-center">
      <View className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </View>
      <ScrollView contentContainerClassName="flex-grow justify-center pb-8">
        <Title>TScopier</Title>
        <Subtitle>Sign in to monitor and control your copier</Subtitle>

        <View className="mt-8">
          <Field
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
          />
          <Field
            label="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
          />
          <ErrorText>{error}</ErrorText>
          <Button label="Sign in" loading={loading} onPress={onLogin} />
          <View className="mt-3">
            <Button label="Continue with Google" variant="secondary" onPress={onGoogle} />
          </View>
          <View className="mt-6 flex-row justify-between">
            <Link href="/(auth)/forgot-password">
              <AccentText>Forgot password?</AccentText>
            </Link>
            <Link href="/(auth)/signup">
              <AccentText>Create account</AccentText>
            </Link>
          </View>
        </View>
      </ScrollView>
    </Screen>
  )
}
