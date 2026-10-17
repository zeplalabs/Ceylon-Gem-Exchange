import { useAuth } from '@clerk/expo'
import { gemTones, neutral } from '@ceylon-gems/ui-tokens'
import { LinearGradient } from 'expo-linear-gradient'
import * as Linking from 'expo-linking'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useVideoPlayer, VideoView, type VideoSource } from 'expo-video'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  GlassSurface,
  IconButton,
  ListingCard,
  PressableScale,
  SegmentedControl,
} from '../../components'
import {
  CallIcon,
  ChatIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  GemIcon,
  HeartIcon,
  PersonIcon,
  PlayIcon,
  ShieldCheckIcon,
  WhatsAppIcon,
} from '../../components/icons'
import { LiveGradientBackground } from '../../components/primitives/LiveGradientBackground'
import { useFontFamily } from '../../hooks/useFontFamily'
import { useToggleFavorite } from '../../hooks/useToggleFavorite'
import { useTranslation } from '../../hooks/useTranslation'
import { API_URL } from '../../lib/apiUrl'
import { usdRateFor, type CurrencyOption } from '../../lib/currency'
import { isRealId } from '../../lib/ids'
import { badgeForDetails, specForDetails, type ListingSpecDetails } from '../../lib/listingSpec'
import { featuredListings, getListingDetail, type ListingDetail } from '../../lib/listings'
import { getListingMedia } from '../../lib/media'
import { useCurrency } from '../../providers/CurrencyProvider'
import { useFavorites } from '../../providers/FavoritesProvider'
import { useGemTone } from '../../providers/GemToneProvider'

/** Display-only extras `ListingSpecDetails` doesn't carry — real columns on `gem_details` the mockup's own fixture renders but `post-ad.tsx`'s posting form never collects (color/clarity/dimensions/cutGrade/refractiveIndex/certNumber/certIssuedAt/lotNumber), so a real listing has these as `null` today. */
interface RealGemExtras {
  color?: string | null
  clarity?: string | null
  origin?: string | null
  treatment?: string | null
  dimensions?: string | null
  cutGrade?: string | null
  refractiveIndex?: string | null
  certNumber?: string | null
  certIssuedAt?: string | null
  lotNumber?: string | null
}

interface RealListingResponse {
  id: string
  type: 'gem' | 'equipment'
  title: string
  description: string | null
  priceAmountCents: number
  priceCurrency: string
  sellerId: string
  sellerName: string | null
  publishedAt: string | null
  createdAt: string
  details: (ListingSpecDetails & RealGemExtras) | null
}

const MISSING = '—'

function formatListedDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// Builds the same `ListingDetail` shape the static fixtures use, from a
// real `GET /listings/:id` response, so the rest of this screen (already
// written against `ListingDetail`) renders either source unchanged. Real
// columns the posting form doesn't collect yet (see RealGemExtras) fall
// back to `MISSING` rather than inventing plausible-looking demo values —
// this is the same "honest gap, not a fabricated number" bar the rest of
// the app holds to (ratings, hours, etc). `sellerPhone` is deliberately
// left blank — `GET /listings/:id` never returns it (see that endpoint's
// own comment); `callSeller`/`messageOnWhatsApp` below reveal it on demand
// through the rate-limited endpoint instead, same pattern chat/[id].tsx
// already established. No real photo backend is wired into this screen —
// `photoCount: 0` renders the same single placeholder hero every other
// photo-less area of the app uses (see the `media` fallback below).
function mapRealListing(
  data: RealListingResponse,
  currencies: CurrencyOption[] | null,
): ListingDetail {
  const d = data.details
  return {
    id: data.id,
    name: data.title,
    spec: specForDetails(data.type, d),
    priceUsd: data.priceAmountCents / 100 / usdRateFor(currencies, data.priceCurrency),
    badge: badgeForDetails(data.type, d),
    lotNumber: d?.lotNumber ?? MISSING,
    weight: d?.caratWeight != null ? `${d.caratWeight} ct` : MISSING,
    shape: d?.shape ?? MISSING,
    colour: d?.color ?? MISSING,
    clarity: d?.clarity ?? MISSING,
    origin: d?.origin ?? MISSING,
    treatment: d?.treatment ?? MISSING,
    dimensions: d?.dimensions ?? MISSING,
    cutGrade: d?.cutGrade ?? MISSING,
    refractiveIndex: d?.refractiveIndex ?? MISSING,
    listedDate: formatListedDate(data.publishedAt ?? data.createdAt),
    description: data.description ?? '',
    sellerName: data.sellerName ?? MISSING,
    sellerMeta: MISSING,
    sellerPhone: '',
    sellerId: data.sellerId,
    certNumber: d?.certNumber ?? MISSING,
    certIssued: d?.certIssuedAt ? `Issued ${formatListedDate(d.certIssuedAt)}` : MISSING,
    photoCount: 0,
  }
}

