import { useAuth } from '@clerk/expo'
import { gemTones, neutral, radii } from '@ceylon-gems/ui-tokens'
import * as Linking from 'expo-linking'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, ScrollView, Share, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Avatar,
  Button,
  Chip,
  GlassSurface,
  IconButton,
  ListingCard,
  PressableScale,
  SearchBar,
} from '../../components'
import {
  CallIcon,
  ChatIcon,
  ChevronLeftIcon,
  GemIcon,
  NavigationIcon,
  PinIcon,
  ShareIcon,
} from '../../components/icons'
import { LiveGradientBackground } from '../../components/primitives/LiveGradientBackground'
import { useFontFamily } from '../../hooks/useFontFamily'
import { useTranslation } from '../../hooks/useTranslation'
import { API_URL } from '../../lib/apiUrl'
import { isRealId } from '../../lib/ids'
import { getListingDetail, getSellerProfile } from '../../lib/listings'
import { specForDetails, type ListingSpecDetails } from '../../lib/listingSpec'
import { useCurrency } from '../../providers/CurrencyProvider'
import { useGemTone } from '../../providers/GemToneProvider'

interface StoreListingCard {
  id: string
  name: string
  spec: string
  priceUsd: number
  /** Real species/equipment-type for a real seller's listing, used to build the category chip row below — '' for a static fixture listing (no species taxonomy on that fixture shape), which just means it never contributes a sub-chip beyond "All". */
  category: string
}

interface StorefrontSummary {
  id: string
  name: string
  address: string
  /** Static-fixture-only trim (`profile.hours`) — no hours column exists on `users` yet, see RealSellerResponse's own comment. */
  hours: string | null
  rating: number
  reviewCount: number | null
  lotsSold: number
  listings: StoreListingCard[]
  galleryLabels: string[] | null
  /** `shopName` present (real) or always true (every current static fixture is a shop) — the one flag that decides which of the two screen layouts renders. See this file's own top comment. */
  hasStorefront: boolean
  /** Real `users.phoneVerifiedAt` presence — the individual-seller Profile's only real "Verified" badge (no ID-verification system exists, so there's no real "Verified ID" to show next to it). Always true on the static path — harmless, since every static fixture seller has `hasStorefront: true` and never reaches the Profile branch that reads this. */
  phoneVerified: boolean
  /** The individual-seller Profile's "Previously sold" grid. Always empty on the static path — no fixture seller has ever needed sold-item history, since all 7 directory fixtures are shops (`hasStorefront: true`) and never render it. */
  soldListings: StoreListingCard[]
  /** Year only — the Profile layout's "Member since {{year}}" line. Real: `users.createdAt`'s year. Static: `profile.since`, already a year string. */
  since: string
  /** The Profile layout's About section — real `users.bio`, or the static fixture's own `bio`. Omitted from the Storefront layout entirely (that mockup has no About/bio section at all). */
  bio: string
}

interface RealListingRow {
  id: string
  title: string
  type: 'gem' | 'equipment'
  priceAmountCents: number
  priceCurrency: string
  details: ListingSpecDetails | null
}

interface RealSellerResponse {
  id: string
  displayName: string | null
  shopName: string | null
  location: string | null
  bio: string | null
  createdAt: string
  activeListingsCount: number
  lotsSold: number
  phoneVerifiedAt: string | null
  listings: RealListingRow[]
  soldListings: RealListingRow[]
}

function toCard(row: RealListingRow, usdRate: (currencyCode: string) => number): StoreListingCard {
  return {
    id: row.id,
    name: row.title,
    spec: specForDetails(row.type, row.details),
    priceUsd: row.priceAmountCents / 100 / usdRate(row.priceCurrency),
    category:
      row.type === 'gem'
        ? (row.details?.species ?? 'Gem')
        : (row.details?.equipmentType ?? 'Equipment'),
  }
}

