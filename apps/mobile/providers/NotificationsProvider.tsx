import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

export type NotificationKind = 'enquiries' | 'price_drops' | 'new_listings'

export interface RealNotification {
  id: string
  kind: NotificationKind
  title: string
  body: string
  listingId: string | null
  savedSearchId: string | null
  readAt: string | null
  createdAt: string
}

interface NotificationsContextValue {
  notifications: RealNotification[]
  /** Replaces the whole list — called by `useSyncNotifications` after a fetch, and by notifications.tsx after a mutation that needs a fresh copy. */
  setNotifications: (list: RealNotification[]) => void
  isUnread: (item: RealNotification) => boolean
  unreadCount: number
  /** Optimistic local update only — the caller (inside the Clerk tree, e.g. notifications.tsx) is responsible for the actual `PATCH` request. */
  markReadLocally: (id: string) => void
  markAllReadLocally: () => void
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

// Real, server-backed notifications now (`GET /me/notifications`,
// apps/api/src/notifications/notifications.controller.ts) — replaces the
// static apps/mobile/lib/notifications.ts seed entirely. Split from the
// fetch itself the same way LocaleProvider/useSyncDeviceLocale is: this
// provider wraps the whole app *outside* ClerkProvider (app/_layout.tsx),
// so it can't call `useAuth()`/`useUser()` itself — `useSyncNotifications`
// (hooks/useSyncNotifications.ts), called from inside the Clerk tree,
// does the actual fetching and pushes results in via `setNotifications`.
// `markReadLocally`/`markAllReadLocally` are the same split: this provider
// only updates local state instantly (so Home's bell dot clears without
// waiting on a round trip), while the screen that calls them is
// responsible for the real `PATCH` request that makes it stick.
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<RealNotification[]>([])

  const isUnread = useCallback((item: RealNotification) => item.readAt === null, [])

  const markReadLocally = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
    )
  }, [])

  const markAllReadLocally = useCallback(() => {
    const now = new Date().toISOString()
    setNotifications((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: now })))
  }, [])

  const unreadCount = useMemo(
    () => notifications.filter(isUnread).length,
    [notifications, isUnread],
  )

  const value = useMemo(
    () => ({
      notifications,
      setNotifications,
      isUnread,
      unreadCount,
      markReadLocally,
      markAllReadLocally,
    }),
    [notifications, isUnread, unreadCount, markReadLocally, markAllReadLocally],
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotifications() {
  const context = useContext(NotificationsContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider')
  }
  return context
}
