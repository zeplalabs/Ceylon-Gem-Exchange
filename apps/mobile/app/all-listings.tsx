import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list'
import { useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { IconButton, ListingCard } from '../components'
import { ChevronLeftIcon } from '../components/icons'
import { LiveGradientBackground } from '../components/primitives/LiveGradientBackground'
import { useFontFamily } from '../hooks/useFontFamily'
import { useTranslation } from '../hooks/useTranslation'
import { defaultLikedIds, featuredListings, type Listing } from '../lib/listings'

const PAD = 22
const GRID_GAP = 12

// Reached by tapping "View all" next to Home's "Featured lots" section —
// that section's own FlashList only ever renders whatever `featuredListings`
// holds today (no cap, unlike Listing Detail's "similar listings"), so
// this screen's grid is identical content, just without Home's hero/search/
// filter chrome above it. Keeps the heart/like toggle Home's own cards
// have (unlike Listing Detail's "similar listings" screen, whose mockup
// gives that specific grid no like affordance — this one is just "more of
// Home's own list", so it should behave like Home's own list). `liked`
// state is local-only and doesn't sync with Home's own `liked` state,
// same caveat as every other local-only like toggle in this app (see
// Home's own comment) — no shared store exists yet.
export default function AllListingsScreen() {
  const t = useTranslation()
  const fonts = useFontFamily()
  const router = useRouter()
  const [liked, setLiked] = useState<Set<string>>(defaultLikedIds)

  function goBack() {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/')
    }
  }

  const toggleLike = useCallback((id: string) => {
    setLiked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

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
          liked={liked.has(item.id)}
          onToggleLike={() => toggleLike(item.id)}
          onPress={() => router.push(`/listing/${item.id}`)}
        />
      </View>
    ),
    [liked, toggleLike, router],
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
            {t.home.featuredTitle}
          </Text>
          <View style={styles.navSpacer} />
        </View>

        <FlashList
          data={featuredListings}
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
  // — same technique as the Similar Listings screen's own nav row.
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
