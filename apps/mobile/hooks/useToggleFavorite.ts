import { useAuth } from '@clerk/expo'
import { useCallback } from 'react'
import { API_URL } from '../lib/apiUrl'
import { isRealId } from '../lib/ids'
import { useFavorites } from '../providers/FavoritesProvider'

// Shared by every screen with a heart button (home/all-listings/
// search-results/listing-detail/favourites). Updates the shared
// FavoritesProvider set optimistically for every id, real or static
// fixture alike; only a real (uuid) id also round-trips to the backend
// (`POST`/`DELETE /listings/:id/favorite`, both idempotent server-side —
// see listing-favorite.controller.ts) so a static fixture card (no row to
// favorite in the DB) still "just works" locally, same as it always did.
export function useToggleFavorite() {
  const { getToken } = useAuth()
  const { likedIds, addLiked, removeLiked } = useFavorites()

  return useCallback(
    async (id: string) => {
      const wasLiked = likedIds.has(id)
      if (wasLiked) removeLiked(id)
      else addLiked(id)

      if (!isRealId(id)) return

      try {
        const token = await getToken()
        if (!token) return
        await fetch(`${API_URL}/listings/${id}/favorite`, {
          method: wasLiked ? 'DELETE' : 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
      } catch {
        // Revert the optimistic update if the request itself failed to go
        // out (a non-2xx response isn't distinguished here — both toggle
        // endpoints are idempotent and near-impossible to legitimately
        // fail for a signed-in caller, so a thrown network error is the
        // one case worth undoing).
        if (wasLiked) addLiked(id)
        else removeLiked(id)
      }
    },
    [likedIds, addLiked, removeLiked, getToken],
  )
}
