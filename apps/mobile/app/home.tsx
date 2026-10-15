import { useAuth, useUser } from '@clerk/expo'
import { gemTones } from '@ceylon-gems/ui-tokens'
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list'
import Slider from '@react-native-community/slider'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { Redirect, useRouter } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  BottomNavBar,
  BottomSheet,
  GlassSurface,
  ListingCard,
  SearchBar,
  Skeleton,
} from '../components'
import {
  BellIcon,
  ChatIcon,
  CloseIcon,
  FilterIcon,
  GemIcon,
  HeartIcon,
  HomeTabIcon,
  PlusIcon,
  ProfileTabIcon,
  SearchIcon,
  StoreIcon,
} from '../components/icons'
import { GRADIENT_140 } from '../components/primitives/gradientAngle'
import { LiveGradientBackground } from '../components/primitives/LiveGradientBackground'
import { PressableScale } from '../components/primitives/PressableScale'
import { useFilters } from '../hooks/useFilters'
import { useFontFamily } from '../hooks/useFontFamily'
import { useToggleFavorite } from '../hooks/useToggleFavorite'
import { useTranslation } from '../hooks/useTranslation'
import { featuredListings, type Listing } from '../lib/listings'
import { useCurrency } from '../providers/CurrencyProvider'
import { useFavorites } from '../providers/FavoritesProvider'
import { useGemTone } from '../providers/GemToneProvider'
import { useNotifications } from '../providers/NotificationsProvider'
const PAD = 22
const GRID_GAP = 12

// Placeholder hero photo (Unsplash, free license, no attribution required)
// — no real photo backend exists yet (see ListingCard.tsx's identical
// note), so this stands in until real gem photography is wired up.
const HERO_IMAGE_URL =
  'https://images.unsplash.com/photo-1613843351058-1dd06fda7c02?w=1200&q=80&auto=format&fit=crop'

// Group names are DB-driven now (see useFilters) — the admin dashboard
// (not built yet) can add/retire whole groups, not just options within
// them, so this can't be a fixed compile-time union anymore.
type PickedFilters = Record<string, string[]>
const emptyPicked: PickedFilters = {}

function useGreeting() {
  const t = useTranslation()
  const hour = new Date().getHours()
  if (hour < 12) return t.home.greetingMorning
  if (hour < 18) return t.home.greetingAfternoon
  return t.home.greetingEvening
}

