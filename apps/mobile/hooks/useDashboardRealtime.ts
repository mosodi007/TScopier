import { useEffect, useRef } from 'react'
import { whenRealtimeReady } from '@tscopier/shared'
import { supabase } from '@/lib/supabase'
import type { BrokerAccount } from '@tscopier/shared'

const DEBOUNCE_MS = 450

function removeChannelsForTopic(topic: string): void {
  for (const existing of supabase.getChannels()) {
    if (
      existing.topic === topic
      || existing.topic === `realtime:${topic}`
      || existing.topic.endsWith(`:${topic}`)
    ) {
      void supabase.removeChannel(existing)
    }
  }
}

export function useDashboardRealtime(
  userId: string | undefined,
  onDataChange: () => void,
  onBrokerPatch?: (broker: BrokerAccount) => void,
  scope = 'main',
  enabled = true,
): void {
  const onChangeRef = useRef(onDataChange)
  onChangeRef.current = onDataChange
  const onBrokerPatchRef = useRef(onBrokerPatch)
  onBrokerPatchRef.current = onBrokerPatch
  const generationRef = useRef(0)

  useEffect(() => {
    if (!userId || !enabled) return

    const generation = ++generationRef.current
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    const schedule = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        debounceTimer = null
        onChangeRef.current()
      }, DEBOUNCE_MS)
    }

    const filter = `user_id=eq.${userId}`
    const topic = `dashboard_realtime:${scope}:${userId}`
    let cancelled = false
    let channel: ReturnType<typeof supabase.channel> | null = null

    void (async () => {
      try {
        await whenRealtimeReady(supabase, userId)
        if (cancelled || generation !== generationRef.current) return

        removeChannelsForTopic(topic)

        channel = supabase
          .channel(topic)
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
      } catch {
        // Ignore setup races during fast refresh; next effect run will retry.
      }
    })()

    return () => {
      cancelled = true
      if (debounceTimer) clearTimeout(debounceTimer)
      if (channel) {
        void supabase.removeChannel(channel)
        channel = null
      }
      removeChannelsForTopic(topic)
    }
  }, [userId, scope, enabled])
}
