import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { IconButton, ListingCard } from '../../components'
import { ChevronLeftIcon } from '../../components/icons'
import { LiveGradientBackground } from '../../components/primitives/LiveGradientBackground'
import { useFontFamily } from '../../hooks/useFontFamily'
import { useTranslation } from '../../hooks/useTranslation'
import { featuredListings, getListingDetail, type Listing } from '../../lib/listings'

const PAD = 22
const GRID_GAP = 12

// Reached by tapping "View all" next to Listing Detail's "Similar
// listings" section — that section itself only ever shows 4 cards; this
// screen is the uncapped list. No "similar" scoring exists yet (no
// search/recommendation backend — see CLAUDE.md's "Current sequencing"),
// so "similar" means the same thing it does on Listing Detail: every
// other `featuredListings` entry besides the one the user came from. No
// like/heart button on these cards, matching Listing Detail's own
// similar-listings grid (the mockup gives that grid no like affordance).
export default function SimilarListingsScreen() {
  const t = useTranslation()
  const fonts = useFontFamily()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const listing = getListingDetail(id)
  const similar = listing ? featuredListings.filter((item) => item.id !== listing.id) : []

  function goBack() {
    if (router.canGoBack()) {
      router.back()
    } else if (listing) {
      router.replace(`/listing/${listing.id}`)
    } else {
      router.replace('/')
    }
  }

  const renderItem = useCallback(
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
          onPress={() => router.push(`/listing/${item.id}`)}
        />
      </View>
    ),
    [router],
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
            {t.listingDetail.similarListings}
          </Text>
          <View style={styles.navSpacer} />
        </View>

        <FlashList
          data={similar}
          keyExtractor={(item) => item.id}
          numColumns={2}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
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
    color: '#fff',
  },
  // Balances the back button's width so the title stays visually centered
  // — same technique as Listing Detail's own nav row (whose balancing
  // element is the favorite-toggle button rather than an empty spacer,
  // but there's no equivalent real action to put here).
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
})