type Tab = 'about' | 'specs' | 'seller'

// The hero gallery's video shot, auto-played from the start every time
// it's swiped into view (not tap-to-play like the Gallery Viewer screen's
// main stage — this hero is meant to read as "browsing photos" at a
// glance, so a video shot should just play rather than sit as an inert
// poster the user has to notice and tap). Replaying from 0 on each
// swipe-in (rather than resuming where a previous viewing left off)
// matches a photo slide, which always shows the same frame when swiped
// back to — the video should likewise always start the same way. Muted
// by default since it's starting without an explicit user gesture. No
// `nativeControls` — like a photo slide, tapping it navigates to the
// Gallery Viewer (where the clip gets its own tap-to-play, controllable
// viewing) rather than toggling playback in place; native controls would
// also just intercept the tap before a wrapping Pressable ever saw it.
function HeroVideoSlide({
  source,
  width,
  height,
  isActive,
  onPress,
  accessibilityLabel,
}: {
  source: VideoSource
  width: number
  height: number
  isActive: boolean
  onPress: () => void
  accessibilityLabel: string
}) {
  const player = useVideoPlayer(source, (p) => {
    p.loop = true
    p.muted = true
  })

  useEffect(() => {
    if (isActive) {
      player.replay()
      player.play()
    } else {
      player.pause()
    }
  }, [isActive, player])

  return (
    <PressableScale
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      style={{ width, height }}
    >
      <VideoView
        style={{ width, height }}
        player={player}
        contentFit="cover"
        pointerEvents="none"
      />
    </PressableScale>
  )
}

