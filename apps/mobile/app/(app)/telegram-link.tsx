import { useCallback, useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { router } from 'expo-router'
import { Check, ShieldCheck, X } from 'lucide-react-native'
import {
  callTelegramAuth,
  getSupabaseUrl,
  resolveTelegramAuthError,
  resolveTelegramAuthErrorMessage,
  type QrPollResponse,
} from '@tscopier/shared'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import {
  TelegramConnectFlow,
  type TelegramAuthMethod,
  type TelegramConnectStage,
} from '@/components/telegram/TelegramConnectFlow'
import { Button, Screen } from '@/components/ui'
import { tscTheme } from '@/lib/tscTheme'
import { cn } from '@/lib/cn'

const EDGE_FN = () => `${getSupabaseUrl()}/functions/v1/telegram-auth`

const ERR = {
  telegramAlreadyLinked:
    'This Telegram account is already linked to another TScopier account. Sign in to that account or contact support.',
  failedSendCode: 'Failed to send code',
  verificationFailed: 'Verification failed',
  failedStartQr: 'Failed to start QR login',
  noPendingQr: 'QR login expired. Please start again.',
  networkError: 'Network error. Please try again.',
} as const

function normalizeTelegramPhoneInput(raw: string): string {
  const compact = String(raw ?? '').trim().replace(/[\s\-()]/g, '')
  if (compact.startsWith('00')) return `+${compact.slice(2)}`
  return compact
}

function normalizeTelegramCodeInput(raw: string): string {
  return String(raw ?? '').replace(/\D/g, '')
}

type ScreenStage = TelegramConnectStage | 'confirm_2fa' | 'done'

export default function TelegramLinkScreen() {
  const { session } = useAuth()
  const { isDark } = useTheme()
  const [stage, setStage] = useState<ScreenStage>('idle')
  const [authMethod, setAuthMethod] = useState<TelegramAuthMethod>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [qrUrl, setQrUrl] = useState('')
  const [qrWaiting, setQrWaiting] = useState(false)
  const [sessionRowId, setSessionRowId] = useState<string | null>(null)
  const [twoFaConfirmed, setTwoFaConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLinked = useCallback((sessionId: string) => {
    setSessionRowId(sessionId)
    setQrUrl('')
    setQrWaiting(false)
    setStage('confirm_2fa')
  }, [])

  const startQrLogin = useCallback(async () => {
    if (!session?.access_token) return
    setError('')
    setLoading(true)
    setQrWaiting(true)
    try {
      const { ok, data } = await callTelegramAuth<{ qr_url?: string }>(
        EDGE_FN(),
        session.access_token,
        'start_qr_login',
        {},
      )
      if (!ok || !data.qr_url) {
        setError(resolveTelegramAuthErrorMessage(data.error, ERR.failedStartQr, ERR))
        setQrWaiting(false)
        return
      }
      setQrUrl(data.qr_url)
    } catch {
      setError(ERR.networkError)
      setQrWaiting(false)
    } finally {
      setLoading(false)
    }
  }, [session?.access_token])

  useEffect(() => {
    if (stage !== 'qr' || !session?.access_token) return

    let cancelled = false
    const poll = async () => {
      try {
        const { data } = await callTelegramAuth<QrPollResponse>(
          EDGE_FN(),
          session.access_token,
          'poll_qr_login',
          {},
        )
        if (cancelled) return
        if (data.qr_url && data.qr_url !== qrUrl) setQrUrl(data.qr_url)
        if (data.status === 'requires_password' || data.requires_password) {
          setQrWaiting(false)
          setStage('twoFa')
          return
        }
        if (data.status === 'success' && data.session_id) {
          setQrWaiting(false)
          handleLinked(data.session_id)
          return
        }
        if (data.status === 'error') {
          setQrWaiting(false)
          setError(data.error ?? ERR.failedStartQr)
        }
      } catch {
        if (!cancelled) setError(ERR.networkError)
      }
    }

    void poll()
    const interval = setInterval(() => void poll(), 2000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [stage, session?.access_token, qrUrl, handleLinked])

  const sendCode = async () => {
    if (!session?.access_token) return
    setError('')
    setLoading(true)
    try {
      const normalizedPhone = normalizeTelegramPhoneInput(phone)
      const { ok, data } = await callTelegramAuth<Record<string, never>>(
        EDGE_FN(),
        session.access_token,
        'send_code',
        { phone: normalizedPhone },
      )
      if (!ok) {
        setError(resolveTelegramAuthError(data.error, ERR.failedSendCode, ERR))
        return
      }
      setPhone(normalizedPhone)
      setStage('code')
    } catch {
      setError(ERR.networkError)
    } finally {
      setLoading(false)
    }
  }

  const verifyCode = async () => {
    if (!session?.access_token) return
    setError('')
    setLoading(true)
    try {
      const normalizedPhone = normalizeTelegramPhoneInput(phone)
      const normalizedCode = normalizeTelegramCodeInput(code)
      const { ok, data } = await callTelegramAuth<{
        requires_password?: boolean
        session_id?: string
        error?: string
      }>(EDGE_FN(), session.access_token, 'verify_code', {
        phone: normalizedPhone,
        code: normalizedCode,
        password: stage === 'twoFa' ? password : undefined,
      })
      if (data.requires_password) {
        setStage('twoFa')
        return
      }
      if (!ok || data.error) {
        setError(resolveTelegramAuthError(data.error, ERR.verificationFailed, ERR))
        return
      }
      setPhone(normalizedPhone)
      setCode(normalizedCode)
      if (data.session_id) handleLinked(data.session_id)
    } catch {
      setError(ERR.networkError)
    } finally {
      setLoading(false)
    }
  }

  const verifyQrPassword = async () => {
    if (!session?.access_token) return
    setError('')
    setLoading(true)
    try {
      const { ok, data } = await callTelegramAuth<{ session_id?: string }>(
        EDGE_FN(),
        session.access_token,
        'verify_qr_password',
        { password },
      )
      if (!ok || data.error) {
        setError(resolveTelegramAuthErrorMessage(data.error, ERR.verificationFailed, ERR))
        return
      }
      if (data.session_id) handleLinked(data.session_id)
    } catch {
      setError(ERR.networkError)
    } finally {
      setLoading(false)
    }
  }

  const handleStageChange = (next: TelegramConnectStage) => {
    setStage(next)
    setError('')
    if (next === 'phone' || next === 'method') {
      setCode('')
      setPassword('')
      setQrUrl('')
      setQrWaiting(false)
    }
    if (next === 'code') setPassword('')
    if (next !== 'qr') setQrWaiting(false)
  }

  const finishLink = () => {
    if (!twoFaConfirmed || !sessionRowId) return
    setStage('done')
  }

  const closeIcon = isDark ? '#94a3b8' : '#64748b'

  return (
    <Screen className="px-0">
      <View className="flex-row items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
          Link Telegram
        </Text>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="rounded-full p-2"
          accessibilityLabel="Close"
        >
          <X size={20} color={closeIcon} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerClassName="gap-4 px-4 py-4 pb-10"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {stage === 'done' ? (
          <View className="items-center rounded-2xl border border-neutral-200 bg-white px-5 py-8 dark:border-neutral-800 dark:bg-neutral-900">
            <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-teal-50 dark:bg-teal-950/50">
              <Check size={24} color={tscTheme.primary} strokeWidth={2.5} />
            </View>
            <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              Telegram connected
            </Text>
            <Text className="mt-1 text-center text-sm text-neutral-500 dark:text-neutral-400">
              Your session is saved and active.
            </Text>
            <View className="mt-6 w-full gap-2">
              <Button
                label="Manage channels"
                onPress={() => {
                  router.back()
                  router.push('/(app)/channels')
                }}
              />
              <Button label="Done" variant="secondary" onPress={() => router.back()} />
            </View>
          </View>
        ) : stage === 'confirm_2fa' ? (
          <View className="rounded-2xl border border-neutral-200 bg-white px-5 py-5 dark:border-neutral-800 dark:bg-neutral-900">
            <View className="mb-1 flex-row items-center gap-2">
              <ShieldCheck size={20} color={tscTheme.primary} />
              <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                Secure your Telegram account
              </Text>
            </View>
            <Text className="mb-5 text-sm text-neutral-500 dark:text-neutral-400">
              Accounts without a Two-Step Verification password are auto-flagged by Telegram much
              faster. Set one in the Telegram app before you continue, then confirm below.
            </Text>

            <View className="mb-5 gap-2.5">
              {[
                'Open the Telegram app on your phone.',
                'Go to Settings → Privacy and Security → Two-Step Verification.',
                'Set a password and a recovery email.',
              ].map((line, i) => (
                <View key={line} className="flex-row gap-2">
                  <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    {i + 1}.
                  </Text>
                  <Text className="min-w-0 flex-1 text-sm text-neutral-700 dark:text-neutral-300">
                    {line}
                  </Text>
                </View>
              ))}
            </View>

            <Pressable
              onPress={() => setTwoFaConfirmed(v => !v)}
              className={cn(
                'flex-row items-start gap-2.5 rounded-lg border p-3',
                twoFaConfirmed
                  ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/30'
                  : 'border-neutral-200 dark:border-neutral-800',
              )}
            >
              <View
                className={cn(
                  'mt-0.5 h-5 w-5 items-center justify-center rounded border',
                  twoFaConfirmed
                    ? 'border-teal-600 bg-teal-600'
                    : 'border-neutral-300 dark:border-neutral-600',
                )}
              >
                {twoFaConfirmed ? <Check size={12} color="#ffffff" strokeWidth={3} /> : null}
              </View>
              <Text className="min-w-0 flex-1 text-sm text-neutral-700 dark:text-neutral-300">
                I have set a Two-Step Verification password on this Telegram account.
              </Text>
            </Pressable>

            <View className="mt-5">
              <Button
                label="Continue"
                disabled={!twoFaConfirmed}
                onPress={finishLink}
              />
            </View>
          </View>
        ) : (
          <TelegramConnectFlow
            stage={stage}
            onStageChange={handleStageChange}
            authMethod={authMethod}
            onAuthMethodChange={setAuthMethod}
            phone={phone}
            onPhoneChange={setPhone}
            code={code}
            onCodeChange={setCode}
            password={password}
            onPasswordChange={setPassword}
            qrUrl={qrUrl}
            qrWaiting={qrWaiting}
            loading={loading}
            error={error}
            onSendCode={() => void sendCode()}
            onVerifyCode={() => void verifyCode()}
            onStartQr={() => void startQrLogin()}
            onVerifyQrPassword={() => void verifyQrPassword()}
          />
        )}
      </ScrollView>
    </Screen>
  )
}
