import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { whenRealtimeReady } from '@tscopier/shared'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export interface AppNotification {
  id: string
  title: string
  body: string
  createdAt: string
  read: boolean
}

interface NotificationsContextValue {
  notifications: AppNotification[]
  unreadCount: number
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
}

const READ_KEY_PREFIX = 'tscopier.notifications.read.'

const NotificationsContext = createContext<NotificationsContextValue>({
  notifications: [],
  unreadCount: 0,
  markRead: async () => {},
  markAllRead: async () => {},
})

function formatLogTitle(action: string, status: string): { title: string; body: string } {
  const act = action.toLowerCase()
  const ok = status.toLowerCase() === 'success'
  if (act.includes('order_send') || act.includes('signal_entry')) {
    return {
      title: ok ? 'Trade opened' : 'Trade skipped',
      body: ok ? 'A new position was opened on your broker.' : 'Signal was not copied to broker.',
    }
  }
  if (act.includes('mgmt_close') || act.includes('close')) {
    return { title: 'Trade closed', body: 'A position was closed on your broker.' }
  }
  if (act.includes('modify') || act.includes('breakeven')) {
    return { title: 'Trade updated', body: 'SL/TP was modified on an open position.' }
  }
  return { title: 'Copier activity', body: `${action} — ${status}` }
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [readIds, setReadIds] = useState<Set<string>>(new Set())

  const storageKey = user?.id ? `${READ_KEY_PREFIX}${user.id}` : null

  useEffect(() => {
    if (!storageKey) return
    AsyncStorage.getItem(storageKey).then(raw => {
      if (!raw) return
      try {
        const ids = JSON.parse(raw) as string[]
        setReadIds(new Set(ids))
      } catch { /* ignore */ }
    })
  }, [storageKey])

  const persistRead = useCallback(async (ids: Set<string>) => {
    if (!storageKey) return
    await AsyncStorage.setItem(storageKey, JSON.stringify([...ids]))
  }, [storageKey])

  useEffect(() => {
    if (!user?.id) return

    let cancelled = false
    let channel: ReturnType<typeof supabase.channel> | null = null

    void whenRealtimeReady(supabase, user.id).then(() => {
      if (cancelled) return
      channel = supabase
        .channel(`trade_notifications:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'trade_execution_logs',
            filter: `user_id=eq.${user.id}`,
          },
          payload => {
            const row = payload.new as Record<string, unknown>
            const action = String(row.action ?? '')
            const status = String(row.status ?? '')
            if (!action || action.startsWith('pipeline_')) return
            const { title, body } = formatLogTitle(action, status)
            const item: AppNotification = {
              id: String(row.id),
              title,
              body,
              createdAt: String(row.created_at ?? new Date().toISOString()),
              read: false,
            }
            setNotifications(prev => [item, ...prev].slice(0, 100))
          },
        )
        .subscribe()
    })

    void supabase
      .from('trade_execution_logs')
      .select('id, action, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (!data) return
        setNotifications(
          data.map(row => {
            const { title, body } = formatLogTitle(String(row.action), String(row.status))
            return {
              id: String(row.id),
              title,
              body,
              createdAt: String(row.created_at),
              read: false,
            }
          }),
        )
      })

    return () => {
      cancelled = true
      if (channel) void supabase.removeChannel(channel)
    }
  }, [user?.id])

  const notificationsWithRead = useMemo(
    () => notifications.map(n => ({ ...n, read: readIds.has(n.id) || n.read })),
    [notifications, readIds],
  )

  const unreadCount = useMemo(
    () => notificationsWithRead.filter(n => !n.read).length,
    [notificationsWithRead],
  )

  const markRead = useCallback(async (id: string) => {
    setReadIds(prev => {
      const next = new Set(prev)
      next.add(id)
      void persistRead(next)
      return next
    })
  }, [persistRead])

  const markAllRead = useCallback(async () => {
    setReadIds(prev => {
      const next = new Set(prev)
      for (const n of notifications) next.add(n.id)
      void persistRead(next)
      return next
    })
  }, [notifications, persistRead])

  return (
    <NotificationsContext.Provider
      value={{
        notifications: notificationsWithRead,
        unreadCount,
        markRead,
        markAllRead,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationsContext)
