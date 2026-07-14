import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
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
  refresh: () => Promise<void>
}

const SubscriptionContext = createContext<SubscriptionContextValue>({
  subscription: null,
  loading: true,
  hasActiveSubscription: false,
  refresh: async () => {},
})

function isActive(status: string | undefined): boolean {
  return status === 'active' || status === 'trialing'
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setSubscription(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('subscriptions')
      .select('id, user_id, plan, status, extra_accounts, trial_ends_at, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle()
    if (error) console.warn('[subscription]', error.message)
    setSubscription((data as Subscription | null) ?? null)
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const hasActiveSubscription = useMemo(
    () => isActive(subscription?.status),
    [subscription?.status],
  )

  return (
    <SubscriptionContext.Provider value={{ subscription, loading, hasActiveSubscription, refresh }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export const useSubscription = () => useContext(SubscriptionContext)
