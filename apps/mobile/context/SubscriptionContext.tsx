import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { isAdminAccessActive } from '@tscopier/web-lib/adminAccess'
import { isSubscriptionActive } from '@tscopier/web-lib/planLimits'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export interface Subscription {
  id: string
  user_id: string
  plan: 'basic' | 'advanced' | 'trial'
  status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'incomplete'
  extra_accounts: number
  trial_ends_at: string | null
  current_period_end: string | null
}

interface SubscriptionContextValue {
  subscription: Subscription | null
  loading: boolean
  hasActiveSubscription: boolean
  isAdmin: boolean
  refresh: () => Promise<void>
}

const SubscriptionContext = createContext<SubscriptionContextValue>({
  subscription: null,
  loading: true,
  hasActiveSubscription: false,
  isAdmin: false,
  refresh: async () => {},
})

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setSubscription(null)
      setIsAdmin(false)
      setLoading(false)
      return
    }
    setLoading(true)
    const [subscriptionRes, profileRes] = await Promise.all([
      supabase
        .from('subscriptions')
        .select('id, user_id, plan, status, extra_accounts, trial_ends_at, current_period_end')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('user_profiles')
        .select('is_admin, admin_until')
        .eq('user_id', user.id)
        .maybeSingle(),
    ])
    if (subscriptionRes.error) console.warn('[subscription]', subscriptionRes.error.message)
    setSubscription((subscriptionRes.data as Subscription | null) ?? null)
    setIsAdmin(isAdminAccessActive(profileRes.data))
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const hasActiveSubscription = useMemo(
    () =>
      isAdmin ||
      isSubscriptionActive(subscription?.status, subscription?.trial_ends_at),
    [isAdmin, subscription?.status, subscription?.trial_ends_at],
  )

  return (
    <SubscriptionContext.Provider
      value={{ subscription, loading, hasActiveSubscription, isAdmin, refresh }}
    >
      {children}
    </SubscriptionContext.Provider>
  )
}

export const useSubscription = () => useContext(SubscriptionContext)
