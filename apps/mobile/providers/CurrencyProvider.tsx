import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { FALLBACK_CURRENCY, formatAmount, type CurrencyOption } from '../lib/currency'
import { getItem, setItem } from '../lib/storage'

// How often a long-lived foreground session re-pulls `GET /currencies` —
// the backend's CurrencyRatesService (apps/api/src/currencies/) refreshes
// `usdRate` against a live forex feed every 6h; refetching more often than
// that here wouldn't show anything new, just extra requests.
const REFRESH_INTERVAL_MS = 1000 * 60 * 60 * 6

const STORAGE_KEY = 'currency-preference'

interface CurrencyContextValue {
  /** The active currency's code, e.g. "LKR". */
  currency: string
  setCurrency: (code: string) => void
  /** The full admin-editable catalog (GET /currencies) — null while the first fetch is still in flight. */
  currencies: CurrencyOption[] | null
  /** Converts a USD amount to the active currency and formats it — every price in the app should render through this, not `formatAmount` directly. */
  formatPrice: (amountUsd: number) => string
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

// The single source of truth for the app's active display currency
// (Account Settings' "Currency" picker) *and* for the admin-editable
// catalog it picks from (`GET /currencies` — apps/api/src/currencies/,
// DB-backed so an admin can add/retire/reprice a currency without an app
// release; see schema.ts's `currencies` table comment for the write
// endpoints that back that). Fetched once here, at the provider, rather
// than separately in every price-displaying component, since nearly every
// screen needs it. The chosen `currency` code is on-device-only (no
// backend sync like LocaleProvider's useSyncDeviceLocale — nothing asked
// for account-level/cross-device persistence here, unlike language).
export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<string>(FALLBACK_CURRENCY.code)
  const [currencies, setCurrencies] = useState<CurrencyOption[] | null>(null)
  const lastFetchedAt = useRef(0)

  useEffect(() => {
    let cancelled = false

    const fetchRates = () => {
      lastFetchedAt.current = Date.now()
      fetch(`${process.env.EXPO_PUBLIC_API_URL}/currencies`)
        .then((res) => res.json())
        .then((data: CurrencyOption[]) => {
          if (!cancelled) setCurrencies(data.length > 0 ? data : [FALLBACK_CURRENCY])
        })
        .catch(() => {
          // A failed refresh keeps whatever rates are already loaded
          // (stale, but real) rather than falling back to USD mid-session
          // — only the very first load has nothing better to show.
          if (!cancelled) setCurrencies((prev) => prev ?? [FALLBACK_CURRENCY])
        })
    }

    fetchRates()
    const interval = setInterval(fetchRates, REFRESH_INTERVAL_MS)
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active' && Date.now() - lastFetchedAt.current >= REFRESH_INTERVAL_MS) {
        fetchRates()
      }
    })

    return () => {
      cancelled = true
      clearInterval(interval)
      subscription.remove()
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    getItem(STORAGE_KEY).then((stored) => {
      if (!cancelled && stored) setCurrencyState(stored)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const setCurrency = useCallback((next: string) => {
    setCurrencyState(next)
    void setItem(STORAGE_KEY, next)
  }, [])

  const formatPrice = useCallback(
    (amountUsd: number) => {
      const option = currencies?.find((c) => c.code === currency) ?? FALLBACK_CURRENCY
      return formatAmount(amountUsd, option)
    },
    [currencies, currency],
  )

  const value = useMemo(
    () => ({ currency, setCurrency, currencies, formatPrice }),
    [currency, setCurrency, currencies, formatPrice],
  )

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider')
  }
  return context
}