// Reached by tapping a ListingCard on Home/Search Results (real UUID ids,
// now that both are wired to `GET /search`), a Storefront/Profile listing
// grid, or another listing's "Similar listings" card (always a static
// fixture id — see below). Ports "Ceylon Gem Exchange Listing Detail.dc.html".
// Real vs. static branches on `isRealId(id)` (see mapRealListing's own
// comment for exactly which fields a real listing can/can't populate); no
// real photo backend exists yet either way, so photo slides render the
// same tinted-glass + GemIcon placeholder (`media` falls back to one
// synthetic placeholder slide when a real listing has no actual photos —
// see below), and the one video shot (static fixtures only) autoplays a
// real bundled demo clip (see HeroVideoSlide above) standing in for actual
// seller-uploaded video. `@nandorojo/galeria` (CLAUDE.md's mandated
// pinch-zoom/pan-to-close viewer) stays deferred for photos until there's
// a real one worth zooming into. The favorite toggle goes through the
// shared FavoritesProvider, so liking either a real or a static-fixture
// listing here shows up on the real Favourites screen. "Similar listings"
// and the certificate-viewer link are left on the static fixture catalog
// for every listing, real or not (see their own comments below) — a real
// "similar" recommendation and a real certificate record are both out of
// scope here.
export default function ListingDetailScreen() {
  const t = useTranslation()
  const fonts = useFontFamily()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()
  const isReal = isRealId(id)
  const { width: windowWidth } = useWindowDimensions()
  const { gemTone } = useGemTone()
  const tone = gemTones[gemTone]
  const { formatPrice, currencies } = useCurrency()
  const { getToken } = useAuth()
  const iconSoft = `rgba(${tone.rim},0.75)`
  // Matches `body`'s own paddingHorizontal (22 each side) — the hero
  // gallery isn't measured via onLayout since it's always exactly the
  // body content width minus that fixed padding.
  const galleryWidth = windowWidth - 44

  const [activeImage, setActiveImage] = useState(0)
  const [tab, setTab] = useState<Tab>('about')
  const { likedIds } = useFavorites()
  const toggleFavorite = useToggleFavorite()
  const fav = likedIds.has(id)
  const heroScrollRef = useRef<ScrollView>(null)

  // `undefined` = still loading (or not a real id at all — see `listing`
  // below), `null` = fetched and genuinely not found. Kept separate from
  // the static lookup so a real listing gets its own loading state instead
  // of flashing the "not found" view while the request is in flight.
  const [rawReal, setRawReal] = useState<RealListingResponse | null | undefined>(undefined)
  const [revealingPhone, setRevealingPhone] = useState(false)
  const [phoneError, setPhoneError] = useState<string | null>(null)

  useEffect(() => {
    if (!isReal) return
    let cancelled = false
    fetch(`${API_URL}/listings/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(`No listing with id ${id}`)
        return res.json() as Promise<RealListingResponse>
      })
      .then((data) => {
        if (!cancelled) setRawReal(data)
      })
      .catch(() => {
        if (!cancelled) setRawReal(null)
      })
    return () => {
      cancelled = true
    }
  }, [id, isReal])

  const listing = useMemo(() => {
    if (!isReal) return getListingDetail(id)
    return rawReal ? mapRealListing(rawReal, currencies) : undefined
  }, [isReal, id, rawReal, currencies])
  const isLoadingReal = isReal && rawReal === undefined

  function goToImage(i: number) {
    setActiveImage(i)
    heroScrollRef.current?.scrollTo({ x: i * galleryWidth, animated: true })
  }

  function handleHeroMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setActiveImage(Math.round(e.nativeEvent.contentOffset.x / galleryWidth))
  }

  // If there's no back-stack to pop (a dev reload landing here resets the
  // stack with this screen as the root — the same would be true of a
  // future deep link, e.g. a shared listing URL), Home is the sensible
  // fallback destination instead of a silently-dead back button.
  function goBack() {
    if (router.canGoBack()) {
      router.back()
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
          {isLoadingReal ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={neutral.white} />
            </View>
          ) : null}
        </SafeAreaView>
      </LiveGradientBackground>
    )
  }

  // A real listing has no real photos yet (see mapRealListing's own
  // comment) — `getListingMedia` would return an empty array for its
  // `photoCount: 0`, so the hero/thumbnails below would render as an empty
  // strip rather than the glass+GemIcon placeholder every other
  // photo-less area of the app shows. One synthetic, non-navigable 'photo'
  // entry keeps the exact same carousel/dots/thumbnail JSX working
  // unchanged for both branches.
  const media = isReal
    ? [{ title: listing.name, kind: 'photo' as const }]
    : getListingMedia(listing)
  // "Similar listings" stays on the static fixture catalog for every
  // listing, real or not — there's no real "find similar active listings"
  // query behind this yet (out of scope here; it's filler content, not
  // the current listing's own identity), and the static catalog's ids are
  // always valid `/listing/:id` destinations either way.
  const similar = featuredListings.filter((item) => item.id !== listing.id).slice(0, 4)
  const price = formatPrice(listing.priceUsd)
  // Filters out whatever a real listing doesn't have (see mapRealListing)
  // instead of literally rendering "— · — · — certified" — every static
  // fixture has all three, so this is a no-op there.
  const titleMeta = [
    listing.origin !== MISSING ? listing.origin.split(',')[0] : null,
    listing.treatment !== MISSING ? listing.treatment : null,
    listing.certNumber !== MISSING ? `${listing.certNumber.split(' ')[0]} certified` : null,
  ]
    .filter(Boolean)
    .join(' · ')
  const hasCertificate = listing.certNumber !== MISSING

  // Static-fixture listings already have a phone number in hand (that demo
  // data was never gated). A real listing doesn't — `GET /listings/:id`
  // deliberately omits it — so this reveals it on demand through the
  // rate-limited endpoint right before dialing/messaging, same pattern
  // chat/[id].tsx's own `callSeller` already established.
  async function revealPhone(): Promise<string | null> {
    if (listing!.sellerPhone) return listing!.sellerPhone
    if (!isReal || revealingPhone) return null
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
      if (!data.phone) throw new Error("This seller hasn't added a phone number yet")
      return data.phone
    } catch (err) {
      setPhoneError(err instanceof Error && err.message ? err.message : t.common.genericError)
      return null
    } finally {
      setRevealingPhone(false)
    }
  }

  async function callSeller() {
    const phone = await revealPhone()
    if (phone) Linking.openURL(`tel:${phone}`).catch(() => {})
  }

  async function messageOnWhatsApp() {
    const phone = await revealPhone()
    if (phone) Linking.openURL(`https://wa.me/${phone.replace('+', '')}`).catch(() => {})
  }

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
          <Text style={[styles.navTitle, { fontFamily: fonts.extrabold }]} numberOfLines={1}>
            {listing.lotNumber !== MISSING ? listing.lotNumber : listing.name}
          </Text>
          <PressableScale
            onPress={() => toggleFavorite(id)}
            accessibilityRole="button"
            accessibilityLabel={fav ? `Unlike ${listing.name}` : `Like ${listing.name}`}
            accessibilityState={{ selected: fav }}
          >
            {fav ? (
              <LinearGradient
                colors={[`${tone.cta[0]}0.45)`, `${tone.cta[1]}0.3)`]}
                style={[styles.navIconBtn, { borderColor: `rgba(${tone.rim},0.45)` }]}
              >
                <HeartIcon size={17} filled color={tone.accent} />
              </LinearGradient>
            ) : (
              <GlassSurface clarity={55} radius={14} style={styles.navIconBtn}>
                <HeartIcon size={17} color="rgba(255,255,255,0.85)" />
              </GlassSurface>
            )}
          </PressableScale>
        </View>

        {phoneError ? <Text style={styles.phoneError}>{phoneError}</Text> : null}

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <View
            style={Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 20 },
                shadowOpacity: 0.6,
                shadowRadius: 30,
              },
              android: { elevation: 10 },
            })}
          >
            {/* overflow:'hidden' lives on this inner view (not the shadow
                wrapper above) — overflow:'hidden' and a shadow on the same
                view clip the shadow away in RN, so the rounded-corner clip
                and the drop shadow need separate layers. */}
            <View style={styles.gallery}>
              <ScrollView
                ref={heroScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleHeroMomentumEnd}
              >
                {media.map((shot, i) =>
                  shot.kind === 'video' && shot.video ? (
                    <HeroVideoSlide
                      key={i}
                      source={shot.video}
                      width={galleryWidth}
                      height={280}
                      isActive={i === activeImage}
                      onPress={() => router.push(`/gallery/${listing.id}?index=${i}`)}
                      accessibilityLabel={`${listing.name} video ${i + 1}`}
                    />
                  ) : (
                    <PressableScale
                      key={i}
                      // Real listings have no actual Gallery Viewer content
                      // to open yet (see `media`'s own comment) — the
                      // placeholder slide stays visually identical but
                      // isn't a tap target to a dead-end screen.
                      onPress={
                        isReal ? undefined : () => router.push(`/gallery/${listing.id}?index=${i}`)
                      }
                      accessibilityLabel={`${listing.name} photo ${i + 1}`}
                      style={{ width: galleryWidth, height: 280 }}
                    >
                      {/* radius 0 — the slide fills its own rectangle; the
                          rounded shape comes from the container's overflow
                          clip above, not from each individual slide. */}
                      <GlassSurface
                        clarity={55}
                        rim={tone.rim}
                        radius={0}
                        style={styles.galleryGlass}
                      >
                        <GemIcon
                          size={44}
                          ink="rgba(255,255,255,0.2)"
                          inkSoft="rgba(255,255,255,0.12)"
                        />
                      </GlassSurface>
                    </PressableScale>
                  ),
                )}
              </ScrollView>
              <LinearGradient
                colors={['rgba(6,11,26,0.12)', 'rgba(6,11,26,0)', 'rgba(6,11,26,0.6)']}
                locations={[0, 0.4, 1]}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
              <View style={styles.dotsRow} pointerEvents="none">
                {media.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      i === activeImage
                        ? { width: 20, backgroundColor: tone.accent, shadowColor: tone.accent }
                        : { width: 5, backgroundColor: 'rgba(255,255,255,0.4)' },
                    ]}
                  />
                ))}
              </View>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.thumbRow}
            contentContainerStyle={styles.thumbRowContent}
          >
            {media.map((shot, i) => {
              const active = i === activeImage
              const thumb = (
                <GlassSurface
                  clarity={55}
                  radius={18}
                  style={[
                    styles.thumb,
                    active && { borderWidth: 1.5, borderColor: `rgba(${tone.rim},0.65)` },
                    !active && styles.thumbInactive,
                  ]}
                >
                  <GemIcon
                    size={18}
                    ink="rgba(255,255,255,0.22)"
                    inkSoft="rgba(255,255,255,0.12)"
                  />
                  {shot.kind === 'video' ? (
                    <View style={styles.thumbVideoBadge}>
                      <PlayIcon size={8} />
                    </View>
                  ) : null}
                </GlassSurface>
              )
              return (
                <PressableScale
                  key={i}
                  onPress={() => goToImage(i)}
                  accessibilityLabel={`View ${i + 1}`}
                >
                  {active ? (
                    <View
                      style={[
                        styles.thumbActiveRing,
                        { backgroundColor: `rgba(${tone.halo},0.18)` },
                      ]}
                    >
                      {thumb}
                    </View>
                  ) : (
                    thumb
                  )}
                </PressableScale>
              )
            })}
          </ScrollView>

          <View style={styles.titleRow}>
            <View style={styles.titleCol}>
              <Text style={[styles.title, { fontFamily: fonts.extrabold }]}>{listing.name}</Text>
              {titleMeta ? (
                <Text style={[styles.titleMeta, { fontFamily: fonts.semibold }]}>{titleMeta}</Text>
              ) : null}
              <View style={styles.sellerRow}>
                <PersonIcon size={13} color={iconSoft} strokeWidth={1.8} />
                <Text style={[styles.sellerRowLabel, { fontFamily: fonts.bold }]}>
                  {listing.sellerName}
                </Text>
              </View>
            </View>
            <View style={styles.priceCol}>
              <Text style={[styles.priceLabel, { fontFamily: fonts.bold }]}>
                {t.listingDetail.priceLabel}
              </Text>
              <Text style={[styles.price, { fontFamily: fonts.extrabold, color: tone.accent }]}>
                {price}
              </Text>
            </View>
          </View>

          <View style={styles.specGrid}>
            <View style={styles.specRow}>
              <SpecCell label={t.listingDetail.weight} value={listing.weight} />
              <SpecCell label={t.listingDetail.shape} value={listing.shape} />
            </View>
            <View style={styles.specRow}>
              <SpecCell label={t.listingDetail.color} value={listing.colour} />
              <SpecCell label={t.listingDetail.clarity} value={listing.clarity} />
            </View>
          </View>

          <SegmentedControl
            variant="glass"
            options={[
              { label: t.listingDetail.aboutTab, value: 'about' as const },
              { label: t.listingDetail.specsTab, value: 'specs' as const },
              { label: t.listingDetail.sellerTab, value: 'seller' as const },
            ]}
            value={tab}
            onChange={setTab}
            style={styles.tabs}
          />

          <GlassSurface clarity={55} radius={22} style={styles.panel}>
            {tab === 'about' ? (
              <Text style={[styles.aboutText, { fontFamily: fonts.regular }]}>
                {listing.description}
              </Text>
            ) : null}

            {tab === 'specs' ? (
              <View style={styles.detailRows}>
                {[
                  { label: 'Origin', value: listing.origin },
                  { label: 'Treatment', value: listing.treatment },
                  { label: 'Dimensions', value: listing.dimensions },
                  { label: 'Cut grade', value: listing.cutGrade },
                  { label: 'Refractive index', value: listing.refractiveIndex },
                  { label: 'Listed', value: listing.listedDate },
                ].map((row, i, arr) => (
                  <View
                    key={row.label}
                    style={[styles.detailRow, i < arr.length - 1 && styles.detailRowDivider]}
                  >
                    <Text style={[styles.detailLabel, { fontFamily: fonts.semibold }]}>
                      {row.label}
                    </Text>
                    <Text style={[styles.detailValue, { fontFamily: fonts.bold }]}>
                      {row.value}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {tab === 'seller' ? (
              <PressableScale
                onPress={() =>
                  router.push(`/seller/${listing.sellerId}?fromListingId=${listing.id}`)
                }
                accessibilityLabel={`${listing.sellerName}, ${t.sellerProfile.title}`}
                style={styles.sellerPanelRow}
              >
                <GlassSurface clarity={55} rim={tone.rim} radius={23} style={styles.sellerAvatar}>
                  <PersonIcon size={22} color={iconSoft} strokeWidth={1.6} />
                </GlassSurface>
                <View style={styles.sellerPanelCol}>
                  <Text style={[styles.sellerPanelName, { fontFamily: fonts.extrabold }]}>
                    {listing.sellerName}
                  </Text>
                  <Text style={[styles.sellerPanelMeta, { fontFamily: fonts.semibold }]}>
                    {listing.sellerMeta}
                  </Text>
                </View>
                <ChevronRightIcon color="rgba(255,255,255,0.5)" />
              </PressableScale>
            ) : null}
          </GlassSurface>

          {hasCertificate ? (
            <PressableScale
              onPress={() => router.push(`/certificate/${listing.id}`)}
              accessibilityLabel={`View ${listing.certNumber} certificate`}
            >
              <GlassSurface clarity={55} radius={20} style={styles.certRow}>
                <View
                  style={[
                    styles.certIconTile,
                    {
                      backgroundColor: `rgba(${tone.rim},0.14)`,
                      borderColor: `rgba(${tone.rim},0.28)`,
                    },
                  ]}
                >
                  <ShieldCheckIcon size={17} color={iconSoft} strokeWidth={1.5} />
                </View>
                <View style={styles.certTextCol}>
                  <Text style={[styles.certNumber, { fontFamily: fonts.bold }]}>
                    {listing.certNumber}
                  </Text>
                  <Text style={[styles.certIssued, { fontFamily: fonts.semibold }]}>
                    {listing.certIssued}
                  </Text>
                </View>
                <ChevronRightIcon />
              </GlassSurface>
            </PressableScale>
          ) : null}

          <View style={styles.similarHeader}>
            <Text style={[styles.similarTitle, { fontFamily: fonts.extrabold }]}>
              {t.listingDetail.similarListings}
            </Text>
            <PressableScale onPress={() => router.push(`/similar/${listing.id}`)} hitSlop={8}>
              <Text style={[styles.similarViewAll, { fontFamily: fonts.bold, color: tone.accent }]}>
                {t.listingDetail.viewAll}
              </Text>
            </PressableScale>
          </View>

          <View style={styles.similarGrid}>
            <View style={styles.similarRow}>
              {similar.slice(0, 2).map((item) => (
                <View key={item.id} style={styles.similarItem}>
                  <ListingCard
                    name={item.name}
                    spec={item.spec}
                    priceUsd={item.priceUsd}
                    badge={item.badge}
                    onPress={() => router.push(`/listing/${item.id}`)}
                  />
                </View>
              ))}
            </View>
            <View style={styles.similarRow}>
              {similar.slice(2, 4).map((item) => (
                <View key={item.id} style={styles.similarItem}>
                  <ListingCard
                    name={item.name}
                    spec={item.spec}
                    priceUsd={item.priceUsd}
                    badge={item.badge}
                    onPress={() => router.push(`/listing/${item.id}`)}
                  />
                </View>
              ))}
            </View>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        <View
          style={[
            styles.actionBar,
            { bottom: insets.bottom + 36 },
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
          <GlassSurface
            clarity={55}
            androidFillAlpha={0.92}
            rim={tone.rim}
            radius={28}
            style={styles.actionBarGlass}
          >
            <PressableScale
              onPress={callSeller}
              disabled={revealingPhone}
              style={styles.actionButton}
              accessibilityLabel={t.listingDetail.call}
            >
              <CallIcon size={17} />
              <Text style={[styles.actionLabel, { fontFamily: fonts.extrabold }]}>
                {t.listingDetail.call}
              </Text>
            </PressableScale>
            <PressableScale
              onPress={() => router.push(`/chat/${listing.id}`)}
              style={styles.actionButton}
              accessibilityLabel={t.listingDetail.chat}
            >
              <ChatIcon size={17} />
              <Text style={[styles.actionLabel, { fontFamily: fonts.extrabold }]}>
                {t.listingDetail.chat}
              </Text>
            </PressableScale>
            <PressableScale
              onPress={messageOnWhatsApp}
              disabled={revealingPhone}
              style={styles.actionButton}
              accessibilityLabel={t.listingDetail.whatsapp}
            >
              <WhatsAppIcon size={17} />
              <Text style={[styles.actionLabel, { fontFamily: fonts.extrabold }]}>
                {t.listingDetail.whatsapp}
              </Text>
            </PressableScale>
          </GlassSurface>
        </View>
      </SafeAreaView>
    </LiveGradientBackground>
  )
}

function SpecCell({ label, value }: { label: string; value: string }) {
  const fonts = useFontFamily()
  return (
    <GlassSurface clarity={55} radius={18} style={styles.specCell}>
      <Text style={[styles.specLabel, { fontFamily: fonts.bold }]}>{label}</Text>
      <Text style={[styles.specValue, { fontFamily: fonts.extrabold }]}>{value}</Text>
    </GlassSurface>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneError: {
    marginTop: 4,
    marginHorizontal: 22,
    textAlign: 'center',
    fontSize: 12,
    color: neutral.danger.textStrong,
  },
  // Exact values from the mockup's default glassClarity (55)/density
  // ("Airy") computations — not the general spacing/fontSize/radii scales,
  // which don't happen to land on these numbers.
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 10,
    paddingHorizontal: 22,
    paddingBottom: 8,
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    letterSpacing: -0.2,
    color: neutral.white,
  },
  navIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 22,
  },
  gallery: {
    height: 280,
    borderRadius: 26,
    overflow: 'hidden',
  },
  galleryGlass: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    height: 5,
    borderRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  thumbRow: {
    marginTop: 12,
    flexGrow: 0,
  },
  // flexGrow: 1 lets the content container expand to the ScrollView's full
  // width when the thumbnails don't fill it (<=4 photos) so justifyContent
  // can center them; once there are enough thumbnails to overflow that
  // width on their own, flexGrow has nothing left to grow into and this
  // naturally falls back to normal left-aligned horizontal scrolling — no
  // photo-count branching needed.
  thumbRowContent: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: 10,
  },
  thumb: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbInactive: {
    opacity: 0.75,
  },
  thumbVideoBadge: {
    position: 'absolute',
    right: 5,
    bottom: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(4,8,18,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  thumbActiveRing: {
    padding: 3,
    borderRadius: 21,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
    marginTop: 20,
  },
  titleCol: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 22,
    letterSpacing: -0.4,
    lineHeight: 22 * 1.15,
    color: neutral.white,
  },
  titleMeta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  sellerRowLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
  },
  priceCol: {
    alignItems: 'flex-end',
    gap: 3,
  },
  priceLabel: {
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.45)',
  },
  price: {
    fontSize: 20,
  },
  specGrid: {
    gap: 10,
    marginTop: 18,
  },
  specRow: {
    flexDirection: 'row',
    gap: 10,
  },
  specCell: {
    flex: 1,
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  specLabel: {
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.45)',
  },
  specValue: {
    fontSize: 14,
    color: neutral.white,
  },
  tabs: {
    marginTop: 18,
  },
  panel: {
    marginTop: 12,
    padding: 16,
  },
  aboutText: {
    fontSize: 13,
    lineHeight: 13 * 1.65,
    color: 'rgba(255,255,255,0.62)',
  },
  detailRows: {
    gap: 11,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 11,
  },
  detailRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  detailLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  detailValue: {
    fontSize: 12,
    color: neutral.white,
  },
  sellerPanelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  sellerAvatar: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerPanelCol: {
    flex: 1,
    gap: 3,
  },
  sellerPanelName: {
    fontSize: 14,
    color: neutral.white,
  },
  sellerPanelMeta: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  certRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    padding: 14,
  },
  certIconTile: {
    width: 38,
    height: 38,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  certTextCol: {
    flex: 1,
    gap: 2,
  },
  certNumber: {
    fontSize: 13,
    color: neutral.white,
  },
  certIssued: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
  },
  similarHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  similarTitle: {
    fontSize: 16,
    letterSpacing: -0.2,
    color: neutral.white,
  },
  similarViewAll: {
    fontSize: 12,
  },
  similarGrid: {
    gap: 12,
    marginTop: 14,
  },
  similarRow: {
    flexDirection: 'row',
    gap: 12,
  },
  similarItem: {
    flex: 1,
  },
  bottomSpacer: {
    height: 150,
  },
  actionBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 28,
  },
  actionBarGlass: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
  },
  actionButton: {
    flex: 1,
    height: 50,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  actionLabel: {
    fontSize: 13,
    color: neutral.white,
  },
})
