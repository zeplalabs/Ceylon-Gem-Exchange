import { gemTones, neutral } from '@ceylon-gems/ui-tokens'
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useMemo } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { GlassSurface, IconButton, ListingCard } from '../components'
import { ChevronLeftIcon, QuerySearchIcon } from '../components/icons'
import { LiveGradientBackground } from '../components/primitives/LiveGradientBackground'
import { useFontFamily } from '../hooks/useFontFamily'
import {
  useListingSearch,
  type ListingSearchParams,
  type SearchHit,
} from '../hooks/useListingSearch'
import { useToggleFavorite } from '../hooks/useToggleFavorite'
import { useTranslation } from '../hooks/useTranslation'
import { usdRateFor } from '../lib/currency'
import { badgeForDetails, specForDetails } from '../lib/listingSpec'
import { featuredListings, type Listing } from '../lib/listings'
import { useCurrency } from '../providers/CurrencyProvider'
import { useFavorites } from '../providers/FavoritesProvider'
import { useGemTone } from '../providers/GemToneProvider'

const PAD = 22
const GRID_GAP = 12

function csv(value: string | undefined) {
  return value ? value.split(',').filter(Boolean) : undefined
}

// Two independent sources feed this one grid screen:
//
// - Legacy/static: Saved Searches' "View results" card (`app/
//   saved-searches.tsx`, itself still a local, unwired demo screen — see
//   docs/remaining-work.md) passes `ids`, a hand-curated set of
//   `lib/listings.ts` fixture ids. Unchanged from before this screen had
//   any real-search path.
// - Real: Home's search bar/filter sheet (`buildSearchResultsHref`) passes
//   `q`/`species`/`shape`/`origin`/`certAuthority`/`maxPriceCents` —
//   exactly `useListingSearch`'s own param names, straight off the
//   querystring — and this becomes a real, paginated `GET /search` results
//   page (`onEndReached` loads more while `found` hits remain).
//
// `ids` takes priority if somehow both are present (shouldn't happen —
// the two call sites are disjoint), since it's the more specific request.
export default function SearchResultsScreen() {
  const t = useTranslation()
  const fonts = useFontFamily()
  const router = useRouter()
  const { gemTone } = useGemTone()
  const tone = gemTones[gemTone]
  const { currencies } = useCurrency()
  const params = useLocalSearchParams<{
    name?: string
    ids?: string
    q?: string
    species?: string
    shape?: string
    origin?: string
    certAuthority?: string
    maxPriceCents?: string
  }>()
  const { likedIds } = useFavorites()
  const toggleLike = useToggleFavorite()

  function goBack() {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/')
    }
  }

  const isLegacyStatic = Boolean(params.ids)
  const matchIds = useMemo(() => new Set(csv(params.ids) ?? []), [params.ids])
  const staticResults = useMemo(
    () => featuredListings.filter((item) => matchIds.has(item.id)),
    [matchIds],
  )

  const searchParams = useMemo<ListingSearchParams>(
    () => ({
      q: params.q,
      species: csv(params.species),
      shape: csv(params.shape),
      origin: csv(params.origin),
      certAuthority: csv(params.certAuthority),
      maxPriceCents: params.maxPriceCents ? Number.parseInt(params.maxPriceCents, 10) : undefined,
      perPage: 20,
      enabled: !isLegacyStatic,
    }),
    [
      isLegacyStatic,
      params.q,
      params.species,
      params.shape,
      params.origin,
      params.certAuthority,
      params.maxPriceCents,
    ],
  )
  const {
    hits,
    found,
    loading: searchLoading,
    loadingMore,
    error: searchError,
    loadMore,
  } = useListingSearch(searchParams)

  const navTitle = params.name ?? (params.q ? `"${params.q}"` : t.searchResults.title)

  const staticRenderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Listing>) => (
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
          liked={likedIds.has(item.id)}
          onToggleLike={() => toggleLike(item.id)}
          onPress={() => router.push(`/listing/${item.id}`)}
        />
      </View>
    ),
    [likedIds, toggleLike, router],
  )

  const realRenderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<SearchHit>) => (
      <View
        style={[
          styles.gridItem,
          index % 2 === 0 ? { paddingRight: GRID_GAP / 2 } : { paddingLeft: GRID_GAP / 2 },
        ]}
      >
        <ListingCard
          name={item.title}
          spec={specForDetails(item.type, item)}
          priceUsd={item.priceAmountCents / 100 / usdRateFor(currencies, item.priceCurrency)}
          badge={badgeForDetails(item.type, item)}
          liked={likedIds.has(item.id)}
          onToggleLike={() => toggleLike(item.id)}
          onPress={() => router.push(`/listing/${item.id}`)}
        />
      </View>
    ),
    [likedIds, toggleLike, router, currencies],
  )

  const isEmpty = isLegacyStatic
    ? staticResults.length === 0
    : !searchLoading && !searchError && found === 0

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
            {navTitle}
          </Text>
          <View style={styles.navSpacer} />
        </View>

        {!isLegacyStatic && !isEmpty ? (
          <Text style={[styles.resultsCount, { fontFamily: fonts.semibold }]}>
            {t.searchResults.resultsCount.replace('{{count}}', String(found))}
          </Text>
        ) : null}

        {isEmpty ? (
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
                <QuerySearchIcon size={20} color={tone.ink} strokeWidth={1.7} />
              </View>
              <Text style={[styles.emptyTitle, { fontFamily: fonts.extrabold }]}>
                {t.searchResults.emptyTitle}
              </Text>
              <Text style={[styles.emptySubtitle, { fontFamily: fonts.medium }]}>
                {t.searchResults.emptySubtitle}
              </Text>
            </GlassSurface>
          </View>
        ) : isLegacyStatic ? (
          <FlashList
            data={staticResults}
            keyExtractor={(item) => item.id}
            numColumns={2}
            renderItem={staticRenderItem}
            contentContainerStyle={styles.listContent}
          />
        ) : searchLoading ? (
          <ActivityIndicator color={neutral.white} style={styles.loadingSpacer} />
        ) : searchError ? (
          <Text style={styles.emptyListText}>{t.common.genericError}</Text>
        ) : (
          <FlashList
            data={hits}
            keyExtractor={(item) => item.id}
            numColumns={2}
            renderItem={realRenderItem}
            contentContainerStyle={styles.listContent}
            onEndReachedThreshold={0.4}
            onEndReached={loadMore}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator color={neutral.white} style={styles.loadingSpacer} />
              ) : null
            }
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
  resultsCount: {
    textAlign: 'center',
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 6,
  },
  listContent: {
    paddingHorizontal: PAD,
    paddingTop: 4,
    paddingBottom: 32,
  },
  loadingSpacer: {
    marginTop: 40,
  },
  emptyListText: {
    marginTop: 40,
    textAlign: 'center',
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
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
