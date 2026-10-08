import { gemTones, neutral } from '@ceylon-gems/ui-tokens'
import { Asset } from 'expo-asset'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { useRef, useState } from 'react'
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { GlassSurface, IconButton, PressableScale } from '../../components'
import { CloseIcon, ShareIcon } from '../../components/icons'
import { useFontFamily } from '../../hooks/useFontFamily'
import { useTranslation } from '../../hooks/useTranslation'
import { CERTIFICATES, type CertificateItem } from '../../lib/certificates'
import { getListingDetail } from '../../lib/listings'
import { useGemTone } from '../../providers/GemToneProvider'

// A PDF certificate's main-stage slide. Hands off to the native share
// sheet on tap rather than rendering inline. Two things were tried first
// and dropped: `react-native-webview`, which on iOS handed local PDF
// files off to the native Quick Look "Preview" app instead of rendering
// inside the WebView itself (a `loadFileURL:allowingReadAccessToURL:`
// handoff quirk that didn't resolve with the usual props); and
// `expo-web-browser`'s `openBrowserAsync`, which wraps `SFSafariViewController`
// — built for http/https web pages, not local `file://` URIs, so not a
// safe bet either. `expo-sharing` is the one API actually built for "hand
// a local file to the OS" — the share sheet it opens includes Quick Look
// Preview as one option among several (Save to Files, Mail, etc.), so the
// same native PDF viewer still shows, but now as a deliberate choice from
// a share sheet rather than an automatic surprise. `Asset.fromModule(source).
// downloadAsync()` resolves the bundled PDF to a real file URI on demand,
// only when actually tapped.
function CertificatePdfSlide({
  source,
  width,
  height,
  accessibilityLabel,
}: {
  source: number
  width: number
  height: number
  accessibilityLabel: string
}) {
  const fonts = useFontFamily()

  async function handleOpen() {
    const asset = Asset.fromModule(source)
    await asset.downloadAsync()
    const uri = asset.localUri ?? asset.uri
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri)
    }
  }

  return (
    <PressableScale
      onPress={handleOpen}
      accessibilityLabel={accessibilityLabel}
      style={[styles.slide, { width, height }]}
    >
      <View style={styles.pdfBadge}>
        <Text style={[styles.pdfBadgeLabel, { fontFamily: fonts.extrabold }]}>PDF</Text>
        <Text style={[styles.pdfBadgeHint, { fontFamily: fonts.medium }]}>Tap to view</Text>
      </View>
    </PressableScale>
  )
}

