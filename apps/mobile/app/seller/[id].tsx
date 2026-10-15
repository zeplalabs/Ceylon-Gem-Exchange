import { useAuth } from '@clerk/expo'
import { gemTones, neutral } from '@ceylon-gems/ui-tokens'
import * as Linking from 'expo-linking'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, ScrollView, Share, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Avatar,
  Button,
  Chip,
  GhostButton,
  GlassSurface,
  IconButton,
  ListingCard,
  SearchBar,
} from '../../components'
import {
  CallIcon,
  ChevronLeftIcon,
  GemIcon,
  HeartIcon,
  PinIcon,
  SendIcon,
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
  listings: RealListingRow[]
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
    listings: data.listings.map((row) => ({
      id: row.id,
      name: row.title,
      spec: specForDetails(row.type, row.details),
      priceUsd: row.priceAmountCents / 100 / usdRate(row.priceCurrency),
      category:
        row.type === 'gem'
          ? (row.details?.species ?? 'Gem')
          : (row.details?.equipmentType ?? 'Equipment'),
    })),
    // No real photo backend exists yet — omitted rather than showing a
    // fabricated "See all N" gallery, same reasoning stores.tsx's own
    // comment gives for the same gap.
    galleryLabels: null,
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
  }
}

// Reached from Listing Detail's Seller tab and from stores.tsx's directory
// cards. Ports "Ceylon Gem Exchange Storefront.html" — replaces this
// screen's earlier tabbed Listings/Reviews/About layout with a single
// scroll: cover photo, logo + name + rating line, an address/contact card
// (Directions/Chat/Call), a demo-only "Shop gallery" row, then a
// search-in-shop + category-chip + sort row over the seller's own stone
// grid. Same dual real/static path as before (chat/[id].tsx's convention):
// a real seller uuid hits `GET /sellers/:id` (now also joined with gem/
// equipment details, same as GET /listings/mine — see seller-profile.
// controller.ts's own comment), every current entry point otherwise
// passes one of lib/listings.ts's synthetic `s-*` static-fixture ids.
// Rating/reviews/hours/gallery photos stay fixed demo trim on the static
// path only — a real seller shows "—"/omits those sections instead of
// fabricating them, same honesty bar every other real-data screen in this
// app holds to.
export default function SellerProfileScreen() {
  const t = useTranslation()
  const fonts = useFontFamily()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { gemTone } = useGemTone()
  const tone = gemTones[gemTone]
  const { getToken } = useAuth()
  const { currencies } = useCurrency()
  const isRealSeller = isRealId(id)

  const [realSummary, setRealSummary] = useState<StorefrontSummary | null>(null)
  const [loading, setLoading] = useState(isRealSeller)
  const [favourited, setFavourited] = useState(false)
  const [revealingPhone, setRevealingPhone] = useState(false)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)

  function usdRate(currencyCode: string) {
    return currencies?.find((c) => c.code === currencyCode)?.usdRate ?? 1
  }

  const summary = isRealSeller ? realSummary : id ? summaryFromStatic(id) : null
  const firstListingId = summary?.listings[0]?.id

  async function callSeller() {
    if (!firstListingId) return
    if (!isRealSeller) {
      const detail = getListingDetail(firstListingId)
      if (detail?.sellerPhone) Linking.openURL(`tel:${detail.sellerPhone}`).catch(() => {})
      return
    }
    if (revealingPhone) return
    setPhoneError(null)
    setRevealingPhone(true)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not signed in')
      const res = await fetch(`${API_URL}/listings/${firstListingId}/reveal-phone`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => null)
        throw new Error(errBody?.message ?? `Couldn't get the seller's number (${res.status})`)
      }
      const data = (await res.json()) as { phone: string | null }
      if (!data.phone) throw new Error("This seller hasn't added a phone number yet")
      Linking.openURL(`tel:${data.phone}`).catch(() => {})
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
            <View style={styles.navActions}>
              <IconButton
                icon={
                  <HeartIcon
                    size={16}
                    filled={favourited}
                    color={favourited ? tone.accent : '#fff'}
                  />
                }
                onPress={() => setFavourited((v) => !v)}
                accessibilityLabel={t.sellerProfile.favouriteSeller}
                size={40}
                radius={14}
              />
              <IconButton
                icon={<ShareIcon />}
                onPress={shareStore}
                accessibilityLabel={t.sellerProfile.shareLabel}
                size={40}
                radius={14}
              />
            </View>
          </View>

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
              badge="verified"
              accessibilityLabel={summary.name}
              style={styles.avatar}
            />
            <View style={styles.identityText}>
              <Text style={[styles.name, { fontFamily: fonts.extrabold }]} numberOfLines={2}>
                {summary.name}
              </Text>
              <Text style={[styles.ratingLine, { fontFamily: fonts.bold }]}>
                {summary.rating > 0
                  ? `${summary.rating.toFixed(1)} ★ · ${summary.reviewCount ?? 0} ${t.sellerProfile.reviewsSuffix} · ${summary.lotsSold} ${t.sellerProfile.soldSuffix}`
                  : `${summary.lotsSold} ${t.sellerProfile.soldSuffix}`}
              </Text>
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
                icon={<SendIcon size={15} color={neutral.white} strokeWidth={1.9} />}
                style={styles.ctaFlex}
              />
              <GhostButton
                label={t.sellerProfile.chat}
                onPress={() => firstListingId && router.push(`/chat/${firstListingId}`)}
                disabled={!firstListingId}
                style={styles.ctaFlex}
              />
              <IconButton
                icon={<CallIcon size={17} color={tone.ink} strokeWidth={1.8} />}
                onPress={callSeller}
                disabled={!firstListingId || revealingPhone}
                accessibilityLabel={t.listingDetail.callSeller}
                size={48}
                radius={24}
              />
            </View>
          </GlassSurface>

          {phoneError ? (
            <Text style={[styles.phoneError, { fontFamily: fonts.semibold }]}>{phoneError}</Text>
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
                      style={[styles.galleryLabel, { fontFamily: fonts.bold, color: tone.accent }]}
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

          {categories.length > 0 ? (
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
  avatar: {
    borderWidth: 3,
    borderColor: 'rgba(6,14,28,0.9)',
    borderRadius: 42,
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
    gap: 8,
  },
  ctaFlex: {
    flex: 1,
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
})
