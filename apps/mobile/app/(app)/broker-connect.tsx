import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { Check, Plus, Trash2, X } from 'lucide-react-native'
import type { BrokerAccount } from '@tscopier/shared'
import { callEdgeFunction } from '@tscopier/shared'
import {
  emptyConnectTradingAccountForm,
  type ConnectTradingAccountForm,
} from '@tscopier/web-lib/connectTradingAccountForm'
import { validateConnectRow } from '@tscopier/web-lib/bulkConnectBrokers'
import { inferServerPlatform, type TradingPlatform } from '@tscopier/web-lib/tradingPlatform'
import { useAuth } from '@/context/AuthContext'
import { useSubscription } from '@/context/SubscriptionContext'
import { useTheme } from '@/context/ThemeContext'
import { MtCompanyServerPicker } from '@/components/brokers/MtCompanyServerPicker'
import { PasswordField } from '@/components/auth/PasswordField'
import { Button, Screen } from '@/components/ui'
import { cn } from '@/lib/cn'
import { tscTheme } from '@/lib/tscTheme'

const mt4Logo = require('@/assets/images/MT4.png')
const mt5Logo = require('@/assets/images/MT5.png')

const COPY = {
  title: (platform: string) => `Connect a new ${platform} account`,
  platformLabel: 'Platform',
  platformMt5: 'MetaTrader 5 (MT5)',
  platformMt4: 'MetaTrader 4 (MT4)',
  accountLabel: 'Account label (optional)',
  accountLabelPlaceholder: (platform: string) => `e.g. Live ${platform}`,
  mtLoginLabel: 'MT login',
  mtLoginPlaceholder: 'Trading account number',
  passwordLabel: 'Password',
  passwordPlaceholder: 'Trading account password',
  connectButton: 'Connect account',
  connectMultipleButton: (count: number) => `Connect ${count} accounts`,
  addMoreButton: 'Add more',
  removeRowAria: 'Remove account row',
  accountRowTitle: (index: number) => `Account ${index}`,
  validationRequired: 'Account number, password, and server are required',
  connectFailed: 'Failed to connect account',
  subscriptionRequired: 'An active subscription is required for this action.',
  duplicateMtLogin: 'This MT login is already connected on that server.',
  mismatchMt4: 'This server name looks like MT4. Switch platform to MT4?',
  mismatchMt5: 'This server name looks like MT5. Switch platform to MT5?',
  connectingTitle: 'Connecting your broker',
  connectingStepLinking: (platform: string) => `Linking your ${platform} account…`,
  connectingStepTerminal: (platform: string) =>
    `Starting your ${platform} terminal — this usually takes 10–30 seconds.`,
  connectingStepSlow: 'Still working… first-time setup can take a few minutes.',
  successTitle: 'Broker connected',
  successBody: 'Your account is linked. Configure channels or return to Brokers.',
  configureTrading: 'Configure trading',
  done: 'Done',
  tip: 'Keep Algo Trading enabled on MT5 and leave the terminal running for reliable copying.',
} as const

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function emptyRows(): ConnectTradingAccountForm[] {
  return [{ ...emptyConnectTradingAccountForm }]
}

function countValidRows(rows: ConnectTradingAccountForm[]): number {
  return rows.filter(row => validateConnectRow(row) == null).length
}

type ConnectStep = 0 | 1 | 2