// Reached by tapping Listing Detail's certificate row. Same structure as
// the Gallery Viewer screen (full-bleed swipeable stage behind
// safe-area-respecting chrome, pips, filmstrip) minus the caption card —
// a certificate image/PDF doesn't need a per-slide description the way a
// seller's own photo captions do. No favorite toggle either (liking a
// certificate isn't a meaningful action); share stays, decorative like
// the Gallery Viewer's own unwired share button. Unlike the photo/video
// placeholders elsewhere, these are real bundled demo files (see
// lib/certificates.ts) — there's no per-listing certificate upload
// pipeline yet, so every listing shares the same fixed demo set.
export default function CertificateScreen() {
  const t = useTranslation()
  const fonts = useFontFamily()
  const router = useRouter()
  const { width, height } = useWindowDimensions()
  const { id } = useLocalSearchParams<{ id: string }>()
  const listing = getListingDetail(id)
  const media: CertificateItem[] = CERTIFICATES
  const { gemTone } = useGemTone()
  const tone = gemTones[gemTone]

  const [activeIndex, setActiveIndex] = useState(0)
  const scrollRef = useRef<ScrollView>(null)

  // If there's no back-stack to pop (a dev reload landing here resets the
  // stack with this screen as the root — the same would be true of a
  // future deep link), the listing it belongs to is the sensible
  // fallback instead of a silently-dead close button.
  function handleClose() {
    if (router.canGoBack()) {
      router.back()
    } else if (listing) {
      router.replace(`/listing/${listing.id}`)
    } else {
      router.replace('/')
    }
  }

  function goToIndex(i: number) {
    setActiveIndex(i)
    scrollRef.current?.scrollTo({ x: i * width, animated: true })
  }

  function handleMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / width))
  }

  if (!listing || media.length === 0) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <View style={styles.topRow}>
            <IconButton
              icon={<CloseIcon />}
              accessibilityLabel={t.common.close}
              onPress={handleClose}
              size={38}
              radius={19}
            />
          </View>
        </SafeAreaView>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      {/* No `style` prop on this ScrollView, matching the Gallery Viewer's
          own main stage — see that screen for why (an SVG descendant here
          would silently fail to render under the absolutely-positioned
          chrome below). Slides stay free of SVG here regardless, for
          consistency — `expo-image` isn't SVG-based, and the PDF slide's
          tap-to-open badge is plain Text/Views, not an icon. */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
      >
        {media.map((item, i) =>
          item.kind === 'pdf' ? (
            <CertificatePdfSlide
              key={i}
              source={item.source}
              width={width}
              height={height}
              accessibilityLabel={`Open certificate document ${i + 1}`}
            />
          ) : (
            <Image
              key={i}
              source={item.source}
              style={[styles.slide, { width, height }]}
              contentFit="contain"
            />
          ),
        )}
      </ScrollView>

      <LinearGradient
        colors={['rgba(4,8,18,0.72)', 'rgba(4,8,18,0.1)', 'rgba(4,8,18,0.05)', 'rgba(4,8,18,0.82)']}
        locations={[0, 0.22, 0.55, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <SafeAreaView
        style={StyleSheet.absoluteFill}
        edges={['top', 'bottom']}
        pointerEvents="box-none"
      >
        <View style={styles.topRow}>
          <IconButton
            icon={<CloseIcon />}
            accessibilityLabel={t.common.close}
            onPress={handleClose}
            size={38}
            radius={19}
          />
          <GlassSurface clarity={55} radius={14} style={styles.counterChip}>
            <Text style={[styles.counterLabel, { fontFamily: fonts.extrabold }]}>
              {activeIndex + 1} / {media.length}
            </Text>
          </GlassSurface>
          <View style={styles.flexSpacer} />
          {/* Decorative — no real export/share capability exists yet,
              matching the Gallery Viewer's own unwired share button. */}
          <IconButton
            icon={<ShareIcon />}
            accessibilityLabel={t.common.send}
            size={38}
            radius={19}
          />
        </View>

        <View style={styles.bottomGroup}>
          <View style={styles.pipsRow}>
            {media.map((_, i) => (
              <PressableScale key={i} onPress={() => goToIndex(i)} hitSlop={6}>
                <View
                  style={[
                    styles.pip,
                    i === activeIndex
                      ? { width: 24, backgroundColor: tone.accent, shadowColor: tone.accent }
                      : { width: 6, backgroundColor: 'rgba(255,255,255,0.35)' },
                  ]}
                />
              </PressableScale>
            ))}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filmstripContent}
            keyboardShouldPersistTaps="handled"
          >
            {media.map((item, i) => {
              const active = i === activeIndex
              const label = item.kind === 'pdf' ? `Document ${i + 1}` : `Photo ${i + 1}`
              const thumb = (
                <GlassSurface
                  clarity={55}
                  radius={16}
                  style={[
                    styles.thumb,
                    active
                      ? { borderWidth: 1.5, borderColor: `rgba(${tone.rim},0.7)` }
                      : styles.thumbInactive,
                  ]}
                >
                  {item.kind === 'pdf' ? (
                    <Text style={[styles.thumbPdfLabel, { fontFamily: fonts.extrabold }]}>PDF</Text>
                  ) : (
                    <Image source={item.source} style={styles.thumbImage} contentFit="cover" />
                  )}
                </GlassSurface>
              )
              return (
                <PressableScale key={i} onPress={() => goToIndex(i)} accessibilityLabel={label}>
                  {active ? (
                    <View
                      style={[
                        styles.thumbActiveRing,
                        { backgroundColor: `rgba(${tone.halo},0.2)` },
                      ]}
                    >
                      {thumb}
                    </View>
                  ) : (
                    thumb
                  )}
                </PressableScale>
              )
            })}
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#05070f',
  },
  flex: {
    flex: 1,
  },
  flexSpacer: {
    flex: 1,
  },
  bottomGroup: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  pdfBadge: {
    width: 96,
    height: 120,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(4,8,18,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  pdfBadgeLabel: {
    fontSize: 14,
    letterSpacing: 0.4,
    color: neutral.white,
  },
  pdfBadgeHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 8,
    paddingHorizontal: 20,
  },
  counterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  counterLabel: {
    fontSize: 12,
    letterSpacing: 0.3,
    color: neutral.white,
  },
  pipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingBottom: 14,
  },
  pip: {
    height: 6,
    borderRadius: 3,
  },
  filmstripContent: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
  },
  thumb: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbPdfLabel: {
    fontSize: 10,
    letterSpacing: 0.4,
    color: 'rgba(255,255,255,0.6)',
  },
  thumbInactive: {
    opacity: 0.62,
  },
  // Approximates the mockup's `0 0 0 3px rgba(halo,0.2)` focus ring — a
  // zero-blur spread shadow is just a solid ring, reproduced here as a
  // padded background rather than a shadow RN can't express directly (same
  // technique as the Gallery Viewer's own active-thumbnail ring).
  thumbActiveRing: {
    padding: 3,
    borderRadius: 19,
  },
})
