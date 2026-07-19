import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native'
import {
  Check,
  KeyRound,
  ListPlus,
  QrCode,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
} from 'lucide-react-native'
import { cn } from '@/lib/cn'
import { tscTheme } from '@/lib/tscTheme'
import { Button } from '@/components/ui'
import { PasswordField } from '@/components/auth/PasswordField'
import { useTheme } from '@/context/ThemeContext'

export type TelegramConnectStage = 'idle' | 'method' | 'phone' | 'code' | 'qr' | 'twoFa'
export type TelegramAuthMethod = 'phone' | 'qr'

const COPY = {
  connectTelegram: 'Connect Telegram',
  heroTitle: 'Link your Telegram account',
  heroSubtitle: 'Sign in with your phone to browse signal channels and add them to the copier.',
  phoneTitle: 'Enter your phone number',
  phoneSubtitle: 'We’ll send a verification code to your Telegram app.',
  codeTitle: 'Enter verification code',
  codeSubtitle: 'Open Telegram on your phone and enter the code you received.',
  stepPhone: 'Phone',
  stepCode: 'Verify',
  stepTwoFa: '2FA',
  stepChannels: 'Channels',
  stepQr: 'Scan QR',
  twoFaTitle: 'Two-step verification',
  twoFaSubtitle:
    'Your account has 2FA enabled. Enter your Telegram cloud password to finish connecting.',
  qrTwoFaSubtitle:
    'Your account has 2FA enabled. Enter your Telegram cloud password to finish linking.',
  howItWorks1: 'Enter the phone number linked to your Telegram account',
  howItWorks2: 'Enter the code sent in the Telegram app',
  howItWorks3: 'Choose signal channels to monitor and copy',
  phoneWarning:
    "TScopier does not access or read your messages. By connecting your Telegram, you only grant the app access to channels you're a member of.",
  methodTitle: 'Choose how to sign in',
  methodSubtitle: 'Use your phone number or scan a QR code with the Telegram app on your phone.',
  methodPhone: 'Phone number',
  methodQr: 'QR code',
  qrTitle: 'Scan with Telegram',
  qrSubtitle: 'Link this account by scanning the code from your phone.',
  qrInstructions:
    'Open Telegram on your phone → Settings → Devices → Link Desktop Device → scan this QR code.',
  qrWaiting: 'Waiting for scan…',
  cancelConnect: 'Cancel',
  phoneLabel: 'Phone number',
  phonePlaceholder: '+1 234 567 8900',
  phoneHint: 'Include country code',
  sendCode: 'Send code',
  verificationCode: 'Verification code',
  verificationPlaceholder: '12345',
  sentTo: (phone: string) => `Sent to ${phone}`,
  twoFaPassword: '2FA password',
  twoFaPlaceholder: 'Your Telegram password',
  twoFaRequired: 'Enter your Telegram 2FA password.',
  verify: 'Verify',
  back: 'Back',
  useDifferentNumber: 'Use a different number',
  backToVerificationCode: 'Back to verification code',
} as const

const PHONE_STEPS = [
  { id: 'phone', icon: Smartphone, label: COPY.stepPhone },
  { id: 'code', icon: KeyRound, label: COPY.stepCode },
  { id: 'twoFa', icon: ShieldCheck, label: COPY.stepTwoFa },
  { id: 'channels', icon: ListPlus, label: COPY.stepChannels },
] as const

const QR_STEPS = [
  { id: 'qr', icon: QrCode, label: COPY.stepQr },
  { id: 'twoFa', icon: ShieldCheck, label: COPY.stepTwoFa },
  { id: 'channels', icon: ListPlus, label: COPY.stepChannels },
] as const

function stepIndex(stage: TelegramConnectStage, authMethod: TelegramAuthMethod): number {
  if (stage === 'idle' || stage === 'method') return 0
  if (authMethod === 'qr') {
    if (stage === 'qr') return 0
    if (stage === 'twoFa') return 1
    return 0
  }
  if (stage === 'phone') return 0
  if (stage === 'code') return 1
  if (stage === 'twoFa') return 2
  return 0
}

