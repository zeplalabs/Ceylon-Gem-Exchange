import { gemTones, neutral } from '@ceylon-gems/ui-tokens'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ConfirmDialog, GlassSurface, IconButton, PressableScale, Toggle } from '../components'
import {
  BellEmptyIcon,
  BinIcon,
  ChevronLeftIcon,
  PlusIcon,
  QuerySearchIcon,
} from '../components/icons'
import { GRADIENT_140 } from '../components/primitives/gradientAngle'
import { LiveGradientBackground } from '../components/primitives/LiveGradientBackground'
import { useFontFamily } from '../hooks/useFontFamily'
import { useTranslation } from '../hooks/useTranslation'
import { useGemTone } from '../providers/GemToneProvider'

interface SavedSearch {
  id: string
  name: string
  meta: string
  filters: string[]
  newCount: string
  /** `lib/listings.ts` ids this query plausibly matches — a small hand
   * curated mapping onto the real demo catalog (there's no actual search
   * backend to compute this), passed to app/search-results.tsx. */
  matchIds: string[]
}

// Ported verbatim from "Ceylon Gem Exchange Saved Searches.dc.html"'s own
// `searches` array — demo content in the same sense as My Ads' own ad list,
// not translated (same treatment as every other screen-local demo dataset
// in this app). `newCount`'s "No new matches" vs real-count distinction
// (`hasNew` below) relies on the English literal, same simplification as
// elsewhere in this app's demo data.
const INITIAL_SEARCHES: SavedSearch[] = [
  {
    id: 'q1',
    name: 'Unheated blue sapphire',
    meta: 'Saved 4 days ago · 12 matches',
    filters: ['Blue Sapphire', 'Ratnapura', 'Unheated', 'under $10k'],
    newCount: '3 new since Monday',
    matchIds: ['1'],
  },
  {
    id: 'q2',
    name: 'Padparadscha over 2 ct',
    meta: 'Saved 2 weeks ago · 5 matches',
    filters: ['Padparadscha', '2 ct+', 'GIA or SSEF'],
    newCount: '1 new today',
    matchIds: ['2'],
  },
  {
    id: 'q3',
    name: 'Star ruby cabochons',
    meta: 'Saved 3 weeks ago · 8 matches',
    filters: ['Ruby', 'Cabochon', 'Elahera'],
    newCount: 'No new matches',
    matchIds: ['3'],
  },
  {
    id: 'q4',
    name: 'Spinel pairs for setting',
    meta: 'Saved 1 month ago · 21 matches',
    filters: ['Spinel', 'Matched pair', 'under $3k'],
    newCount: '6 new this week',
    matchIds: ['4'],
  },
  {
    id: 'q5',
    name: "Cat's eye chrysoberyl",
    meta: 'Saved 2 months ago · 3 matches',
    filters: ["Cat's Eye", '4 ct+'],
    newCount: 'No new matches',
    matchIds: ['5'],
  },
]

