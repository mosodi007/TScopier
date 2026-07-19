import { Pressable, Text, View } from 'react-native'
import { router } from 'expo-router'
import { CreditCard } from 'lucide-react-native'
import { useAuth } from '@/context/AuthContext'
import { useSubscription } from '@/context/SubscriptionContext'
import { cn } from '@/lib/cn'

interface SubscriptionWarningBannerProps {
  className?: string
}

/**
 * Dashboard warning when the user has no active subscription (or payment is past due).
 * Matches the web UpgradePrompt / PastDueSubscriptionBanner treatment.
 */
export function SubscriptionWarningBanner({ className }: SubscriptionWarningBannerProps) {
  const { user } = useAuth()
  const { loading, hasActiveSubscription, isAdmin, subscription } = useSubscription()

  if (!user || loading || isAdmin || hasActiveSubscription) return null

  const isPastDue = subscription?.status === 'past_due'
  const title = isPastDue
    ? 'Payment did not go through'
    : 'Subscribe to start copying signals'
  const body = isPastDue
    ? 'Please pay your invoices to avoid service disruptions. We will stop the copier if payment is not received.'
    : "You're on view only mode. Purchase a subscription plan to connect brokers, Telegram channels and backtests."
  const cta = isPastDue ? 'Pay invoices' : 'Purchase Subscription'

  return (
    <View
      role="alert"
      className={cn(
        'rounded-xl border border-error-200 bg-error-50 px-4 py-3 dark:border-error-800 dark:bg-error-950/40',
        className,
      )}
    >
      <View className="gap-3">
        <View className="flex-row gap-3">
          <CreditCard size={20} color="#737373" style={{ marginTop: 2 }} />
          <View className="min-w-0 flex-1">
            <Text className="text-sm font-semibold text-[#737373]">{title}</Text>
            <Text className="mt-0.5 text-sm leading-5 text-[#737373]/90">{body}</Text>
          </View>
        </View>
        <Pressable
          onPress={() => router.push('/(app)/billing')}
          className="items-center justify-center rounded-lg bg-[#737373] px-3 py-2.5 active:opacity-90"
          accessibilityRole="button"
          accessibilityLabel={cta}
        >
          <Text className="text-sm font-medium text-white">{cta}</Text>
        </Pressable>
      </View>
    </View>
  )
}