function GhostButton({
  label,
  onPress,
  disabled,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={cn('items-center rounded-xl py-3', disabled && 'opacity-50')}
    >
      <Text className="text-sm font-medium text-neutral-600 dark:text-neutral-300">{label}</Text>
    </Pressable>
  )
}

function TextField({
  label,
  hint,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoFocus,
}: {
  label: string
  hint?: string
  value: string
  onChangeText: (v: string) => void
  placeholder?: string
  keyboardType?: 'default' | 'phone-pad' | 'number-pad'
  autoFocus?: boolean
}) {
  return (
    <View className="mb-1">
      <Text className="mb-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType={keyboardType}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        className="rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
      />
      {hint ? (
        <Text className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">{hint}</Text>
      ) : null}
    </View>
  )
}

export interface TelegramConnectFlowProps {
  stage: TelegramConnectStage
  onStageChange: (stage: TelegramConnectStage) => void
  authMethod: TelegramAuthMethod
  onAuthMethodChange: (method: TelegramAuthMethod) => void
  phone: string
  onPhoneChange: (value: string) => void
  code: string
  onCodeChange: (value: string) => void
  password: string
  onPasswordChange: (value: string) => void
  qrUrl: string
  qrWaiting: boolean
  loading: boolean
  error: string
  onSendCode: () => void
  onVerifyCode: () => void
  onStartQr: () => void
  onVerifyQrPassword: () => void
}

