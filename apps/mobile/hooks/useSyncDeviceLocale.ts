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
  }, [isSignedIn, isReady, hasStoredPreference, getToken, setLocale])

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
  }, [isSignedIn, isReady, locale, getToken])
}
