import { defaultGemTone, gemTones, neutral } from '@ceylon-gems/ui-tokens'
import { LinearGradient } from 'expo-linear-gradient'
import * as Linking from 'expo-linking'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  GlassSurface,
  IconButton,
  ListingCard,
  PressableScale,
  SegmentedControl,
} from '../../components'
import {
  CallIcon,
  ChatIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  GemIcon,
  HeartIcon,
  PersonIcon,
  ShieldCheckIcon,
  WhatsAppIcon,
} from '../../components/icons'
import { GRADIENT_140 } from '../../components/primitives/gradientAngle'
import { LiveGradientBackground } from '../../components/primitives/LiveGradientBackground'
import { useFontFamily } from '../../hooks/useFontFamily'
import { useTranslation } from '../../hooks/useTranslation'
import { defaultLikedIds, featuredListings, getListingDetail } from '../../lib/listings'

const tone = gemTones[defaultGemTone]
const iconSoft = `rgba(${tone.rim},0.75)`

type Tab = 'about' | 'specs' | 'seller'

// Reached by tapping a ListingCard on Home (or another listing's "Similar
// listings" card, which pushes a fresh copy of this same route). Ports
// "Ceylon Gem Exchange Listing Detail.dc.html". No photo backend exists
// yet (same situation as ListingCard/Home's hero — see their own
// comments), so the gallery renders the same tinted-glass + GemIcon
// placeholder rather than real photos; `@nandorojo/galeria`
// (CLAUDE.md's mandated pinch-zoom/pan-to-close viewer) is deferred until
// there's an actual photo source worth zooming into — pinch-zooming a
// centered placeholder glyph has nothing to demonstrate. The favorite
// toggle is local-only, like Home's own `liked` state (no shared store
// exists yet), so liking here doesn't sync back to Home's grid.
export default function ListingDetailScreen() {
  const t = useTranslation()
  const fonts = useFontFamily()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()
  const listing = getListingDetail(id)

  const [activeImage, setActiveImage] = useState(0)
  const [tab, setTab] = useState<Tab>('about')
  const [fav, setFav] = useState(() => defaultLikedIds.has(id))

  if (!listing) {
    return (
      <LiveGradientBackground>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.navRow}>
            <IconButton
              icon={<ChevronLeftIcon />}
              accessibilityLabel={t.common.back}
              onPress={() => router.back()}
              size={40}
              radius={14}
            />
          </View>
        </SafeAreaView>
      </LiveGradientBackground>
    )
  }

  const photos = Array.from({ length: listing.photoCount }, (_, i) => i)
  const similar = featuredListings.filter((item) => item.id !== listing.id).slice(0, 4)

  function callSeller() {
    Linking.openURL(`tel:${listing!.sellerPhone}`).catch(() => {})
  }

  function messageOnWhatsApp() {
    Linking.openURL(`https://wa.me/${listing!.sellerPhone.replace('+', '')}`).catch(() => {})
  }

  return (
    <LiveGradientBackground>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.navRow}>
          <IconButton
            icon={<ChevronLeftIcon />}
            accessibilityLabel={t.common.back}
            onPress={() => router.back()}
            size={40}
            radius={14}
          />
          <Text style={[styles.navTitle, { fontFamily: fonts.extrabold }]} numberOfLines={1}>
            {listing.lotNumber}
          </Text>
          <PressableScale
            onPress={() => setFav((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={fav ? `Unlike ${listing.name}` : `Like ${listing.name}`}
            accessibilityState={{ selected: fav }}
          >
            {fav ? (
              <LinearGradient
                colors={[`${tone.cta[0]}0.45)`, `${tone.cta[1]}0.3)`]}
                style={[styles.navIconBtn, { borderColor: `rgba(${tone.rim},0.45)` }]}
              >
                <HeartIcon size={17} filled color={tone.accent} />
              </LinearGradient>
            ) : (
              <GlassSurface clarity={55} radius={14} style={styles.navIconBtn}>
                <HeartIcon size={17} color="rgba(255,255,255,0.85)" />
              </GlassSurface>
            )}
          </PressableScale>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <View
            style={[
              styles.gallery,
              Platform.select({
                ios: {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 20 },
                  shadowOpacity: 0.6,
                  shadowRadius: 30,
                },
                android: { elevation: 10 },
              }),
            ]}
          >
            <GlassSurface clarity={55} rim={tone.rim} radius={26} style={styles.galleryGlass}>
              <GemIcon size={44} ink="rgba(255,255,255,0.2)" inkSoft="rgba(255,255,255,0.12)" />
            </GlassSurface>
            <LinearGradient
              colors={['rgba(6,11,26,0.12)', 'rgba(6,11,26,0)', 'rgba(6,11,26,0.6)']}
              locations={[0, 0.4, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <LinearGradient
              colors={[`${tone.cta[0]}0.6)`, `${tone.cta[1]}0.42)`]}
              start={GRADIENT_140.start}
              end={GRADIENT_140.end}
              style={[styles.priceBadge, { borderColor: `rgba(${tone.rim},0.45)` }]}
            >
              <Text style={[styles.priceBadgeLabel, { fontFamily: fonts.extrabold }]}>
                {listing.price}
              </Text>
            </LinearGradient>
            <View style={styles.dotsRow} pointerEvents="none">
              {photos.map((i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === activeImage
                      ? { width: 20, backgroundColor: tone.accent, shadowColor: tone.accent }
                      : { width: 5, backgroundColor: 'rgba(255,255,255,0.4)' },
                  ]}
                />
              ))}
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.thumbRow}
            contentContainerStyle={styles.thumbRowContent}
          >
            {photos.map((i) => {
              const active = i === activeImage
              const thumb = (
                <GlassSurface
                  clarity={55}
                  radius={18}
                  style={[
                    styles.thumb,
                    active && { borderWidth: 1.5, borderColor: `rgba(${tone.rim},0.65)` },
                    !active && styles.thumbInactive,
                  ]}
                >
                  <GemIcon
                    size={18}
                    ink="rgba(255,255,255,0.22)"
                    inkSoft="rgba(255,255,255,0.12)"
                  />
                </GlassSurface>
              )
              return (
                <PressableScale
                  key={i}
                  onPress={() => setActiveImage(i)}
                  accessibilityLabel={`View ${i + 1}`}
                >
                  {active ? <View style={styles.thumbActiveRing}>{thumb}</View> : thumb}
                </PressableScale>
              )
            })}
          </ScrollView>

          <View style={styles.titleRow}>
            <View style={styles.titleCol}>
              <Text style={[styles.title, { fontFamily: fonts.extrabold }]}>{listing.name}</Text>
              <Text style={[styles.titleMeta, { fontFamily: fonts.semibold }]}>
                {listing.origin.split(',')[0]} · {listing.treatment} ·{' '}
                {listing.certNumber.split(' ')[0]} certified
              </Text>
              <View style={styles.sellerRow}>
                <PersonIcon size={13} color={iconSoft} strokeWidth={1.8} />
                <Text style={[styles.sellerRowLabel, { fontFamily: fonts.bold }]}>
                  {listing.sellerName}
                </Text>
              </View>
            </View>
            <View style={styles.priceCol}>
              <Text style={[styles.priceLabel, { fontFamily: fonts.bold }]}>
                {t.listingDetail.priceLabel}
              </Text>
              <Text style={[styles.price, { fontFamily: fonts.extrabold, color: tone.accent }]}>
                {listing.price}
              </Text>
            </View>
          </View>

          <View style={styles.specGrid}>
            <View style={styles.specRow}>
              <SpecCell label={t.listingDetail.weight} value={listing.weight} />
              <SpecCell label={t.listingDetail.shape} value={listing.shape} />
            </View>
            <View style={styles.specRow}>
              <SpecCell label={t.listingDetail.color} value={listing.colour} />
              <SpecCell label={t.listingDetail.clarity} value={listing.clarity} />
            </View>
          </View>

          <SegmentedControl
            variant="glass"
            options={[
              { label: t.listingDetail.aboutTab, value: 'about' as const },
              { label: t.listingDetail.specsTab, value: 'specs' as const },
              { label: t.listingDetail.sellerTab, value: 'seller' as const },
            ]}
            value={tab}
            onChange={setTab}
            style={styles.tabs}
          />

          <GlassSurface clarity={55} radius={22} style={styles.panel}>
            {tab === 'about' ? (
              <Text style={[styles.aboutText, { fontFamily: fonts.regular }]}>
                {listing.description}
              </Text>
            ) : null}

            {tab === 'specs' ? (
              <View style={styles.detailRows}>
                {[
                  { label: 'Origin', value: listing.origin },
                  { label: 'Treatment', value: listing.treatment },
                  { label: 'Dimensions', value: listing.dimensions },
                  { label: 'Cut grade', value: listing.cutGrade },
                  { label: 'Refractive index', value: listing.refractiveIndex },
                  { label: 'Listed', value: listing.listedDate },
                ].map((row, i, arr) => (
                  <View
                    key={row.label}
                    style={[styles.detailRow, i < arr.length - 1 && styles.detailRowDivider]}
                  >
                    <Text style={[styles.detailLabel, { fontFamily: fonts.semibold }]}>
                      {row.label}
                    </Text>
                    <Text style={[styles.detailValue, { fontFamily: fonts.bold }]}>
                      {row.value}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {tab === 'seller' ? (
              <View style={styles.sellerPanelRow}>
                <GlassSurface clarity={55} rim={tone.rim} radius={23} style={styles.sellerAvatar}>
                  <PersonIcon size={22} color={iconSoft} strokeWidth={1.6} />
                </GlassSurface>
                <View style={styles.sellerPanelCol}>
                  <Text style={[styles.sellerPanelName, { fontFamily: fonts.extrabold }]}>
                    {listing.sellerName}
                  </Text>
                  <Text style={[styles.sellerPanelMeta, { fontFamily: fonts.semibold }]}>
                    {listing.sellerMeta}
                  </Text>
                </View>
                <LinearGradient
                  colors={[`${tone.cta[0]}0.5)`, `${tone.cta[1]}0.32)`]}
                  start={GRADIENT_140.start}
                  end={GRADIENT_140.end}
                  style={[styles.sellerChatBtn, { borderColor: `rgba(${tone.rim},0.42)` }]}
                >
                  <ChatIcon size={16} />
                </LinearGradient>
              </View>
            ) : null}
          </GlassSurface>

          <View style={styles.certRow}>
            <View
              style={[
                styles.certIconTile,
                {
                  backgroundColor: `rgba(${tone.rim},0.14)`,
                  borderColor: `rgba(${tone.rim},0.28)`,
                },
              ]}
            >
              <ShieldCheckIcon size={17} color={iconSoft} strokeWidth={1.5} />
            </View>
            <View style={styles.certTextCol}>
              <Text style={[styles.certNumber, { fontFamily: fonts.bold }]}>
                {listing.certNumber}
              </Text>
              <Text style={[styles.certIssued, { fontFamily: fonts.semibold }]}>
                {listing.certIssued}
              </Text>
            </View>
            <ChevronRightIcon />
          </View>

          <View style={styles.similarHeader}>
            <Text style={[styles.similarTitle, { fontFamily: fonts.extrabold }]}>
              {t.listingDetail.similarListings}
            </Text>
            <Text style={[styles.similarViewAll, { fontFamily: fonts.bold, color: tone.accent }]}>
              {t.listingDetail.viewAll}
            </Text>
          </View>

          <View style={styles.similarGrid}>
            <View style={styles.similarRow}>
              {similar.slice(0, 2).map((item) => (
                <View key={item.id} style={styles.similarItem}>
                  <ListingCard
                    name={item.name}
                    spec={item.spec}
                    price={item.price}
                    badge={item.badge}
                    onPress={() => router.push(`/listing/${item.id}`)}
                  />
                </View>
              ))}
            </View>
            <View style={styles.similarRow}>
              {similar.slice(2, 4).map((item) => (
                <View key={item.id} style={styles.similarItem}>
                  <ListingCard
                    name={item.name}
                    spec={item.spec}
                    price={item.price}
                    badge={item.badge}
                    onPress={() => router.push(`/listing/${item.id}`)}
                  />
                </View>
              ))}
            </View>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        <View
          style={[
            styles.actionBar,
            { bottom: insets.bottom + 36 },
            Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 18 },
                shadowOpacity: 0.6,
                shadowRadius: 26,
              },
              android: { elevation: 10 },
            }),
          ]}
        >
          <GlassSurface clarity={55} rim={tone.rim} radius={28} style={styles.actionBarGlass}>
            <PressableScale
              onPress={callSeller}
              style={styles.actionButton}
              accessibilityLabel={t.listingDetail.call}
            >
              <CallIcon size={17} />
              <Text style={[styles.actionLabel, { fontFamily: fonts.extrabold }]}>
                {t.listingDetail.call}
              </Text>
            </PressableScale>
            <PressableScale style={styles.actionButton} accessibilityLabel={t.listingDetail.chat}>
              <ChatIcon size={17} />
              <Text style={[styles.actionLabel, { fontFamily: fonts.extrabold }]}>
                {t.listingDetail.chat}
              </Text>
            </PressableScale>
            <PressableScale
              onPress={messageOnWhatsApp}
              style={styles.actionButton}
              accessibilityLabel={t.listingDetail.whatsapp}
            >
              <WhatsAppIcon size={17} />
              <Text style={[styles.actionLabel, { fontFamily: fonts.extrabold }]}>
                {t.listingDetail.whatsapp}
              </Text>
            </PressableScale>
          </GlassSurface>
        </View>
      </SafeAreaView>
    </LiveGradientBackground>
  )
}

