import { gemTones, neutral } from '@ceylon-gems/ui-tokens'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, ConfirmDialog, GlassSurface, IconButton, PressableScale } from '../components'
import { ChevronLeftIcon, GemIcon, HeartIcon, PlusIcon, ViewsIcon } from '../components/icons'
import { GRADIENT_140 } from '../components/primitives/gradientAngle'
import { LiveGradientBackground } from '../components/primitives/LiveGradientBackground'
import { useFontFamily } from '../hooks/useFontFamily'
import { useTranslation } from '../hooks/useTranslation'
import { useCurrency } from '../providers/CurrencyProvider'
import { useGemTone } from '../providers/GemToneProvider'

type AdStatus = 'Active' | 'Pending' | 'Sold' | 'Expired'
type TabKey = 'All' | 'Active' | 'Pending' | 'Sold'

interface MyAd {
  id: string
  name: string
  spec: string
  priceUsd: number
  views: string
  saves: string
  status: AdStatus
  posted: string
}

// Ported verbatim from "Ceylon Gem Exchange My Ads.dc.html"'s own `allAds`
// array — demo content in the same sense as Notifications' seeded items,
// not real listings with a backend behind them. `priceUsd` is converted
// from the mockup's literal "$ 8,400"-style strings so prices render
// through `useCurrency().formatPrice()` like every other price in the app
// (lib/listings.ts does the same); `views`/`saves` stay as the mockup's own
// literal strings ("1.2k") since they're display-only demo counters, not
// values this screen computes. Four of the five names/prices exactly match
// featuredListings in lib/listings.ts (this seller's own real listings
// elsewhere in the demo data) — coincidence in the source mockups, kept
// as-is rather than cross-wired, since the two screens were authored with
// independent demo datasets and "Natural Spinel Pair"/"Teal Sapphire" don't
// line up with that catalog closely enough to treat them as the same record.
const INITIAL_ADS: MyAd[] = [
  {
    id: '1',
    name: 'Ceylon Blue Sapphire',
    spec: '3.14 ct · Oval · GIA',
    priceUsd: 8400,
    views: '412',
    saves: '38',
    status: 'Active',
    posted: '2d ago',
  },
  {
    id: '2',
    name: 'Star Ruby Cabochon',
    spec: '5.60 ct · Cabochon',
    priceUsd: 3250,
    views: '196',
    saves: '12',
    status: 'Active',
    posted: '5d ago',
  },
  {
    id: '3',
    name: 'Natural Spinel Pair',
    spec: '1.88 ct · Round · NGJA',
    priceUsd: 1980,
    views: '88',
    saves: '6',
    status: 'Pending',
    posted: '1d ago',
  },
  {
    id: '4',
    name: 'Rainbow Moonstone',
    spec: '6.10 ct · Pear',
    priceUsd: 890,
    views: '1.2k',
    saves: '94',
    status: 'Sold',
    posted: '3w ago',
  },
  {
    id: '5',
    name: 'Teal Sapphire',
    spec: '2.76 ct · Pear',
    priceUsd: 4320,
    views: '54',
    saves: '3',
    status: 'Expired',
    posted: '2mo ago',
  },
]

const TAB_KEYS: TabKey[] = ['All', 'Active', 'Pending', 'Sold']

