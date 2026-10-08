import { defaultGemTone, type GemTone } from '@ceylon-gems/ui-tokens'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getItem, setItem } from '../lib/storage'

const STORAGE_KEY = 'gem-tone-preference'

function isGemTone(value: string | null): value is GemTone {
  return value === 'sapphire' || value === 'padparadscha' || value === 'emerald'
}

interface GemToneContextValue {
  gemTone: GemTone
  setGemTone: (tone: GemTone) => void
}

const GemToneContext = createContext<GemToneContextValue | null>(null)

// The single source of truth for the app's active gem-tone theme (Account
// Settings' "Gem tone" picker). Mirrors LocaleProvider's shape exactly —
// same storage.ts persistence (SecureStore on native, localStorage on web),
// same read-once-on-mount pattern — so the two providers behave
// identically from a caller's perspective. No "isReady" gate here though:
// unlike locale (which affects which font family loads), rendering one
// frame of the default tone before the stored preference loads is a
// harmless, invisible flash, not a wrong-font bug.
export function GemToneProvider({ children }: { children: ReactNode }) {
  const [gemTone, setGemToneState] = useState<GemTone>(defaultGemTone)

  useEffect(() => {
    let cancelled = false

    getItem(STORAGE_KEY).then((stored) => {
      if (cancelled) return
      if (isGemTone(stored)) setGemToneState(stored)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const setGemTone = useCallback((next: GemTone) => {
    setGemToneState(next)
    void setItem(STORAGE_KEY, next)
  }, [])

  const value = useMemo(() => ({ gemTone, setGemTone }), [gemTone, setGemTone])

  return <GemToneContext.Provider value={value}>{children}</GemToneContext.Provider>
}

export function useGemTone() {
  const context = useContext(GemToneContext)
  if (!context) {
    throw new Error('useGemTone must be used within a GemToneProvider')
  }
  return context
}
