import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { router } from 'expo-router'
import { getSupabaseUrl, callTelegramAuth } from '@tscopier/shared'
import { useAuth } from '@/context/AuthContext'
import { AccentText, BodyText, Button, Card, ErrorText, Field, Screen, Subtitle, Title } from '@/components/ui'

export default function TelegramLinkScreen() {
  const { session } = useAuth()
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const edgeUrl = `${getSupabaseUrl()}/functions/v1/telegram-auth`

  const sendCode = async () => {
    if (!session?.access_token) return
    setLoading(true)
    setError(null)
    const { ok, data } = await callTelegramAuth<{ error?: string }>(
      edgeUrl,
      session.access_token,
      'send_code',
      { phone },
    )
    setLoading(false)
    if (!ok || data.error) {
      setError(data.error ?? 'Could not send code')
      return
    }
    setStep('code')
    setMessage('Enter the code Telegram sent you.')
  }

  const verifyCode = async () => {
    if (!session?.access_token) return
    setLoading(true)
    setError(null)
    const { ok, data } = await callTelegramAuth<{ error?: string; channels?: unknown[] }>(
      edgeUrl,
      session.access_token,
      'verify_code',
      { phone, code },
    )
    setLoading(false)
    if (!ok || data.error) {
      setError(data.error ?? 'Invalid code')
      return
    }
    setMessage(`Telegram linked. ${data.channels?.length ?? 0} channels available.`)
  }

  const startQr = async () => {
    if (!session?.access_token) return
    setLoading(true)
    setError(null)
    const { ok, data } = await callTelegramAuth<{ error?: string; qr_url?: string }>(
      edgeUrl,
      session.access_token,
      'start_qr_login',
      {},
    )
    setLoading(false)
    if (!ok || data.error) {
      setError(data.error ?? 'QR login failed')
      return
    }
    setMessage('Scan the QR in your Telegram app (Settings → Devices → Link Desktop Device).')
  }

  return (
    <Screen>
      <ScrollView contentContainerClassName="pb-24">
        <Title>Link Telegram</Title>
        <Subtitle>Connect the account that receives signal channels</Subtitle>
        <View className="mt-6">
          {step === 'phone' ? (
            <>
              <Field label="Phone number" value={phone} onChangeText={setPhone} placeholder="+1234567890" />
              <Button label="Send code" loading={loading} onPress={sendCode} />
            </>
          ) : (
            <>
              <Field label="Verification code" value={code} onChangeText={setCode} />
              <Button label="Verify" loading={loading} onPress={verifyCode} />
            </>
          )}
          <View className="mt-3">
            <Button label="Use QR login instead" variant="secondary" loading={loading} onPress={startQr} />
          </View>
          <ErrorText>{error}</ErrorText>
          {message ? <AccentText className="mb-3">{message}</AccentText> : null}
          <Button label="Close" variant="secondary" onPress={() => router.back()} />
        </View>
        <Card className="mt-6">
          <BodyText className="text-sm">
            Telegram listening runs on TScopier servers. Your phone only authorizes the session.
          </BodyText>
        </Card>
      </ScrollView>
    </Screen>
  )
}
