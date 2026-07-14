import { ScrollView, View, Linking } from 'react-native'
import { router } from 'expo-router'
import { openCustomerPortal, startPlanCheckout } from '@tscopier/shared'
import { useAuth } from '@/context/AuthContext'
import { getBillingReturnUrl } from '@/lib/linking'
import { BodyText, Button, Card, Screen, Subtitle, Title } from '@/components/ui'

export default function BillingScreen() {
  const { session } = useAuth()

  const openCheckout = async (plan: 'basic' | 'advanced') => {
    if (!session?.access_token) return
    const url = await startPlanCheckout({
      accessToken: session.access_token,
      plan,
      interval: 'monthly',
      successUrl: getBillingReturnUrl(),
      cancelUrl: getBillingReturnUrl(),
    })
    await Linking.openURL(url)
  }

  const openPortal = async () => {
    if (!session?.access_token) return
    const url = await openCustomerPortal(session.access_token, getBillingReturnUrl())
    await Linking.openURL(url)
  }

  return (
    <Screen>
      <ScrollView contentContainerClassName="gap-4 pb-24">
        <Title>Billing</Title>
        <Subtitle>Manage your TScopier subscription</Subtitle>

        <Card>
          <BodyText className="mb-3">Choose a plan to unlock full copier features.</BodyText>
          <View className="gap-2">
            <Button label="Basic plan" onPress={() => void openCheckout('basic')} />
            <Button label="Advanced plan" variant="secondary" onPress={() => void openCheckout('advanced')} />
          </View>
        </Card>

        <Card>
          <BodyText className="mb-3">Update payment method, invoices, or cancel via Stripe.</BodyText>
          <Button label="Open billing portal" variant="secondary" onPress={() => void openPortal()} />
        </Card>

        <Button label="Close" variant="secondary" onPress={() => router.back()} />
      </ScrollView>
    </Screen>
  )
}
