import { useCallback, useEffect, useState } from 'react'
import { Alert, Linking, Platform, ScrollView, Switch, View } from 'react-native'
import Constants from 'expo-constants'
import { router } from 'expo-router'
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
  const extra = Constants.expoConfig?.extra as {
    privacyPolicyUrl?: string
    termsUrl?: string
    riskDisclaimerUrl?: string
  } | undefined

  useEffect(() => {
    void getPushPreference().then(setPushEnabled)
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
