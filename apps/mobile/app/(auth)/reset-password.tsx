import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { Button, ErrorText, Field, Screen, Subtitle, Title } from '@/components/ui'

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async () => {
    setLoading(true)
    setError(null)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    router.replace('/(auth)/login')
  }

  return (
    <Screen className="justify-center">
      <ScrollView contentContainerClassName="flex-grow justify-center pb-8">
        <Title>New password</Title>
        <Subtitle>Choose a new password for your account</Subtitle>
        <View className="mt-8">
          <Field label="New password" secureTextEntry value={password} onChangeText={setPassword} />
          <ErrorText>{error}</ErrorText>
          <Button label="Update password" loading={loading} onPress={onSubmit} />
        </View>
      </ScrollView>
    </Screen>
  )
}
