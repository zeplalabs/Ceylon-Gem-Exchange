import { gemTones, neutral } from '@ceylon-gems/ui-tokens'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useVideoPlayer, VideoView, type VideoSource } from 'expo-video'
import { useEffect, useRef, useState } from 'react'
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
import { CloseIcon, GemIcon, HeartIcon, PlayIcon, ShareIcon } from '../../components/icons'
import { GRADIENT_140 } from '../../components/primitives/gradientAngle'
import { useFontFamily } from '../../hooks/useFontFamily'
import { useTranslation } from '../../hooks/useTranslation'
import { getListingDetail } from '../../lib/listings'
import { getListingMedia } from '../../lib/media'
import { useGemTone } from '../../providers/GemToneProvider'

// A video shot's main-stage slide. Its own component (not inline in the
// map below) because `useVideoPlayer` is a hook — one instance per video
// shot, not one shared across the whole stage. Tap-to-play over a poster
// state rather than autoplay: swiping through the gallery shouldn't start
// pulling video data/audio for a clip the user hasn't chosen to watch.
// Deliberately no SVG here (the poster's play glyph is a plain View
// triangle, not `PlayIcon`) — matches the no-SVG-in-this-ScrollView
// workaround below; `VideoView` itself is a native view, not SVG, so it
// isn't subject to that same bug, but the poster button still needs to
// avoid it since it renders before any tap.
function GalleryVideoSlide({
  source,
  width,
  height,
  isActive,
  accessibilityLabel,
}: {
  source: VideoSource
  width: number
  height: number
  isActive: boolean
  accessibilityLabel: string
}) {
  const [started, setStarted] = useState(false)
  const player = useVideoPlayer(source, (p) => {
    p.loop = true
  })

  // Pause (don't tear down) when the user swipes away — scrubbing back to
  // this slide should resume from where it left off, not restart cold.
  useEffect(() => {
    if (!isActive) {
      player.pause()
    }
  }, [isActive, player])

  if (!started) {
    return (
      <PressableScale
        onPress={() => {
          setStarted(true)
          player.play()
        }}
        accessibilityLabel={accessibilityLabel}
        style={[styles.slide, { width, height }]}
      >
        <View style={styles.videoPlayBadge}>
          <View style={styles.videoPlayTriangle} />
        </View>
      </PressableScale>
    )
  }

  return <VideoView style={{ width, height }} player={player} nativeControls contentFit="cover" />
}

