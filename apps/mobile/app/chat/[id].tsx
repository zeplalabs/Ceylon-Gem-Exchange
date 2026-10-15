import { useAuth } from '@clerk/expo'
import { gemTones, neutral } from '@ceylon-gems/ui-tokens'
import { LinearGradient } from 'expo-linear-gradient'
import * as Linking from 'expo-linking'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Avatar,
  BottomSheet,
  Button,
  ConfirmDialog,
  GlassSurface,
  IconButton,
  PressableScale,
  TextField,
} from '../../components'
import {
  AttachIcon,
  BlockIcon,
  CallIcon,
  CheckIcon,
  ChevronLeftIcon,
  CloseIcon,
  GemIcon,
  MoreVerticalIcon,
  SendIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
} from '../../components/icons'
import { GRADIENT_140 } from '../../components/primitives/gradientAngle'
import { LiveGradientBackground } from '../../components/primitives/LiveGradientBackground'
import { useFontFamily } from '../../hooks/useFontFamily'
import { useTranslation } from '../../hooks/useTranslation'
import { API_URL } from '../../lib/apiUrl'
import { getListingDetail, type ListingDetail } from '../../lib/listings'
import { useCurrency } from '../../providers/CurrencyProvider'
import { useGemTone } from '../../providers/GemToneProvider'

// A real `listings` row has a uuid `id`; every static fixture in
// lib/listings.ts uses a short plain string ('1'..'6') instead — so this
// is a reliable way to tell "a listing created via post-ad.tsx's wizard"
// apart from "the static demo data" without a separate flag threaded
// through every navigation call site. Listing Detail (what normally links
// here) isn't wired to the real API yet (see docs/remaining-work.md's
// Critical Path), so every link into this screen today still passes a
// static id — this only takes effect once something does pass a real one.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Minimal shape this screen actually needs, built from either the static
// ListingDetail fixture or a real `GET /listings/:id` response — keeps the
// real/static branch to one small adapter instead of threading `isReal ?`
// through every render site below.
interface ChatListingSummary {
  id: string
  name: string
  specLine: string
  priceUsd: number
  sellerName: string
  /**
   * Always populated for the static-fixture path (that demo data was
   * never gated). Always `null` for a real listing — `GET /listings/:id`
   * deliberately no longer returns it (see that endpoint's own comment),
   * so a real seller's number is only ever fetched on demand, by
   * callSeller() below, through the rate-limited reveal endpoint.
   */
  sellerPhone: string | null
  /**
   * `users.id`, for the Block/Unblock seller sheet action below — `null`
   * on the static-fixture path, since that demo seller isn't a real user
   * row (block/unblock just toggles local, cosmetic state there instead).
   */
  sellerId: string | null
}

function summaryFromStatic(listing: ListingDetail): ChatListingSummary {
  return {
    id: listing.id,
    name: listing.name,
    specLine: `${listing.lotNumber} · ${listing.weight} · ${listing.treatment}`,
    priceUsd: listing.priceUsd,
    sellerName: listing.sellerName,
    sellerPhone: listing.sellerPhone,
    sellerId: null,
  }
}

interface RealListingDetails {
  caratWeight?: number
  treatment?: string
  brand?: string
  equipmentType?: string
  condition?: string
}
interface RealListingResponse {
  id: string
  sellerId: string
  type: 'gem' | 'equipment'
  title: string
  priceAmountCents: number
  sellerName: string | null
  details: RealListingDetails | null
}

function summaryFromReal(listing: RealListingResponse): ChatListingSummary {
  const d = listing.details
  const specLine =
    listing.type === 'gem'
      ? [d?.caratWeight !== undefined ? `${d.caratWeight} ct` : null, d?.treatment]
          .filter(Boolean)
          .join(' · ')
      : [d?.brand ?? d?.equipmentType, d?.condition].filter(Boolean).join(' · ')
  return {
    id: listing.id,
    name: listing.title,
    specLine,
    priceUsd: listing.priceAmountCents / 100,
    sellerName: listing.sellerName ?? '—',
    sellerPhone: null,
    sellerId: listing.sellerId,
  }
}

interface RealMessage {
  id: string
  senderId: string
  body: string
  createdAt: string
}
interface RealThread {
  id: string
  buyerId: string
}

type ChatMessageKind = 'text' | 'photo' | 'offer'
interface ChatMessage {
  from: 'me' | 'them'
  kind?: ChatMessageKind
  text?: string
  /** Always USD — formatted for display via `useCurrency()` at render time, same as every other price in the app. */
  amountUsd?: number
  time: string
}

