import { ScrollView, View, Linking } from 'react-native'
import Constants from 'expo-constants'
import { router } from 'expo-router'
import { useAuth } from '@/context/AuthContext'
import { useSubscription } from '@/context/SubscriptionContext'
import { useTheme } from '@/context/ThemeContext'
import { ThemeOption } from '@/components/ThemeToggle'
import { StackScreen } from '@/components/layout/StackScreen'
import {
  AccentText,
  Button,
  Card,
  HeadingText,
  LabelText,
  MutedText,
  ValueText,
} from '@/components/ui'

export default function SettingsScreen() {
  const { user, signOut } = useAuth()
  const { subscription, hasActiveSubscription } = useSubscription()
  const { theme, setTheme } = useTheme()
  const extra = Constants.expoConfig?.extra as {
    privacyPolicyUrl?: string
    termsUrl?: string
    riskDisclaimerUrl?: string
  } | undefined

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
          <LabelText>Subscription</LabelText>
          <ValueText className="mt-1 text-lg">
            {hasActiveSubscription ? `${subscription?.plan ?? 'active'} plan` : 'No active subscription'}
          </ValueText>
          <View className="mt-3">
            <Button label="Manage billing" variant="secondary" onPress={() => router.push('/(app)/billing')} />
          </View>
        </Card>

        <Card>
          <HeadingText className="mb-2">Setup</HeadingText>
          <View className="gap-2">
            <Button label="Connect broker" variant="secondary" onPress={() => router.push('/(app)/broker-connect')} />
            <Button label="Link Telegram" variant="secondary" onPress={() => router.push('/(app)/telegram-link')} />
            <Button label="Copier status" variant="secondary" onPress={() => router.push('/(app)/copier-status')} />
            <Button label="Channel config" variant="secondary" onPress={() => router.push('/(app)/channel-config')} />
          </View>
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
