import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { defaultLikedIds } from '../lib/listings'

interface FavoritesContextValue {
  /** Every liked listing id — real UUIDs (favorited server-side) and static fixture ids ('1'..'6') alike, so any screen's heart tap shows up on the Favourites screen regardless of which kind of listing it was. */
  likedIds: Set<string>
  addLiked: (id: string) => void
  removeLiked: (id: string) => void
  /** Folds a batch of real ids (GET /favorites, on sign-in) into the set without clobbering locally-liked fixture ids already in it. */
  mergeLiked: (ids: string[]) => void
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null)

// Replaces the 5+ independent, never-synced local `useState<Set<string>>(defaultLikedIds)`
// copies that used to live in home.tsx/all-listings.tsx/search-results.tsx/
// listing/[id].tsx/favourites.tsx — one shared set so liking a listing
// anywhere shows up everywhere, especially on the real Favourites screen.
// Seeded with the same `defaultLikedIds` those screens always started
// from, so the pre-sign-in/demo look is unchanged; `useSyncFavorites`
// merges the real `GET /favorites` ids in on top once signed in (see that
// hook for why this provider doesn't fetch itself — it sits outside
// ClerkProvider, same reasoning as NotificationsProvider).
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [likedIds, setLikedIds] = useState<Set<string>>(() => new Set(defaultLikedIds))

  const addLiked = useCallback((id: string) => {
    setLikedIds((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }, [])

  const removeLiked = useCallback((id: string) => {
    setLikedIds((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const mergeLiked = useCallback((ids: string[]) => {
    if (ids.length === 0) return
    setLikedIds((prev) => {
      const next = new Set(prev)
      let changed = false
      for (const id of ids) {
        if (!next.has(id)) {
          next.add(id)
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [])

  const value = useMemo(
    () => ({ likedIds, addLiked, removeLiked, mergeLiked }),
    [likedIds, addLiked, removeLiked, mergeLiked],
  )

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider')
  }
  return context
}
