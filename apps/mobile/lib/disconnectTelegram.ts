import { Alert } from 'react-native'
import { invalidateTgChannelsCache } from '@/lib/tgChannelsCache'
import { supabase } from '@/lib/supabase'

export async function disconnectTelegramSession(userId: string): Promise<void> {
  await supabase.from('telegram_sessions').delete().eq('user_id', userId)
  invalidateTgChannelsCache(userId)
}

/** Confirm, then disconnect Telegram session (channels are kept). */
export function confirmDisconnectTelegram(userId: string | undefined): void {
  if (!userId) {
    Alert.alert('Not signed in', 'Sign in again to disconnect Telegram.')
    return
  }
  Alert.alert(
    'Disconnect Telegram',
    'This removes your Telegram session from TScopier. Configured channels are kept. Continue?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: () => {
          void disconnectTelegramSession(userId).then(() => {
            Alert.alert('Telegram disconnected', 'You can link Telegram again from Channels.')
          })
        },
      },
    ],
  )
}