// Demo conversation seed, ported from the "Ceylon Gem Exchange Chat.dc.html"
// mockup's own `state.msgs` — only used on the static-fixture path
// (UUID_PATTERN not matching `id`), where there's still no real seller on
// the other end to have actually sent these. A real listing instead loads
// its real thread from `apps/api`'s `inquiry_threads`/`inquiry_messages`
// (see the effect in ChatScreen below) and starts empty, with no canned
// reply. The mockup hardcoded one specific listing's lot number/cert into
// the opening lines; this interpolates the actual listing instead so the
// demo reads correctly from any listing's Chat button, not just the one
// the mockup was built against.
function buildSeedMessages(listing: ListingDetail): ChatMessage[] {
  return [
    { from: 'me', text: `Hi, is ${listing.lotNumber} still available?`, time: '10:12' },
    {
      from: 'them',
      text: 'Yes, it is. The stone is in our Ratnapura office and can be viewed by appointment.',
      time: '10:14',
    },
    { from: 'them', kind: 'photo', time: '10:14' },
    {
      from: 'me',
      text: 'Beautiful colour. Can you share the GIA report as well?',
      time: '10:16',
    },
    {
      from: 'them',
      text: `Of course — it's attached to the listing. ${listing.certNumber}.`,
      time: '10:17',
    },
    { from: 'me', kind: 'offer', amountUsd: 7800, time: '10:19' },
  ]
}

function formatTime(d: Date) {
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}
function now() {
  return formatTime(new Date())
}