// Reached from Profile's "My ads" row. Ports "Ceylon Gem Exchange My
// Ads.dc.html" — stat tiles, status tabs (mockup deliberately has no
// "Expired" tab even though it's a real status), a card list with
// per-status action pills, an empty state, and a floating "Post a new ad"
// button. The "+" nav button and the floating button have no real
// destination yet (no Post Ad screen/route exists in this app — the
// `postAd` i18n namespace is a seeded stub from an earlier session that was
// never built into a screen), so both render without a Pressable per the
// same "don't wire a dead tap target" rule app/profile.tsx documents.
// Status-changing action pills (Mark sold/Relist/Renew/Delete) are real
// local-state mutations instead — no new screen needed, matching this
// app's "local-only toggle" precedent (notification prefs, two-factor,
// gem tone) — while Edit/Promote/View stay decorative for the same reason
// as the nav buttons.
export default function MyAdsScreen() {
  const t = useTranslation()
  const fonts = useFontFamily()
  const router = useRouter()
  const { gemTone } = useGemTone()
  const tone = gemTones[gemTone]
  const { formatPrice } = useCurrency()

  const [ads, setAds] = useState<MyAd[]>(INITIAL_ADS)
  const [tab, setTab] = useState<TabKey>('All')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  function goBack() {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/profile')
    }
  }

  function setStatus(id: string, status: AdStatus) {
    setAds((prev) => prev.map((ad) => (ad.id === id ? { ...ad, status } : ad)))
  }

  function confirmDelete() {
    setAds((prev) => prev.filter((ad) => ad.id !== deleteId))
    setDeleteId(null)
  }

  function tabLabel(key: TabKey) {
    switch (key) {
      case 'All':
        return t.myAds.tabAll
      case 'Active':
        return t.myAds.statusActive
      case 'Pending':
        return t.myAds.statusPending
      case 'Sold':
        return t.myAds.statusSold
    }
  }

  function statusLabel(status: AdStatus) {
    switch (status) {
      case 'Active':
        return t.myAds.statusActive
      case 'Pending':
        return t.myAds.statusPending
      case 'Sold':
        return t.myAds.statusSold
      case 'Expired':
        return t.myAds.statusExpired
    }
  }

  function statusColor(status: AdStatus) {
    switch (status) {
      case 'Active':
        return tone.accent
      case 'Pending':
        return '#ffc65c'
      case 'Sold':
        return '#7ee6a8'
      case 'Expired':
        return 'rgba(255,255,255,0.55)'
    }
  }

  function actionsFor(ad: MyAd) {
    if (ad.status === 'Sold') {
      return [
        {
          key: 'relist',
          label: t.myAds.relist,
          primary: true,
          onPress: () => setStatus(ad.id, 'Active'),
        },
        { key: 'view', label: t.myAds.view, primary: false },
      ]
    }
    if (ad.status === 'Expired') {
      return [
        {
          key: 'renew',
          label: t.myAds.renew,
          primary: true,
          onPress: () => setStatus(ad.id, 'Active'),
        },
        { key: 'delete', label: t.myAds.delete, primary: false, onPress: () => setDeleteId(ad.id) },
      ]
    }
    return [
      { key: 'edit', label: t.myAds.edit, primary: true },
      { key: 'promote', label: t.myAds.promote, primary: false },
      {
        key: 'markSold',
        label: t.myAds.markSold,
        primary: false,
        onPress: () => setStatus(ad.id, 'Sold'),
      },
    ]
  }

  const shown = tab === 'All' ? ads : ads.filter((ad) => ad.status === tab)
  const isEmpty = shown.length === 0

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
            {t.myAds.title}
          </Text>
          <View style={styles.navSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.statsRow}>
            {(
              [
                { value: String(ads.length), label: t.myAds.statTotalAds },
                { value: '1.9k', label: t.myAds.statViews },
                { value: '153', label: t.myAds.statSaves },
              ] as const
            ).map((stat) => (
              <GlassSurface
                key={stat.label}
                clarity={55}
                rim={tone.rim}
                radius={20}
                style={styles.statTile}
              >
                <Text style={[styles.statValue, { fontFamily: fonts.extrabold }]}>
                  {stat.value}
                </Text>
                <Text style={[styles.statLabel, { fontFamily: fonts.bold }]} numberOfLines={1}>
                  {stat.label}
                </Text>
              </GlassSurface>
            ))}
          </View>

          <GlassSurface clarity={55} radius={18} style={styles.tabsBar}>
            <View style={styles.tabsRow}>
              {TAB_KEYS.map((key) => {
                const active = tab === key
                const label = tabLabel(key)
                const pillText = (
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.tabLabel,
                      {
                        fontFamily: fonts.bold,
                        color: active ? neutral.white : 'rgba(255,255,255,0.55)',
                      },
                    ]}
                  >
                    {label}
                  </Text>
                )
                return (
                  <PressableScale
                    key={key}
                    onPress={() => setTab(key)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={label}
                    style={styles.tabPressable}
                  >
                    {active ? (
                      <LinearGradient
                        colors={[`${tone.cta[0]}0.5)`, `${tone.cta[1]}0.32)`]}
                        start={GRADIENT_140.start}
                        end={GRADIENT_140.end}
                        style={[styles.tabPill, { borderColor: `rgba(${tone.rim},0.42)` }]}
                      >
                        {pillText}
                      </LinearGradient>
                    ) : (
                      <View style={[styles.tabPill, { borderColor: 'transparent' }]}>
                        {pillText}
                      </View>
                    )}
                  </PressableScale>
                )
              })}
            </View>
          </GlassSurface>

          <View style={styles.listWrap}>
            {shown.map((ad) => (
              <GlassSurface key={ad.id} clarity={55} radius={24} style={styles.card}>
                <GlassSurface clarity={55} rim={tone.rim} radius={18} style={styles.thumb}>
                  <GemIcon
                    size={28}
                    ink="rgba(255,255,255,0.22)"
                    inkSoft="rgba(255,255,255,0.12)"
                  />
                </GlassSurface>
                <View style={styles.cardBody}>
                  <View style={styles.cardTopRow}>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: `rgba(${tone.rim},0.12)`,
                          borderColor: `rgba(${tone.rim},0.24)`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusLabel,
                          { fontFamily: fonts.extrabold, color: statusColor(ad.status) },
                        ]}
                      >
                        {statusLabel(ad.status)}
                      </Text>
                    </View>
                    <Text style={[styles.postedLabel, { fontFamily: fonts.semibold }]}>
                      {ad.posted}
                    </Text>
                  </View>
                  <Text style={[styles.adName, { fontFamily: fonts.extrabold }]} numberOfLines={1}>
                    {ad.name}
                  </Text>
                  <Text style={[styles.adSpec, { fontFamily: fonts.semibold }]} numberOfLines={1}>
                    {ad.spec}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text
                      style={[styles.adPrice, { fontFamily: fonts.extrabold, color: tone.accent }]}
                    >
                      {formatPrice(ad.priceUsd)}
                    </Text>
                    <View style={styles.metaStat}>
                      <ViewsIcon size={13} />
                      <Text style={[styles.metaLabel, { fontFamily: fonts.bold }]}>{ad.views}</Text>
                    </View>
                    <View style={styles.metaStat}>
                      <HeartIcon size={12} color="rgba(255,255,255,0.5)" />
                      <Text style={[styles.metaLabel, { fontFamily: fonts.bold }]}>{ad.saves}</Text>
                    </View>
                  </View>
                  <View style={styles.actionsRow}>
                    {actionsFor(ad).map((action) =>
                      action.onPress ? (
                        <PressableScale
                          key={action.key}
                          onPress={action.onPress}
                          accessibilityLabel={action.label}
                        >
                          {action.primary ? (
                            <LinearGradient
                              colors={[`${tone.cta[0]}0.72)`, `${tone.cta[1]}0.5)`]}
                              start={GRADIENT_140.start}
                              end={GRADIENT_140.end}
                              style={[styles.actionPill, { borderColor: `rgba(${tone.rim},0.45)` }]}
                            >
                              <Text style={[styles.actionLabel, { fontFamily: fonts.extrabold }]}>
                                {action.label}
                              </Text>
                            </LinearGradient>
                          ) : (
                            <View style={[styles.actionPill, styles.actionPillSecondary]}>
                              <Text
                                style={[
                                  styles.actionLabel,
                                  styles.actionLabelSecondary,
                                  { fontFamily: fonts.extrabold },
                                ]}
                              >
                                {action.label}
                              </Text>
                            </View>
                          )}
                        </PressableScale>
                      ) : (
                        <View
                          key={action.key}
                          style={[styles.actionPill, styles.actionPillSecondary]}
                        >
                          <Text
                            style={[
                              styles.actionLabel,
                              styles.actionLabelSecondary,
                              { fontFamily: fonts.extrabold },
                            ]}
                          >
                            {action.label}
                          </Text>
                        </View>
                      ),
                    )}
                  </View>
                </View>
              </GlassSurface>
            ))}
          </View>

          {isEmpty ? (
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
                <GemIcon size={26} ink={tone.ink} inkSoft={tone.ink} strokeWidth={1.5} />
              </View>
              <Text style={[styles.emptyTitle, { fontFamily: fonts.extrabold }]}>
                {t.myAds.emptyTitle}
              </Text>
              <Text style={[styles.emptySubtitle, { fontFamily: fonts.medium }]}>
                {t.myAds.emptySubtitle}
              </Text>
            </GlassSurface>
          ) : null}

          <View style={styles.bottomSpacer} />
        </ScrollView>

        <Button
          label={t.myAds.postNewAd}
          icon={<PlusIcon size={15} color={neutral.white} strokeWidth={2.4} />}
          style={styles.postButton}
        />

        <ConfirmDialog
          visible={deleteId !== null}
          title={t.myAds.deleteConfirmTitle}
          message={t.myAds.deleteConfirmMessage}
          confirmLabel={t.myAds.delete}
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
    paddingBottom: 8,
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    letterSpacing: -0.2,
    color: neutral.white,
  },
  // Balances the back button's width so the title stays visually centered
  // — same technique as all-listings.tsx's own nav row. The mockup's own
  // "+" nav button was dropped per product direction (no Post Ad screen
  // exists yet — see the file-level comment).
  navSpacer: {
    width: 40,
  },
  body: {
    paddingHorizontal: 22,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  statTile: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  statValue: {
    fontSize: 18,
    color: neutral.white,
  },
  statLabel: {
    fontSize: 10,
    letterSpacing: 0.4,
    color: 'rgba(255,255,255,0.45)',
  },
  tabsBar: {
    flexDirection: 'row',
    padding: 5,
    marginTop: 16,
  },
  // width:'100%' — GlassSurface's sole in-flow child shrinks to its content
  // without it, same gotcha documented in notifications.tsx.
  tabsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 6,
  },
  tabPressable: {
    flex: 1,
  },
  tabPill: {
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 12,
  },
  listWrap: {
    gap: 12,
    marginTop: 16,
  },
  card: {
    flexDirection: 'row',
    gap: 13,
    padding: 13,
  },
  thumb: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusPill: {
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 9,
    borderWidth: 1,
  },
  statusLabel: {
    fontSize: 9,
    letterSpacing: 0.3,
  },
  postedLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
  },
  adName: {
    fontSize: 14,
    letterSpacing: -0.1,
    color: neutral.white,
  },
  adSpec: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 2,
  },
  adPrice: {
    fontSize: 14,
  },
  metaStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionPill: {
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionPillSecondary: {
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderColor: 'rgba(255,255,255,0.18)',
  },
  actionLabel: {
    fontSize: 11,
    color: neutral.white,
  },
  actionLabelSecondary: {
    color: 'rgba(255,255,255,0.72)',
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
  bottomSpacer: {
    height: 120,
  },
  postButton: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 38,
  },
})
