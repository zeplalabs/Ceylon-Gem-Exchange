import { gemTones, neutral } from '@ceylon-gems/ui-tokens'
import { LinearGradient } from 'expo-linear-gradient'
import * as Linking from 'expo-linking'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Avatar, GlassSurface, IconButton, PressableScale } from '../../components'
import {
  AttachIcon,
  CallIcon,
  ChevronLeftIcon,
  GemIcon,
  SendIcon,
  ShieldCheckIcon,
} from '../../components/icons'
import { GRADIENT_140 } from '../../components/primitives/gradientAngle'
import { LiveGradientBackground } from '../../components/primitives/LiveGradientBackground'
import { useFontFamily } from '../../hooks/useFontFamily'
import { useTranslation } from '../../hooks/useTranslation'
import { getListingDetail, type ListingDetail } from '../../lib/listings'
import { useCurrency } from '../../providers/CurrencyProvider'
import { useGemTone } from '../../providers/GemToneProvider'

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
// mockup's own `state.msgs` — placeholder content in the same sense as
// lib/listings.ts's detail data: no messaging backend exists yet (see
// CLAUDE.md's "Current sequencing"), so this screen is a local-only chat
// simulation, not wired to anything real. The mockup hardcoded one
// specific listing's lot number/cert into the opening lines; this
// interpolates the actual listing instead so the demo reads correctly
// from any listing's Chat button, not just the one the mockup was built
// against.
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

function now() {
  const d = new Date()
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
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
// tab's chat button. Ports "Ceylon Gem Exchange Chat.dc.html" — the typing-
// delay + canned-reply behavior in `send()` below replicates the mockup's
// own `push()` logic exactly, so the interaction itself is real even
// though the "seller" on the other end isn't (see buildSeedMessages above).
// No photo backend exists yet (same situation as Listing Detail's gallery),
// so the pinned-lot thumbnail and the one photo message both render the
// same tinted-glass + GemIcon placeholder rather than a real image.
export default function ChatScreen() {
  const t = useTranslation()
  const fonts = useFontFamily()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const listing = getListingDetail(id)
  const { gemTone } = useGemTone()
  const tone = gemTones[gemTone]
  const { formatPrice } = useCurrency()
  const price = listing ? formatPrice(listing.priceUsd) : ''

  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    listing ? buildSeedMessages(listing) : [],
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

  function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    setMessages((prev) => prev.concat({ from: 'me', text: trimmed, time: now() }))
    setDraft('')

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

  function callSeller() {
    if (!listing) return
    Linking.openURL(`tel:${listing.sellerPhone}`).catch(() => {})
  }

  // Chat always belongs to a specific listing, so if there's no back-stack
  // to pop (a dev reload landing here resets the stack with this screen as
  // the root — the same would be true of a future deep link, e.g. from a
  // push notification), going to that listing directly is the right
  // fallback instead of a silently-dead back button.
  function goBack() {
    if (router.canGoBack()) {
      router.back()
    } else if (listing) {
      router.replace(`/listing/${listing.id}`)
    } else {
      router.replace('/')
    }
  }

  if (!listing) {
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
        </SafeAreaView>
      </LiveGradientBackground>
    )
  }

  const quick = [t.chat.quickBookViewing, t.chat.quickRequestVideo, t.chat.quickNegotiable]
  const filled = draft.trim().length > 0

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
            <Avatar initials={initialsFor(listing.sellerName)} size={40} badge="online" />
          </View>
          <View style={styles.nameCol}>
            <Text style={[styles.name, { fontFamily: fonts.extrabold }]} numberOfLines={1}>
              {listing.sellerName}
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
            size={40}
            radius={14}
          />
        </View>

        <View style={styles.pinnedWrap}>
          <PressableScale
            onPress={() => router.push(`/listing/${listing.id}`)}
            accessibilityLabel={`${listing.name}, ${price}`}
          >
            <GlassSurface clarity={55} radius={20} style={styles.lotCard}>
              <View style={styles.lotThumb}>
                <GemIcon size={18} ink="rgba(255,255,255,0.25)" inkSoft="rgba(255,255,255,0.15)" />
              </View>
              <View style={styles.lotCol}>
                <Text style={[styles.lotName, { fontFamily: fonts.bold }]} numberOfLines={1}>
                  {listing.name}
                </Text>
                <Text style={[styles.lotMeta, { fontFamily: fonts.semibold }]} numberOfLines={1}>
                  {listing.lotNumber} · {listing.weight} · {listing.treatment}
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
                      listedPriceUsd={listing.priceUsd}
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
                  placeholder={t.chat.composerPlaceholder.replace('{{name}}', listing.sellerName)}
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
})
