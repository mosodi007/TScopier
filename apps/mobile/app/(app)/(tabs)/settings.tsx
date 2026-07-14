import { ScrollView, Text, View, Linking } from 'react-native'
import Constants from 'expo-constants'
import { router } from 'expo-router'
import { useAuth } from '@/context/AuthContext'
import { useSubscription } from '@/context/SubscriptionContext'
import { Button, Card, Screen, Subtitle, Title } from '@/components/ui'

export default function SettingsScreen() {
  const { user, signOut } = useAuth()
  const { subscription, hasActiveSubscription } = useSubscription()
  const extra = Constants.expoConfig?.extra as {
    privacyPolicyUrl?: string
    termsUrl?: string
    riskDisclaimerUrl?: string
  } | undefined

  return (
    <Screen>
      <ScrollView contentContainerClassName="gap-4 pb-24">
        <Title>Settings</Title>
        <Subtitle>{user?.email}</Subtitle>

        <Card>
          <Text className="text-sm text-neutral-400">Subscription</Text>
          <Text className="mt-1 text-lg text-white">
            {hasActiveSubscription ? `${subscription?.plan ?? 'active'} plan` : 'No active subscription'}
          </Text>
          <View className="mt-3">
            <Button label="Manage billing" variant="secondary" onPress={() => router.push('/(app)/billing')} />
          </View>
        </Card>

        <Card>
          <Text className="mb-2 font-semibold text-white">Setup</Text>
          <View className="gap-2">
            <Button label="Connect broker" variant="secondary" onPress={() => router.push('/(app)/broker-connect')} />
            <Button label="Link Telegram" variant="secondary" onPress={() => router.push('/(app)/telegram-link')} />
            <Button label="Copier status" variant="secondary" onPress={() => router.push('/(app)/copier-status')} />
            <Button label="Channel config" variant="secondary" onPress={() => router.push('/(app)/channel-config')} />
          </View>
        </Card>

        <Card>
          <Text className="mb-2 font-semibold text-white">Legal</Text>
          <View className="gap-2">
            {extra?.termsUrl ? (
              <Text className="text-teal-400" onPress={() => Linking.openURL(extra.termsUrl!)}>Terms of Service</Text>
            ) : null}
            {extra?.privacyPolicyUrl ? (
              <Text className="text-teal-400" onPress={() => Linking.openURL(extra.privacyPolicyUrl!)}>Privacy Policy</Text>
            ) : null}
            {extra?.riskDisclaimerUrl ? (
              <Text className="text-teal-400" onPress={() => Linking.openURL(extra.riskDisclaimerUrl!)}>Risk Disclaimer</Text>
            ) : null}
          </View>
        </Card>

        <Button label="Sign out" variant="danger" onPress={() => void signOut()} />
      </ScrollView>
    </Screen>
  )
}
