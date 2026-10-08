export type NotificationKind = 'enquiries' | 'priceDrops' | 'newListings'
export type NotificationWhen = 'TODAY' | 'EARLIER'

export interface NotificationItem {
  id: number
  kind: NotificationKind
  when: NotificationWhen
  title: string
  body: string
  time: string
  /** Which glyph fills the icon tile — omitted when `thumb` is set instead
   * (a seller/listing photo placeholder, same tinted-glass + GemIcon
   * pattern used everywhere else in the app with no real photo backend). */
  icon?: 'chat' | 'gem' | 'bag'
  thumb?: boolean
  /** Starts read — distinct from the user marking it read by tapping or
   * using "mark all as read" (tracked separately, in NotificationsProvider's
   * `readIds`). */
  isRead?: boolean
}

// Ported verbatim from "Ceylon Gem Exchange Notifications.dc.html"'s own
// `items` array — demo content in the same sense as Gallery Viewer's shot
// captions or Chat's message thread, not translated (a real notification's
// text is generated server-side from a real event, the same as a real
// seller's chat message — there's nothing here for `packages/i18n` to
// own). Lives here (rather than inline in app/notifications.tsx) so
// NotificationsProvider can compute Home's unread badge from the same
// list the inbox screen renders.
export const NOTIFICATIONS: NotificationItem[] = [
  {
    id: 0,
    kind: 'enquiries',
    when: 'TODAY',
    title: 'Nuwan replied to your enquiry',
    body: '"The 3.14 ct sapphire is still available — happy to send a video."',
    time: '12 min ago',
    icon: 'chat',
  },
  {
    id: 1,
    kind: 'priceDrops',
    when: 'TODAY',
    title: 'Price dropped on a saved gem',
    body: 'Teal Sapphire 2.76 ct is now $ 3,980 — down from $ 4,320.',
    time: '2 hours ago',
    thumb: true,
  },
  {
    id: 2,
    kind: 'newListings',
    when: 'TODAY',
    title: '3 new matches for "Unheated blue sapphire"',
    body: 'Ratnapura · under $10k · GIA certified.',
    time: '5 hours ago',
    icon: 'gem',
  },
  {
    id: 3,
    kind: 'enquiries',
    when: 'EARLIER',
    title: 'New enquiry on your ad',
    body: 'Someone asked about the Star Ruby Cabochon.',
    time: 'Yesterday',
    icon: 'chat',
    isRead: true,
  },
  {
    id: 4,
    kind: 'newListings',
    when: 'EARLIER',
    title: 'Padparadscha over 2 ct listed',
    body: '1.94 ct cushion from Perera Gem House.',
    time: '2 days ago',
    thumb: true,
    isRead: true,
  },
  {
    id: 5,
    kind: 'priceDrops',
    when: 'EARLIER',
    title: 'Membership renews soon',
    body: 'Trader Plus renews on 12 Sep for $ 24.',
    time: '3 days ago',
    icon: 'bag',
    isRead: true,
  },
]
