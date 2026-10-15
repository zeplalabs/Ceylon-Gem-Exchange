import { useAuth } from '@clerk/expo'
import { gemTones, neutral } from '@ceylon-gems/ui-tokens'
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { GlassSurface, IconButton, ListingCard } from '../components'
import { ChevronLeftIcon, HeartIcon } from '../components/icons'
import { LiveGradientBackground } from '../components/primitives/LiveGradientBackground'
import { useFontFamily } from '../hooks/useFontFamily'
import { useToggleFavorite } from '../hooks/useToggleFavorite'
import { useTranslation } from '../hooks/useTranslation'
import { API_URL } from '../lib/apiUrl'
import { featuredListings } from '../lib/listings'
import { specForDetails, type ListingSpecDetails } from '../lib/listingSpec'
import { useCurrency } from '../providers/CurrencyProvider'
import { useFavorites } from '../providers/FavoritesProvider'
import { useGemTone } from '../providers/GemToneProvider'

const PAD = 22
const GRID_GAP = 12

interface RealFavoriteListing {
  id: string
  type: 'gem' | 'equipment'
  title: string
  status: 'draft' | 'pending_review' | 'active' | 'paused' | 'expired' | 'sold' | 'removed'
  priceAmountCents: number
  priceCurrency: string
  details: ListingSpecDetails | null
}

// A card shape every source (real API row or static fixture) gets mapped
// into, so `renderItem` below never has to branch — identical to
// `Listing` (lib/listings.ts) by design.
interface FavouriteCard {
  id: string
  name: string
  spec: string
  priceUsd: number
  badge: string
}

function statusBadge(status: RealFavoriteListing['status']) {
  if (status === 'sold') return 'Sold'
  if (status === 'expired') return 'Expired'
  if (status === 'paused') return 'Paused'
  return null
}

function realToCard(
  listing: RealFavoriteListing,
  usdRate: (currencyCode: string) => number,
): FavouriteCard {
  const typeBadge =
    listing.type === 'gem'
      ? (listing.details?.species ?? 'Gem')
      : (listing.details?.equipmentType ?? 'Equipment')
  return {
    id: listing.id,
    name: listing.title,
    spec: specForDetails(listing.type, listing.details),
    priceUsd: listing.priceAmountCents / 100 / usdRate(listing.priceCurrency),
    badge: statusBadge(listing.status) ?? typeBadge,
  }
}

// Reached from Profile's "Favourites" row (and Home/Chats/Profile's
// BottomNavBar "Saved" tab). Per explicit product direction, this is the
// same "home page item view" as app/all-listings.tsx — same ListingCard
// grid, same component. Real favorites now come from `GET /favorites`
// (joined with gem/equipment details, same shape `GET /listings/mine`
// uses — see favorites.controller.ts); everything the shared
// FavoritesProvider holds that *isn't* a real listing id (i.e. a static
// fixture card liked on Home/All Listings/Search Results/Listing Detail,
// none of which have a real backend row to persist to) is rendered
// alongside it via `getListingDetail`'s fixture catalog, so "every heart
// tap, anywhere" ends up here regardless of which kind of card it was.
// Unliking a card here removes it from the list outright (unlike Home/All
// Listings, where unliking just dims the heart) — for a real listing that
// also fires the real `DELETE /listings/:id/favorite` (via
// useToggleFavorite); for a fixture one it's local-only, same as it always
// was.
export default function FavouritesScreen() {
  const t = useTranslation()
  const fonts = useFontFamily()
  const router = useRouter()
  const { gemTone } = useGemTone()
  const tone = gemTones[gemTone]
  const { isSignedIn, getToken } = useAuth()
  const { likedIds } = useFavorites()
  const { currencies } = useCurrency()
  const toggleFavorite = useToggleFavorite()
  const [realFavorites, setRealFavorites] = useState<RealFavoriteListing[]>([])

  useEffect(() => {
    if (!isSignedIn) {
      setRealFavorites([])
      return
    }
    let cancelled = false
    async function load() {
      try {
        const token = await getToken()
        if (!token || cancelled) return
        const res = await fetch(`${API_URL}/favorites`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok || cancelled) return
        setRealFavorites((await res.json()) as RealFavoriteListing[])
      } catch {
        // Leave whatever's already shown — a pull-to-refresh equivalent
        // isn't wired here yet, so the next visit to this screen retries.
      }
    }
    void load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn])

  function usdRate(currencyCode: string) {
    return currencies?.find((c) => c.code === currencyCode)?.usdRate ?? 1
  }

  function goBack() {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/profile')
    }
  }

  const handleUnlike = useCallback(
    (id: string) => {
      void toggleFavorite(id)
      setRealFavorites((prev) => prev.filter((item) => item.id !== id))
    },
    [toggleFavorite],
  )

  const fixtureCards: FavouriteCard[] = featuredListings
    .filter((item) => likedIds.has(item.id))
    .map((item) => ({
      id: item.id,
      name: item.name,
      spec: item.spec,
      badge: item.badge,
      priceUsd: item.priceUsd,
    }))
  const realCards = realFavorites.map((item) => realToCard(item, usdRate))
  const favourited = [...realCards, ...fixtureCards]

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<FavouriteCard>) => (
      <View
        style={[
          styles.gridItem,
          index % 2 === 0 ? { paddingRight: GRID_GAP / 2 } : { paddingLeft: GRID_GAP / 2 },
        ]}
      >
        <ListingCard
          name={item.name}
          spec={item.spec}
          priceUsd={item.priceUsd}
          badge={item.badge}
          liked
          onToggleLike={() => handleUnlike(item.id)}
          onPress={() => router.push(`/listing/${item.id}`)}
        />
      </View>
    ),
    [handleUnlike, router],
  )

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
          <Text style={[styles.navTitle, { fontFamily: fonts.extrabold }]} numberOfLines={1}>
            {t.profile.favourites}
          </Text>
          <View style={styles.navSpacer} />
        </View>

        {favourited.length === 0 ? (
          <View style={styles.emptyWrap}>
            <GlassSurface clarity={55} radius={24} style={styles.emptyPanel}>
              <View
                style={[
                  styles.emptyIconTile,
                  {
                    backgroundColor: `rgba(${tone.rim},0.13)`,
                    borderColor: `rgba(${tone.rim},0.26)`,
                  },
                ]}
              >
                <HeartIcon size={22} color={tone.ink} />
              </View>
              <Text style={[styles.emptyTitle, { fontFamily: fonts.extrabold }]}>
                {t.favourites.emptyTitle}
              </Text>
              <Text style={[styles.emptySubtitle, { fontFamily: fonts.medium }]}>
                {t.favourites.emptySubtitle}
              </Text>
            </GlassSurface>
          </View>
        ) : (
          <FlashList
            data={favourited}
            keyExtractor={(item) => item.id}
            numColumns={2}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
          />
        )}
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
    gap: 10,
    paddingTop: 10,
    paddingHorizontal: PAD,
    paddingBottom: 8,
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    letterSpacing: -0.2,
    color: neutral.white,
  },
  navSpacer: {
    width: 40,
  },
  listContent: {
    paddingHorizontal: PAD,
    paddingTop: 4,
    paddingBottom: 32,
  },
  gridItem: {
    flex: 1,
    paddingBottom: GRID_GAP,
  },
  emptyWrap: {
    flex: 1,
    paddingHorizontal: PAD,
  },
  emptyPanel: {
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  emptyIconTile: {
    width: 56,
    height: 56,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    color: neutral.white,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18.6,
    color: 'rgba(255,255,255,0.5)',
  },
})