// "Perera Gem House" -> "PG" — Avatar's `initials` prop wants initials, not
// the full name truncated to two characters.
function initialsFor(name: string) {
  return name
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

// Reached from Listing Detail's "Chat" action-bar button and the Seller
// tab's chat button. Ports "Ceylon Gem Exchange Chat.dc.html". E1.4's
// "Inquiry threads" are real now — `apps/api/src/inquiries/` persists
// messages to a `(listing, buyer)` thread — but every current entry point
// into this screen still passes a static-fixture id (Listing Detail isn't
// wired to the real API yet, see docs/remaining-work.md), so the typing-
// delay + canned-reply demo path (buildSeedMessages, send()'s fixture
// branch) stays in place for those; it's exercised today, the real-API
// branch is exercised once something upstream passes a real listing uuid.
// No photo backend for *chat* exists yet (separate from E1.2's listing-
// photo pipeline, which is real) — same situation as Listing Detail's
// gallery, so the pinned-lot thumbnail and the one demo photo message both
// render the same tinted-glass + GemIcon placeholder rather than a real
// image, on both paths. `callSeller()` below is the other E1.4 item built
// this way: a real listing's phone number is fetched on tap, through
// `apps/api/src/phone-reveal/`'s rate-limited reveal endpoint, rather than
// riding along on the listing fetch the way it used to (and the way the
// static fixture's `sellerPhone` still does, since that demo data was
// never real PII to protect).
export default function ChatScreen() {
  const t = useTranslation()
  const fonts = useFontFamily()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { getToken } = useAuth()
  const isRealListing = UUID_PATTERN.test(id ?? '')
  const staticListing = !isRealListing ? getListingDetail(id) : undefined
  const { gemTone } = useGemTone()
  const tone = gemTones[gemTone]
  const { formatPrice } = useCurrency()

  const [realListing, setRealListing] = useState<ChatListingSummary | null>(null)
  const [loadingReal, setLoadingReal] = useState(isRealListing)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [revealingPhone, setRevealingPhone] = useState(false)
  const [phoneError, setPhoneError] = useState<string | null>(null)

  const [moreSheetVisible, setMoreSheetVisible] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [blockStatusLoaded, setBlockStatusLoaded] = useState(false)
  const [blockConfirmVisible, setBlockConfirmVisible] = useState(false)
  const [blockActionLoading, setBlockActionLoading] = useState(false)
  const [blockError, setBlockError] = useState<string | null>(null)

  const [reportSheetVisible, setReportSheetVisible] = useState(false)
  const [reportReason, setReportReason] = useState<string | null>(null)
  const [reportDetails, setReportDetails] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportSubmitted, setReportSubmitted] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)

  const listingSummary: ChatListingSummary | null = isRealListing
    ? realListing
    : staticListing
      ? summaryFromStatic(staticListing)
      : null
  const price = listingSummary ? formatPrice(listingSummary.priceUsd) : ''

  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    staticListing ? buildSeedMessages(staticListing) : [],
  )
  const [draft, setDraft] = useState('')
  const [typing, setTyping] = useState(false)
  const [dots, setDots] = useState(1)
  const threadRef = useRef<ScrollView>(null)
  const replyTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const dotsTimer = useRef<ReturnType<typeof setInterval>>(undefined)

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => threadRef.current?.scrollToEnd({ animated: true }))
  }, [])

  useEffect(() => {
    scrollToEnd()
  }, [messages.length, typing, scrollToEnd])

  useEffect(
    () => () => {
      clearTimeout(replyTimer.current)
      clearInterval(dotsTimer.current)
    },
    [],
  )

  // Real backend path — only ever runs for a listing created via
  // post-ad.tsx's wizard (see UUID_PATTERN's comment). Fetches the listing
  // itself (public) and this buyer's thread with its seller (auth
  // required) in parallel; a message's `from` is derived by comparing its
  // `senderId` to `thread.buyerId` rather than needing a separate "who am
  // I" call — the signed-in caller is always the thread's buyer here (see
  // InquiriesController's own comment on why GET is buyer-only).
  useEffect(() => {
    if (!isRealListing || !id) return
    let cancelled = false

    async function load() {
      setLoadingReal(true)
      try {
        const token = await getToken()
        const [listingRes, messagesRes] = await Promise.all([
          fetch(`${API_URL}/listings/${id}`),
          token
            ? fetch(`${API_URL}/listings/${id}/messages`, {
                headers: { Authorization: `Bearer ${token}` },
              })
            : Promise.resolve(null),
        ])
        if (cancelled) return

        if (listingRes.ok) {
          const data = (await listingRes.json()) as RealListingResponse
          setRealListing(summaryFromReal(data))
        }

        if (messagesRes?.ok) {
          const data = (await messagesRes.json()) as {
            thread: RealThread | null
            messages: RealMessage[]
          }
          setMessages(
            data.messages.map((m) => ({
              from: data.thread && m.senderId === data.thread.buyerId ? 'me' : 'them',
              text: m.body,
              time: formatTime(new Date(m.createdAt)),
            })),
          )
        }
      } catch {
        // Leave whatever's already loaded (nothing, on a fresh mount) —
        // the screen still renders, just without a listing/thread to show.
      } finally {
        if (!cancelled) setLoadingReal(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
    // `getToken` deliberately excluded — Clerk's `useAuth()` hands back a
    // new function identity on every render (not memoized), so listing it
    // would re-fetch the whole thread (and reassign `messages` wholesale)
    // on every render, including every keystroke in the composer below —
    // same bug as edit-profile.tsx's identical fix, just manifesting as
    // wasted requests/flicker here rather than un-typeable fields, since
    // nothing in this effect touches `draft`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isRealListing])

  function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    setDraft('')
    setSendError(null)

    if (isRealListing) {
      setSending(true)
      ;(async () => {
        try {
          const token = await getToken()
          if (!token) throw new Error('Not signed in')
          const res = await fetch(`${API_URL}/listings/${id}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ body: trimmed }),
          })
          if (!res.ok) {
            const errBody = await res.json().catch(() => null)
            throw new Error(errBody?.message ?? `Failed to send (${res.status})`)
          }
          const data = (await res.json()) as { thread: RealThread; message: RealMessage }
          setMessages((prev) =>
            prev.concat({
              from: 'me',
              text: data.message.body,
              time: formatTime(new Date(data.message.createdAt)),
            }),
          )
        } catch (err) {
          setSendError(err instanceof Error && err.message ? err.message : t.common.genericError)
          setDraft(trimmed)
        } finally {
          setSending(false)
        }
      })()
      return
    }

    // Static-fixture demo path, unchanged — a canned reply from the
    // simulated "seller," since there's no real one on the other end.
    setMessages((prev) => prev.concat({ from: 'me', text: trimmed, time: now() }))
    clearTimeout(replyTimer.current)
    clearInterval(dotsTimer.current)
    replyTimer.current = setTimeout(() => {
      setTyping(true)
      dotsTimer.current = setInterval(() => {
        setDots((d) => (d % 3) + 1)
      }, 380)
      replyTimer.current = setTimeout(() => {
        clearInterval(dotsTimer.current)
        setTyping(false)
        setMessages((prev) => prev.concat({ from: 'them', text: t.chat.autoReply, time: now() }))
      }, 1800)
    }, 600)
  }

  // Static-fixture listings already have a phone number in hand (that demo
  // data was never gated). A real listing doesn't — `GET /listings/:id`
  // deliberately omits it (see RealListingResponse's own comment) — so
  // this reveals it on demand through the rate-limited endpoint right
  // before dialing, rather than fetching it alongside the rest of the
  // listing whether or not the buyer ever taps "call."
  async function callSeller() {
    if (!listingSummary) return
    if (listingSummary.sellerPhone) {
      Linking.openURL(`tel:${listingSummary.sellerPhone}`).catch(() => {})
      return
    }
    if (!isRealListing || revealingPhone) return

    setPhoneError(null)
    setRevealingPhone(true)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not signed in')
      const res = await fetch(`${API_URL}/listings/${id}/reveal-phone`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => null)
        throw new Error(errBody?.message ?? `Couldn't get the seller's number (${res.status})`)
      }
      const data = (await res.json()) as { phone: string | null }
      if (!data.phone) {
        throw new Error("This seller hasn't added a phone number yet")
      }
      Linking.openURL(`tel:${data.phone}`).catch(() => {})
    } catch (err) {
      setPhoneError(err instanceof Error && err.message ? err.message : t.common.genericError)
    } finally {
      setRevealingPhone(false)
    }
  }

  // Opens the header overflow sheet, and lazily fetches this seller's
  // current block status the first time it's opened for a real listing —
  // no need to pay for that request on every chat mount, only when the
  // buyer actually looks at the Block/Unblock action. The static-fixture
  // path has no real seller to check and just keeps its local toggle.
  async function openMoreSheet() {
    setMoreSheetVisible(true)
    if (!isRealListing || !listingSummary?.sellerId || blockStatusLoaded) return
    try {
      const token = await getToken()
      if (!token) return
      const res = await fetch(`${API_URL}/sellers/${listingSummary.sellerId}/block`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = (await res.json()) as { blocked: boolean }
        setBlocked(data.blocked)
      }
    } catch {
      // Leave `blocked` at its current value — the sheet still works,
      // just might show the wrong label until the next successful check.
    } finally {
      setBlockStatusLoaded(true)
    }
  }

  function openBlockConfirm() {
    setMoreSheetVisible(false)
    setBlockError(null)
    setBlockConfirmVisible(true)
  }

  async function confirmBlockToggle() {
    if (blockActionLoading) return
    if (!isRealListing || !listingSummary?.sellerId) {
      // Static-fixture demo seller isn't a real user row — cosmetic only.
      setBlocked((b) => !b)
      setBlockConfirmVisible(false)
      return
    }
    setBlockActionLoading(true)
    setBlockError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not signed in')
      const res = await fetch(`${API_URL}/sellers/${listingSummary.sellerId}/block`, {
        method: blocked ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => null)
        throw new Error(errBody?.message ?? `Failed to update block status (${res.status})`)
      }
      setBlocked((b) => !b)
      setBlockConfirmVisible(false)
    } catch (err) {
      setBlockError(err instanceof Error && err.message ? err.message : t.common.genericError)
    } finally {
      setBlockActionLoading(false)
    }
  }

  function openReportSheet() {
    setMoreSheetVisible(false)
    setReportReason(null)
    setReportDetails('')
    setReportSubmitted(false)
    setReportError(null)
    setReportSheetVisible(true)
  }

  async function submitReport() {
    if (!reportReason || reportSubmitting) return

    if (!isRealListing) {
      // Static-fixture demo listing has no real `listings` row to attach a
      // report to — cosmetic only, same reasoning as the block toggle above.
      setReportSubmitted(true)
      return
    }

    setReportSubmitting(true)
    setReportError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not signed in')
      const res = await fetch(`${API_URL}/listings/${id}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: reportReason, details: reportDetails.trim() || undefined }),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => null)
        throw new Error(errBody?.message ?? `Failed to submit report (${res.status})`)
      }
      setReportSubmitted(true)
    } catch (err) {
      setReportError(err instanceof Error && err.message ? err.message : t.common.genericError)
    } finally {
      setReportSubmitting(false)
    }
  }

  // Chat always belongs to a specific listing, so if there's no back-stack
  // to pop (a dev reload landing here resets the stack with this screen as
  // the root — the same would be true of a future deep link, e.g. from a
  // push notification), going to that listing directly is the right
  // fallback instead of a silently-dead back button.
  function goBack() {
    if (router.canGoBack()) {
      router.back()
    } else if (listingSummary) {
      router.replace(`/listing/${listingSummary.id}`)
    } else {
      router.replace('/')
    }
  }

  if (!listingSummary) {
    return (
      <LiveGradientBackground>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.navRow}>
            <IconButton
              icon={<ChevronLeftIcon />}
              accessibilityLabel={t.common.back}
              onPress={goBack}
              size={40}
              radius={14}
            />
          </View>
          {isRealListing && loadingReal ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={neutral.white} />
            </View>
          ) : null}
        </SafeAreaView>
      </LiveGradientBackground>
    )
  }

  const quick = [t.chat.quickBookViewing, t.chat.quickRequestVideo, t.chat.quickNegotiable]
  const filled = draft.trim().length > 0 && !sending

  const reportReasons = [
    { value: 'counterfeit', label: t.chat.reportReasonCounterfeit },
    { value: 'misleading', label: t.chat.reportReasonMisleading },
    { value: 'prohibited_item', label: t.chat.reportReasonProhibitedItem },
    { value: 'scam', label: t.chat.reportReasonScam },
    { value: 'other', label: t.chat.reportReasonOther },
  ]

  return (
    <LiveGradientBackground>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.navRow}>
          <IconButton
            icon={<ChevronLeftIcon />}
            accessibilityLabel={t.common.back}
            onPress={goBack}
            size={40}
            radius={14}
          />
          <View style={styles.avatarWrap}>
            <Avatar initials={initialsFor(listingSummary.sellerName)} size={40} badge="online" />
          </View>
          <View style={styles.nameCol}>
            <Text style={[styles.name, { fontFamily: fonts.extrabold }]} numberOfLines={1}>
              {listingSummary.sellerName}
            </Text>
            <Text
              style={[
                styles.presence,
                { fontFamily: fonts.semibold },
                typing && { color: tone.accent },
              ]}
            >
              {typing ? t.chat.presenceTyping : t.chat.presenceOnline}
            </Text>
          </View>
          <IconButton
            icon={<CallIcon size={16} />}
            accessibilityLabel={t.listingDetail.callSeller}
            onPress={callSeller}
            disabled={revealingPhone}
            size={40}
            radius={14}
          />
          <IconButton
            icon={<MoreVerticalIcon size={18} />}
            accessibilityLabel={t.chat.moreOptions}
            onPress={openMoreSheet}
            size={40}
            radius={14}
          />
        </View>

        {phoneError ? <Text style={styles.phoneError}>{phoneError}</Text> : null}
        {blockError ? <Text style={styles.phoneError}>{blockError}</Text> : null}

        <View style={styles.pinnedWrap}>
          <PressableScale
            onPress={() => router.push(`/listing/${listingSummary.id}`)}
            accessibilityLabel={`${listingSummary.name}, ${price}`}
          >
            <GlassSurface clarity={55} radius={20} style={styles.lotCard}>
              <View style={styles.lotThumb}>
                <GemIcon size={18} ink="rgba(255,255,255,0.25)" inkSoft="rgba(255,255,255,0.15)" />
              </View>
              <View style={styles.lotCol}>
                <Text style={[styles.lotName, { fontFamily: fonts.bold }]} numberOfLines={1}>
                  {listingSummary.name}
                </Text>
                <Text style={[styles.lotMeta, { fontFamily: fonts.semibold }]} numberOfLines={1}>
                  {listingSummary.specLine}
                </Text>
              </View>
              <Text style={[styles.lotPrice, { fontFamily: fonts.extrabold, color: tone.accent }]}>
                {price}
              </Text>
            </GlassSurface>
          </PressableScale>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            ref={threadRef}
            style={styles.flex}
            contentContainerStyle={styles.threadContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            // `scrollToEnd` in the mount effect alone can fire before RN has
            // measured the true final content height (glass/blur children
            // settle a frame late), landing short of the actual bottom —
            // onContentSizeChange re-fires once the real height is known.
            onContentSizeChange={scrollToEnd}
          >
            <GlassSurface clarity={55} radius={11} style={styles.datePill}>
              <Text style={[styles.datePillLabel, { fontFamily: fonts.bold }]}>{t.chat.today}</Text>
            </GlassSurface>

            <View
              style={[
                styles.safety,
                {
                  backgroundColor: `rgba(${tone.rim},0.08)`,
                  borderColor: `rgba(${tone.rim},0.2)`,
                },
              ]}
            >
              <ShieldCheckIcon size={14} color={`rgba(${tone.rim},0.75)`} />
              <Text style={[styles.safetyText, { fontFamily: fonts.semibold }]}>
                {t.chat.safetyNotice}
              </Text>
            </View>

            {messages.map((m, i) => {
              const mine = m.from === 'me'
              const next = messages[i + 1]
              const last = !next || next.from !== m.from
              const kind = m.kind ?? 'text'
              const showMeta = last
              const meta = mine && i === messages.length - 1 ? `${m.time} · ${t.chat.seen}` : m.time

              return (
                <View
                  key={i}
                  style={[
                    styles.row,
                    { alignItems: mine ? 'flex-end' : 'flex-start' },
                    !last && styles.rowTight,
                  ]}
                >
                  {kind === 'offer' ? (
                    <OfferBubble
                      amountUsd={m.amountUsd!}
                      listedPriceUsd={listingSummary.priceUsd}
                      fonts={fonts}
                      t={t}
                    />
                  ) : kind === 'photo' ? (
                    <PhotoBubble last={last} />
                  ) : (
                    <TextBubble mine={mine} last={last} text={m.text!} fonts={fonts} />
                  )}
                  {showMeta ? (
                    <Text style={[styles.meta, { fontFamily: fonts.semibold }]}>{meta}</Text>
                  ) : null}
                </View>
              )
            })}

            {typing ? (
              <View style={[styles.row, { alignItems: 'flex-start' }]}>
                <GlassSurface clarity={55} radius={20} style={styles.typingBubble}>
                  <Text style={[styles.typingDots, { fontFamily: fonts.extrabold }]}>
                    {'•'.repeat(dots).padEnd(3, ' ')}
                  </Text>
                </GlassSurface>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.composerOuter}>
            {sendError ? <Text style={styles.sendError}>{sendError}</Text> : null}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickRow}
              keyboardShouldPersistTaps="handled"
            >
              {quick.map((label) => (
                <PressableScale key={label} onPress={() => send(label)} accessibilityLabel={label}>
                  <GlassSurface clarity={55} radius={14} style={styles.quickChipSurface}>
                    <Text style={[styles.quickChipLabel, { fontFamily: fonts.bold }]}>{label}</Text>
                  </GlassSurface>
                </PressableScale>
              ))}
            </ScrollView>

            <View
              style={[
                styles.composerShadowWrap,
                Platform.select({
                  ios: {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 18 },
                    shadowOpacity: 0.6,
                    shadowRadius: 26,
                  },
                  android: { elevation: 10 },
                }),
              ]}
            >
              <GlassSurface clarity={55} rim={tone.rim} radius={26} style={styles.composer}>
                {/* No attachment flow exists yet to open — matches the
                    mockup's own attach button, which has no onClick either. */}
                <View style={styles.attachBtn}>
                  <AttachIcon size={16} />
                </View>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  onSubmitEditing={() => send(draft)}
                  placeholder={t.chat.composerPlaceholder.replace(
                    '{{name}}',
                    listingSummary.sellerName,
                  )}
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  style={[styles.input, { fontFamily: fonts.medium }]}
                  returnKeyType="send"
                />
                <PressableScale
                  onPress={() => send(draft)}
                  disabled={!filled}
                  accessibilityLabel={t.common.send}
                >
                  <View
                    style={[
                      styles.sendShadowWrap,
                      Platform.select({
                        ios: {
                          shadowColor: `rgb(${tone.halo})`,
                          shadowOffset: { width: 0, height: 12 },
                          shadowOpacity: filled ? 0.9 : 0.35,
                          shadowRadius: 18,
                        },
                        android: { elevation: filled ? 8 : 2 },
                      }),
                    ]}
                  >
                    <LinearGradient
                      colors={[`${tone.cta[0]}0.9)`, `${tone.cta[1]}0.76)`]}
                      start={GRADIENT_140.start}
                      end={GRADIENT_140.end}
                      style={[styles.sendBtn, { borderColor: `rgba(${tone.rim},0.5)` }]}
                    >
                      <SendIcon size={16} />
                    </LinearGradient>
                  </View>
                </PressableScale>
              </GlassSurface>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <BottomSheet
        visible={moreSheetVisible}
        onClose={() => setMoreSheetVisible(false)}
        closeAccessibilityLabel={t.common.close}
        radius={30}
        style={styles.moreSheet}
      >
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { fontFamily: fonts.extrabold }]}>
            {t.chat.moreOptions}
          </Text>
          <PressableScale
            onPress={() => setMoreSheetVisible(false)}
            accessibilityLabel={t.common.close}
            hitSlop={8}
            style={styles.sheetClose}
          >
            <CloseIcon />
          </PressableScale>
        </View>

        <PressableScale
          onPress={openReportSheet}
          accessibilityLabel={t.chat.reportTitle}
          style={styles.sheetActionRow}
        >
          <View style={[styles.sheetIconTile, { backgroundColor: `rgba(${tone.rim},0.13)` }]}>
            <ShieldAlertIcon size={17} color={tone.ink} strokeWidth={1.8} />
          </View>
          <Text style={[styles.sheetActionLabel, { fontFamily: fonts.semibold }]}>
            {t.chat.reportTitle}
          </Text>
        </PressableScale>

        <PressableScale
          onPress={openBlockConfirm}
          accessibilityLabel={blocked ? t.chat.unblockSeller : t.chat.blockConfirmButton}
          style={styles.sheetActionRow}
        >
          <View style={[styles.sheetIconTile, styles.sheetIconTileDanger]}>
            <BlockIcon size={17} color={neutral.danger.text} strokeWidth={1.8} />
          </View>
          <Text
            style={[
              styles.sheetActionLabel,
              styles.sheetActionLabelDanger,
              { fontFamily: fonts.semibold },
            ]}
          >
            {blocked ? t.chat.unblockSeller : t.chat.blockConfirmButton}
          </Text>
        </PressableScale>
      </BottomSheet>

      <BottomSheet
        visible={reportSheetVisible}
        onClose={() => setReportSheetVisible(false)}
        closeAccessibilityLabel={t.common.close}
        radius={30}
        style={styles.reportSheet}
      >
        <View style={styles.sheetHeader}>
          <Text
            style={[styles.sheetTitle, styles.settingsFlexGrow, { fontFamily: fonts.extrabold }]}
            numberOfLines={2}
          >
            {reportSubmitted ? t.chat.reportSuccessTitle : t.chat.reportTitle}
          </Text>
          <PressableScale
            onPress={() => setReportSheetVisible(false)}
            accessibilityLabel={t.common.close}
            hitSlop={8}
            style={styles.sheetClose}
          >
            <CloseIcon />
          </PressableScale>
        </View>

        {reportSubmitted ? (
          <View style={styles.reportSuccessBody}>
            <ShieldCheckIcon size={30} color={tone.ink} strokeWidth={1.6} />
            <Text style={[styles.reportSuccessText, { fontFamily: fonts.semibold }]}>
              {t.chat.reportSuccessMessage}
            </Text>
            <Button label={t.common.done} onPress={() => setReportSheetVisible(false)} />
          </View>
        ) : (
          <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
            {reportReasons.map((reason) => {
              const active = reason.value === reportReason
              return (
                <PressableScale
                  key={reason.value}
                  onPress={() => setReportReason(reason.value)}
                  accessibilityRole="checkbox"
                  accessibilityLabel={reason.label}
                  accessibilityState={{ checked: active }}
                  style={[
                    styles.sheetOption,
                    active
                      ? {
                          backgroundColor: `rgba(${tone.rim},0.14)`,
                          borderColor: `rgba(${tone.rim},0.3)`,
                        }
                      : styles.sheetOptionInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.sheetOptionLabel,
                      styles.settingsFlexGrow,
                      { fontFamily: fonts.semibold },
                    ]}
                  >
                    {reason.label}
                  </Text>
                  {active ? <CheckIcon size={14} color={tone.accent} /> : null}
                </PressableScale>
              )
            })}

            <TextField
              value={reportDetails}
              onChangeText={setReportDetails}
              placeholder={t.chat.reportDetailsPlaceholder}
              multiline
              style={styles.reportDetailsField}
            />

            {reportError ? <Text style={styles.sendError}>{reportError}</Text> : null}

            <Button
              label={t.chat.reportSubmit}
              onPress={submitReport}
              loading={reportSubmitting}
              disabled={!reportReason}
              style={styles.reportSubmitButton}
            />
          </ScrollView>
        )}
      </BottomSheet>

      <ConfirmDialog
        visible={blockConfirmVisible}
        title={blocked ? t.chat.unblockConfirmTitle : t.chat.blockConfirmTitle}
        message={blocked ? t.chat.unblockConfirmMessage : t.chat.blockConfirmMessage}
        confirmLabel={blocked ? t.chat.unblockConfirmButton : t.chat.blockConfirmButton}
        cancelLabel={t.common.cancel}
        destructive={!blocked}
        onConfirm={confirmBlockToggle}
        onCancel={() => setBlockConfirmVisible(false)}
      />
    </LiveGradientBackground>
  )
}