export function TelegramConnectFlow({
  stage,
  onStageChange,
  authMethod,
  onAuthMethodChange,
  phone,
  onPhoneChange,
  code,
  onCodeChange,
  password,
  onPasswordChange,
  qrUrl,
  qrWaiting,
  loading,
  error,
  onSendCode,
  onVerifyCode,
  onStartQr,
  onVerifyQrPassword,
}: TelegramConnectFlowProps) {
  const { isDark } = useTheme()
  const steps = authMethod === 'qr' ? QR_STEPS : PHONE_STEPS
  const activeStep = stepIndex(stage, authMethod)
  const showSteps = stage !== 'idle' && stage !== 'method'

  const title =
    stage === 'method'
      ? COPY.methodTitle
      : stage === 'phone'
        ? COPY.phoneTitle
        : stage === 'code'
          ? COPY.codeTitle
          : stage === 'qr'
            ? COPY.qrTitle
            : stage === 'twoFa'
              ? COPY.twoFaTitle
              : COPY.heroTitle

  const subtitle =
    stage === 'method'
      ? COPY.methodSubtitle
      : stage === 'phone'
        ? COPY.phoneSubtitle
        : stage === 'code'
          ? COPY.codeSubtitle
          : stage === 'qr'
            ? COPY.qrSubtitle
            : stage === 'twoFa'
              ? authMethod === 'qr'
                ? COPY.qrTwoFaSubtitle
                : COPY.twoFaSubtitle
              : COPY.heroSubtitle

  const howItWorks = [COPY.howItWorks1, COPY.howItWorks2, COPY.howItWorks3]
  const mutedIcon = isDark ? '#94a3b8' : '#a3a3a3'
  const qrImageUri = qrUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrUrl)}`
    : null

  return (
    <View className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      {/* Hero header */}
      <View className="border-b border-neutral-100 bg-[#229ED9]/10 px-5 pb-5 pt-6 dark:border-neutral-800 dark:bg-[#229ED9]/20">
        <View className="items-center">
          <View className="mb-3 h-14 w-14 items-center justify-center rounded-2xl border border-neutral-100 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
            <Image
              source={require('@/assets/images/Telegram.png')}
              style={{ width: 32, height: 32 }}
              resizeMode="contain"
            />
          </View>
          <Text className="text-center text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            {title}
          </Text>
          <Text className="mt-1 text-center text-sm text-neutral-500 dark:text-neutral-400">
            {subtitle}
          </Text>
        </View>

        {showSteps ? (
          <View className="mt-6 flex-row items-center justify-center px-1">
            {steps.map((step, i) => {
              const done = i < activeStep
              const current = i === activeStep
              const Icon = step.icon
              return (
                <View key={step.id} className="flex-row items-center" style={{ flex: i < steps.length - 1 ? 1 : 0 }}>
                  <View className="items-center gap-1.5">
                    <View
                      className={cn(
                        'h-9 w-9 items-center justify-center rounded-full border-2',
                        done && 'border-teal-600 bg-teal-600',
                        current && !done && 'border-teal-600 bg-white dark:bg-neutral-800',
                        !done &&
                          !current &&
                          'border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800',
                      )}
                    >
                      {done ? (
                        <Check size={16} color="#ffffff" strokeWidth={2.5} />
                      ) : (
                        <Icon
                          size={16}
                          color={current ? tscTheme.primary : mutedIcon}
                        />
                      )}
                    </View>
                    <Text
                      className={cn(
                        'max-w-[64px] text-center text-[10px] font-medium',
                        current
                          ? 'text-teal-700 dark:text-teal-400'
                          : done
                            ? 'text-neutral-600 dark:text-neutral-300'
                            : 'text-neutral-400',
                      )}
                      numberOfLines={1}
                    >
                      {step.label}
                    </Text>
                  </View>
                  {i < steps.length - 1 ? (
                    <View
                      className={cn(
                        'mx-1 mb-5 h-0.5 flex-1 rounded-full',
                        i < activeStep ? 'bg-teal-500' : 'bg-neutral-200 dark:bg-neutral-700',
                      )}
                    />
                  ) : null}
                </View>
              )
            })}
          </View>
        ) : null}
      </View>

      <View className="gap-4 px-5 py-5">
        {stage === 'idle' ? (
          <View className="gap-2.5">
            {howItWorks.map((line, i) => (
              <View key={line} className="flex-row items-start gap-2.5">
                <View className="mt-0.5 h-5 w-5 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/50">
                  <Text className="text-xs font-semibold text-teal-700 dark:text-teal-300">
                    {i + 1}
                  </Text>
                </View>
                <Text className="min-w-0 flex-1 text-sm text-neutral-600 dark:text-neutral-300">
                  {line}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {stage === 'phone' || stage === 'code' || stage === 'twoFa' || stage === 'qr' ? (
          <View className="flex-row items-start gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2.5 dark:border-amber-900/50 dark:bg-amber-950/30">
            <TriangleAlert size={16} color="#d97706" style={{ marginTop: 2 }} />
            <Text className="min-w-0 flex-1 text-xs leading-5 text-amber-800 dark:text-amber-200/90">
              {COPY.phoneWarning}
            </Text>
          </View>
        ) : null}

        {error ? (
          <View className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-900/50 dark:bg-red-950/40">
            <Text className="text-sm text-red-700 dark:text-red-300">{error}</Text>
          </View>
        ) : null}

        {stage === 'idle' ? (
          <Pressable
            onPress={() => onStageChange('method')}
            className="flex-row items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3.5 active:bg-teal-700"
          >
            <Image
              source={require('@/assets/images/Telegram.png')}
              style={{ width: 20, height: 20 }}
              resizeMode="contain"
            />
            <Text className="text-base font-semibold text-white">{COPY.connectTelegram}</Text>
          </Pressable>
        ) : null}

        {stage === 'method' ? (
          <View className="gap-4">
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => onAuthMethodChange('phone')}
                className={cn(
                  'min-h-[96px] flex-1 rounded-xl border-2 p-4',
                  authMethod === 'phone'
                    ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/30'
                    : 'border-neutral-200 dark:border-neutral-700',
                )}
              >
                <Smartphone size={20} color={tscTheme.primary} />
                <Text className="mt-2 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                  {COPY.methodPhone}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => onAuthMethodChange('qr')}
                className={cn(
                  'min-h-[96px] flex-1 rounded-xl border-2 p-4',
                  authMethod === 'qr'
                    ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/30'
                    : 'border-neutral-200 dark:border-neutral-700',
                )}
              >
                <QrCode size={20} color={tscTheme.primary} />
                <Text className="mt-2 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                  {COPY.methodQr}
                </Text>
              </Pressable>
            </View>
            <Button
              label={authMethod === 'qr' ? COPY.methodQr : COPY.sendCode}
              onPress={() => {
                if (authMethod === 'qr') {
                  onStageChange('qr')
                  onStartQr()
                } else {
                  onStageChange('phone')
                }
              }}
            />
            <GhostButton label={COPY.cancelConnect} onPress={() => onStageChange('idle')} />
          </View>
        ) : null}

        {stage === 'phone' ? (
          <View className="gap-4">
            <TextField
              label={COPY.phoneLabel}
              placeholder={COPY.phonePlaceholder}
              value={phone}
              onChangeText={onPhoneChange}
              hint={COPY.phoneHint}
              keyboardType="phone-pad"
              autoFocus
            />
            <Button label={COPY.sendCode} loading={loading} onPress={onSendCode} />
            <GhostButton label={COPY.back} onPress={() => onStageChange('method')} disabled={loading} />
          </View>
        ) : null}

        {stage === 'code' ? (
          <View className="gap-4">
            <TextField
              label={COPY.verificationCode}
              placeholder={COPY.verificationPlaceholder}
              value={code}
              onChangeText={onCodeChange}
              hint={COPY.sentTo(phone)}
              keyboardType="number-pad"
              autoFocus
            />
            <Button label={COPY.verify} loading={loading} onPress={onVerifyCode} />
            <GhostButton
              label={COPY.useDifferentNumber}
              onPress={() => onStageChange('phone')}
              disabled={loading}
            />
          </View>
        ) : null}

        {stage === 'qr' ? (
          <View className="gap-4">
            <View className="items-center gap-4">
              <View className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-700">
                {qrImageUri ? (
                  <Image
                    source={{ uri: qrImageUri }}
                    style={{ width: 200, height: 200 }}
                    resizeMode="contain"
                  />
                ) : (
                  <View className="h-[200px] w-[200px] items-center justify-center">
                    <ActivityIndicator color={tscTheme.primary} size="large" />
                  </View>
                )}
              </View>
              <Text className="max-w-xs text-center text-xs leading-5 text-neutral-500 dark:text-neutral-400">
                {COPY.qrInstructions}
              </Text>
              {qrWaiting ? (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator color={tscTheme.primary} size="small" />
                  <Text className="text-sm text-teal-700 dark:text-teal-400">{COPY.qrWaiting}</Text>
                </View>
              ) : null}
            </View>
            <GhostButton
              label={COPY.back}
              onPress={() => onStageChange('method')}
              disabled={loading}
            />
          </View>
        ) : null}

        {stage === 'twoFa' ? (
          <View className="gap-4">
            {authMethod === 'phone' ? (
              <View className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800/50">
                <Text className="text-xs text-neutral-500 dark:text-neutral-400">
                  {COPY.verificationCode}
                </Text>
                <Text className="mt-0.5 font-mono text-sm font-medium tracking-wide text-neutral-900 dark:text-neutral-50">
                  {code || '—'}
                </Text>
                <Text className="mt-1 text-xs text-neutral-400">{COPY.sentTo(phone)}</Text>
              </View>
            ) : null}
            <PasswordField
              label={COPY.twoFaPassword}
              placeholder={COPY.twoFaPlaceholder}
              value={password}
              onChangeText={onPasswordChange}
              hint={COPY.twoFaRequired}
              autoFocus
            />
            <Button
              label={COPY.verify}
              loading={loading}
              onPress={authMethod === 'qr' ? onVerifyQrPassword : onVerifyCode}
            />
            <GhostButton
              label={authMethod === 'qr' ? COPY.back : COPY.backToVerificationCode}
              onPress={() => onStageChange(authMethod === 'qr' ? 'qr' : 'code')}
              disabled={loading}
            />
          </View>
        ) : null}
      </View>
    </View>
  )
}
