import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { UserInitialsSource } from '@/lib/userAvatar'

export function useUserProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserInitialsSource>({})
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setProfile({})
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('user_profiles')
      .select('first_name, last_name, display_name')
      .eq('user_id', user.id)
      .maybeSingle()
    setProfile((data as UserInitialsSource) ?? {})
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { profile, loading, refresh }
}
