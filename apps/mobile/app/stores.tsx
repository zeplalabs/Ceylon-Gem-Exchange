import { gemTones, neutral } from '@ceylon-gems/ui-tokens'
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { GlassSurface, IconButton, SearchBar } from '../components'
import { ChevronLeftIcon, GemIcon, SearchIcon } from '../components/icons'
import { LiveGradientBackground } from '../components/primitives/LiveGradientBackground'
import { PressableScale } from '../components/primitives/PressableScale'
import { useFontFamily } from '../hooks/useFontFamily'
import { useTranslation } from '../hooks/useTranslation'
import { API_URL } from '../lib/apiUrl'
import { getStoreDirectory } from '../lib/listings'
import { useGemTone } from '../providers/GemToneProvider'

const PAD = 22

interface RealSeller {
  id: string
  displayName: string | null
  shopName: string | null
  location: string | null
  activeListingsCount: number
}

interface StoreCard {
  id: string
  name: string
  location: string
  rating: number | null
  reviewCount: number | null
}

function fromRealSeller(seller: RealSeller): StoreCard {
  return {
    id: seller.id,
    name: seller.shopName ?? seller.displayName ?? 'Unnamed seller',
    location: seller.location ?? '',
    // No review system exists for a real seller — see
    // sellers-list.controller.ts's own comment. Rendered as "—", same
    // fallback seller/[id].tsx already uses for this exact gap.
    rating: null,
    reviewCount: null,
  }
}

// Reached from Home's new store icon button (header row, left of
// notifications) — ports "Ceylon Gem Exchange Stores.html": a back
// button + large left-aligned title (not the small centered nav title
// Favourites/My Ads use — this mockup's own `Stores` heading is 30px/800,
// measured off the page directly), a search field, and a single-column
// list of store cards. Real sellers come from `GET /sellers` (any account
// with at least one active listing); the mockup's own 7 stores
// (getStoreDirectory, lib/listings.ts) are appended after them, same
// "real rows + a static demo set, merged" pattern favourites.tsx
// established — this app has far too few real sellers yet for the screen
// to only show real data. Cover photos are the same tinted-glass +
// GemIcon placeholder every other "no real photo backend" image area in
// this app uses (ListingCard, Home's hero) — the mockup's own cover tiles
// carry no real image either, just an icon + alt caption, so this isn't a
// fidelity gap, just the existing convention reapplied here too.
export default function StoresScreen() {
  const t = useTranslation()
  const fonts = useFontFamily()
  const router = useRouter()
  const { gemTone } = useGemTone()
  const tone = gemTones[gemTone]
  const [query, setQuery] = useState('')
  const [realSellers, setRealSellers] = useState<RealSeller[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`${API_URL}/sellers`)
        if (!res.ok || cancelled) return
        setRealSellers((await res.json()) as RealSeller[])
      } catch {
        // Leave whatever's already shown — the directory's static fixture
        // keeps the screen from ever looking broken.
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  function goBack() {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/home')
    }
  }

  const allStores = useMemo<StoreCard[]>(
    () => [
      ...realSellers.map(fromRealSeller),
      ...getStoreDirectory().map((s) => ({
        id: s.id,
        name: s.name,
        location: s.location,
        rating: s.rating,
        reviewCount: s.reviewCount ?? null,
      })),
    ],
    [realSellers],
  )

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allStores
    return allStores.filter((s) => s.name.toLowerCase().includes(q))
  }, [allStores, query])

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<StoreCard>) => (
      <PressableScale onPress={() => router.push(`/seller/${item.id}`)} style={styles.cardWrap}>
        <GlassSurface radius={22} clarity={55}>
          <View style={styles.cover}>
            <GemIcon size={28} ink="rgba(255,255,255,0.25)" inkSoft="rgba(255,255,255,0.15)" />
          </View>
          <View style={styles.info}>
            <Text style={[styles.name, { fontFamily: fonts.extrabold }]} numberOfLines={1}>
              {item.name}
            </Text>
            {item.rating !== null ? (
              <View style={styles.ratingRow}>
                <Text style={[styles.stars, { color: tone.accent, fontFamily: fonts.bold }]}>
                  {'★★★★★'}
                </Text>
                <Text style={[styles.ratingValue, { fontFamily: fonts.bold }]}>
                  {item.rating.toFixed(1)}
                </Text>
                {item.reviewCount !== null ? (
                  <Text style={[styles.reviewCount, { fontFamily: fonts.bold }]}>
                    ({item.reviewCount})
                  </Text>
                ) : null}
              </View>
            ) : (
              <Text style={[styles.ratingValue, { fontFamily: fonts.bold }]}>—</Text>
            )}
          </View>
        </GlassSurface>
      </PressableScale>
    ),
    [fonts, router, tone.accent],
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
          <Text style={[styles.title, { fontFamily: fonts.extrabold }]} numberOfLines={1}>
            {t.stores.title}
          </Text>
        </View>

        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder={t.stores.searchPlaceholder}
          leftIcon={<SearchIcon />}
          radius={18}
          style={styles.searchField}
        />

        {shown.length === 0 ? (
          <View style={styles.emptyWrap}>
            <GlassSurface clarity={55} radius={24} style={styles.emptyPanel}>
              <Text style={[styles.emptyTitle, { fontFamily: fonts.extrabold }]}>
                {t.stores.emptyTitle}
              </Text>
              <Text style={[styles.emptySubtitle, { fontFamily: fonts.medium }]}>
                {t.stores.emptySubtitle}
              </Text>
            </GlassSurface>
          </View>
        ) : (
          <FlashList
            data={shown}
            keyExtractor={(item) => item.id}
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
    gap: 12,
    paddingTop: 10,
    paddingHorizontal: PAD,
    paddingBottom: 14,
  },
  title: {
    fontSize: 30,
    letterSpacing: -0.6,
    color: neutral.white,
  },
  searchField: {
    marginHorizontal: PAD,
    marginBottom: 14,
  },
  listContent: {
    paddingHorizontal: PAD,
    paddingBottom: 32,
  },
  cardWrap: {
    paddingBottom: 14,
  },
  cover: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  info: {
    gap: 8,
    padding: 14,
  },
  name: {
    fontSize: 17,
    color: neutral.white,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stars: {
    fontSize: 12,
    letterSpacing: 1,
  },
  ratingValue: {
    fontSize: 12,
    color: neutral.white,
  },
  reviewCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
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
