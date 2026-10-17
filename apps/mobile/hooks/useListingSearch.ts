import { useEffect, useRef, useState } from 'react'
import { API_URL } from '../lib/apiUrl'
import type { ListingSpecDetails } from '../lib/listingSpec'

/** Mirrors `apps/api/src/search/search-index.service.ts`'s `ListingDocument` — one row per real, `active` listing in Typesense, not a static fixture. */
export interface SearchHit extends ListingSpecDetails {
  id: string
  type: 'gem' | 'equipment'
  title: string
  description?: string
  priceAmountCents: number
  priceCurrency: string
  sellerId: string
  publishedAtTs: number
}

export interface ListingSearchParams {
  q?: string
  /** Each facet is multi-select (Home's filter sheet allows several chips per group) — joined client-side into one comma-separated query param; see search.controller.ts's `filterValues`. */
  species?: string[]
  shape?: string[]
  origin?: string[]
  certAuthority?: string[]
  maxPriceCents?: number
  perPage?: number
  /** False skips fetching entirely (e.g. search-results.tsx's legacy static-fixture path, which has no real query to run) — distinct from an empty `q`, which is itself a valid "browse everything" request. Defaults true. */
  enabled?: boolean
}

interface SearchResponse {
  hits: SearchHit[]
  found: number
  page: number
}

function buildQueryString(params: ListingSearchParams, page: number) {
  const qs = new URLSearchParams()
  if (params.q) qs.set('q', params.q)
  if (params.species?.length) qs.set('species', params.species.join(','))
  if (params.shape?.length) qs.set('shape', params.shape.join(','))
  if (params.origin?.length) qs.set('origin', params.origin.join(','))
  if (params.certAuthority?.length) qs.set('certAuthority', params.certAuthority.join(','))
  if (params.maxPriceCents !== undefined) qs.set('maxPriceCents', String(params.maxPriceCents))
  qs.set('perPage', String(params.perPage ?? 20))
  qs.set('page', String(page))
  return qs.toString()
}

// Shared by home.tsx (the "Featured lots" grid, live-filtered in place by
// its own search bar/filter sheet) and search-results.tsx (a dedicated,
// paginated results screen) — both are real `GET /search` consumers now,
// replacing `apps/mobile/lib/listings.ts`'s static `featuredListings`
// fixture. Debounces every param change by 300ms (including the very
// first load — a buyer opening Home a moment sooner than the first
// request fires isn't noticeable, and it keeps this hook's logic uniform
// rather than special-casing mount) so fast typing in the search box
// doesn't fire a request per keystroke. Each call replaces the in-flight
// one via AbortController — a slow page-2 response landing after a newer
// page-1 request would otherwise race and show stale results.
export function useListingSearch(params: ListingSearchParams) {
  const [hits, setHits] = useState<SearchHit[]>([])
  const [found, setFound] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const paramsKey = JSON.stringify(params)

  useEffect(() => {
    if (params.enabled === false) {
      setLoading(false)
      return
    }
    setPage(1)
    setLoading(true)
    setError(false)
    const timer = setTimeout(() => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      fetch(`${API_URL}/search?${buildQueryString(params, 1)}`, { signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error(`Search failed (${res.status})`)
          return res.json() as Promise<SearchResponse>
        })
        .then((data) => {
          setHits(data.hits)
          setFound(data.found)
          setLoading(false)
        })
        .catch((err) => {
          if (err instanceof Error && err.name === 'AbortError') return
          setLoading(false)
          setError(true)
        })
    }, 300)
    return () => {
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey])

  function loadMore() {
    if (params.enabled === false || loading || loadingMore || hits.length >= found) return
    const nextPage = page + 1
    setLoadingMore(true)
    fetch(`${API_URL}/search?${buildQueryString(params, nextPage)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Search failed (${res.status})`)
        return res.json() as Promise<SearchResponse>
      })
      .then((data) => {
        setHits((prev) => prev.concat(data.hits))
        setFound(data.found)
        setPage(nextPage)
        setLoadingMore(false)
      })
      .catch(() => {
        setLoadingMore(false)
      })
  }

  return { hits, found, loading, loadingMore, error, loadMore }
}