export default function BrokerConnectScreen() {
  const { session, user } = useAuth()
  const { hasActiveSubscription, isAdmin, loading: subLoading } = useSubscription()
  const { isDark } = useTheme()
  const muted = isDark ? '#94a3b8' : '#64748b'

  const [rows, setRows] = useState<ConnectTradingAccountForm[]>(emptyRows)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [connectStep, setConnectStep] = useState<ConnectStep>(0)
  const [connectedBroker, setConnectedBroker] = useState<BrokerAccount | null>(null)
  const connectStartedAtRef = useRef(0)

  useEffect(() => {
    if (!saving) return
    connectStartedAtRef.current = Date.now()
    setConnectStep(0)
    const timer = setInterval(() => {
      const elapsed = Date.now() - connectStartedAtRef.current
      if (elapsed >= 45_000) setConnectStep(2)
      else if (elapsed >= 12_000) setConnectStep(1)
      else setConnectStep(0)
    }, 1_000)
    return () => clearInterval(timer)
  }, [saving])

  const selectedPlatform = rows[0]?.platform ?? 'MT5'

  const setPlatform = useCallback((platform: TradingPlatform) => {
    setRows(prev => prev.map(row => ({ ...row, platform })))
  }, [])

  const setRowField = useCallback(
    (index: number, field: keyof ConnectTradingAccountForm, value: string) => {
      setRows(prev => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
    },
    [],
  )

  const addRow = () => {
    setRows(prev => [
      ...prev,
      { ...emptyConnectTradingAccountForm, platform: prev[0]?.platform ?? 'MT5' },
    ])
  }

  const removeRow = (index: number) => {
    setRows(prev => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  const serverPlatformMismatch =
    rows
      .map(row => {
        const inferred = inferServerPlatform(row.broker_server)
        return inferred && inferred !== row.platform ? inferred : null
      })
      .find(Boolean) ?? null

  const waitUntilConnected = async (accountId: string): Promise<BrokerAccount> => {
    if (!session?.access_token) throw new Error(COPY.connectFailed)
    const maxMs = 180_000
    const started = Date.now()
    let lastError = 'Terminal connection timed out'
    while (Date.now() - started < maxMs) {
      try {
        const { ok, data } = await callEdgeFunction<{
          account?: BrokerAccount
          error?: string
        }>('fxsocket-broker', {
          accessToken: session.access_token,
          body: { action: 'refresh_summary', account_id: accountId },
          timeoutMs: 60_000,
        })
        if (ok && data.account) {
          if (data.account.connection_status === 'connected') return data.account
          if (data.account.connection_status === 'error') {
            throw new Error(data.account.connection_error ?? COPY.connectFailed)
          }
        } else if (data.error) {
          lastError = data.error
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : lastError
      }
      await sleep(2_000)
    }
    throw new Error(lastError)
  }

  const connectSingle = async (row: ConnectTradingAccountForm): Promise<BrokerAccount> => {
    if (!session?.access_token) throw new Error(COPY.connectFailed)
    const { ok, data } = await callEdgeFunction<{
      account?: BrokerAccount
      error?: string
      pending?: boolean
    }>('fxsocket-broker', {
      accessToken: session.access_token,
      body: {
        action: 'connect',
        login: row.account_number.trim(),
        password: row.account_password,
        server: row.broker_server.trim(),
        platform: row.platform,
        label: row.label.trim() || undefined,
      },
      timeoutMs: 120_000,
    })
    if (!ok || data.error || !data.account) {
      throw new Error(data.error ?? COPY.connectFailed)
    }
    let ready = data.account
    if (ready.connection_status !== 'connected') {
      ready = await waitUntilConnected(ready.id)
    }
    return ready
  }

  const onConnect = async () => {
    setError('')
    if (subLoading) return
    if (!hasActiveSubscription && !isAdmin) {
      setError(COPY.subscriptionRequired)
      return
    }

    const validRows = rows.filter(row => validateConnectRow(row) == null)
    if (validRows.length === 0) {
      setError(COPY.validationRequired)
      return
    }

    if (user?.id && validRows.length === 1) {
      const row = validRows[0]!
      const login = row.account_number.trim()
      const server = row.broker_server.trim()
      const { data: existing } = await callEdgeFunction<{ accounts?: BrokerAccount[] }>(
        'fxsocket-broker',
        {
          accessToken: session?.access_token,
          body: { action: 'list' },
        },
      ).catch(() => ({ data: { accounts: [] as BrokerAccount[] } }))
      const duplicate = (existing.accounts ?? []).find(
        b => b.account_login === login && b.broker_server === server,
      )
      if (duplicate) {
        setError(COPY.duplicateMtLogin)
        return
      }
    }

    setSaving(true)
    try {
      let last: BrokerAccount | null = null
      for (const row of validRows) {
        last = await connectSingle(row)
      }
      setConnectedBroker(last)
      setRows(emptyRows())
    } catch (err) {
      setError(err instanceof Error ? err.message : COPY.connectFailed)
    } finally {
      setSaving(false)
    }
  }

  const validCount = countValidRows(rows)
  const isMulti = rows.length > 1
  const submitLabel = isMulti
    ? COPY.connectMultipleButton(validCount || rows.length)
    : COPY.connectButton

  const connectStepMessage =
    connectStep === 2
      ? COPY.connectingStepSlow
      : connectStep === 1
        ? COPY.connectingStepTerminal(selectedPlatform)
        : COPY.connectingStepLinking(selectedPlatform)

  if (connectedBroker) {
    return (
      <Screen className="px-0">
        <View className="flex-row items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            Connect broker
          </Text>
          <Pressable onPress={() => router.back()} hitSlop={12} className="rounded-full p-2">
            <X size={20} color={muted} />
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-full max-w-md items-center rounded-3xl border border-neutral-200 bg-white px-6 py-8 dark:border-neutral-800 dark:bg-neutral-900">
            <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-teal-50 dark:bg-teal-950/50">
              <Check size={28} color={tscTheme.primary} strokeWidth={2.5} />
            </View>
            <Image
              source={selectedPlatform === 'MT4' ? mt4Logo : mt5Logo}
              style={{ width: 40, height: 40, marginBottom: 12 }}
              resizeMode="contain"
            />
            <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              {COPY.successTitle}
            </Text>
            <Text className="mt-1 text-center text-sm text-neutral-500 dark:text-neutral-400">
              {COPY.successBody}
            </Text>
            <Text className="mt-3 text-center text-xs text-neutral-400">
              {[connectedBroker.account_login, connectedBroker.broker_server]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            <View className="mt-6 w-full gap-2">
              <Button
                label={COPY.configureTrading}
                onPress={() => {
                  router.back()
                  router.push(`/(app)/broker-config/${connectedBroker.id}`)
                }}
              />
              <Button label={COPY.done} variant="secondary" onPress={() => router.back()} />
            </View>
          </View>
        </View>
      </Screen>
    )
  }

  return (
    <Screen className="px-0">
      <View className="flex-row items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <Text className="min-w-0 flex-1 text-base font-semibold text-neutral-900 dark:text-neutral-50">
          {COPY.title(selectedPlatform)}
        </Text>
        <Pressable
          onPress={() => {
            if (!saving) router.back()
          }}
          disabled={saving}
          hitSlop={12}
          className="rounded-full p-2"
          accessibilityLabel="Close"
        >
          <X size={20} color={muted} />
        </Pressable>
      </View>

      <View className="relative flex-1">
        <ScrollView
          contentContainerClassName="gap-4 px-4 py-4 pb-10"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <View className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-900/50 dark:bg-red-950/40">
              <Text className="text-sm text-red-700 dark:text-red-300">{error}</Text>
              {error === COPY.subscriptionRequired ? (
                <Pressable onPress={() => router.push('/(app)/billing')} className="mt-2">
                  <Text className="text-sm font-medium text-teal-700 dark:text-teal-300">
                    Open billing
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <View className={cn('gap-4', saving && 'opacity-60')}>
            <View>
              <Text className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {COPY.platformLabel}
              </Text>
              <View className="flex-row gap-2">
                {(['MT5', 'MT4'] as const).map(option => {
                  const selected = selectedPlatform === option
                  return (
                    <Pressable
                      key={option}
                      disabled={saving}
                      onPress={() => setPlatform(option)}
                      className={cn(
                        'min-h-[72px] flex-1 flex-row items-center gap-2.5 rounded-xl border px-3 py-2.5',
                        selected
                          ? 'border-teal-500 bg-teal-50 dark:border-teal-400 dark:bg-teal-950/40'
                          : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900',
                      )}
                    >
                      <Image
                        source={option === 'MT4' ? mt4Logo : mt5Logo}
                        style={{ width: 28, height: 28 }}
                        resizeMode="contain"
                      />
                      <Text
                        className={cn(
                          'flex-1 text-sm font-medium',
                          selected
                            ? 'text-teal-900 dark:text-teal-100'
                            : 'text-neutral-700 dark:text-neutral-300',
                        )}
                      >
                        {option === 'MT5' ? COPY.platformMt5 : COPY.platformMt4}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>

            {serverPlatformMismatch ? (
              <View className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
                <Text className="text-sm text-amber-900 dark:text-amber-100">
                  {serverPlatformMismatch === 'MT4' ? COPY.mismatchMt4 : COPY.mismatchMt5}
                </Text>
                <Pressable onPress={() => setPlatform(serverPlatformMismatch)} className="mt-2">
                  <Text className="text-sm font-medium text-teal-700 underline dark:text-teal-300">
                    Switch to {serverPlatformMismatch}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {rows.map((row, index) => (
              <View
                key={index}
                className="gap-3 rounded-2xl border border-neutral-100 p-4 dark:border-neutral-800"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    {COPY.accountRowTitle(index + 1)}
                  </Text>
                  {rows.length > 1 ? (
                    <Pressable
                      onPress={() => removeRow(index)}
                      disabled={saving}
                      accessibilityLabel={COPY.removeRowAria}
                      className="rounded-lg p-1.5"
                    >
                      <Trash2 size={16} color="#f07070" />
                    </Pressable>
                  ) : null}
                </View>

                <View>
                  <Text className="mb-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    {COPY.accountLabel}
                  </Text>
                  <TextInput
                    value={row.label}
                    onChangeText={raw => setRowField(index, 'label', raw)}
                    placeholder={COPY.accountLabelPlaceholder(selectedPlatform)}
                    placeholderTextColor="#94a3b8"
                    editable={!saving}
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-3 text-sm text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-50"
                  />
                </View>

                <View>
                  <Text className="mb-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    {COPY.mtLoginLabel} <Text className="text-error-500">*</Text>
                  </Text>
                  <TextInput
                    value={row.account_number}
                    onChangeText={raw => setRowField(index, 'account_number', raw)}
                    placeholder={COPY.mtLoginPlaceholder}
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!saving}
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-3 text-sm text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-50"
                  />
                </View>

                <PasswordField
                  label={`${COPY.passwordLabel} *`}
                  value={row.account_password}
                  onChangeText={raw => setRowField(index, 'account_password', raw)}
                  placeholder={COPY.passwordPlaceholder}
                  editable={!saving}
                  className="mb-0"
                />

                <MtCompanyServerPicker
                  value={row.broker_server}
                  onChange={raw => setRowField(index, 'broker_server', raw)}
                  platform={row.platform}
                  disabled={saving}
                />
              </View>
            ))}

            <Pressable
              disabled={saving}
              onPress={addRow}
              className="flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 py-3 dark:border-neutral-700"
            >
              <Plus size={16} color={tscTheme.primary} />
              <Text className="text-sm font-medium text-teal-700 dark:text-teal-300">
                {COPY.addMoreButton}
              </Text>
            </Pressable>

            <Button
              label={submitLabel}
              loading={saving}
              disabled={saving}
              onPress={() => void onConnect()}
            />

            <View className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900/60">
              <Text className="text-xs leading-5 text-neutral-500 dark:text-neutral-400">
                {COPY.tip}
              </Text>
            </View>
          </View>
        </ScrollView>

        {saving ? (
          <View className="absolute inset-0 items-center justify-center bg-white/90 px-8 dark:bg-neutral-950/90">
            <ActivityIndicator color={tscTheme.primary} size="large" />
            <Text className="mt-4 text-center text-base font-semibold text-neutral-900 dark:text-neutral-50">
              {COPY.connectingTitle}
            </Text>
            <Text className="mt-2 text-center text-sm text-neutral-500 dark:text-neutral-400">
              {connectStepMessage}
            </Text>
          </View>
        ) : null}
      </View>
    </Screen>
  )
}