function SpecCell({ label, value }: { label: string; value: string }) {
  const fonts = useFontFamily()
  return (
    <GlassSurface clarity={55} radius={18} style={styles.specCell}>
      <Text style={[styles.specLabel, { fontFamily: fonts.bold }]}>{label}</Text>
      <Text style={[styles.specValue, { fontFamily: fonts.extrabold }]}>{value}</Text>
    </GlassSurface>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  // Exact values from the mockup's default glassClarity (55)/density
  // ("Airy") computations — not the general spacing/fontSize/radii scales,
  // which don't happen to land on these numbers.
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
    fontSize: 15,
    letterSpacing: -0.2,
    color: neutral.white,
  },
  navIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 22,
  },
  gallery: {
    height: 280,
    borderRadius: 26,
  },
  galleryGlass: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 13,
    borderWidth: 1,
  },
  priceBadgeLabel: {
    fontSize: 10,
    letterSpacing: 0.3,
    color: neutral.white,
  },
  dotsRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    height: 5,
    borderRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  thumbRow: {
    marginTop: 12,
    flexGrow: 0,
  },
  thumbRowContent: {
    gap: 10,
  },
  thumb: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbInactive: {
    opacity: 0.75,
  },
  thumbActiveRing: {
    padding: 3,
    borderRadius: 21,
    backgroundColor: `rgba(${tone.halo},0.18)`,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
    marginTop: 20,
  },
  titleCol: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 22,
    letterSpacing: -0.4,
    lineHeight: 22 * 1.15,
    color: neutral.white,
  },
  titleMeta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  sellerRowLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
  },
  priceCol: {
    alignItems: 'flex-end',
    gap: 3,
  },
  priceLabel: {
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.45)',
  },
  price: {
    fontSize: 20,
  },
  specGrid: {
    gap: 10,
    marginTop: 18,
  },
  specRow: {
    flexDirection: 'row',
    gap: 10,
  },
  specCell: {
    flex: 1,
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  specLabel: {
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.45)',
  },
  specValue: {
    fontSize: 14,
    color: neutral.white,
  },
  tabs: {
    marginTop: 18,
  },
  panel: {
    marginTop: 12,
    padding: 16,
  },
  aboutText: {
    fontSize: 13,
    lineHeight: 13 * 1.65,
    color: 'rgba(255,255,255,0.62)',
  },
  detailRows: {
    gap: 11,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 11,
  },
  detailRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  detailLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  detailValue: {
    fontSize: 12,
    color: neutral.white,
  },
  sellerPanelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  sellerAvatar: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerPanelCol: {
    flex: 1,
    gap: 3,
  },
  sellerPanelName: {
    fontSize: 14,
    color: neutral.white,
  },
  sellerPanelMeta: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  sellerChatBtn: {
    width: 38,
    height: 38,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  certRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    padding: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  certIconTile: {
    width: 38,
    height: 38,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  certTextCol: {
    flex: 1,
    gap: 2,
  },
  certNumber: {
    fontSize: 13,
    color: neutral.white,
  },
  certIssued: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
  },
  similarHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  similarTitle: {
    fontSize: 16,
    letterSpacing: -0.2,
    color: neutral.white,
  },
  similarViewAll: {
    fontSize: 12,
  },
  similarGrid: {
    gap: 12,
    marginTop: 14,
  },
  similarRow: {
    flexDirection: 'row',
    gap: 12,
  },
  similarItem: {
    flex: 1,
  },
  bottomSpacer: {
    height: 150,
  },
  actionBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 28,
  },
  actionBarGlass: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
  },
  actionButton: {
    flex: 1,
    height: 50,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  actionLabel: {
    fontSize: 13,
    color: neutral.white,
  },
})
