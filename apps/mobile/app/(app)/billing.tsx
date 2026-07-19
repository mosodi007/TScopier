import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { useFocusEffect, router } from 'expo-router'
import { CreditCard, ExternalLink } from 'lucide-react-native'
import { openCustomerPortal } from '@tscopier/shared'
import { useAuth } from '@/context/AuthContext'
import { useSubscription } from '@/context/SubscriptionContext'
import { useTheme } from '@/context/ThemeContext'
import { StackScreen } from '@/components/layout/StackScreen'
import { Button, Card } from '@/components/ui'
import { openInAppBrowser, openWebAppInApp } from '@/lib/inAppBrowser'
import { getBillingReturnUrl } from '@/lib/linking'
import { cn } from '@/lib/cn'
import { tscTheme } from '@/lib/tscTheme'

function formatPlanName(plan: string | null | undefined): string {
  if (!plan) return '—'
  if (plan === 'basic') return 'Basic'
  if (plan === 'advanced') return 'Advanced'
  if (plan === 'trial') return 'Trial'
  return plan.charAt(0).toUpperCase() + plan.slice(1)
}

function formatStatus(status: string | null | undefined): string {
  switch (status) {
    case 'active':
      return 'Active'
    case 'trialing':
      return 'Trial'
    case 'past_due':
      return 'Past due'
    case 'canceled':
      return 'Canceled'
    case 'incomplete':
      return 'Incomplete'
    default:
      return status ? status.replace(/_/g, ' ') : '—'
  }
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function statusBadgeClass(status: string | null | undefined): { wrap: string; text: string } {
  switch (status) {
    case 'active':
    case 'trialing':
      return {
        wrap: 'bg-teal-50 dark:bg-teal-950/40',
        text: 'text-teal-700 dark:text-teal-300',
      }
    case 'past_due':
    case 'incomplete':
      return {
        wrap: 'bg-amber-50 dark:bg-amber-950/40',
        text: 'text-amber-800 dark:text-amber-200',
      }
    case 'canceled':
      return {
        wrap: 'bg-neutral-100 dark:bg-neutral-800',
        text: 'text-neutral-600 dark:text-neutral-400',
      }
    default:
      return {
        wrap: 'bg-neutral-100 dark:bg-neutral-800',
        text: 'text-neutral-600 dark:text-neutral-400',
      }
  }
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-4 border-b border-neutral-100 py-3.5 last:border-b-0 dark:border-neutral-800">
      <Text className="text-sm text-neutral-500 dark:text-neutral-400">{label}</Text>
      <Text className="max-w-[60%] text-right text-sm font-medium text-neutral-900 dark:text-neutral-50">
        {value}
      </Text>
    </View>
  )
}

