import { useEffect } from 'react'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { parseAuthTokensFromUrl } from '@/lib/linking'
import { supabase } from '@/lib/supabase'

WebBrowser.maybeCompleteAuthSession()

export function useAuthDeepLink(): void {
  useEffect(() => {
    const handleUrl = async (url: string) => {
      const { accessToken, refreshToken, type } = parseAuthTokensFromUrl(url)
      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        return
      }
      if (type === 'recovery') {
        // reset-password screen reads session from URL via same handler
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        }
      }
    }

    void Linking.getInitialURL().then(url => {
      if (url) void handleUrl(url)
    })

    const sub = Linking.addEventListener('url', ({ url }) => {
      void handleUrl(url)
    })

    return () => sub.remove()
  }, [])
}
