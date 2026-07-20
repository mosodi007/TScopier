import './env'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { RealtimeClient } from '@supabase/realtime-js'
import * as SecureStore from 'expo-secure-store'
import { getSupabaseAnonKey, getSupabaseUrl } from '@tscopier/shared'

function readEnv(key: string): string {
  const value = process.env[key]
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

const supabaseUrl = getSupabaseUrl()
const supabaseAnonKey = getSupabaseAnonKey()
const realtimeOverride =
  readEnv('EXPO_PUBLIC_SUPABASE_REALTIME_URL')
  || readEnv('VITE_SUPABASE_REALTIME_URL')

/** False when EAS/production build was missing EXPO_PUBLIC_* secrets. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabaseConfigMessage = isSupabaseConfigured
  ? null
  : 'Missing Supabase config. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY as EAS environment variables (or apps/mobile/.env for local), then rebuild.'

function normalizeRealtimeEndpoint(raw: string): string {
  const trimmed = raw.replace(/\/$/, '')
  const withProtocol = trimmed.startsWith('ws')
    ? trimmed
    : trimmed.replace(/^http/i, match => (match.toLowerCase() === 'https' ? 'wss' : 'ws'))
  return withProtocol.endsWith('/realtime/v1') ? withProtocol : `${withProtocol}/realtime/v1`
}

function applyOptionalRealtimeEndpoint(client: SupabaseClient, anonKey: string): void {
  if (!realtimeOverride) return
  const endpoint = normalizeRealtimeEndpoint(realtimeOverride)
  const existing = client.realtime as RealtimeClient & {
    accessToken?: () => Promise<string | null | undefined>
    headers?: Record<string, string>
    fetch?: typeof fetch
  }
  ;(client as { realtime: RealtimeClient }).realtime = new RealtimeClient(endpoint, {
    params: { apikey: anonKey },
    accessToken: existing.accessToken?.bind(existing),
    headers: existing.headers,
    fetch: existing.fetch,
    disconnectOnEmptyChannelsAfterMs: 60_000,
  })
}

const SecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}

/**
 * Always export a client so module importers don't crash.
 * When misconfigured, RootLayout shows a config screen and never mounts auth.
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://invalid.local',
  supabaseAnonKey || 'invalid',
  {
    auth: {
      storage: SecureStoreAdapter,
      autoRefreshToken: isSupabaseConfigured,
      persistSession: isSupabaseConfigured,
      detectSessionInUrl: false,
    },
    realtime: {
      disconnectOnEmptyChannelsAfterMs: 60_000,
    },
  },
)

if (isSupabaseConfigured) {
  applyOptionalRealtimeEndpoint(supabase, supabaseAnonKey)
}