export default function BillingScreen() {
  const { session } = useAuth()
  const { subscription, hasActiveSubscription, isAdmin, loading, refresh } = useSubscription()
  const { isDark } = useTheme()
  const muted = isDark ? '#94a3b8' : '#64748b'

  const [refreshing, setRefreshing] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [error, setError] = useState('')

  useFocusEffect(
    useCallback(() => {
      void refresh()
    }, [refresh]),
  )

  const onRefresh = async () => {
    setRefreshing(true)
    setError('')
    await refresh()
    setRefreshing(false)
  }

  const openPricing = () => {
    void openWebAppInApp('/pricing', { session })
  }

  const openPortal = async () => {
    if (!session?.access_token) return
    setPortalLoading(true)
    setError('')
    try {
      const url = await openCustomerPortal(session.access_token, getBillingReturnUrl())
      await openInAppBrowser({ url })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open billing portal')
    } finally {
      setPortalLoading(false)
    }
  }

  const isPastDue = subscription?.status === 'past_due' || subscription?.status === 'incomplete'
  const showSubscribeCta = !hasActiveSubscription || isPastDue
  const subscribeLabel = isPastDue ? 'Pay invoices' : 'Purchase Subscription'

  return (
    <StackScreen title="Billing" subtitle="Subscription & invoices" showHeaderActions={false}>
      <ScrollView
        contentContainerClassName="gap-4 pb-24"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={tscTheme.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-900/50 dark:bg-red-950/40">
            <Text className="text-sm text-red-700 dark:text-red-300">{error}</Text>
          </View>
        ) : null}

        {loading && !subscription && !isAdmin ? (
          <View className="items-center py-16">
            <ActivityIndicator color={tscTheme.primary} size="large" />
          </View>
        ) : (
          <>
            <Card className="overflow-hidden p-0">
              <View className="flex-row items-center gap-3 border-b border-neutral-100 px-4 py-4 dark:border-neutral-800">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/40">
                  <CreditCard size={18} color={tscTheme.primary} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                    {isAdmin
                      ? 'Admin access'
                      : hasActiveSubscription
                        ? `${formatPlanName(subscription?.plan)} plan`
                        : 'No active subscription'}
                  </Text>
                  <Text className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                    {isAdmin
                      ? 'Unlimited accounts and channels'
                      : hasActiveSubscription
                        ? 'Your current TScopier subscription'
                        : 'Subscribe on the web to unlock copying'}
                  </Text>
                </View>
                {!isAdmin && subscription?.status ? (
                  <View
                    className={cn(
                      'rounded-full px-2.5 py-1',
                      statusBadgeClass(subscription.status).wrap,
                    )}
                  >
                    <Text
                      className={cn(
                        'text-[11px] font-semibold',
                        statusBadgeClass(subscription.status).text,
                      )}
                    >
                      {formatStatus(subscription.status)}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View className="px-4">
                {isAdmin ? (
                  <SummaryRow label="Plan" value="Admin" />
                ) : subscription ? (
                  <>
                    <SummaryRow label="Plan" value={formatPlanName(subscription.plan)} />
                    <SummaryRow label="Status" value={formatStatus(subscription.status)} />
                    {subscription.status === 'trialing' ? (
                      <SummaryRow label="Trial ends" value={formatDate(subscription.trial_ends_at)} />
                    ) : (
                      <SummaryRow
                        label="Next renewal"
                        value={formatDate(subscription.current_period_end)}
                      />
                    )}
                    {subscription.extra_accounts > 0 ? (
                      <SummaryRow
                        label="Extra accounts"
                        value={String(subscription.extra_accounts)}
                      />
                    ) : null}
                  </>
                ) : (
                  <View className="py-5">
                    <Text className="text-sm leading-5 text-neutral-600 dark:text-neutral-300">
                      You&apos;re on view-only mode. Purchase a subscription to connect brokers,
                      Telegram channels, and run backtests.
                    </Text>
                  </View>
                )}
              </View>
            </Card>

            {showSubscribeCta && !isAdmin ? (
              <Card>
                <Text className="mb-1 text-base font-semibold text-neutral-900 dark:text-neutral-50">
                  {isPastDue ? 'Update payment' : 'Get started'}
                </Text>
                <Text className="mb-4 text-sm leading-5 text-neutral-500 dark:text-neutral-400">
                  {isPastDue
                    ? 'Open the pricing page to settle invoices and keep the copier running.'
                    : 'Browse plans and checkout securely on tscopier.ai — no App Store purchase.'}
                </Text>
                <Button label={subscribeLabel} onPress={openPricing} />
              </Card>
            ) : null}

            {hasActiveSubscription && !isAdmin ? (
              <Card>
                <Text className="mb-1 text-base font-semibold text-neutral-900 dark:text-neutral-50">
                  Manage subscription
                </Text>
                <Text className="mb-4 text-sm leading-5 text-neutral-500 dark:text-neutral-400">
                  Change plan, update payment method, or view invoices on the web.
                </Text>
                <View className="gap-2">
                  <Button label="View plans / upgrade" onPress={openPricing} />
                  <Button
                    label="Open billing portal"
                    variant="secondary"
                    loading={portalLoading}
                    onPress={() => void openPortal()}
                  />
                </View>
                <View className="mt-3 flex-row items-center justify-center gap-1.5">
                  <ExternalLink size={12} color={muted} />
                  <Text className="text-xs text-neutral-400">Stripe checkout opens in-app</Text>
                </View>
              </Card>
            ) : null}

            {isAdmin ? (
              <Card>
                <Text className="text-sm leading-5 text-neutral-600 dark:text-neutral-300">
                  Admin access is active on this account. You can still browse plans if needed.
                </Text>
                <View className="mt-3">
                  <Button label="View pricing" variant="secondary" onPress={openPricing} />
                </View>
              </Card>
            ) : null}
          </>
        )}

        <Button label="Close" variant="secondary" onPress={() => router.back()} />
      </ScrollView>
    </StackScreen>
  )
}
