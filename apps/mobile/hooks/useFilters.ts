import { useEffect, useState } from 'react'
import { API_URL } from '../lib/apiUrl'

export type FilterGroups = Record<string, string[]>

// Home's filter sheet taxonomy (Stone/Shape/District/Origin/Certificate),
// fetched from the API's GET /filters (DB-backed — see
// apps/api/src/filters/filters.controller.ts) instead of the static object
// this replaces, so the admin dashboard (not built yet) can add/retire
// options without an app release. Fetched once on mount, no auth needed
// (public taxonomy data) — `null` means still loading, distinct from `{}`
// (loaded but genuinely empty, or the request failed).
export function useFilters() {
  const [groups, setGroups] = useState<FilterGroups | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch(`${API_URL}/filters`)
      .then((res) => res.json())
      .then((data: FilterGroups) => {
        if (!cancelled) setGroups(data)
      })
      .catch(() => {
        if (!cancelled) setGroups({})
      })

    return () => {
      cancelled = true
    }
  }, [])

  return groups
}
