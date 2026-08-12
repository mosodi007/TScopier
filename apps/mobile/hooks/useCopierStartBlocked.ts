import { useCallback, useEffect, useMemo, useState } from 'react'
import type { BrokerAccount } from '@tscopier/shared'
import { listenerLeaseStatusFromRow } from '@tscopier/web-lib/listenerLeaseStatus'
import { useAuth } from '@/context/AuthContext'
import { useSubscription } from '@/context/SubscriptionContext'
import {
  resolveCopierStartBlocked,
  type CopierStartBlockedReason,
} from '@/lib/copierStartBlocked'
import { isBrokerConnected, type BrokerLiveSnapshot } from '@/lib/dashboardStats'
import { supabase } from '@/lib/supabase'

interface UseCopierStartBlockedArgs {
  brokers?: BrokerAccount[]
  brokersLoading?: boolean
  liveByBroker?: Record<string, BrokerLiveSnapshot>
}

function brokerHasLiveStream(live?: BrokerLiveSnapshot): boolean {
  if (!live) return false
  return live.equity != null || live.balance != null
}

export function useCopierStartBlocked(args: UseCopierStartBlockedArgs = {}) {
  const { user } = useAuth()
  const { hasActiveSubscription, loading: subscriptionLoading } = useSubscription()
  const [brokers, setBrokers] = useState<BrokerAccount[]>(args.brokers ?? [])
  const [brokersLoading, setBrokersLoading] = useState(args.brokers == null)
  const [telegramConnected, setTelegramConnected] = useState<boolean | null>(null)
  const [telegramLoading, setTelegramLoading] = useState(true)
  const [channelCount, setChannelCount] = useState(0)
  const [channelsLoading, setChannelsLoading] = useState(true)
  const [listenerLive, setListenerLive] = useState(false)
  const [listenerLoading, setListenerLoading] = useState(true)

  useEffect(() => {
    if (args.brokers != null) {
      setBrokers(args.brokers)
      setBrokersLoading(args.brokersLoading ?? false)
    }
  }, [args.brokers, args.brokersLoading])

  const loadBrokers = useCallback(async () => {
    if (args.brokers != null || !user?.id) return
    setBrokersLoading(true)
    const { data } = await supabase
      .from('broker_accounts')
      .select('id, is_active, fxsocket_status, connection_status, fxsocket_account_id, metaapi_account_id')
      .eq('user_id', user.id)
    setBrokers((data ?? []) as BrokerAccount[])
    setBrokersLoading(false)
  }, [args.brokers, user?.id])

  const loadCopierPrerequisites = useCallback(async () => {
    if (!user?.id) {
      setTelegramConnected(null)
      setChannelCount(0)
      setListenerLive(false)
      setTelegramLoading(false)
      setChannelsLoading(false)
      setListenerLoading(false)
      return
    }
    setTelegramLoading(true)
    setChannelsLoading(true)
    setListenerLoading(true)
    const [sessionRes, channelsRes, leaseRes] = await Promise.all([
      supabase.from('telegram_sessions').select('id').eq('user_id', user.id).maybeSingle(),
      supabase
        .from('telegram_channels')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
      supabase
        .from('worker_session_leases')
        .select('expires_at, role')
        .eq('user_id', user.id)
        .maybeSingle(),
    ])
    setTelegramConnected(!!sessionRes.data)
    setChannelCount(channelsRes.count ?? 0)
    setListenerLive(listenerLeaseStatusFromRow(leaseRes.data).status === 'live')
    setTelegramLoading(false)
    setChannelsLoading(false)
    setListenerLoading(false)
  }, [user?.id])

  useEffect(() => {
    void loadBrokers()
  }, [loadBrokers])

  useEffect(() => {
    void loadCopierPrerequisites()
  }, [loadCopierPrerequisites])

  const resolving =
    subscriptionLoading ||
    brokersLoading ||
    telegramLoading ||
    channelsLoading ||
    listenerLoading

  const hasConnectedBroker = useMemo(
    () =>
      brokers.some(b => {
        if (b.is_active === false) return false
        if (isBrokerConnected(b)) return true
        return brokerHasLiveStream(args.liveByBroker?.[b.id])
      }),
    [args.liveByBroker, brokers],
  )

  const { blocked, reason } = useMemo(
    () =>
      resolveCopierStartBlocked({
        hasActiveSubscription,
        hasConnectedBroker,
        hasTelegramSession: telegramConnected === true,
        hasChannels: channelCount > 0,
      }),
    [hasActiveSubscription, hasConnectedBroker, telegramConnected, channelCount],
  )

  return {
    copierStartBlocked: blocked,
    copierStartBlockedReason: reason as CopierStartBlockedReason | null,
    listenerLive,
    resolving,
  }
}