// Reached from Profile's "Saved searches" row. Ports "Ceylon Gem Exchange
// Saved Searches.dc.html" — an alerts blurb, a card list (per-card alert
// Toggle, filter chips, new-match count, "View results", delete), and a
// floating "Save a new search" button. "View results" is real navigation —
// per explicit product direction, it leads to app/search-results.tsx, the
// same "home page item view" grid as app/all-listings.tsx/favourites.tsx,
// filtered to that card's own `matchIds`. The nav row's "+" and the
// floating "Save a new search" button stay decorative (no Pressable) —
// there's no search-creation screen/flow built yet, same "don't wire a
// dead tap target" rule app/my-ads.tsx's own "+" button followed. The alert
// Toggle and delete are real local state, same "local-only toggle"
// precedent as everywhere else in this app.
export default function SavedSearchesScreen() {
  const t = useTranslation()
  const fonts = useFontFamily()
  const router = useRouter()
  const { gemTone } = useGemTone()
  const tone = gemTones[gemTone]

  const [searches, setSearches] = useState<SavedSearch[]>(INITIAL_SEARCHES)
  const [alerts, setAlerts] = useState<Record<string, boolean>>({
    q1: true,
    q2: true,
    q3: false,
    q4: true,
    q5: false,
  })
  const [deleteId, setDeleteId] = useState<string | null>(null)

  function goBack() {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/profile')
    }
  }

  function toggleAlert(id: string) {
    setAlerts((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function confirmDelete() {
    setSearches((prev) => prev.filter((q) => q.id !== deleteId))
    setDeleteId(null)
  }

  function viewResults(search: SavedSearch) {
    router.push({
      pathname: '/search-results',
      params: { name: search.name, ids: search.matchIds.join(',') },
    })
  }

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
            {t.savedSearches.title}
          </Text>
          <View style={styles.navSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <GlassSurface clarity={55} radius={20} style={styles.blurb}>
            <View
              style={[
                styles.blurbIconTile,
                {
                  backgroundColor: `rgba(${tone.rim},0.13)`,
                  borderColor: `rgba(${tone.rim},0.24)`,
                },
              ]}
            >
              <BellEmptyIcon size={17} color={tone.ink} strokeWidth={1.7} />
            </View>
            <Text style={[styles.blurbText, { fontFamily: fonts.medium }]}>
              {t.savedSearches.blurb}
            </Text>
          </GlassSurface>

          <View style={styles.listWrap}>
            {searches.map((search) => {
              const hasNew = !search.newCount.startsWith('No')
              return (
                <GlassSurface key={search.id} clarity={55} radius={24} style={styles.card}>
                  <View style={styles.cardTopRow}>
                    <View
                      style={[
                        styles.cardIconTile,
                        {
                          backgroundColor: `rgba(${tone.rim},0.13)`,
                          borderColor: `rgba(${tone.rim},0.26)`,
                        },
                      ]}
                    >
                      <QuerySearchIcon size={16} color={tone.ink} strokeWidth={1.9} />
                    </View>
                    <View style={styles.cardText}>
                      <Text
                        style={[styles.cardName, { fontFamily: fonts.extrabold }]}
                        numberOfLines={1}
                      >
                        {search.name}
                      </Text>
                      <Text
                        style={[styles.cardMeta, { fontFamily: fonts.semibold }]}
                        numberOfLines={1}
                      >
                        {search.meta}
                      </Text>
                    </View>
                    <Toggle
                      value={!!alerts[search.id]}
                      onValueChange={() => toggleAlert(search.id)}
                      tone={gemTone}
                      accessibilityLabel={search.name}
                    />
                  </View>

                  <View style={styles.chipsRow}>
                    {search.filters.map((label) => (
                      <View
                        key={label}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: `rgba(${tone.rim},0.12)`,
                            borderColor: `rgba(${tone.rim},0.24)`,
                          },
                        ]}
                      >
                        <Text style={[styles.chipLabel, { fontFamily: fonts.extrabold }]}>
                          {label}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.cardFooter}>
                    <Text
                      style={[
                        styles.newCount,
                        {
                          fontFamily: fonts.extrabold,
                          color: hasNew ? tone.accent : 'rgba(255,255,255,0.4)',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {search.newCount}
                    </Text>
                    <View style={styles.footerSpacer} />
                    <PressableScale
                      onPress={() => viewResults(search)}
                      accessibilityLabel={t.savedSearches.viewResults}
                    >
                      <LinearGradient
                        colors={[`${tone.cta[0]}0.72)`, `${tone.cta[1]}0.5)`]}
                        start={GRADIENT_140.start}
                        end={GRADIENT_140.end}
                        style={[styles.viewPill, { borderColor: `rgba(${tone.rim},0.45)` }]}
                      >
                        <Text style={[styles.viewPillLabel, { fontFamily: fonts.extrabold }]}>
                          {t.savedSearches.viewResults}
                        </Text>
                      </LinearGradient>
                    </PressableScale>
                    <PressableScale
                      onPress={() => setDeleteId(search.id)}
                      accessibilityLabel={t.common.delete}
                      style={styles.deleteButton}
                    >
                      <BinIcon size={14} color="#ff8f80" strokeWidth={1.7} />
                    </PressableScale>
                  </View>
                </GlassSurface>
              )
            })}
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        <View style={[styles.postButtonInert, { borderColor: `rgba(${tone.rim},0.5)` }]}>
          <LinearGradient
            colors={[`${tone.cta[0]}0.9)`, `${tone.cta[1]}0.76)`]}
            start={GRADIENT_140.start}
            end={GRADIENT_140.end}
            style={styles.postButtonFill}
          >
            <PlusIcon size={15} color={neutral.white} strokeWidth={2.4} />
            <Text style={[styles.postButtonLabel, { fontFamily: fonts.extrabold }]}>
              {t.savedSearches.saveNewSearch}
            </Text>
          </LinearGradient>
        </View>

        <ConfirmDialog
          visible={deleteId !== null}
          title={t.savedSearches.deleteConfirmTitle}
          message={t.savedSearches.deleteConfirmMessage}
          confirmLabel={t.common.delete}
          cancelLabel={t.common.cancel}
          destructive
          onConfirm={confirmDelete}
          onCancel={() => setDeleteId(null)}
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
    paddingHorizontal: 22,
    paddingBottom: 12,
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    letterSpacing: -0.2,
    color: neutral.white,
  },
  navSpacer: {
    width: 40,
  },
  body: {
    paddingHorizontal: 22,
  },
  blurb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  blurbIconTile: {
    flexShrink: 0,
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blurbText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16.5,
    color: 'rgba(255,255,255,0.6)',
  },
  listWrap: {
    gap: 12,
    marginTop: 14,
  },
  card: {
    padding: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardIconTile: {
    flexShrink: 0,
    width: 36,
    height: 36,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
    gap: 5,
    minWidth: 0,
  },
  cardName: {
    fontSize: 14,
    letterSpacing: -0.1,
    color: neutral.white,
  },
  cardMeta: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 12,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 11,
    borderWidth: 1,
  },
  chipLabel: {
    fontSize: 10,
    letterSpacing: 0.2,
    color: 'rgba(255,255,255,0.78)',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  newCount: {
    flexShrink: 1,
    fontSize: 11,
  },
  footerSpacer: {
    flex: 1,
  },
  viewPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 13,
    borderWidth: 1,
  },
  viewPillLabel: {
    fontSize: 11,
    color: neutral.white,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: 'rgba(255,120,105,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,120,105,0.26)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSpacer: {
    height: 100,
  },
  // Decorative only — see the file-level comment on why this has no
  // Pressable (no search-creation screen exists yet).
  postButtonInert: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 38,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
  },
  postButtonFill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  postButtonLabel: {
    fontSize: 15,
    color: neutral.white,
  },
})