function summaryFromReal(
  data: RealSellerResponse,
  usdRate: (currencyCode: string) => number,
): StorefrontSummary {
  return {
    id: data.id,
    name: data.shopName ?? data.displayName ?? '—',
    address: data.location ?? '—',
    // No hours/open-status column exists on `users` yet — omitted rather
    // than fabricated, same reasoning as rating/reviewCount below.
    hours: null,
    rating: 0,
    reviewCount: null,
    lotsSold: data.lotsSold,
    listings: data.listings.map((row) => toCard(row, usdRate)),
    // No real photo backend exists yet — omitted rather than showing a
    // fabricated "See all N" gallery, same reasoning stores.tsx's own
    // comment gives for the same gap.
    galleryLabels: null,
    hasStorefront: Boolean(data.shopName),
    phoneVerified: data.phoneVerifiedAt != null,
    soldListings: data.soldListings.map((row) => toCard(row, usdRate)),
    since: String(new Date(data.createdAt).getFullYear()),
    bio: data.bio ?? '',
  }
}

function summaryFromStatic(id: string): StorefrontSummary | null {
  const profile = getSellerProfile(id)
  if (!profile) return null
  return {
    id: profile.id,
    name: profile.name,
    address: profile.office,
    hours: profile.hours,
    rating: profile.rating,
    reviewCount: profile.reviewCount ?? null,
    lotsSold: profile.lotsSold,
    listings: profile.listingIds
      .map((listingId) => getListingDetail(listingId))
      .filter((listing): listing is NonNullable<typeof listing> => listing !== undefined)
      .map((listing) => ({
        id: listing.id,
        name: listing.name,
        spec: listing.spec,
        priceUsd: listing.priceUsd,
        category: '',
      })),
    galleryLabels: profile.galleryLabels ?? null,
    hasStorefront: true,
    phoneVerified: true,
    soldListings: [],
    since: profile.since,
    bio: profile.bio,
  }
}

