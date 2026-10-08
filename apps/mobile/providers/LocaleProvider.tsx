import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { defaultLocale, isSupportedLocale, type Locale } from '@ceylon-gems/i18n'
import { detectDeviceLocale } from '../lib/locale'
import { getItem, setItem } from '../lib/storage'

const STORAGE_KEY = 'locale-preference'

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  /** True until the stored preference (or the device fallback) has been read once. */
  isReady: boolean
  /**
   * True once `locale` reflects a real explicit choice — either read back
   * from this device's own storage on launch, or set via `setLocale` since.
   * False means it's still just the device-locale guess. useSyncDeviceLocale
   * reads this to decide whether a sign-in should adopt the account's
   * DB-persisted locale (only when this is still false — an explicit choice,
   * on this device or synced from a previous one, always wins over a guess).
   */
  hasStoredPreference: boolean
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

// The single source of truth for the app's active language. Persists via
// lib/storage.ts (SecureStore on native, localStorage on web — see there
// for why) rather than pulling in AsyncStorage for one small string. Same-
// device persistence (close app, reopen, same language) comes from this
// alone; cross-device persistence (sign in somewhere new, get the language
// you'd already chosen) is useSyncDeviceLocale's job, layered on top via
// `hasStoredPreference` below — this provider doesn't know about the
// backend at all.
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)
  const [isReady, setIsReady] = useState(false)
  const [hasStoredPreference, setHasStoredPreference] = useState(false)

  useEffect(() => {
    let cancelled = false

    getItem(STORAGE_KEY)
      .then((stored) => {
        if (cancelled) return
        const isStored = isSupportedLocale(stored)
        setLocaleState(isStored ? stored : detectDeviceLocale())
        setHasStoredPreference(isStored)
      })
      .finally(() => {
        if (!cancelled) setIsReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    setHasStoredPreference(true)
    void setItem(STORAGE_KEY, next)
  }, [])

  const value = useMemo(
    () => ({ locale, setLocale, isReady, hasStoredPreference }),
    [locale, setLocale, isReady, hasStoredPreference],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider')
  }
  return context
}
