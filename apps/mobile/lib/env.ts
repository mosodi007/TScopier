import Constants from 'expo-constants'
import { configureEnvReader } from '@tscopier/shared'

type ExtraConfig = {
  supabaseUrl?: string
  supabaseAnonKey?: string
  supabaseRealtimeUrl?: string
  workerUrl?: string
}

function extra(): ExtraConfig {
  return (Constants.expoConfig?.extra ?? {}) as ExtraConfig
}

configureEnvReader((key: string) => {
  // Expo inlines EXPO_PUBLIC_* at bundle time.
  const fromProcess = process.env[key]
  if (typeof fromProcess === 'string' && fromProcess.trim()) return fromProcess.trim()

  const ex = extra()
  if (key === 'EXPO_PUBLIC_SUPABASE_URL' || key === 'VITE_SUPABASE_URL') {
    return ex.supabaseUrl?.trim() || undefined
  }
  if (key === 'EXPO_PUBLIC_SUPABASE_ANON_KEY' || key === 'VITE_SUPABASE_ANON_KEY') {
    return ex.supabaseAnonKey?.trim() || undefined
  }
  if (key === 'EXPO_PUBLIC_SUPABASE_REALTIME_URL' || key === 'VITE_SUPABASE_REALTIME_URL') {
    return ex.supabaseRealtimeUrl?.trim() || undefined
  }
  if (key === 'EXPO_PUBLIC_WORKER_URL' || key === 'VITE_WORKER_URL') {
    return ex.workerUrl?.trim() || undefined
  }
  return undefined
})
