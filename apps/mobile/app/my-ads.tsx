import { useAuth } from '@clerk/expo'
import { gemTones, neutral } from '@ceylon-gems/ui-tokens'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, ConfirmDialog, GlassSurface, IconButton, PressableScale } from '../components'
import {
  ChatIcon,
  ChevronLeftIcon,
  GemIcon,
  HeartIcon,
  PlusIcon,
  ViewsIcon,
} from '../components/icons'
import { GRADIENT_140 } from '../components/primitives/gradientAngle'
import { LiveGradientBackground } from '../components/primitives/LiveGradientBackground'
import { useFontFamily } from '../hooks/useFontFamily'
import { useTranslation } from '../hooks/useTranslation'
import { API_URL } from '../lib/apiUrl'
import { specForDetails } from '../lib/listingSpec'
import { useCurrency } from '../providers/CurrencyProvider'
import { useGemTone } from '../providers/GemToneProvider'

type RealStatus = 'draft' | 'pending_review' | 'active' | 'paused' | 'expired' | 'sold' | 'removed'
type TabKey = 'All' | 'Active' | 'Pending' | 'Sold'

interface RealAdDetails {
  species?: string
  caratWeight?: number
  shape?: string
  certAuthority?: string
  brand?: string
  equipmentType?: string
  condition?: string
}

interface RealAd {
  id: string
  type: 'gem' | 'equipment'
  title: string
  priceAmountCents: number
  priceCurrency: string
  status: RealStatus
  publishedAt: string | null
  createdAt: string
  details: RealAdDetails | null
  viewCount: number
  favoritesCount: number
  inquiryCount: number
}

type DeleteTarget = { id: string; kind: 'hard' | 'soft' }

// "2d ago"/"3w ago"/"2mo ago" — same literal vocabulary the mockup's own
// `allAds` seed used, now computed from a real `publishedAt`/`createdAt`
// instead of being part of the demo content.
function relativeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffDays = Math.max(0, Math.floor(diffMs / 86_400_000))
  if (diffDays < 1) return '<1d ago'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return `${Math.floor(diffDays / 30)}mo ago`
}

