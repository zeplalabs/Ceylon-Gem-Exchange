import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { NOTIFICATIONS, type NotificationItem } from '../lib/notifications'

interface NotificationsContextValue {
  isUnread: (item: NotificationItem) => boolean
  unreadCount: number
  markRead: (id: number) => void
  markAllRead: () => void
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

// The single source of truth for which demo notifications are read —
// shared across Home's bell dot and the Notifications inbox screen, so
// marking something read (or "mark all as read") on the inbox actually
// clears Home's dot instead of each screen keeping its own disconnected
// copy of read state, which is what app/notifications.tsx did before this
// (a local `readIds` — same gap every other local-only toggle in this app
// still has, e.g. Favourites/Home/All Listings' own `liked` state, which
// this doesn't touch). No `lib/storage.ts` persistence — read state resets
// on app restart, same as every other in-memory-only preference here;
// nothing asked for it to survive that, only for it to be shared live
// between these two screens.
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [readIds, setReadIds] = useState<Set<number>>(new Set())

  const isUnread = useCallback(
    (item: NotificationItem) => !readIds.has(item.id) && !item.isRead,
    [readIds],
  )

  const markRead = useCallback((id: number) => {
    setReadIds((prev) => new Set(prev).add(id))
  }, [])

  const markAllRead = useCallback(() => {
    setReadIds(new Set(NOTIFICATIONS.map((n) => n.id)))
  }, [])

  const unreadCount = useMemo(() => NOTIFICATIONS.filter(isUnread).length, [isUnread])

  const value = useMemo(
    () => ({ isUnread, unreadCount, markRead, markAllRead }),
    [isUnread, unreadCount, markRead, markAllRead],
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
