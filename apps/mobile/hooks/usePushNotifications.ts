import { useEffect, useRef } from 'react'
import { AppState, Platform } from 'react-native'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

const PUSH_PREF_KEY = 'tscopier.push.enabled'

/** Latest Expo push token registered on this device (for Settings disable). */
let devicePushToken: string | null = null

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export async function getPushPreference(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(PUSH_PREF_KEY)
    if (raw == null) return true
    return raw === '1'
  } catch {
    return true
  }
}

export async function setPushPreference(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(PUSH_PREF_KEY, enabled ? '1' : '0')
}

function resolveProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId
    ?? Constants.easConfig?.projectId
    ?? undefined
  )
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync('trades', {
    name: 'Trade alerts',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#14b8a6',
  })
}

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('[push] Physical device required for push notifications')
    return null
  }

  await ensureAndroidChannel()

  const existing = await Notifications.getPermissionsAsync() as { granted?: boolean; status?: string }
  if (!(existing.granted || existing.status === 'granted')) {
    const requested = await Notifications.requestPermissionsAsync() as {
      granted?: boolean
      status?: string
    }
    if (!(requested.granted || requested.status === 'granted')) {
      console.warn('[push] Permission not granted')
      return null
    }
  }

  const projectId = resolveProjectId()
  if (!projectId) {
    console.warn('[push] Missing EAS projectId in app config')
    return null
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId })
  return tokenData.data
}

async function upsertPushToken(userId: string, token: string): Promise<void> {
  const platform =
    Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web'
  const { error } = await supabase.from('user_push_tokens').upsert(
    {
      user_id: userId,
      token,
      platform,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,token' },
  )
  if (error) {
    console.warn('[push] Failed to save token', error.message)
    return
  }
  devicePushToken = token
}

async function deletePushToken(token: string | null): Promise<void> {
  if (!token) return
  const { error } = await supabase.from('user_push_tokens').delete().eq('token', token)
  if (error) {
    console.warn('[push] Failed to delete token', error.message)
  }
  if (devicePushToken === token) devicePushToken = null
}

function navigateFromNotification(data: Record<string, unknown> | undefined): void {
  const href = typeof data?.href === 'string' ? data.href : '/(app)/alerts'
  try {
    router.push(href as never)
  } catch {
    router.push('/(app)/alerts')
  }
}

async function syncRegistration(userId: string): Promise<'ok' | 'denied' | 'unavailable' | 'error'> {
  try {
    const prefEnabled = await getPushPreference()
    if (!prefEnabled) return 'denied'

    const token = await registerForPushNotifications()
    if (!token) {
      const permissions = await Notifications.getPermissionsAsync() as {
        granted?: boolean
        status?: string
      }
      return permissions.granted || permissions.status === 'granted' ? 'unavailable' : 'denied'
    }
    await upsertPushToken(userId, token)
    return 'ok'
  } catch (e) {
    console.warn('[push] syncRegistration failed', e)
    return 'error'
  }
}

/**
 * Registers Expo push token for the signed-in user, persists it to Supabase,
 * and routes notification taps to Alerts.
 */
export function usePushNotifications(enabled = true): void {
  const { user } = useAuth()
  const tokenRef = useRef<string | null>(null)
  const registeringRef = useRef(false)

  useEffect(() => {
    const responseSub = Notifications.addNotificationResponseReceivedListener(response => {
      navigateFromNotification(
        response.notification.request.content.data as Record<string, unknown> | undefined,
      )
    })

    void Notifications.getLastNotificationResponseAsync().then(response => {
      if (!response) return
      navigateFromNotification(
        response.notification.request.content.data as Record<string, unknown> | undefined,
      )
    })

    return () => {
      responseSub.remove()
    }
  }, [])

  useEffect(() => {
    if (!enabled || !user?.id) {
      if (!user?.id && tokenRef.current) {
        const stale = tokenRef.current
        tokenRef.current = null
        void deletePushToken(stale)
      }
      return
    }

    let cancelled = false

    const sync = async () => {
      if (registeringRef.current) return
      registeringRef.current = true
      try {
        if (cancelled) return
        const result = await syncRegistration(user.id)
        if (!cancelled && result === 'ok' && devicePushToken) {
          tokenRef.current = devicePushToken
        }
      } finally {
        registeringRef.current = false
      }
    }

    void sync()

    const appSub = AppState.addEventListener('change', state => {
      if (state === 'active') void sync()
    })

    return () => {
      cancelled = true
      appSub.remove()
    }
  }, [enabled, user?.id])
}

/** Turn off push for this device and remove the Expo token from Supabase. */
export async function disableDevicePush(): Promise<void> {
  await setPushPreference(false)
  await deletePushToken(devicePushToken)
}

/** Enable preference and register immediately for the given user. */
export async function enableDevicePush(userId: string): Promise<'ok' | 'denied' | 'unavailable' | 'error'> {
  await setPushPreference(true)
  return syncRegistration(userId)
}