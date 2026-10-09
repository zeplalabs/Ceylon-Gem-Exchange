import { isSupportedLocale, type Locale } from '@ceylon-gems/i18n'
import { useEffect, useState } from 'react'
import { API_URL } from '../lib/apiUrl'

export interface LanguageOption {
  code: Locale
  label: string
}

// Matches apps/api/src/db/seed-languages.ts. Used if GET /languages fails
// (offline dev API, request error) so the picker still has something
// genuinely switchable to offer instead of going empty — not shown while
// the request is merely still in flight, see `null` below.
const FALLBACK_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English' },
  { code: 'si', label: 'සිංහල' },
  { code: 'ta', label: 'தமிழ்' },
]

// Account Settings' (and locale-settings') Language picker options, fetched
// from the API's GET /languages (DB-backed — see
// apps/api/src/languages/languages.controller.ts) instead of a static
// array, so the list/order can change without an app release — same
// pattern as useFilters. A row whose `code` isn't one of this build's
// `SUPPORTED_LOCALES` (no shipped dictionary/font for it yet) is filtered
// out rather than offered and failing to actually switch anything; `null`
// means still loading, distinct from a resolved (possibly fallback) list.
export function useLanguages() {
  const [languages, setLanguages] = useState<LanguageOption[] | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch(`${API_URL}/languages`)
      .then((res) => res.json())
      .then((data: { code: string; label: string }[]) => {
        if (cancelled) return
        const supported = data.filter((row): row is LanguageOption => isSupportedLocale(row.code))
        setLanguages(supported.length > 0 ? supported : FALLBACK_LANGUAGES)
      })
      .catch(() => {
        if (!cancelled) setLanguages(FALLBACK_LANGUAGES)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return languages
}