function bubbleCorner(mine: boolean, last: boolean) {
  return mine
    ? { borderBottomRightRadius: last ? 6 : 20 }
    : { borderBottomLeftRadius: last ? 6 : 20 }
}

interface TextBubbleProps {
  mine: boolean
  last: boolean
  text: string
  fonts: ReturnType<typeof useFontFamily>
}

// `mine` bubbles need the shadow-on-an-unclipped-wrapper pattern (see
// Button.tsx's identical comment) since they're a gradient-filled, clipped
// shape — `theirs` bubbles are plain GlassSurface, which has no shadow at
// all in the mockup, so no wrapper needed there.
function TextBubble({ mine, last, text, fonts }: TextBubbleProps) {
  const { gemTone } = useGemTone()
  const tone = gemTones[gemTone]
  const corner = bubbleCorner(mine, last)
  if (mine) {
    return (
      <View
        style={[
          styles.bubbleRadius,
          corner,
          Platform.select({
            ios: {
              shadowColor: `rgb(${tone.halo})`,
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.9,
              shadowRadius: 18,
            },
            android: { elevation: 8 },
          }),
        ]}
      >
        <LinearGradient
          colors={[`${tone.cta[0]}0.62)`, `${tone.cta[1]}0.46)`]}
          start={GRADIENT_140.start}
          end={GRADIENT_140.end}
          style={[
            styles.bubble,
            corner,
            { borderColor: `rgba(${tone.rim},0.42)`, borderTopColor: 'rgba(255,255,255,0.35)' },
          ]}
        >
          <Text style={[styles.bubbleText, { fontFamily: fonts.medium }]}>{text}</Text>
        </LinearGradient>
      </View>
    )
  }
  return (
    <GlassSurface clarity={55} radius={20} style={[styles.bubble, corner]}>
      <Text style={[styles.bubbleText, { fontFamily: fonts.medium }]}>{text}</Text>
    </GlassSurface>
  )
}

