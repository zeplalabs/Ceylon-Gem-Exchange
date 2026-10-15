import { useAuth } from '@clerk/expo'
import { useEffect } from 'react'
import { API_URL } from '../lib/apiUrl'
import { useNotifications, type RealNotification } from '../providers/NotificationsProvider'

// Fetches the signed-in user's real notifications once on sign-in and
// pushes them into NotificationsProvider — called from app/_layout.tsx's
// `AppLayout` (inside ClerkProvider), same split as useSyncDeviceLocale.
export function useSyncNotifications() {
  const { isSignedIn, getToken } = useAuth()
  const { setNotifications } = useNotifications()

  useEffect(() => {
    if (!isSignedIn) return
    let cancelled = false

    async function load() {
      try {
        const token = await getToken()
        if (!token || cancelled) return
        const res = await fetch(`${API_URL}/me/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok || cancelled) return
        setNotifications((await res.json()) as RealNotification[])
      } catch {
        // Leave whatever's already loaded — Home's bell dot and the inbox
        // screen just show nothing new until the next successful sync.
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
