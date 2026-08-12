import { useCallback, useEffect, useState } from 'react'
import { Image, Pressable, Text, View } from 'react-native'
import { useFocusEffect, router } from 'expo-router'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'

const memory = new Map<string, boolean>()

interface TelegramConnectBannerProps {
  className?: string
}

/** Dashboard banner when the user has not linked Telegram yet (web parity). */
export function TelegramConnectBanner({ className }: TelegramConnectBannerProps) {
  const { user } = useAuth()
  const [connected, setConnected] = useState<boolean | null>(() => {
    if (!user?.id) return null
    return memory.has(user.id) ? memory.get(user.id)! : null
  })

  const refreshTelegramSession = useCallback(async () => {
    if (!user?.id) {
      setConnected(null)
      return
    }
    const { data } = await supabase
      .from('telegram_sessions')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    const hasSession = !!data
    memory.set(user.id, hasSession)
    setConnected(hasSession)
  }, [user?.id])

  useEffect(() => {
    void refreshTelegramSession()
  }, [refreshTelegramSession])

  useFocusEffect(
    useCallback(() => {
      void refreshTelegramSession()
    }, [refreshTelegramSession]),
  )

  if (!user?.id || connected !== false) return null

  return (
    <View
      className={cn(
        'rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/60 dark:bg-amber-950/30',
        className,
      )}
    >
      <View className="gap-3">
        <View className="flex-row gap-3">
          <Image
            source={require('@/assets/images/Telegram.png')}
            style={{ width: 20, height: 20, marginTop: 2 }}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
          <View className="min-w-0 flex-1">
            <Text className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              Telegram not connected
            </Text>
            <Text className="mt-0.5 text-sm text-amber-800/90 dark:text-amber-200/80">
              Connect your Telegram account to start copying signals from your channels.
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => router.push('/(app)/telegram-link')}
          className="items-center justify-center rounded-lg bg-teal-600 px-3 py-2.5 active:bg-teal-700"
          accessibilityRole="button"
          accessibilityLabel="Connect Telegram"
        >
          <Text className="text-sm font-medium text-white">Connect Telegram</Text>
        </Pressable>
      </View>
    </View>
  )
}