// Reached from Listing Detail's Seller tab (which also passes
// `?fromListingId=` — the listing the buyer was actually looking at, so
// Message/Call key off that specific listing rather than an arbitrary
// "first" one) and from stores.tsx's directory cards (no listing in
// context there, so `keyListingId` below falls back to the seller's own
// first active listing). One route, two entirely different layouts,
// picked by `summary.hasStorefront` (== real `users.shopName` presence,
// always true on the static path — see that flag's own doc comment):
//
// - Storefront ("Ceylon Gem Exchange Storefront.html") — cover photo,
//   logo + name + rating line, an address/contact card (Directions/Chat/
//   Call), a demo-only "Shop gallery" row, then a search-in-shop +
//   category-chip + sort row over the seller's own active stone grid.
// - Profile ("Ceylon Gem Exchange User Profile.html") — for a seller with
//   no shop identity (most real signups today, since `shopName` is an
//   optional Edit Profile field): a centered nav title, a plain avatar
//   (no cover photo), name/location/member-since, a real "Phone verified"
//   badge (no fake "Verified ID" — no identity-verification system
//   exists), a 2-cell rating/items-sold stat card (no fabricated reply
//   time), Message/Call, an About bio, a 2-row details card (account
//   type, phone status), and a real "Previously sold" grid (`soldListings`
//   — status='sold', not the Storefront's active-stone grid). The
//   mockup's own rating histogram + individual review cards are entirely
//   skipped, not approximated — no review system exists anywhere in this
//   schema (see docs/remaining-work.md's "Review system" item), and this
//   screen already holds the line of omitting a section rather than
//   fabricating one elsewhere on this exact screen (rating/hours/gallery).
//
// Same dual real/static path as before (chat/[id].tsx's convention): a
// real seller uuid hits `GET /sellers/:id` (joined with gem/equipment
// details on both its active and sold listings — same pattern as GET
// /listings/mine — see seller-profile.controller.ts's own comment), every
// current entry point otherwise passes one of lib/listings.ts's synthetic
// `s-*` static-fixture ids (all 7 of which are shops, so only ever
// exercise the Storefront branch — the Profile branch is real-seller-only
// today).
export default function SellerProfileScreen() {
  const t = useTranslation()
  const fonts = useFontFamily()
  const router = useRouter()
  const { id, fromListingId } = useLocalSearchParams<{ id: string; fromListingId?: string }>()
  const { gemTone } = useGemTone()
  const tone = gemTones[gemTone]
  const { getToken } = useAuth()
  const { currencies } = useCurrency()
  const isRealSeller = isRealId(id)

  const [realSummary, setRealSummary] = useState<StorefrontSummary | null>(null)
  const [loading, setLoading] = useState(isRealSeller)
  const [revealingPhone, setRevealingPhone] = useState(false)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)

  function usdRate(currencyCode: string) {
    return currencies?.find((c) => c.code === currencyCode)?.usdRate ?? 1
  }

  const summary = isRealSeller ? realSummary : id ? summaryFromStatic(id) : null
  // The listing the buyer was actually viewing on Listing Detail's Seller
  // tab, when that's how they got here — more correct than always keying
  // Message/Call off "whatever this seller's first active listing
  // happens to be" (stores.tsx's directory cards have no such listing in
  // context, so they fall back to that).
  const keyListingId = fromListingId ?? summary?.listings[0]?.id

  // `tel:` fails on the iOS Simulator (no Phone app/cellular capability —
  // real-device-only, same as every other calling feature) and on any
  // device with no calling capability at all (e.g. an iPad). Previously
  // swallowed silently (`.catch(() => {})`), which is indistinguishable
  // from the button doing nothing at all — now surfaced through the same
  // `phoneError` banner the reveal-phone network call already uses.
  function dial(phone: string) {
    Linking.openURL(`tel:${phone}`).catch(() => setPhoneError(t.listingDetail.callNotSupported))
  }

  async function callSeller() {
    if (!keyListingId) return
    if (!isRealSeller) {
      const detail = getListingDetail(keyListingId)
      if (detail?.sellerPhone) dial(detail.sellerPhone)
      return
    }
    if (revealingPhone) return
    setPhoneError(null)
    setRevealingPhone(true)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not signed in')
      const res = await fetch(`${API_URL}/listings/${keyListingId}/reveal-phone`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => null)
        throw new Error(errBody?.message ?? `Couldn't get the seller's number (${res.status})`)
      }
      const data = (await res.json()) as { phone: string | null }
      if (!data.phone) throw new Error("This seller hasn't added a phone number yet")
      dial(data.phone)
    } catch (err) {
      setPhoneError(err instanceof Error && err.message ? err.message : t.common.genericError)
    } finally {
      setRevealingPhone(false)
    }
  }

  function openDirections() {
    if (!summary?.address || summary.address === '—') return
    Linking.openURL(`https://maps.apple.com/?q=${encodeURIComponent(summary.address)}`).catch(
      () => {},
    )
  }

  function shareStore() {
    if (!summary) return
    Share.share({
      message: `${summary.name} on Ceylon Gem Exchange — ceylongems://seller/${summary.id}`,
    }).catch(() => {})
  }

  useEffect(() => {
    if (!isRealSeller || !id) return
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`${API_URL}/sellers/${id}`)
        if (!res.ok || cancelled) return
        setRealSummary(summaryFromReal((await res.json()) as RealSellerResponse, usdRate))
      } catch {
        // Leave `realSummary` null — renders the not-found state below.
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
    // `currencies`/`usdRate` deliberately excluded — this only needs to
    // refetch when the id itself changes, same reasoning edit-profile.tsx
    // excludes `getToken` for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isRealSeller])

  function goBack() {
    if (router.canGoBack()) router.back()
    else router.replace('/home')
  }

  function initialsFor(name: string) {
    return name
      .split(/\s+/)
      .map((word) => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }

  const categories = useMemo(() => {
    if (!summary || !isRealSeller) return []
    const counts = new Map<string, number>()
    for (const listing of summary.listings) {
      if (!listing.category) continue
      counts.set(listing.category, (counts.get(listing.category) ?? 0) + 1)
    }
    return Array.from(counts.entries())
  }, [summary, isRealSeller])

  const filteredListings = useMemo(() => {
    if (!summary) return []
    const q = query.trim().toLowerCase()
    return summary.listings.filter((listing) => {
      if (category && listing.category !== category) return false
      if (q && !listing.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [summary, query, category])

  if (!summary) {
    return (
      <LiveGradientBackground>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <View style={styles.navRow}>
            <IconButton
              icon={<ChevronLeftIcon />}
              accessibilityLabel={t.common.back}
              onPress={goBack}
              size={40}
              radius={14}
            />
            <View style={styles.navSpacer} />
          </View>
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={neutral.white} />
            </View>
          ) : null}
        </SafeAreaView>
      </LiveGradientBackground>
    )
  }

  return (
    <LiveGradientBackground>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.navRow}>
            <IconButton
              icon={<ChevronLeftIcon />}
              accessibilityLabel={t.common.back}
              onPress={goBack}
              size={40}
              radius={14}
            />
            {!summary.hasStorefront ? (
              <Text style={[styles.navTitle, { fontFamily: fonts.extrabold }]} numberOfLines={1}>
                {t.sellerProfile.profileTitle}
              </Text>
            ) : null}
            <View style={styles.navActions}>
              <IconButton
                icon={<ShareIcon />}
                onPress={shareStore}
                accessibilityLabel={t.sellerProfile.shareLabel}
                size={40}
                radius={14}
              />
            </View>
          </View>

          {summary.hasStorefront ? (
            <>
              <View
                style={styles.coverArea}
                accessible
                accessibilityLabel={t.sellerProfile.coverPhotoLabel}
              >
                <GemIcon size={30} ink="rgba(255,255,255,0.25)" inkSoft="rgba(255,255,255,0.15)" />
              </View>

              <View style={styles.identityRow}>
                <Avatar
                  initials={initialsFor(summary.name)}
                  size={84}
                  accessibilityLabel={summary.name}
                />
                <View style={styles.identityText}>
                  <Text style={[styles.name, { fontFamily: fonts.extrabold }]} numberOfLines={2}>
                    {summary.name}
                  </Text>
                  {summary.rating > 0 ? (
                    <Text style={[styles.ratingLine, { fontFamily: fonts.bold }]}>
                      {`${summary.rating.toFixed(1)} ★ · ${summary.reviewCount ?? 0} ${t.sellerProfile.reviewsSuffix}`}
                    </Text>
                  ) : null}
                </View>
              </View>

              <GlassSurface clarity={55} rim={tone.rim} radius={18} style={styles.addressCard}>
                <View style={styles.addressRow}>
                  <PinIcon size={15} color={tone.accent} strokeWidth={1.8} />
                  <View style={styles.addressTextWrap}>
                    <Text style={[styles.addressLine, { fontFamily: fonts.bold }]}>
                      {summary.address}
                    </Text>
                    {summary.hours ? (
                      <Text style={[styles.hoursLine, { fontFamily: fonts.semibold }]}>
                        {summary.hours}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.ctaRow}>
                  <Button
                    label={t.sellerProfile.directions}
                    onPress={openDirections}
                    disabled={summary.address === '—'}
                    icon={<NavigationIcon size={15} color={neutral.white} strokeWidth={1.8} />}
                    style={styles.ctaFlex}
                  />
                  <PressableScale
                    onPress={() => keyListingId && router.push(`/chat/${keyListingId}`)}
                    disabled={!keyListingId}
                    accessibilityLabel={t.sellerProfile.chatWithSeller}
                    style={styles.ctaFlex}
                  >
                    <GlassSurface
                      clarity={45}
                      rim={tone.rim}
                      radius={radii.full}
                      style={styles.chatPill}
                    >
                      <ChatIcon size={15} color={neutral.white} strokeWidth={1.8} />
                      <Text style={[styles.chatLabel, { fontFamily: fonts.medium }]}>
                        {t.sellerProfile.chat}
                      </Text>
                    </GlassSurface>
                  </PressableScale>
                  <IconButton
                    icon={<CallIcon size={17} color={tone.ink} strokeWidth={1.8} />}
                    onPress={callSeller}
                    disabled={!keyListingId || revealingPhone}
                    accessibilityLabel={t.listingDetail.callSeller}
                    size={48}
                    radius={24}
                  />
                </View>
              </GlassSurface>

              {phoneError ? (
                <Text style={[styles.phoneError, { fontFamily: fonts.semibold }]}>
                  {phoneError}
                </Text>
              ) : null}

              {summary.galleryLabels ? (
                <View style={styles.gallerySection}>
                  <Text style={[styles.sectionTitle, { fontFamily: fonts.extrabold }]}>
                    {t.sellerProfile.galleryTitle}
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.galleryRow}
                  >
                    {summary.galleryLabels.map((label) => (
                      <GlassSurface key={label} clarity={45} radius={16} style={styles.galleryTile}>
                        <GemIcon
                          size={20}
                          ink="rgba(255,255,255,0.25)"
                          inkSoft="rgba(255,255,255,0.15)"
                        />
                        <Text
                          style={[
                            styles.galleryLabel,
                            { fontFamily: fonts.bold, color: tone.accent },
                          ]}
                          numberOfLines={2}
                        >
                          {label}
                        </Text>
                      </GlassSurface>
                    ))}
                  </ScrollView>
                </View>
              ) : null}

              <SearchBar
                value={query}
                onChangeText={setQuery}
                placeholder={`${t.sellerProfile.searchInPrefix} ${summary.name}`}
                radius={18}
                style={styles.searchField}
              />

              {summary.listings.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsRow}
                >
                  <Chip
                    label={`${t.sellerProfile.allChipLabel} · ${summary.listings.length}`}
                    selected={category === null}
                    onPress={() => setCategory(null)}
                  />
                  {categories.map(([name, cnt]) => (
                    <Chip
                      key={name}
                      label={`${name} · ${cnt}`}
                      selected={category === name}
                      onPress={() => setCategory(category === name ? null : name)}
                    />
                  ))}
                </ScrollView>
              ) : null}

              <View style={styles.countRow}>
                <Text style={[styles.countText, { fontFamily: fonts.semibold }]}>
                  {filteredListings.length} {t.sellerProfile.stonesSuffix}
                </Text>
                <Text style={[styles.sortText, { fontFamily: fonts.semibold }]}>
                  {t.sellerProfile.sortNewest}
                </Text>
              </View>

              {filteredListings.length === 0 ? (
                <Text style={[styles.emptyText, { fontFamily: fonts.medium }]}>
                  {t.sellerProfile.noListings}
                </Text>
              ) : (
                <View style={styles.listingsGrid}>
                  {filteredListings.map((card, i) => (
                    <View
                      key={card.id}
                      style={[
                        styles.gridItem,
                        i % 2 === 0 ? styles.gridItemLeft : styles.gridItemRight,
                      ]}
                    >
                      <ListingCard
                        name={card.name}
                        spec={card.spec}
                        priceUsd={card.priceUsd}
                        badge={card.category || 'Gem'}
                        onPress={() => router.push(`/listing/${card.id}`)}
                      />
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : (
            <>
              <View style={styles.profileAvatarWrap}>
                <Avatar
                  initials={initialsFor(summary.name)}
                  size={96}
                  accessibilityLabel={summary.name}
                />
              </View>
              <Text style={[styles.profileName, { fontFamily: fonts.extrabold }]}>
                {summary.name}
              </Text>
              <View style={styles.profileLocationRow}>
                <PinIcon size={12} color="rgba(255,255,255,0.5)" strokeWidth={1.8} />
                <Text style={[styles.profileLocationText, { fontFamily: fonts.semibold }]}>
                  {summary.address !== '—' ? `${summary.address} · ` : ''}
                  {t.sellerProfile.memberSince.replace('{{year}}', summary.since)}
                </Text>
              </View>

              {summary.phoneVerified ? (
                <View style={styles.profileBadgeRow}>
                  <View
                    style={[
                      styles.profileBadge,
                      {
                        backgroundColor: `rgba(${tone.rim},0.14)`,
                        borderColor: `rgba(${tone.rim},0.3)`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.profileBadgeLabel,
                        { fontFamily: fonts.bold, color: tone.accent },
                      ]}
                    >
                      {t.sellerProfile.phoneVerifiedBadge}
                    </Text>
                  </View>
                </View>
              ) : null}

              <GlassSurface clarity={55} rim={tone.rim} radius={20} style={styles.profileStatsCard}>
                <View style={styles.statCell}>
                  <Text style={[styles.statValue, { fontFamily: fonts.extrabold }]}>
                    {summary.rating > 0 ? `${summary.rating.toFixed(1)} ★` : '—'}
                  </Text>
                  <Text style={[styles.statLabel, { fontFamily: fonts.bold }]}>
                    {t.sellerProfile.statRating}
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCell}>
                  <Text style={[styles.statValue, { fontFamily: fonts.extrabold }]}>
                    {summary.lotsSold}
                  </Text>
                  <Text style={[styles.statLabel, { fontFamily: fonts.bold }]}>
                    {t.sellerProfile.statItemsSold}
                  </Text>
                </View>
              </GlassSurface>

              <View style={styles.profileCtaRow}>
                <Button
                  label={t.sellerProfile.message}
                  onPress={() => keyListingId && router.push(`/chat/${keyListingId}`)}
                  disabled={!keyListingId}
                  icon={<ChatIcon size={15} color={neutral.white} strokeWidth={1.8} />}
                  style={styles.ctaFlex}
                />
                <IconButton
                  icon={<CallIcon size={17} color={tone.ink} strokeWidth={1.8} />}
                  onPress={callSeller}
                  disabled={!keyListingId || revealingPhone}
                  accessibilityLabel={t.listingDetail.callSeller}
                  size={48}
                  radius={24}
                />
              </View>

              {phoneError ? (
                <Text style={[styles.phoneError, { fontFamily: fonts.semibold }]}>
                  {phoneError}
                </Text>
              ) : null}

              {summary.bio ? (
                <View style={styles.profileSection}>
                  <Text style={[styles.sectionTitle, { fontFamily: fonts.extrabold }]}>
                    {t.sellerProfile.aboutTitle}
                  </Text>
                  <GlassSurface clarity={55} radius={18} style={styles.bioCard}>
                    <Text style={[styles.bioText, { fontFamily: fonts.medium }]}>
                      {summary.bio}
                    </Text>
                  </GlassSurface>
                </View>
              ) : null}

              <View style={styles.profileSection}>
                <GlassSurface clarity={55} radius={18} style={styles.detailCard}>
                  <View style={[styles.detailRow, styles.detailRowDivider]}>
                    <Text style={[styles.detailLabel, { fontFamily: fonts.semibold }]}>
                      {t.sellerProfile.accountTypeLabel}
                    </Text>
                    <Text style={[styles.detailValue, { fontFamily: fonts.bold }]}>
                      {t.sellerProfile.individualLabel}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { fontFamily: fonts.semibold }]}>
                      {t.sellerProfile.phoneLabel}
                    </Text>
                    <Text style={[styles.detailValue, { fontFamily: fonts.bold }]}>
                      {summary.phoneVerified
                        ? t.sellerProfile.verifiedLabel
                        : t.sellerProfile.notVerifiedLabel}
                    </Text>
                  </View>
                </GlassSurface>
              </View>

              {summary.soldListings.length > 0 ? (
                <View style={styles.profileSection}>
                  <Text style={[styles.sectionTitle, { fontFamily: fonts.extrabold }]}>
                    {t.sellerProfile.previouslySoldTitle}
                  </Text>
                  <View style={styles.listingsGrid}>
                    {summary.soldListings.map((card, i) => (
                      <View
                        key={card.id}
                        style={[
                          styles.gridItem,
                          i % 2 === 0 ? styles.gridItemLeft : styles.gridItemRight,
                        ]}
                      >
                        <ListingCard
                          name={card.name}
                          spec={card.spec}
                          priceUsd={card.priceUsd}
                          badge={t.sellerProfile.soldBadge}
                          onPress={() => router.push(`/listing/${card.id}`)}
                        />
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </LiveGradientBackground>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingHorizontal: 22,
    paddingBottom: 10,
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    letterSpacing: -0.2,
    color: neutral.white,
  },
  navActions: {
    flexDirection: 'row',
    gap: 8,
  },
  navSpacer: {
    width: 40,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingBottom: 32,
  },
  coverArea: {
    height: 150,
    marginHorizontal: 22,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
    marginTop: -36,
    paddingHorizontal: 22,
  },
  identityText: {
    flex: 1,
    paddingBottom: 4,
    gap: 4,
  },
  name: {
    fontSize: 21,
    letterSpacing: -0.3,
    color: neutral.white,
  },
  ratingLine: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  addressCard: {
    marginTop: 16,
    marginHorizontal: 22,
    padding: 14,
    gap: 12,
  },
  addressRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addressTextWrap: {
    flex: 1,
    gap: 2,
  },
  addressLine: {
    fontSize: 13,
    color: neutral.white,
  },
  hoursLine: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ctaFlex: {
    flex: 1,
  },
  chatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    paddingHorizontal: 16,
  },
  chatLabel: {
    fontSize: 14,
    color: neutral.white,
  },
  phoneError: {
    marginTop: 10,
    marginHorizontal: 22,
    textAlign: 'center',
    fontSize: 11,
    color: neutral.danger.text,
  },
  gallerySection: {
    marginTop: 22,
  },
  sectionTitle: {
    fontSize: 16,
    color: neutral.white,
    marginHorizontal: 22,
    marginBottom: 10,
  },
  galleryRow: {
    paddingHorizontal: 22,
    gap: 10,
  },
  galleryTile: {
    width: 100,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 6,
  },
  galleryLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  searchField: {
    marginTop: 22,
    marginHorizontal: 22,
  },
  chipsRow: {
    paddingHorizontal: 22,
    gap: 8,
    marginTop: 12,
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 22,
    marginTop: 16,
    marginBottom: 4,
  },
  countText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  sortText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  emptyText: {
    marginTop: 20,
    marginHorizontal: 22,
    textAlign: 'center',
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  listingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    paddingHorizontal: 22,
  },
  gridItem: {
    width: '50%',
    marginBottom: 12,
  },
  gridItemLeft: {
    paddingRight: 6,
  },
  gridItemRight: {
    paddingLeft: 6,
  },
  bottomSpacer: {
    height: 14,
  },
  // Profile layout (no storefront) — distinct from the Storefront styles
  // above, which overlap an avatar on a cover photo this layout doesn't
  // have at all.
  profileAvatarWrap: {
    alignItems: 'center',
    marginTop: 8,
  },
  profileName: {
    marginTop: 14,
    textAlign: 'center',
    fontSize: 21,
    letterSpacing: -0.3,
    color: neutral.white,
  },
  profileLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 4,
    paddingHorizontal: 22,
  },
  profileLocationText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
  },
  profileBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  profileBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  profileBadgeLabel: {
    fontSize: 10,
  },
  profileStatsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginHorizontal: 22,
    paddingVertical: 14,
  },
  // Distinct from the shared `ctaRow` (Storefront's own CTA row sits
  // nested inside `addressCard`, which already insets it via that card's
  // own `marginHorizontal: 22` — adding margin here too would double it).
  // This one isn't nested in anything, so it needs its own inset to line
  // up with `profileStatsCard`/`profileSection` above and below it.
  profileCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    marginHorizontal: 22,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  statValue: {
    fontSize: 16,
    color: neutral.white,
  },
  statLabel: {
    fontSize: 9,
    letterSpacing: 0.4,
    color: 'rgba(255,255,255,0.5)',
  },
  // No `marginHorizontal` here — `sectionTitle` and `listingsGrid` (used
  // for "Previously sold") already carry their own 22px inset, same as
  // every other top-level element on this screen (profileStatsCard,
  // profileCtaRow). Adding a second 22 here doubled it to 44 on anything
  // nested inside, shifting "Previously sold"'s cards (and the About/
  // details cards, and every section title) out of alignment with
  // everything above them.
  profileSection: {
    marginTop: 20,
  },
  bioCard: {
    marginHorizontal: 22,
    padding: 16,
  },
  bioText: {
    fontSize: 13,
    lineHeight: 13 * 1.6,
    color: 'rgba(255,255,255,0.8)',
  },
  detailCard: {
    marginHorizontal: 22,
    paddingHorizontal: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 14,
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
})