// Reached by tapping Listing Detail's hero gallery image. Ports "Ceylon Gem
// Exchange Gallery Viewer.dc.html" — full-bleed media stage behind
// safe-area-respecting chrome (close/counter/share/favorite, caption card,
// pips, filmstrip). Swiping between slides uses a native horizontal
// `pagingEnabled` ScrollView rather than the mockup's own invisible
// left/right tap zones (a real swipe gesture is the better native pattern
// for this, same judgment call as other screens favoring the native-idiom
// interaction over a literal port of a web workaround). No real photo
// source exists yet (see Listing Detail's identical note), so photo slides
// render the same tinted-glass + GemIcon placeholder; the one video shot
// plays a real bundled demo clip (see GalleryVideoSlide above) standing in
// for actual seller-uploaded video until the upload pipeline exists.
// Pinch-zoom via `@nandorojo/galeria` (CLAUDE.md's mandated viewer) stays
// deferred for photos for the same reason it was deferred on Listing
// Detail — nothing real to zoom into yet.
export default function GalleryScreen() {
  const t = useTranslation()
  const fonts = useFontFamily()
  const router = useRouter()
  const { width, height } = useWindowDimensions()
  const { id, index } = useLocalSearchParams<{ id: string; index?: string }>()
  const listing = getListingDetail(id)
  const media = listing ? getListingMedia(listing) : []
  const { gemTone } = useGemTone()
  const tone = gemTones[gemTone]

  const startIndex = Math.min(Math.max(Number(index ?? 0) || 0, 0), Math.max(media.length - 1, 0))
  const [activeIndex, setActiveIndex] = useState(startIndex)
  const [fav, setFav] = useState(false)
  const scrollRef = useRef<ScrollView>(null)

  // If there's no back-stack to pop (a dev reload landing here resets the
  // stack with this screen as the root — the same would be true of a
  // future deep link, e.g. a shared photo URL), the listing it belongs to
  // is the sensible fallback instead of a silently-dead close button.
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

  const current = media[activeIndex]!

  return (
    <View style={styles.root}>
      {/* No `style` prop on this ScrollView — each slide's own explicit
          `height` (full window height) is enough for it to size itself
          without flex/absolute help, which matters here: an SVG descendant
          (GemIcon) silently fails to render whenever the chrome SafeAreaView
          below is `position:'absolute'` — confirmed empirically (isolated
          across several combinations of ScrollView style/pagingEnabled/
          contentOffset, all pointing at the SafeAreaView's absolute
          positioning specifically, not this ScrollView's own setup). Since
          the absolute chrome is required for the correct full-bleed-image-
          behind-floating-glass look, the fix is routing around the bug
          rather than the bug itself: no SVG inside this ScrollView at all
          — the tinted glass background plus the caption card below already
          read as "photo placeholder" without it, and the video slide's
          poster button (see GalleryVideoSlide above) uses a plain View
          triangle instead of PlayIcon for the same reason. GemIcon still
          works fine in the filmstrip ScrollView lower down, which isn't
          affected (it has no absolutely-positioned sibling of its own). */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
        contentOffset={{ x: startIndex * width, y: 0 }}
      >
        {media.map((shot, i) =>
          shot.kind === 'video' && shot.video ? (
            <GalleryVideoSlide
              key={i}
              source={shot.video}
              width={width}
              height={height}
              isActive={i === activeIndex}
              accessibilityLabel={`Play ${shot.title} video`}
            />
          ) : (
            <View key={i} style={[styles.slide, { width, height }]} />
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
              matching the mockup's own unwired share button. */}
          <IconButton
            icon={<ShareIcon />}
            accessibilityLabel={t.common.send}
            size={38}
            radius={19}
          />
          <IconButton
            icon={<HeartIcon filled={fav} color={fav ? tone.accent : 'rgba(255,255,255,0.9)'} />}
            active={fav}
            accessibilityLabel={fav ? `Unlike ${listing.name} photo` : `Like ${listing.name} photo`}
            onPress={() => setFav((v) => !v)}
            size={38}
            radius={19}
          />
        </View>

        <View style={styles.bottomGroup}>
          <View style={styles.bottomArea}>
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

            {/* Hidden entirely (not just the caption line) when this shot has
                no seller-written caption — a title with nothing under it
                would read as broken content, not as "no description yet". */}
            {current.caption ? (
              <GlassSurface clarity={55} radius={22} style={styles.captionCard}>
                <LinearGradient
                  colors={[`${tone.cta[0]}0.55)`, `${tone.cta[1]}0.38)`]}
                  start={GRADIENT_140.start}
                  end={GRADIENT_140.end}
                  style={[styles.kindPill, { borderColor: `rgba(${tone.rim},0.45)` }]}
                >
                  <Text style={[styles.kindPillLabel, { fontFamily: fonts.extrabold }]}>
                    {current.kind === 'video' ? t.gallery.videoLabel : t.gallery.photoLabel}
                  </Text>
                </LinearGradient>
                <Text style={[styles.captionTitle, { fontFamily: fonts.extrabold }]}>
                  {current.title}
                </Text>
                <Text style={[styles.captionText, { fontFamily: fonts.medium }]}>
                  {current.caption}
                </Text>
              </GlassSurface>
            ) : null}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filmstripContent}
            keyboardShouldPersistTaps="handled"
          >
            {media.map((shot, i) => {
              const active = i === activeIndex
              const label = `${shot.kind === 'video' ? t.gallery.videoLabel : t.gallery.photoLabel} ${i + 1}`
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
                  <GemIcon
                    size={20}
                    ink="rgba(255,255,255,0.22)"
                    inkSoft="rgba(255,255,255,0.12)"
                  />
                  {shot.kind === 'video' ? (
                    <View style={styles.videoBadge}>
                      <PlayIcon size={8} />
                    </View>
                  ) : null}
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
  // Anchored directly to the safe area's bottom edge rather than pushed
  // there by a flex spacer — a `flex:1` sibling inside this screen's
  // absolutely-positioned SafeAreaView chrome does not reliably expand to
  // consume the space above it, leaving a large gap below the filmstrip
  // instead of flush with the bottom, matching the mockup's layout.
  bottomGroup: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  // width/height are passed explicitly per-instance (see useWindowDimensions
  // above) rather than as a percentage here — a horizontal ScrollView's
  // content container has no determined height of its own, so a `height:
  // '100%'` child silently collapses to zero instead of resolving against
  // the viewport.
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  videoPlayBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(4,8,18,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  // A right-pointing triangle built from borders — plain Views only, no
  // SVG (see the no-SVG-in-this-ScrollView comment above).
  videoPlayTriangle: {
    width: 0,
    height: 0,
    marginLeft: 4,
    borderTopWidth: 12,
    borderBottomWidth: 12,
    borderLeftWidth: 18,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: neutral.white,
  },
  // Exact values from the mockup's default glassClarity (55)/density
  // ("Airy") computations — not the general spacing/fontSize/radii scales,
  // which don't happen to land on these numbers.
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
  bottomArea: {
    paddingHorizontal: 20,
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
  captionCard: {
    flexDirection: 'column',
    gap: 7,
    padding: 16,
  },
  kindPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 11,
    borderWidth: 1,
  },
  kindPillLabel: {
    fontSize: 9,
    letterSpacing: 0.4,
    color: neutral.white,
    textTransform: 'uppercase',
  },
  captionTitle: {
    fontSize: 15,
    letterSpacing: -0.2,
    color: neutral.white,
  },
  captionText: {
    fontSize: 12,
    lineHeight: 12 * 1.5,
    color: 'rgba(255,255,255,0.55)',
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
  },
  thumbInactive: {
    opacity: 0.62,
  },
  // Approximates the mockup's `0 0 0 3px rgba(halo,0.2)` focus ring — a
  // zero-blur spread shadow is just a solid ring, reproduced here as a
  // padded background rather than a shadow RN can't express directly (same
  // technique as verify-phone.tsx's active code-cell ring).
  thumbActiveRing: {
    padding: 3,
    borderRadius: 19,
  },
  videoBadge: {
    position: 'absolute',
    right: 5,
    bottom: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(4,8,18,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
})