// Reached from Profile's "My ads" row. Ports "Ceylon Gem Exchange My
// Ads.dc.html" — stat tiles, status tabs, a card list with per-status
// action pills, an empty state, and a floating "Post a new ad" button.
// Real data now (`GET /listings/mine`, extended to join gem/equipment
// details for a real spec line, a real `viewCount` column, and grouped
// `favorites`/`inquiry_threads` counts) — replaces the static `allAds`
// seed this screen launched with. `views` increments on every real
// `GET /listings/:id` load that isn't the seller's own (a raw impression
// count, not unique visitors — see `listings.viewCount`'s schema comment);
// `saves` is the real `favorites` count; the card's third meta stat
// (new — the mockup's own card only had two) is how many distinct buyers
// have a real inquiry thread about that listing. Status actions are real
// `PATCH /listings/:id/status` calls
// (`submit`/`mark_sold`/`relist`/`renew`/`remove`/`deactivate`/`reactivate`,
// the last four added to the backend specifically for this screen — see
// listings.controller.ts's `STATUS_TRANSITIONS`) or, for a still-`draft`
// ad, a real hard `DELETE /listings/:id`. `deactivate`/`reactivate` are a
// new `active` <-> `paused` pair — a seller pausing a live ad without
// deleting it, distinct from `remove`'s one-way trip to `removed` (no
// transition exists back out of that status). `removed` listings are
// filtered out entirely, same as everywhere else they're treated as gone.
// Edit routes to
// `post-ad.tsx`'s own edit mode (`?id=`) — real only while a listing is
// still `draft`/`pending_review`, matching `PATCH /listings/:id`'s own
// lock-after-publish rule (post-ad.tsx's confirm dialog already states
// this to the seller). "Promote" was dropped (not building listing
// boosts); "View" on a sold ad stays decorative since there's no
// seller-facing "view my own live listing" screen to send it to yet.
export default function MyAdsScreen() {
  const t = useTranslation()
  const fonts = useFontFamily()
  const router = useRouter()
  const { getToken } = useAuth()
  const { gemTone } = useGemTone()
  const tone = gemTones[gemTone]
  const { formatPrice } = useCurrency()

  const [ads, setAds] = useState<RealAd[] | null>(null)
  const [tab, setTab] = useState<TabKey>('All')
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const token = await getToken()
        if (!token) return
        const res = await fetch(`${API_URL}/listings/mine`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok || cancelled) return
        setAds((await res.json()) as RealAd[])
      } catch {
        // Leave `ads` null — renders the loading spinner forever rather
        // than a misleading empty state; a real network/auth failure here
        // is rare enough not to need its own dedicated error screen.
      }
    }
    void load()
    return () => {
      cancelled = true
    }
    // `getToken` deliberately excluded — see edit-profile.tsx's identical
    // fix; Clerk's `useAuth()` hands back a new function identity on every
    // render, which would re-fetch on every render instead of once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function goBack() {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/profile')
    }
  }

  async function performAction(
    ad: RealAd,
    action: 'submit' | 'mark_sold' | 'relist' | 'renew' | 'deactivate' | 'reactivate',
  ) {
    if (busyId) return
    setBusyId(ad.id)
    setActionError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not signed in')
      const res = await fetch(`${API_URL}/listings/${ad.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(body?.message ?? `Failed to update this ad (${res.status})`)
      }
      setAds((prev) =>
        prev ? prev.map((a) => (a.id === ad.id ? { ...a, status: body.status } : a)) : prev,
      )
    } catch (err) {
      setActionError(err instanceof Error && err.message ? err.message : t.common.genericError)
    } finally {
      setBusyId(null)
    }
  }

  async function confirmDeleteOrRemove() {
    if (!deleteTarget || busyId) return
    const { id, kind } = deleteTarget
    setBusyId(id)
    setActionError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not signed in')
      const res = await fetch(
        kind === 'hard' ? `${API_URL}/listings/${id}` : `${API_URL}/listings/${id}/status`,
        {
          method: kind === 'hard' ? 'DELETE' : 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          ...(kind === 'soft' ? { body: JSON.stringify({ action: 'remove' }) } : {}),
        },
      )
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.message ?? `Failed to remove this ad (${res.status})`)
      }
      setAds((prev) => (prev ? prev.filter((a) => a.id !== id) : prev))
    } catch (err) {
      setActionError(err instanceof Error && err.message ? err.message : t.common.genericError)
    } finally {
      setBusyId(null)
      setDeleteTarget(null)
    }
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

  function statusLabel(status: RealStatus) {
    switch (status) {
      case 'draft':
        return t.myAds.statusDraft
      case 'pending_review':
        return t.myAds.statusPending
      case 'active':
        return t.myAds.statusActive
      case 'paused':
        return t.myAds.statusPaused
      case 'sold':
        return t.myAds.statusSold
      case 'expired':
        return t.myAds.statusExpired
      case 'removed':
        return ''
    }
  }

  function statusColor(status: RealStatus) {
    switch (status) {
      case 'active':
        return tone.accent
      case 'pending_review':
      case 'draft':
        return '#ffc65c'
      case 'sold':
        return '#7ee6a8'
      case 'expired':
      case 'paused':
      case 'removed':
        return 'rgba(255,255,255,0.55)'
    }
  }

  function actionsFor(ad: RealAd) {
    switch (ad.status) {
      case 'draft':
        return [
          {
            key: 'edit',
            label: t.myAds.edit,
            primary: false,
            onPress: () => router.push(`/post-ad?id=${ad.id}` as never),
          },
          {
            key: 'submit',
            label: t.myAds.submitForReview,
            primary: true,
            onPress: () => performAction(ad, 'submit'),
          },
          {
            key: 'delete',
            label: t.myAds.delete,
            primary: false,
            onPress: () => setDeleteTarget({ id: ad.id, kind: 'hard' }),
          },
        ]
      case 'pending_review':
        return [
          {
            key: 'edit',
            label: t.myAds.edit,
            primary: false,
            onPress: () => router.push(`/post-ad?id=${ad.id}` as never),
          },
          {
            key: 'remove',
            label: t.myAds.remove,
            primary: false,
            onPress: () => setDeleteTarget({ id: ad.id, kind: 'soft' }),
          },
        ]
      case 'sold':
        return [
          {
            key: 'relist',
            label: t.myAds.relist,
            primary: true,
            onPress: () => performAction(ad, 'relist'),
          },
          { key: 'view', label: t.myAds.view, primary: false },
        ]
      case 'expired':
        return [
          {
            key: 'renew',
            label: t.myAds.renew,
            primary: true,
            onPress: () => performAction(ad, 'renew'),
          },
          {
            key: 'delete',
            label: t.myAds.delete,
            primary: false,
            onPress: () => setDeleteTarget({ id: ad.id, kind: 'soft' }),
          },
        ]
      case 'paused':
        return [
          {
            key: 'reactivate',
            label: t.myAds.reactivate,
            primary: true,
            onPress: () => performAction(ad, 'reactivate'),
          },
          {
            key: 'remove',
            label: t.myAds.remove,
            primary: false,
            onPress: () => setDeleteTarget({ id: ad.id, kind: 'soft' }),
          },
        ]
      case 'active':
      default:
        return [
          {
            key: 'deactivate',
            label: t.myAds.deactivate,
            primary: false,
            onPress: () => performAction(ad, 'deactivate'),
          },
          {
            key: 'markSold',
            label: t.myAds.markSold,
            primary: false,
            onPress: () => performAction(ad, 'mark_sold'),
          },
        ]
    }
  }

  const visibleAds = (ads ?? []).filter((a) => a.status !== 'removed')
  const totalViews = visibleAds.reduce((sum, a) => sum + a.viewCount, 0)
  const totalSaves = visibleAds.reduce((sum, a) => sum + a.favoritesCount, 0)
  const statusToTab: Partial<Record<RealStatus, TabKey>> = {
    active: 'Active',
    pending_review: 'Pending',
    sold: 'Sold',
  }
  const shown = tab === 'All' ? visibleAds : visibleAds.filter((a) => statusToTab[a.status] === tab)
  const isEmpty = ads !== null && shown.length === 0

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

        {ads === null ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={neutral.white} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <View style={styles.statsRow}>
              {(
                [
                  { value: String(visibleAds.length), label: t.myAds.statTotalAds },
                  { value: String(totalViews), label: t.myAds.statViews },
                  { value: String(totalSaves), label: t.myAds.statSaves },
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
                {(['All', 'Active', 'Pending', 'Sold'] as TabKey[]).map((key) => {
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

            {actionError ? <Text style={styles.actionError}>{actionError}</Text> : null}

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
                        {relativeAgo(ad.publishedAt ?? ad.createdAt)}
                      </Text>
                    </View>
                    <Text
                      style={[styles.adName, { fontFamily: fonts.extrabold }]}
                      numberOfLines={1}
                    >
                      {ad.title}
                    </Text>
                    <Text style={[styles.adSpec, { fontFamily: fonts.semibold }]} numberOfLines={1}>
                      {specForDetails(ad.type, ad.details)}
                    </Text>
                    <View style={styles.metaRow}>
                      <Text
                        style={[
                          styles.adPrice,
                          { fontFamily: fonts.extrabold, color: tone.accent },
                        ]}
                      >
                        {formatPrice(ad.priceAmountCents / 100)}
                      </Text>
                      <View style={styles.metaStat}>
                        <ViewsIcon size={13} />
                        <Text style={[styles.metaLabel, { fontFamily: fonts.bold }]}>
                          {ad.viewCount}
                        </Text>
                      </View>
                      <View style={styles.metaStat}>
                        <HeartIcon size={12} color="rgba(255,255,255,0.5)" />
                        <Text style={[styles.metaLabel, { fontFamily: fonts.bold }]}>
                          {ad.favoritesCount}
                        </Text>
                      </View>
                      <View style={styles.metaStat}>
                        <ChatIcon size={12} color="rgba(255,255,255,0.5)" />
                        <Text style={[styles.metaLabel, { fontFamily: fonts.bold }]}>
                          {ad.inquiryCount}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.actionsRow}>
                      {actionsFor(ad).map((action) =>
                        action.onPress ? (
                          <PressableScale
                            key={action.key}
                            onPress={action.onPress}
                            disabled={busyId === ad.id}
                            accessibilityLabel={action.label}
                          >
                            {action.primary ? (
                              <LinearGradient
                                colors={[`${tone.cta[0]}0.72)`, `${tone.cta[1]}0.5)`]}
                                start={GRADIENT_140.start}
                                end={GRADIENT_140.end}
                                style={[
                                  styles.actionPill,
                                  { borderColor: `rgba(${tone.rim},0.45)` },
                                ]}
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
        )}

        <Button
          label={t.myAds.postNewAd}
          icon={<PlusIcon size={15} color={neutral.white} strokeWidth={2.4} />}
          onPress={() => router.push('/post-ad')}
          style={styles.postButton}
        />

        <ConfirmDialog
          visible={deleteTarget !== null}
          title={
            deleteTarget?.kind === 'hard' ? t.myAds.deleteConfirmTitle : t.myAds.removeConfirmTitle
          }
          message={
            deleteTarget?.kind === 'hard'
              ? t.myAds.deleteConfirmMessage
              : t.myAds.removeConfirmMessage
          }
          confirmLabel={deleteTarget?.kind === 'hard' ? t.myAds.delete : t.myAds.remove}
          cancelLabel={t.common.cancel}
          destructive
          onConfirm={confirmDeleteOrRemove}
          onCancel={() => setDeleteTarget(null)}
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
  // — same technique as all-listings.tsx's own nav row.
  navSpacer: {
    width: 40,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  actionError: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 12,
    color: neutral.danger.textStrong,
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
    flexWrap: 'wrap',
    gap: 10,
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
