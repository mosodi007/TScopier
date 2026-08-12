import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { LandingTranslations } from '@tscopier/web-i18n/locales/landing/types'
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  isLocale,
  localeDirection,
  type Locale,
} from '@tscopier/web-i18n/types'
import { getLandingTranslations } from '@/lib/landingLocales'

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  dir: 'rtl' | 'ltr'
  landing: LandingTranslations
  ready: boolean
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(LOCALE_STORAGE_KEY)
        const next = isLocale(raw) ? raw : DEFAULT_LOCALE
        if (!cancelled) setLocaleState(next)
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    void AsyncStorage.setItem(LOCALE_STORAGE_KEY, next)
  }, [])

  const landing = useMemo(() => getLandingTranslations(locale), [locale])

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      dir: localeDirection(locale),
      landing,
      ready,
    }),
    [locale, setLocale, landing, ready],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider')
  return ctx
}
