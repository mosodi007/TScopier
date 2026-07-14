import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { Link, router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { makeDeepLink } from '@/lib/linking'
import { ThemeToggle } from '@/components/ThemeToggle'
import { AccentText, Button, ErrorText, Field, Screen, Subtitle, Title } from '@/components/ui'

export default function SignupScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSignup = async () => {
    setLoading(true)
    setError(null)
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: makeDeepLink('auth/confirmed') },
    })
    setLoading(false)
    if (signUpError) {
      setError(signUpError.message)
      return
    }
    router.replace({ pathname: '/(auth)/verify-email', params: { email } })
  }

  return (
    <Screen className="justify-center">
      <View className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </View>
      <ScrollView contentContainerClassName="flex-grow justify-center pb-8">
        <Title>Create account</Title>
        <Subtitle>Start copying Telegram signals to MT4/MT5</Subtitle>
        <View className="mt-8">
          <Field label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <Field label="Password" secureTextEntry value={password} onChangeText={setPassword} />
          <ErrorText>{error}</ErrorText>
          <Button label="Sign up" loading={loading} onPress={onSignup} />
          <View className="mt-6">
            <Link href="/(auth)/login">
              <AccentText>Already have an account? Sign in</AccentText>
            </Link>
          </View>
        </View>
      </ScrollView>
    </Screen>
  )
}
