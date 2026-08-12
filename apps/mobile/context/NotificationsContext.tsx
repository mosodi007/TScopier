import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { whenRealtimeReady } from '@tscopier/shared'
import { tradeNotificationsEn } from '@tscopier/web-i18n/tradeNotifications/en'
import {
  countUnreadNotifications,
  TRADE_EXECUTION_LOG_NOTIFICATION_SELECT,
  TRADE_NOTIFICATION_LOG_ACTIONS,
  tradeNotificationsFromLogs,
  type TradeExecutionLogRow,
  type TradeNotification,
} from '@tscopier/web-lib/tradeNotifications'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

const MAX_NOTIFICATIONS = 30
const FETCH_LIMIT = 120
const REALTIME_DEBOUNCE_MS = 300
const LAST_READ_KEY_PREFIX = 'tsc_notifications_last_read_at:'

function buildChannelDisplayNames(
  channels: Array<{ id: string; display_name: string; channel_username?: string | null }>,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const c of channels) {
    const name = c.display_name?.trim()
    const username = c.channel_username?.trim().replace(/^@/, '')
    out[c.id] = name || (username ? `@${username}` : 'Unnamed channel')
  }
  return out
}

function buildBrokerLabels(
  brokers: Array<{ id: string; label?: string | null; broker_name?: string | null }>,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const b of brokers) {
    const label = b.label?.trim()
    const brokerName = b.broker_name?.trim()
    out[b.id] = label || brokerName || ''
  }
  return out
}

async function readLastReadAt(userId: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(`${LAST_READ_KEY_PREFIX}${userId}`)
  } catch {
    return null
  }
}

async function writeLastReadAt(userId: string, iso: string): Promise<void> {
  try {
    await AsyncStorage.setItem(`${LAST_READ_KEY_PREFIX}${userId}`, iso)
  } catch {
    // ignore storage failures
  }
}

interface NotificationsContextValue {
  items: TradeNotification[]
  unreadCount: number
  loading: boolean
  markAllRead: () => void
  refresh: () => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextValue>({
  items: [],
  unreadCount: 0,
  loading: false,
  markAllRead: () => {},
  refresh: async () => {},
})

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [items, setItems] = useState<TradeNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [lastReadAt, setLastReadAt] = useState<string | null>(null)
  const channelNamesRef = useRef<Record<string, string>>({})
  const brokerLabelsRef = useRef<Record<string, string>>({})
  const rawRowsRef = useRef<TradeExecutionLogRow[]>([])
  const knownLogIdsRef = useRef(new Set<string>())
  const notificationIdsRef = useRef(new Set<string>())

  useEffect(() => {
    if (!user?.id) {
      setLastReadAt(null)
      return
    }
    void readLastReadAt(user.id).then(setLastReadAt)
  }, [user?.id])

  const applyRows = useCallback((rows: TradeExecutionLogRow[]): TradeNotification[] => {
    rawRowsRef.current = rows
    return tradeNotificationsFromLogs(rows, tradeNotificationsEn, {
      channelDisplayNames: channelNamesRef.current,
      brokerLabels: brokerLabelsRef.current,
    }).slice(0, MAX_NOTIFICATIONS)
  }, [])

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setItems([])
      setLoading(false)
      knownLogIdsRef.current.clear()
      notificationIdsRef.current.clear()
      rawRowsRef.current = []
      return
    }
    setLoading(true)
    try {
      const [channelsRes, brokersRes, logsRes] = await Promise.all([
        supabase
          .from('telegram_channels')
          .select('id, display_name, channel_username')
          .eq('user_id', user.id),
        supabase
          .from('broker_accounts')
          .select('id, label, broker_name')
          .eq('user_id', user.id),
        supabase
          .from('trade_execution_logs')
          .select(TRADE_EXECUTION_LOG_NOTIFICATION_SELECT)
          .eq('user_id', user.id)
          .eq('status', 'success')
          .in('action', [...TRADE_NOTIFICATION_LOG_ACTIONS])
          .order('created_at', { ascending: false })
          .limit(FETCH_LIMIT),
      ])
      if (channelsRes.error) throw new Error(channelsRes.error.message)
      if (brokersRes.error) throw new Error(brokersRes.error.message)
      if (logsRes.error) throw new Error(logsRes.error.message)

      channelNamesRef.current = buildChannelDisplayNames(channelsRes.data ?? [])
      brokerLabelsRef.current = buildBrokerLabels(brokersRes.data ?? [])
      const rows = (logsRes.data ?? []) as TradeExecutionLogRow[]
      knownLogIdsRef.current = new Set(rows.map(r => r.id))
      const next = applyRows(rows)
      notificationIdsRef.current = new Set(next.map(n => n.id))
      setItems(next)
    } catch (e) {
      console.warn('[notifications] load failed', e)
    } finally {
      setLoading(false)
    }
  }, [user?.id, applyRows])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!user?.id) return

    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    const flush = () => {
      debounceTimer = null
      void refresh()
    }

    const schedule = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(flush, REALTIME_DEBOUNCE_MS)
    }

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
            const row = payload.new as TradeExecutionLogRow
            if (!row?.id || knownLogIdsRef.current.has(row.id)) return
            knownLogIdsRef.current.add(row.id)
            rawRowsRef.current = [row, ...rawRowsRef.current]
              .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
              .slice(0, FETCH_LIMIT)
            setItems(applyRows(rawRowsRef.current))
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
  }, [user?.id, refresh, applyRows])

  const markAllRead = useCallback(() => {
    if (!user?.id) return
    const now = new Date().toISOString()
    setLastReadAt(now)
    void writeLastReadAt(user.id, now)
  }, [user?.id])

  const unreadCount = useMemo(
    () => countUnreadNotifications(items, lastReadAt),
    [items, lastReadAt],
  )

  const value = useMemo(
    (): NotificationsContextValue => ({
      items,
      unreadCount,
      loading,
      markAllRead,
      refresh,
    }),
    [items, unreadCount, loading, markAllRead, refresh],
  )

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationsContext)