// UI + real signed-in state per the "Ceylon Gem Exchange Home.dc.html"
// design. No listings/search backend exists yet (see CLAUDE.md's "Current
// sequencing"), so `featuredListings` is placeholder demo data and search/
// filtering only narrow that local array rather than hitting Typesense —
// the filter sheet's taxonomy itself (`useFilters`) is real, DB-backed data
// though (see apps/api/src/filters). The mockup's `position:sticky` search bar and filter-
// chips row are rendered as plain scrolling content, not truly sticky —
// FlashList v2 has no `stickyHeaderIndices` equivalent for header content,
// and reaching for one would mean restructuring the header into typed list
// items for a secondary polish behavior; deferred rather than done partially.
export default function HomeScreen() {
  const t = useTranslation()
  const fonts = useFontFamily()
  const greeting = useGreeting()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const { gemTone } = useGemTone()
  const tone = gemTones[gemTone]
  const { formatPrice } = useCurrency()
  const { unreadCount } = useNotifications()

  const filterData = useFilters()
  const filterGroups = filterData ?? {}

  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<PickedFilters>(emptyPicked)
  const [price, setPrice] = useState(12000)
  const [filterOpen, setFilterOpen] = useState(false)
  const { likedIds } = useFavorites()
  const toggleLike = useToggleFavorite()
  // Profile, Chat, and Saved all navigate to real screens (Profile's hub,
  // the Chats inbox, and the real Favourites screen — see app/chats.tsx /
  // app/favourites.tsx) that each have their own copy of this same shared
  // BottomNavBar with their own tab already active, so handleNavChange
  // below never sets any of them as a local tab. The middle slot
  // (previously "Bids") is the raised "Post ad" button, routing to the
  // real app/post-ad.tsx wizard — it never reads as an active tab
  // (BottomNavBar skips the active-state treatment entirely for `raised`
  // items), so it's a real navigation inside the `value === 'post'` branch
  // below rather than a `setNavValue` call.
  const [navValue, setNavValue] = useState<'home' | 'chat' | 'post' | 'saved' | 'profile'>('home')

  function handleNavChange(value: 'home' | 'chat' | 'post' | 'saved' | 'profile') {
    if (value === 'profile') {
      router.push('/profile')
      return
    }
    if (value === 'post') {
      router.push('/post-ad')
      return
    }
    if (value === 'chat') {
      router.push('/chats')
      return
    }
    if (value === 'saved') {
      router.push('/favourites')
      return
    }
    setNavValue(value)
  }

  const toggleFilterOption = useCallback((group: string, name: string) => {
    setPicked((prev) => {
      const current = prev[group] ?? []
      const next = current.includes(name) ? current.filter((x) => x !== name) : [...current, name]
      return { ...prev, [group]: next }
    })
  }, [])

  const activeChips = useMemo(
    () => Object.keys(picked).flatMap((group) => picked[group]!.map((name) => ({ group, name }))),
    [picked],
  )
  const hasFilters = activeChips.length > 0

  const resultCount = Math.max(3, 42 - activeChips.length * 6 - (price < 6000 ? 12 : 0))

  const filteredListings = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return featuredListings
    return featuredListings.filter((item) => item.name.toLowerCase().includes(q))
  }, [query])

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
          liked={likedIds.has(item.id)}
          onToggleLike={() => toggleLike(item.id)}
          onPress={() => router.push(`/listing/${item.id}`)}
        />
      </View>
    ),
    [likedIds, toggleLike, router],
  )

  if (isLoaded && !isSignedIn) {
    return <Redirect href="/sign-in" />
  }
  if (!isLoaded) {
    return null
  }

  return (
    <LiveGradientBackground>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={styles.headerRow}>
          <GlassSurface radius={14} clarity={55} style={styles.brandTile}>
            <GemIcon size={19} ink={tone.ink} inkSoft={`rgba(${tone.rim},0.7)`} />
          </GlassSurface>
          <View style={styles.greetingBlock}>
            <Text style={[styles.greetingLabel, { fontFamily: fonts.semibold }]}>{greeting}</Text>
            <Text style={[styles.greetingName, { fontFamily: fonts.extrabold }]} numberOfLines={1}>
              {user?.firstName ?? 'Asitha'}
            </Text>
          </View>
          <PressableScale
            onPress={() => router.push('/stores')}
            accessibilityRole="button"
            accessibilityLabel={t.stores.title}
            hitSlop={4}
          >
            <GlassSurface radius={14} clarity={55} style={styles.bell}>
              <StoreIcon size={18} />
            </GlassSurface>
          </PressableScale>
          <PressableScale
            onPress={() => router.push('/notifications')}
            accessibilityRole="button"
            accessibilityLabel={t.notifications.title}
            hitSlop={4}
            style={styles.bellWrap}
          >
            <GlassSurface radius={14} clarity={55} style={styles.bell}>
              <BellIcon />
            </GlassSurface>
            {/* Sibling of GlassSurface, not a child — same reasoning as
                the filter button's count badge above: GlassSurface's own
                `overflow: 'hidden'` clips a corner-overhanging child.
                Was a plain dot before; now the same numbered-pill style as
                the filter badge, tied to NotificationsProvider's real
                unread count so it actually clears once everything's been
                read on the inbox screen. */}
            {unreadCount > 0 ? (
              <LinearGradient
                colors={[`${tone.cta[0]}0.95)`, `${tone.cta[1]}0.85)`]}
                style={[styles.filterCount, { borderColor: `rgba(${tone.rim},0.6)` }]}
              >
                <Text style={[styles.filterCountLabel, { fontFamily: fonts.extrabold }]}>
                  {unreadCount}
                </Text>
              </LinearGradient>
            ) : null}
          </PressableScale>
        </View>

        <FlashList
          data={filteredListings}
          keyExtractor={(item) => item.id}
          numColumns={2}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <>
              <View style={styles.hero}>
                <Image
                  source={{ uri: HERO_IMAGE_URL }}
                  style={styles.heroImage}
                  contentFit="cover"
                  transition={200}
                />
                <LinearGradient
                  colors={['rgba(6,11,26,0.1)', 'rgba(6,11,26,0.05)', 'rgba(6,11,26,0.55)']}
                  locations={[0, 0.45, 1]}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
              </View>

              <View style={styles.searchRow}>
                <SearchBar
                  value={query}
                  onChangeText={setQuery}
                  placeholder={t.home.searchPlaceholder}
                  leftIcon={<SearchIcon />}
                  radius={18}
                  style={styles.searchField}
                />
                <PressableScale
                  onPress={() => setFilterOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel={t.home.filtersTitle}
                  style={styles.filterButtonWrap}
                >
                  <GlassSurface radius={18} clarity={55} style={styles.filterButton}>
                    <FilterIcon color={tone.accent} />
                  </GlassSurface>
                  {/* Sibling of GlassSurface, not a child — GlassSurface's
                      own outer View clips to its rounded corner
                      (`overflow: 'hidden'`, needed so its blur/tint layers
                      don't bleed past the radius), which was clipping this
                      badge's intentional corner overhang (top/right: -4)
                      down to roughly half a circle. Absolutely positioning
                      it here instead, against this wrapper, keeps the
                      overhang intact. */}
                  {hasFilters ? (
                    <LinearGradient
                      colors={[`${tone.cta[0]}0.95)`, `${tone.cta[1]}0.85)`]}
                      style={[styles.filterCount, { borderColor: `rgba(${tone.rim},0.6)` }]}
                    >
                      <Text style={[styles.filterCountLabel, { fontFamily: fonts.extrabold }]}>
                        {activeChips.length}
                      </Text>
                    </LinearGradient>
                  ) : null}
                </PressableScale>
              </View>

              {hasFilters ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.chipsRow}
                  contentContainerStyle={styles.chipsRowContent}
                >
                  {activeChips.map((chip) => (
                    <Pressable
                      key={`${chip.group}-${chip.name}`}
                      onPress={() => toggleFilterOption(chip.group, chip.name)}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${chip.name} filter`}
                    >
                      <LinearGradient
                        colors={[`${tone.cta[0]}0.32)`, `${tone.cta[1]}0.18)`]}
                        start={GRADIENT_140.start}
                        end={GRADIENT_140.end}
                        style={[styles.activeChip, { borderColor: `rgba(${tone.rim},0.38)` }]}
                      >
                        <Text style={[styles.activeChipLabel, { fontFamily: fonts.bold }]}>
                          {chip.name}
                        </Text>
                        <CloseIcon size={9} />
                      </LinearGradient>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}

              <View style={styles.sectionRow}>
                <Text style={[styles.sectionTitle, { fontFamily: fonts.extrabold }]}>
                  {t.home.featuredTitle}
                </Text>
                <PressableScale onPress={() => router.push('/all-listings')} hitSlop={8}>
                  <Text
                    style={[styles.sectionLink, { fontFamily: fonts.bold, color: tone.accent }]}
                  >
                    {t.home.viewAll}
                  </Text>
                </PressableScale>
              </View>
            </>
          }
          ListFooterComponent={<View style={{ height: insets.bottom + 140 }} />}
        />
      </SafeAreaView>

      <BottomNavBar
        value={navValue}
        onChange={handleNavChange}
        style={[styles.floatingNav, { bottom: 30 }]}
        items={[
          { value: 'home', label: 'Home', icon: (color) => <HomeTabIcon color={color} /> },
          {
            value: 'chat',
            label: 'Chat',
            icon: (color) => <ChatIcon size={20} color={color} strokeWidth={1.9} />,
          },
          {
            value: 'post',
            label: 'Post ad',
            icon: (color) => <PlusIcon size={22} color={color} strokeWidth={2.4} />,
            raised: true,
          },
          {
            value: 'saved',
            label: 'Saved',
            icon: (color) => <HeartIcon size={20} color={color} />,
          },
          { value: 'profile', label: 'Profile', icon: (color) => <ProfileTabIcon color={color} /> },
        ]}
      />

      <BottomSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        closeAccessibilityLabel={t.common.cancel}
        radius={32}
        style={styles.filterSheet}
      >
        <View style={styles.filterHeader}>
          <Text style={[styles.filterTitle, { fontFamily: fonts.extrabold }]}>
            {t.home.filtersTitle}
          </Text>
          <Pressable
            onPress={() => setFilterOpen(false)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t.common.cancel}
            style={styles.filterClose}
          >
            <CloseIcon />
          </Pressable>
        </View>

        <ScrollView style={styles.filterBody} keyboardShouldPersistTaps="handled">
          {filterData === null ? (
            <FilterGroupsSkeleton />
          ) : (
            Object.keys(filterGroups).map((group) => (
              <View key={group} style={styles.filterGroup}>
                <Text style={[styles.filterGroupLabel, { fontFamily: fonts.bold }]}>
                  {group.toUpperCase()}
                </Text>
                <View style={styles.filterOptions}>
                  {filterGroups[group]!.map((option) => {
                    const isSelected = (picked[group] ?? []).includes(option)
                    return (
                      <FilterOptionPill
                        key={option}
                        label={option}
                        selected={isSelected}
                        onPress={() => toggleFilterOption(group, option)}
                      />
                    )
                  })}
                </View>
              </View>
            ))
          )}

          <View style={styles.priceSection}>
            <View style={styles.priceHeader}>
              <Text style={[styles.filterGroupLabel, { fontFamily: fonts.bold }]}>
                {t.home.maxPriceLabel.toUpperCase()}
              </Text>
              <Text
                style={[styles.priceValue, { fontFamily: fonts.extrabold, color: tone.accent }]}
              >
                {formatPrice(price)}
              </Text>
            </View>
            <Slider
              minimumValue={500}
              maximumValue={20000}
              step={500}
              value={price}
              onValueChange={setPrice}
              minimumTrackTintColor={tone.accent}
              maximumTrackTintColor="rgba(255,255,255,0.2)"
              thumbTintColor={tone.accent}
            />
          </View>
        </ScrollView>

        <View style={styles.filterFooter}>
          <Pressable
            onPress={() => {
              setPicked(emptyPicked)
              setPrice(20000)
            }}
            style={styles.resetButton}
          >
            <Text style={[styles.resetLabel, { fontFamily: fonts.bold }]}>{t.common.reset}</Text>
          </Pressable>
          <Pressable onPress={() => setFilterOpen(false)} style={styles.applyButtonWrap}>
            <LinearGradient
              colors={[`${tone.cta[0]}0.9)`, `${tone.cta[1]}0.76)`]}
              start={GRADIENT_140.start}
              end={GRADIENT_140.end}
              style={[styles.applyButton, { borderColor: `rgba(${tone.rim},0.5)` }]}
            >
              <Text style={[styles.applyLabel, { fontFamily: fonts.bold }]}>
                {t.home.showResultsCount.replace('{{count}}', String(resultCount))}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      </BottomSheet>
    </LiveGradientBackground>
  )
}

// Mimics the real filter sheet's group-label + wrapped-pills layout while
// useFilters is still loading. Three representative groups, not all five —
// showing the real taxonomy's exact group count here would imply false
// precision about what's actually loading. Varied pill widths so it reads
// as content, not a uniform robotic grid.
const SKELETON_PILL_WIDTHS = [
  [90, 70, 100, 64],
  [60, 84, 56],
  [72, 96, 68, 80, 60],
]

function FilterGroupsSkeleton() {
  return (
    <>
      {SKELETON_PILL_WIDTHS.map((widths, groupIndex) => (
        <View key={groupIndex} style={styles.filterGroup}>
          <Skeleton width={70} height={11} radius={3} style={{ marginBottom: 11 }} />
          <View style={styles.filterOptions}>
            {widths.map((width, pillIndex) => (
              <Skeleton key={pillIndex} width={width} height={36} radius={14} />
            ))}
          </View>
        </View>
      ))}
    </>
  )
}

interface FilterOptionPillProps {
  label: string
  selected: boolean
  onPress: () => void
}

// The filter sheet's toggle pill — a low-alpha glow chip, distinct from the
// active-filter chips above it (different alpha/padding/no glow in the
// mockup's own `activeChips`/`filterGroups` style strings, so not
// unified into one shared formula). Shadow lives on the unclipped
// wrapper for the same masksToBounds reason as Button's CTA glow.
function FilterOptionPill({ label, selected, onPress }: FilterOptionPillProps) {
  const fonts = useFontFamily()
  const { gemTone } = useGemTone()
  const tone = gemTones[gemTone]

  if (!selected) {
    return (
      <Pressable onPress={onPress} style={styles.filterPillInactive}>
        <Text
          style={[
            styles.filterPillLabel,
            { fontFamily: fonts.bold, color: 'rgba(255,255,255,0.7)' },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    )
  }

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.filterPillGlow,
        Platform.select({
          ios: {
            shadowColor: `rgb(${tone.halo})`,
            shadowOffset: { width: 0, height: 7 },
            shadowOpacity: 0.9,
            shadowRadius: 12,
          },
          android: { elevation: 4 },
        }),
      ]}
    >
      <LinearGradient
        colors={[`${tone.cta[0]}0.5)`, `${tone.cta[1]}0.32)`]}
        start={GRADIENT_140.start}
        end={GRADIENT_140.end}
        style={[styles.filterPillActive, { borderColor: `rgba(${tone.rim},0.45)` }]}
      >
        <Text style={[styles.filterPillLabel, { fontFamily: fonts.bold, color: '#fff' }]}>
          {label}
        </Text>
      </LinearGradient>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  // Most values below are the mockup's exact numbers at its default
  // glassClarity (55) / density ("Airy") — not the general spacing/
  // fontSize/radii scales, which don't happen to land on these numbers.
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 8,
    paddingHorizontal: PAD,
    paddingBottom: 12,
  },
  brandTile: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingBlock: {
    flex: 1,
    gap: 1,
  },
  greetingLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  greetingName: {
    fontSize: 15,
    letterSpacing: -0.2,
    color: '#fff',
  },
  bellWrap: {
    position: 'relative',
  },
  bell: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: PAD,
  },
  hero: {
    position: 'relative',
    height: 210,
    marginHorizontal: -PAD,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  // `StyleSheet.absoluteFillObject` was removed in RN 0.86 — spelled out
  // directly since it needs to sit alongside alignItems/justifyContent.
  heroImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  searchField: {
    flex: 1,
    minHeight: 50,
  },
  filterButtonWrap: {
    position: 'relative',
  },
  filterButton: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountLabel: {
    fontSize: 10,
    color: '#fff',
  },
  chipsRow: {
    marginTop: 10,
    flexGrow: 0,
  },
  chipsRowContent: {
    gap: 8,
    paddingRight: PAD,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  activeChipLabel: {
    fontSize: 11,
    color: '#fff',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    letterSpacing: -0.2,
    color: '#fff',
  },
  sectionLink: {
    fontSize: 12,
  },
  gridItem: {
    flex: 1,
    paddingBottom: GRID_GAP,
  },
  floatingNav: {
    position: 'absolute',
    left: 20,
    right: 20,
  },
  // Filter sheet — exact values from the mockup's sheetStyle/filterGroups/
  // sheetFootStyle. `height`/`padding`/asymmetric bottom radius override
  // BottomSheet's defaults via its `style` prop; `radius` (top corners)
  // stays on the BottomSheet prop itself.
  filterSheet: {
    height: '76%',
    padding: 0,
    borderBottomLeftRadius: 44,
    borderBottomRightRadius: 44,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  filterTitle: {
    fontSize: 17,
    color: '#fff',
  },
  filterClose: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  filterBody: {
    flex: 1,
    paddingHorizontal: 20,
  },
  filterGroup: {
    marginBottom: 20,
  },
  filterGroupLabel: {
    fontSize: 11,
    letterSpacing: 0.5,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 11,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterPillInactive: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  filterPillGlow: {
    borderRadius: 14,
  },
  filterPillActive: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  filterPillLabel: {
    fontSize: 12,
  },
  priceSection: {
    marginBottom: 22,
  },
  priceHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priceValue: {
    fontSize: 13,
  },
  filterFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  resetButton: {
    flexBasis: 96,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  resetLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  applyButtonWrap: {
    flex: 1,
  },
  applyButton: {
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  applyLabel: {
    fontSize: 14,
    color: '#fff',
  },
})
