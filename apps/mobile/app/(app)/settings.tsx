import { useCallback, useEffect, useState } from 'react'
import { Alert, Linking, Platform, ScrollView, Switch, View } from 'react-native'
import Constants from 'expo-constants'
import { router } from 'expo-router'
import * as Updates from 'expo-updates'
import { useAuth } from '@/context/AuthContext'
import { useSubscription } from '@/context/SubscriptionContext'
import { useTheme } from '@/context/ThemeContext'
import { ThemeOption } from '@/components/ThemeToggle'
import { StackScreen } from '@/components/layout/StackScreen'
import { confirmDisconnectTelegram } from '@/lib/disconnectTelegram'
import {
  disableDevicePush,
  enableDevicePush,
  getPushPreference,
} from '@/hooks/usePushNotifications'
import {
  checkAndApplyOtaUpdate,
  getOtaUpdateInfo,
  type OtaUpdateInfo,
} from '@/hooks/useOTAUpdates'
import {
  AccentText,
  Button,
  Card,
  HeadingText,
  LabelText,
  MutedText,
  ValueText,
} from '@/components/ui'
import { tscTheme } from '@/lib/tscTheme'

export default function SettingsScreen() {
  const { user, signOut } = useAuth()
  const { subscription, hasActiveSubscription } = useSubscription()
  const { theme, setTheme, isDark } = useTheme()
  const [pushEnabled, setPushEnabled] = useState(true)
  const [pushBusy, setPushBusy] = useState(false)
  const [otaBusy, setOtaBusy] = useState(false)
  const [otaInfo, setOtaInfo] = useState<OtaUpdateInfo>(() => getOtaUpdateInfo())
  const appVersion = Constants.expoConfig?.version ?? '—'
  const extra = Constants.expoConfig?.extra as {
    privacyPolicyUrl?: string
    termsUrl?: string
    riskDisclaimerUrl?: string
  } | undefined

  useEffect(() => {
    void getPushPreference().then(setPushEnabled)
    setOtaInfo(getOtaUpdateInfo())
  }, [])

  const onTogglePush = useCallback(
    async (next: boolean) => {
      if (!user?.id || pushBusy) return
      setPushBusy(true)
      setPushEnabled(next)
      try {
        if (!next) {
          await disableDevicePush()
          return
        }
        const result = await enableDevicePush(user.id)
        if (result === 'denied') {
          setPushEnabled(false)
          Alert.alert(
            'Notifications blocked',
            'Enable notifications for TScopier in system Settings to receive trade alerts.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: () => {
                  if (Platform.OS === 'ios') {
                    void Linking.openURL('app-settings:')
                  } else {
                    void Linking.openSettings()
                  }
                },
              },
            ],
          )
        } else if (result !== 'ok') {
          setPushEnabled(false)
          Alert.alert(
            'Could not enable notifications',
            'Push requires a development or production build on a physical device (not Expo Go / simulator).',
          )
        }
      } finally {
        setPushBusy(false)
      }
    },
    [pushBusy, user?.id],
  )

  const onCheckUpdates = useCallback(async () => {
    if (otaBusy) return
    setOtaBusy(true)
    try {
      const result = await checkAndApplyOtaUpdate({ download: true, autoReload: false })
      setOtaInfo(getOtaUpdateInfo())
      if (result.status === 'ready') {
        Alert.alert('Update ready', result.message, [
          { text: 'Later', style: 'cancel' },
          { text: 'Restart', onPress: () => void Updates.reloadAsync() },
        ])
      } else if (result.status === 'up-to-date') {
        Alert.alert('Up to date', result.message)
      } else {
        Alert.alert(
          result.status === 'error' ? 'Update check failed' : 'App updates',
          result.message,
        )
      }
    } finally {
      setOtaBusy(false)
    }
  }, [otaBusy])

  return (
    <StackScreen title="Settings" subtitle={user?.email ?? undefined}>
      <ScrollView contentContainerClassName="mt-4 gap-4 pb-24">
        <Card>
          <HeadingText className="mb-3">Appearance</HeadingText>
          <View className="flex-row gap-2">
            <ThemeOption label="Light" selected={theme === 'light'} onPress={() => setTheme('light')} />
            <ThemeOption label="Dark" selected={theme === 'dark'} onPress={() => setTheme('dark')} />
          </View>
        </Card>

        <Card>
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <HeadingText>Push notifications</HeadingText>
              <MutedText className="mt-1 text-sm">
                Trade alerts on this device when executions, closes, and stop updates succeed.
              </MutedText>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={value => void onTogglePush(value)}
              disabled={pushBusy || !user?.id}
              trackColor={{ false: isDark ? '#334155' : '#cbd5e1', true: tscTheme.primary }}
              thumbColor="#ffffff"
            />
          </View>
        </Card>

        <Card>
          <HeadingText className="mb-2">App updates</HeadingText>
          <MutedText className="mb-3 text-sm">
            Over-the-air updates deliver JS fixes without a new App Store build. Native changes still
            require a store release.
          </MutedText>
          <LabelText>Version</LabelText>
          <ValueText className="mt-1">{appVersion}</ValueText>
          {otaInfo.enabled ? (
            <View className="mt-2 gap-1">
              <MutedText className="text-xs">
                Channel: {otaInfo.channel ?? '—'} · Runtime: {otaInfo.runtimeVersion ?? '—'}
              </MutedText>
              <MutedText className="text-xs">
                {otaInfo.isEmbeddedLaunch
                  ? 'Running embedded build'
                  : `Update ${otaInfo.updateId?.slice(0, 8) ?? '—'}`}
              </MutedText>
            </View>
          ) : (
            <MutedText className="mt-2 text-xs">
              OTA is inactive in Expo Go / local development.
            </MutedText>
          )}
          <View className="mt-3">
            <Button
              label={otaBusy ? 'Checking…' : 'Check for updates'}
              variant="secondary"
              onPress={() => void onCheckUpdates()}
              disabled={otaBusy || !otaInfo.enabled}
            />
          </View>
        </Card>

        <Card>
          <LabelText>Subscription</LabelText>
          <ValueText className="mt-1 text-lg">
            {hasActiveSubscription ? `${subscription?.plan ?? 'active'} plan` : 'No active subscription'}
          </ValueText>
          <View className="mt-3">
            <Button label="Manage billing" variant="secondary" onPress={() => router.push('/(app)/billing')} />
          </View>
        </Card>

        <Card>
          <HeadingText className="mb-2">Telegram</HeadingText>
          <MutedText className="mb-3 text-sm">
            Disconnect removes your Telegram session. Configured channels are kept.
          </MutedText>
          <Button
            label="Disconnect Telegram"
            variant="danger"
            onPress={() => confirmDisconnectTelegram(user?.id)}
          />
        </Card>

        <Card>
          <HeadingText className="mb-2">Legal</HeadingText>
          <View className="gap-2">
            {extra?.termsUrl ? (
              <AccentText onPress={() => Linking.openURL(extra.termsUrl!)}>Terms of Service</AccentText>
            ) : null}
            {extra?.privacyPolicyUrl ? (
              <AccentText onPress={() => Linking.openURL(extra.privacyPolicyUrl!)}>Privacy Policy</AccentText>
            ) : null}
            {extra?.riskDisclaimerUrl ? (
              <AccentText onPress={() => Linking.openURL(extra.riskDisclaimerUrl!)}>Risk Disclaimer</AccentText>
            ) : null}
          </View>
        </Card>

        <Button label="Sign out" variant="danger" onPress={() => void signOut()} />
        <MutedText className="text-center text-xs">Profile avatar menu also includes billing and affiliate links.</MutedText>
      </ScrollView>
    </StackScreen>
  )
}
