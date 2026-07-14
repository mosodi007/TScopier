import { useEffect, useRef } from 'react'
import { whenRealtimeReady } from '@tscopier/shared'
import { supabase } from '@/lib/supabase'
import type { BrokerAccount } from '@tscopier/shared'

const DEBOUNCE_MS = 450

export function useDashboardRealtime(
  userId: string | undefined,
  onDataChange: () => void,
  onBrokerPatch?: (broker: BrokerAccount) => void,
  scope = 'main',
): void {
  const onChangeRef = useRef(onDataChange)
  onChangeRef.current = onDataChange
  const onBrokerPatchRef = useRef(onBrokerPatch)
  onBrokerPatchRef.current = onBrokerPatch

  useEffect(() => {
    if (!userId) return

    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    const schedule = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        debounceTimer = null
        onChangeRef.current()
      }, DEBOUNCE_MS)
    }

    const filter = `user_id=eq.${userId}`
    let cancelled = false
    let channel: ReturnType<typeof supabase.channel> | null = null

    void whenRealtimeReady(supabase, userId).then(() => {
      if (cancelled) return
      channel = supabase
        .channel(`dashboard_realtime:${scope}:${userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'trades', filter }, schedule)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'signals', filter }, schedule)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'broker_accounts', filter },
          payload => {
            if (payload.eventType === 'UPDATE' && payload.new) {
              onBrokerPatchRef.current?.(payload.new as BrokerAccount)
            }
            schedule()
          },
        )
        .subscribe()
    })

    return () => {
      cancelled = true
      if (debounceTimer) clearTimeout(debounceTimer)
      if (channel) void supabase.removeChannel(channel)
    }
  }, [userId, scope])
}