// Always from the seller in the current seed data (see buildSeedMessages) —
// the mockup's own corner formula for a photo message always tightens the
// bottom-left corner regardless of sender, so that's reproduced as-is
// rather than generalized for a "mine" case nothing exercises yet.
function PhotoBubble({ last }: { last: boolean }) {
  return (
    <GlassSurface
      clarity={55}
      radius={20}
      style={[styles.photoBubble, { borderBottomLeftRadius: last ? 6 : 20 }]}
    >
      <GemIcon size={28} ink="rgba(255,255,255,0.22)" inkSoft="rgba(255,255,255,0.12)" />
    </GlassSurface>
  )
}

interface OfferBubbleProps {
  amountUsd: number
  listedPriceUsd: number
  fonts: ReturnType<typeof useFontFamily>
  t: ReturnType<typeof useTranslation>
}

function OfferBubble({ amountUsd, listedPriceUsd, fonts, t }: OfferBubbleProps) {
  const { gemTone } = useGemTone()
  const tone = gemTones[gemTone]
  const { formatPrice } = useCurrency()
  return (
    <GlassSurface clarity={55} rim={tone.rim} radius={20} style={styles.offerBubble}>
      <Text style={[styles.offerLabel, { fontFamily: fonts.bold }]}>{t.chat.yourOffer}</Text>
      <Text style={[styles.offerAmount, { fontFamily: fonts.extrabold }]}>
        {formatPrice(amountUsd)}
      </Text>
      <Text style={[styles.offerSub, { fontFamily: fonts.semibold }]}>
        {t.chat.listedAt.replace('{{price}}', formatPrice(listedPriceUsd))}
      </Text>
      <LinearGradient
        colors={[`${tone.cta[0]}0.5)`, `${tone.cta[1]}0.32)`]}
        start={GRADIENT_140.start}
        end={GRADIENT_140.end}
        style={[styles.offerStatusPill, { borderColor: `rgba(${tone.rim},0.42)` }]}
      >
        <Text style={[styles.offerStatusLabel, { fontFamily: fonts.extrabold }]}>
          {t.chat.offerPending}
        </Text>
      </LinearGradient>
    </GlassSurface>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Exact values from the mockup's default glassClarity (55)/density
  // ("Airy") computations — not the general spacing/fontSize/radii scales,
  // which don't happen to land on these numbers.
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingTop: 10,
    paddingHorizontal: 22,
    paddingBottom: 10,
  },
  avatarWrap: {
    flex: 0,
  },
  nameCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    fontSize: 15,
    letterSpacing: -0.2,
    color: neutral.white,
  },
  presence: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  pinnedWrap: {
    paddingHorizontal: 22,
  },
  lotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 14,
  },
  lotThumb: {
    width: 46,
    height: 46,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lotCol: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  lotName: {
    fontSize: 13,
    color: neutral.white,
  },
  lotMeta: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  lotPrice: {
    fontSize: 14,
  },
  threadContent: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 14,
  },
  datePill: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  datePillLabel: {
    fontSize: 10,
    letterSpacing: 0.4,
    color: 'rgba(255,255,255,0.6)',
  },
  safety: {
    flexDirection: 'row',
    gap: 9,
    alignItems: 'flex-start',
    padding: 11,
    paddingHorizontal: 13,
    borderRadius: 16,
    borderWidth: 1,
  },
  safetyText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 11 * 1.5,
    color: 'rgba(255,255,255,0.6)',
  },
  row: {
    flexDirection: 'column',
    gap: 5,
  },
  rowTight: {
    marginBottom: -4,
  },
  bubbleRadius: {
    borderRadius: 20,
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 20,
    borderWidth: 1,
  },
  bubbleText: {
    fontSize: 13,
    lineHeight: 13 * 1.5,
    color: neutral.white,
  },
  photoBubble: {
    width: 200,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerBubble: {
    width: 230,
    gap: 5,
    padding: 14,
    paddingHorizontal: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 6,
  },
  offerLabel: {
    fontSize: 10,
    letterSpacing: 0.4,
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
  },
  offerAmount: {
    fontSize: 22,
    letterSpacing: -0.4,
    color: neutral.white,
  },
  offerSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
  },
  offerStatusPill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  offerStatusLabel: {
    fontSize: 10,
    letterSpacing: 0.3,
    color: neutral.white,
  },
  meta: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    paddingHorizontal: 6,
  },
  typingBubble: {
    minWidth: 44,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomLeftRadius: 6,
  },
  typingDots: {
    fontSize: 16,
    letterSpacing: 3,
    lineHeight: 16,
    color: neutral.white,
  },
  composerOuter: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 10,
  },
  sendError: {
    paddingHorizontal: 2,
    fontSize: 11,
    color: neutral.danger.textStrong,
  },
  phoneError: {
    paddingHorizontal: 22,
    marginTop: -4,
    fontSize: 11,
    color: neutral.danger.textStrong,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickChipSurface: {
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  quickChipLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
  },
  composerShadowWrap: {
    borderRadius: 26,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 52,
    paddingHorizontal: 6,
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: neutral.white,
    fontSize: 14,
    paddingHorizontal: 4,
  },
  sendShadowWrap: {
    borderRadius: 20,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  // More-options / Report sheets — same BottomSheet header/row shape as
  // Profile's Account Settings picker sheets (closeIcon header, selectable
  // rows with a trailing checkmark), ported here since this screen has its
  // own separate StyleSheet rather than sharing profile.tsx's.
  moreSheet: {
    paddingBottom: 24,
  },
  reportSheet: {
    paddingBottom: 20,
    maxHeight: '82%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    gap: 12,
  },
  sheetTitle: {
    fontSize: 16,
    color: neutral.white,
  },
  sheetClose: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  settingsFlexGrow: {
    flex: 1,
  },
  sheetActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 20,
  },
  sheetIconTile: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetIconTileDanger: {
    backgroundColor: neutral.danger.surface,
    borderColor: neutral.danger.border,
  },
  sheetActionLabel: {
    fontSize: 14,
    color: neutral.white,
  },
  sheetActionLabelDanger: {
    color: neutral.danger.text,
  },
  sheetBody: {
    paddingHorizontal: 14,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 2,
  },
  sheetOptionInactive: {
    borderColor: 'transparent',
  },
  sheetOptionLabel: {
    color: neutral.white,
    fontSize: 14,
  },
  reportDetailsField: {
    marginTop: 12,
    marginHorizontal: 2,
  },
  reportSubmitButton: {
    marginTop: 18,
    marginHorizontal: 2,
    marginBottom: 8,
  },
  reportSuccessBody: {
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 24,
    paddingTop: 4,
  },
  reportSuccessText: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 13 * 1.5,
    color: 'rgba(255,255,255,0.75)',
  },
})
