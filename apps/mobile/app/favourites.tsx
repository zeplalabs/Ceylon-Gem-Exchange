import { gemTones, neutral } from '@ceylon-gems/ui-tokens'
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list'
import { useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { GlassSurface, IconButton, ListingCard } from '../components'
import { ChevronLeftIcon, HeartIcon } from '../components/icons'
import { LiveGradientBackground } from '../components/primitives/LiveGradientBackground'
import { useFontFamily } from '../hooks/useFontFamily'
import { useTranslation } from '../hooks/useTranslation'
import { useGemTone } from '../providers/GemToneProvider'
import { defaultLikedIds, featuredListings, type Listing } from '../lib/listings'

const PAD = 22
const GRID_GAP = 12

// Reached from Profile's "Favourites" row. Per explicit product direction,
// this is the same "home page item view" as app/all-listings.tsx — same
// ListingCard grid, same component — just pre-filtered to the liked set
// instead of showing everything. `liked` starts from `defaultLikedIds`
// (same demo seed Home/All Listings use) and is this screen's own local
// copy — no shared store exists yet (see all-listings.tsx's own comment),
// so un-liking here doesn't un-like it on Home, and vice versa. Unliking a
// card here removes it from the list outright, which is the point of this
// screen (unlike Home/All Listings, where unliking just dims the heart).
export default function FavouritesScreen() {
  const t = useTranslation()
  const fonts = useFontFamily()
  const router = useRouter()
  const { gemTone } = useGemTone()
  const tone = gemTones[gemTone]
  const [liked, setLiked] = useState<Set<string>>(defaultLikedIds)

  function goBack() {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/profile')
    }
  }

  const toggleLike = useCallback((id: string) => {
    setLiked((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const favourited = featuredListings.filter((item) => liked.has(item.id))

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
          liked
          onToggleLike={() => toggleLike(item.id)}
          onPress={() => router.push(`/listing/${item.id}`)}
        />
      </View>
    ),
    [toggleLike, router],
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
