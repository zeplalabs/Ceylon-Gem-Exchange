import { useAuth } from '@clerk/expo'
import { useEffect } from 'react'
import { API_URL } from '../lib/apiUrl'
import { useFavorites } from '../providers/FavoritesProvider'

// Fetches the signed-in user's real favorited listing ids once on sign-in
// and merges them into FavoritesProvider's shared set — same split as
// useSyncNotifications/useSyncDeviceLocale (called from app/_layout.tsx's
// `AppLayout`, inside ClerkProvider). Only merges ids in; favourites.tsx
// itself does its own `GET /favorites` fetch for the full listing rows it
// needs to render cards — this hook exists so every *other* screen's heart
// (home/all-listings/search-results/listing-detail) already knows which
// real listings are favorited the moment they're signed in, not just
// after visiting the Favourites screen once.
export function useSyncFavorites() {
  const { isSignedIn, getToken } = useAuth()
  const { mergeLiked } = useFavorites()

  useEffect(() => {
    if (!isSignedIn) return
    let cancelled = false

    async function load() {
      try {
        const token = await getToken()
        if (!token || cancelled) return
        const res = await fetch(`${API_URL}/favorites`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok || cancelled) return
        const rows = (await res.json()) as Array<{ id: string }>
        mergeLiked(rows.map((row) => row.id))
      } catch {
        // Leave whatever's already liked locally — the next sign-in/app
        // open retries.
      }
    }

    void load()
    return () => {
      cancelled = true
    }
    // `getToken` deliberately excluded — same unstable-reference fix as
    // edit-profile.tsx; `isSignedIn` is the only thing this needs to react to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn])
}
