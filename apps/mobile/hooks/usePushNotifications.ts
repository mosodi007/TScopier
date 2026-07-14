import { useEffect, useRef } from 'react'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null

  const existing = await Notifications.getPermissionsAsync()
  const existingStatus = (existing as { status?: string }).status ?? 'undetermined'
  let finalStatus = existingStatus
  if (existingStatus !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync()
    finalStatus = (requested as { status?: string }).status ?? 'denied'
  }
  if (finalStatus !== 'granted') return null

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId
    ?? Constants.easConfig?.projectId

  const tokenData = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  )

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('trades', {
      name: 'Trade alerts',
      importance: Notifications.AndroidImportance.HIGH,
    })
  }

  return tokenData.data
}

export function usePushNotifications(enabled = true): void {
  const { user } = useAuth()
  const registeredRef = useRef<string | null>(null)

  useEffect(() => {
    if (!enabled || !user?.id) return

    void (async () => {
      const token = await registerForPushNotifications()
      if (!token || token === registeredRef.current) return
      registeredRef.current = token

      await supabase.from('user_push_tokens').upsert(
        {
          user_id: user.id,
          token,
          platform: Platform.OS,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,token' },
      )
    })()
  }, [enabled, user?.id])
}
