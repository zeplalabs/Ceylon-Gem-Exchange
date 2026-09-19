import { defaultGemTone, gemTones, type GemTone } from '@ceylon-gems/ui-tokens'
import { LinearGradient } from 'expo-linear-gradient'
import { memo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useFontFamily } from '../hooks/useFontFamily'
import { ArrowRightIcon, GemIcon, HeartIcon } from './icons'
import { GRADIENT_140 } from './primitives/gradientAngle'
import { GlassSurface } from './primitives/GlassSurface'
import { PressableScale } from './primitives/PressableScale'

interface ListingCardProps {
  name: string
  spec: string
  price: string
  badge: string
  /** Omit both `liked` and `onToggleLike` to render without a heart button at all — e.g. Listing Detail's "similar listings" grid, whose mockup has no like affordance on these cards. */
  liked?: boolean
  tone?: GemTone
  onPress?: () => void
  onToggleLike?: () => void
}

// The 2-per-row grid tile (Home's `ads`, and the shape "My Ads"/"Saved
// Searches"/Listing Detail's "similar listings" reuse) — exact values from
// the Home mockup's `cardStyle`/`badgeStyle`/`heartStyle`/`arrowStyle`, not
// the general Card.tsx (whose uniform padding doesn't fit an image-first
// tile). No real photo backend exists yet, so the image area renders a
// tinted glass placeholder with the brand gem mark instead of an
// `expo-image` — swap in a real photo source once listings have one.
// Primitives-as-props and `memo` per the RN list-performance rules: this
// renders inside a virtualized grid, so it must stay cheap and stable.
function ListingCardImpl({
  name,
  spec,
  price,
  badge,
  liked,
  tone = defaultGemTone,
  onPress,
  onToggleLike,
}: ListingCardProps) {
  const palette = gemTones[tone]
  const fonts = useFontFamily()

  return (
    <GlassSurface radius={22} clarity={55} style={styles.card}>
      {/* The heart button is a sibling overlay, not nested inside the card's
          own PressableScale below — two GestureDetectors nested inside each
          other compete for the same touch, so tapping the heart would also
          scale/fire the card's press. Absolute positioning lets them
          overlap visually without overlapping in the gesture tree. */}
      <PressableScale onPress={onPress} accessibilityLabel={`${name}, ${spec}, ${price}`}>
        <View style={styles.imageArea}>
          <GemIcon size={28} ink="rgba(255,255,255,0.25)" inkSoft="rgba(255,255,255,0.15)" />

          <LinearGradient
            colors={[`${palette.cta[0]}0.6)`, `${palette.cta[1]}0.42)`]}
            start={GRADIENT_140.start}
            end={GRADIENT_140.end}
            style={[styles.badge, { borderColor: `rgba(${palette.rim},0.45)` }]}
          >
            <Text style={[styles.badgeLabel, { fontFamily: fonts.extrabold }]}>{badge}</Text>
          </LinearGradient>
        </View>

        <View style={styles.info}>
          <Text style={[styles.name, { fontFamily: fonts.bold }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.spec, { fontFamily: fonts.semibold }]} numberOfLines={1}>
            {spec}
          </Text>
          <View style={styles.priceRow}>
            <Text style={[styles.price, { fontFamily: fonts.extrabold, color: palette.accent }]}>
              {price}
            </Text>
            <LinearGradient
              colors={[`${palette.cta[0]}0.8)`, `${palette.cta[1]}0.62)`]}
              start={GRADIENT_140.start}
              end={GRADIENT_140.end}
              style={[styles.arrow, { borderColor: `rgba(${palette.rim},0.45)` }]}
            >
              <ArrowRightIcon size={13} />
            </LinearGradient>
          </View>
        </View>
      </PressableScale>

      {onToggleLike ? (
        <PressableScale
          onPress={onToggleLike}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={liked ? `Unlike ${name}` : `Like ${name}`}
          accessibilityState={{ selected: liked }}
          style={styles.heartButton}
        >
          <HeartIcon
            size={13}
            filled={liked}
            color={liked ? palette.accent : 'rgba(255,255,255,0.9)'}
          />
        </PressableScale>
      ) : null}
    </GlassSurface>
  )
}

export const ListingCard = memo(ListingCardImpl)

const styles = StyleSheet.create({
  // Exact values from the mockups' cardStyle/badgeStyle/heartStyle/
  // arrowStyle — image height 118, card radius 22, badge/heart/arrow sizes
  // and offsets — not the general spacing/radii scales.
  card: {
    overflow: 'hidden',
  },
  imageArea: {
    height: 118,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  badgeLabel: {
    fontSize: 9,
    letterSpacing: 0.3,
    color: '#fff',
  },
  heartButton: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 27,
    height: 27,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  info: {
    padding: 12,
    paddingTop: 12,
    paddingBottom: 13,
    gap: 7,
  },
  name: {
    fontSize: 13,
    lineHeight: 13 * 1.3,
    color: '#fff',
  },
  spec: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  price: {
    fontSize: 14,
  },
  arrow: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
})
