import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { router } from 'expo-router'
import { callEdgeFunction } from '@tscopier/shared'
import { useAuth } from '@/context/AuthContext'
import { Button, Card, ErrorText, Field, Screen, Subtitle, Title } from '@/components/ui'

export default function BrokerConnectScreen() {
  const { session } = useAuth()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [server, setServer] = useState('')
  const [label, setLabel] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const onConnect = async () => {
    if (!session?.access_token) return
    setLoading(true)
    setError(null)
    setSuccess(null)
    const { ok, data } = await callEdgeFunction<{ error?: string; broker_account_id?: string }>(
      'fxsocket-broker',
      {
        accessToken: session.access_token,
        body: {
          action: 'connect',
          login,
          password,
          server,
          label: label || server,
        },
        timeoutMs: 120_000,
      },
    )
    setLoading(false)
    if (!ok || data.error) {
      setError(data.error ?? 'Broker connect failed')
      return
    }
    setSuccess('Broker connected. It may take a minute to show as online.')
  }

  return (
    <Screen>
      <ScrollView contentContainerClassName="pb-24">
        <Title>Connect broker</Title>
        <Subtitle>Link your MT4/MT5 account via FxSocket</Subtitle>
        <View className="mt-6">
          <Field label="Account label" value={label} onChangeText={setLabel} placeholder="My live account" />
          <Field label="Login" value={login} onChangeText={setLogin} keyboardType="default" />
          <Field label="Password" secureTextEntry value={password} onChangeText={setPassword} />
          <Field label="Server" value={server} onChangeText={setServer} placeholder="Broker-Server" />
          <ErrorText>{error}</ErrorText>
          {success ? <Text className="mb-3 text-teal-400">{success}</Text> : null}
          <Button label="Connect" loading={loading} onPress={onConnect} />
          <View className="mt-3">
            <Button label="Close" variant="secondary" onPress={() => router.back()} />
          </View>
        </View>
        <Card className="mt-6">
          <Text className="text-sm text-neutral-400">
            Keep Algo Trading enabled on MT5 and leave the terminal running for reliable copying.
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  )
}
