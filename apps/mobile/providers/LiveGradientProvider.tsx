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

const STORAGE_KEY = 'live-gradient-preference'

interface LiveGradientContextValue {
  liveGradientEnabled: boolean
  setLiveGradientEnabled: (enabled: boolean) => void
}

const LiveGradientContext = createContext<LiveGradientContextValue | null>(null)

// The single source of truth for whether LiveGradientBackground's animated
// shader runs (Appearance's "Live gradient" toggle) — mirrors
// GemToneProvider's shape exactly: same storage.ts persistence
// (SecureStore on native, localStorage on web), same read-once-on-mount
// pattern, no "isReady" gate (a frame of the default `true` before the
// stored preference loads is a harmless flash, same reasoning as gem
// tone). Defaults to true — the mockups' own background is always
// animated. Turning it off freezes the shader's `u_time` at 0, the same
// mechanism `useReducedMotion()` already uses there (see
// LiveGradientBackground's own comment) — this is an additional, explicit
// user preference layered on top of that OS-level one, not a replacement
// for it: either one freezes the frame.
export function LiveGradientProvider({ children }: { children: ReactNode }) {
  const [liveGradientEnabled, setLiveGradientEnabledState] = useState(true)

  useEffect(() => {
    let cancelled = false

    getItem(STORAGE_KEY).then((stored) => {
      if (cancelled) return
      if (stored === 'off') setLiveGradientEnabledState(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const setLiveGradientEnabled = useCallback((next: boolean) => {
    setLiveGradientEnabledState(next)
    void setItem(STORAGE_KEY, next ? 'on' : 'off')
  }, [])

  const value = useMemo(
    () => ({ liveGradientEnabled, setLiveGradientEnabled }),
    [liveGradientEnabled, setLiveGradientEnabled],
  )

  return <LiveGradientContext.Provider value={value}>{children}</LiveGradientContext.Provider>
}

export function useLiveGradient() {
  const context = useContext(LiveGradientContext)
  if (!context) {
    throw new Error('useLiveGradient must be used within a LiveGradientProvider')
  }
  return context
}
