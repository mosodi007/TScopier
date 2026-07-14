import AsyncStorage from '@react-native-async-storage/async-storage'
import { useColorScheme as useNativeWindColorScheme } from 'nativewind'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useColorScheme as useSystemColorScheme } from 'react-native'
import type { ThemeMode } from '@/lib/tscTheme'

const STORAGE_KEY = 'tscopier-theme'

interface ThemeContextValue {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  isDark: boolean
  ready: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function resolveSystemTheme(system: ReturnType<typeof useSystemColorScheme>): ThemeMode {
  return system === 'dark' ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme()
  const { setColorScheme } = useNativeWindColorScheme()
  const [theme, setThemeState] = useState<ThemeMode>(() => resolveSystemTheme(systemScheme))
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY)
      const resolved: ThemeMode =
        stored === 'light' || stored === 'dark'
          ? stored
          : resolveSystemTheme(systemScheme)
      if (cancelled) return
      setThemeState(resolved)
      setColorScheme(resolved)
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [setColorScheme, systemScheme])

  const setTheme = useCallback(
    (next: ThemeMode) => {
      setThemeState(next)
      setColorScheme(next)
      void AsyncStorage.setItem(STORAGE_KEY, next)
    },
    [setColorScheme],
  )

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [setTheme, theme])

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      isDark: theme === 'dark',
      ready,
    }),
    [theme, setTheme, toggleTheme, ready],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
