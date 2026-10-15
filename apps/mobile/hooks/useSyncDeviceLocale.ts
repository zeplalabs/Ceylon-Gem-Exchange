import { useAuth } from '@clerk/expo'
import { isSupportedLocale } from '@ceylon-gems/i18n'
import { useEffect } from 'react'
import { API_URL } from '../lib/apiUrl'
import { useLocale } from '../providers/LocaleProvider'

// Keeps the app's active locale and the backend's `users.locale` in sync,
// in both directions:
//
// - Pull: on sign-in, if this device has no explicit locale preference yet
//   (`hasStoredPreference` is false — still just the device-locale guess),
//   fetch the account's DB-persisted locale and adopt it via `setLocale`
//   if it has one. This is what makes a fresh install / a different device
//   come back as the language the user had actually chosen before, rather
//   than re-guessing from the device's own locale. `setLocale` also
//   persists it to this device's own storage, so this only ever runs once
//   per device until the user explicitly switches again.
// - Push: whenever `locale` changes while signed in, push it to the
//   backend — an explicit switch (here, or adopted from another device via
//   the pull above) always wins and the backend just follows it.
export function useSyncDeviceLocale() {
  const { isSignedIn, getToken } = useAuth()
  const { locale, isReady, hasStoredPreference, setLocale } = useLocale()

  useEffect(() => {
    if (!isSignedIn || !isReady || hasStoredPreference) return

    let cancelled = false

    async function pull() {
      const token = await getToken()
      if (!token || cancelled) return

      const remoteLocale = await fetch(`${API_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((body: { locale?: string | null }) => body.locale)
        .catch(() => null)

      if (!cancelled && isSupportedLocale(remoteLocale)) {
        setLocale(remoteLocale)
      }
    }

    void pull()

    return () => {
      cancelled = true
    }
    // `getToken` deliberately excluded — Clerk's `useAuth()` hands back a
    // new function identity on every render (not memoized), so listing it
    // would re-run this on every render while `hasStoredPreference` is
    // still false, not just once. `setLocale` only runs inside `pull()`
    // itself and setting it also flips `hasStoredPreference` true (ending
    // this effect's relevance), so it doesn't need to be a reactive
    // dependency either.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, isReady, hasStoredPreference])

  useEffect(() => {
    if (!isSignedIn || !isReady) return

    let cancelled = false

    async function push() {
      const token = await getToken()
      if (!token || cancelled) return

      await fetch(`${API_URL}/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ locale }),
      }).catch(() => {
        // Best-effort — a failed sync just means the backend stays on the
        // previous value until the next change or sign-in.
      })
    }

    void push()

    return () => {
      cancelled = true
    }
    // `getToken` deliberately excluded — see the pull effect's comment
    // above. Unlike that one, this effect has no guard that goes false
    // after its first real run, so leaving `getToken` in here was a live
    // bug: it fired a `PATCH /me` on *every* render of whatever mounts
    // this hook (`_layout.tsx`, wrapping the whole app) for the entire
    // signed-in session, not just when `locale` actually changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, isReady, locale])
}
