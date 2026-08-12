import { useCallback, useEffect, useState } from 'react'
import { whenRealtimeReady } from '@tscopier/shared'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

export function useCopierPause() {
  const { user } = useAuth()
  const [copierPaused, setCopierPaused] = useState(false)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setCopierPaused(false)
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('user_profiles')
      .select('copier_paused')
      .eq('user_id', user.id)
      .maybeSingle()
    setCopierPaused(data?.copier_paused === true)
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!user?.id) return

    let cancelled = false
    let channel: ReturnType<typeof supabase.channel> | null = null

    void whenRealtimeReady(supabase, user.id).then(() => {
      if (cancelled) return
      channel = supabase
        .channel(`mobile_copier_pause:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'user_profiles',
            filter: `user_id=eq.${user.id}`,
          },
          payload => {
            const next = payload.new as { copier_paused?: boolean } | undefined
            if (typeof next?.copier_paused === 'boolean') {
              setCopierPaused(next.copier_paused)
            }
          },
        )
        .subscribe()
    })

    return () => {
      cancelled = true
      if (channel) void supabase.removeChannel(channel)
    }
  }, [user?.id])

  const patchPaused = useCallback((next: boolean) => {
    setCopierPaused(next)
  }, [])

  const persistPaused = useCallback(
    async (next: boolean) => {
      if (!user?.id) return
      const { error } = await supabase
        .from('user_profiles')
        .upsert({ user_id: user.id, copier_paused: next }, { onConflict: 'user_id' })
      if (error) throw new Error(error.message)
      setCopierPaused(next)
    },
    [user?.id],
  )

  return { copierPaused, loading, patchPaused, persistPaused, refresh }
}
