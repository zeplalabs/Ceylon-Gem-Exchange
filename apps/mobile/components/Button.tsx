import { fontSize, gemTones, neutral, radii, spacing, type GemTone } from '@ceylon-gems/ui-tokens'
import { LinearGradient } from 'expo-linear-gradient'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useFontFamily } from '../hooks/useFontFamily'
import { useGemTone } from '../providers/GemToneProvider'
import { GRADIENT_140 } from './primitives/gradientAngle'
import { GlassSurface } from './primitives/GlassSurface'
import { PressableScale } from './primitives/PressableScale'

// Matches segmentTrackGlass's own padding/gap below — pulled out so the
// sliding pill's width/offset math (SegmentedControl's `glass` variant)
// stays in sync with the track style instead of re-guessing the numbers.
const SEGMENT_TRACK_PADDING = 5
const SEGMENT_TRACK_GAP = 6

interface ButtonProps {
  label: string
  onPress?: () => void
  disabled?: boolean
  loading?: boolean
  /** Overrides the app's active gem tone (from GemToneProvider) for just this button — most callers omit this and inherit the theme. */
  tone?: GemTone
  /** Uses the semantic danger gradient instead of the gem tone — delete/remove actions. */
  danger?: boolean
  icon?: ReactNode
  /** Which side `icon` renders on. Default 'left'; a forward-progress CTA (e.g. "Continue" + arrow) wants 'right'. */
  iconPosition?: 'left' | 'right'
  style?: StyleProp<ViewStyle>
}

// Primary CTA — the full-width gradient pill used for "Sign in", "Post ad",
// "Save changes" etc. across every mockup. The colored glow shadow only
// renders on iOS (Android's `elevation` has no color channel); Android gets
// a plain dark elevation shadow instead, a real platform limitation.
export function Button({
  label,
  onPress,
  disabled,
  loading,
  tone,
  danger,
  icon,
  iconPosition = 'left',
  style,
}: ButtonProps) {
  const { gemTone } = useGemTone()
  const palette = gemTones[tone ?? gemTone]
  const fonts = useFontFamily()
  const isDisabled = disabled || loading
  const gradient: readonly [string, string] = danger
    ? [neutral.danger.ctaFrom, neutral.danger.ctaTo]
    : palette.cta
  const glowRgb = danger ? '214,58,52' : palette.halo
  const rim = danger ? '255,140,125' : palette.rim

  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      accessibilityLabel={label}
      accessibilityState={{ busy: loading }}
      style={style}
    >
      {/* The glow shadow has to live on this unclipped wrapper, not on the
          LinearGradient itself: expo-linear-gradient masks its own layer to
          `borderRadius` so the gradient fill respects the pill shape, and on
          iOS a layer's own drop shadow is clipped by that same
          masksToBounds — so a shadow set alongside borderRadius on the
          gradient view never escaped its bounds (confirmed invisible on a
          real simulator run, not just faint). Values are the design's
          native/components/PrimaryButton.tsx reference port, not the
          .dc.html's literal box-shadow (`0 18px 36px -12px rgba(halo,0.9)`)
          — same CSS-glow-reads-wrong-on-device gap as GlassSurface's blur
          (see CLAUDE.md). */}
      <View
        style={[
          // No `overflow`/`backgroundColor` here — this View only exists to
          // hold the shadow. `borderRadius` alone (without clipping) is
          // still needed so iOS derives a pill-shaped shadow path instead
          // of a plain rectangle behind the rounded gradient.
          { borderRadius: radii.full },
          Platform.select({
            ios: {
              shadowColor: `rgb(${glowRgb})`,
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.9,
              shadowRadius: 18,
            },
            android: { elevation: 8 },
          }),
        ]}
      >
        <LinearGradient
          colors={[`${gradient[0]}0.9)`, `${gradient[1]}0.76)`]}
          start={GRADIENT_140.start}
          end={GRADIENT_140.end}
          style={[
            styles.pill,
            { borderColor: `rgba(${rim},0.5)`, borderTopColor: 'rgba(255,255,255,0.45)' },
          ]}
        >
          {iconPosition === 'left' ? icon : null}
          <Text
            style={[styles.label, { fontFamily: fonts.semibold, color: neutral.white }]}
            numberOfLines={1}
          >
            {loading ? '…' : label}
          </Text>
          {iconPosition === 'right' ? icon : null}
        </LinearGradient>
      </View>
    </PressableScale>
  )
}

interface GhostButtonProps {
  label: string
  onPress?: () => void
  disabled?: boolean
  icon?: ReactNode
  style?: StyleProp<ViewStyle>
}

// Secondary action — plain glass fill, no gradient. Used for "Cancel",
// "Not now", filter-sheet secondary actions.
export function GhostButton({ label, onPress, disabled, icon, style }: GhostButtonProps) {
  const fonts = useFontFamily()
  return (
    <PressableScale onPress={onPress} disabled={disabled} accessibilityLabel={label} style={style}>
      <GlassSurface radius={radii.full} clarity={45} style={styles.pill}>
        {icon}
        <Text
          style={[styles.label, { fontFamily: fonts.medium, color: neutral.white }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </GlassSurface>
    </PressableScale>
  )
}

interface IconButtonProps {
  icon: ReactNode
  onPress?: () => void
  active?: boolean
  disabled?: boolean
  tone?: GemTone
  /** Corner radius — defaults to a full circle; Home's bell/filter buttons use the mockups' literal 14/18 rounded-square instead. */
  radius?: number
  /** Width/height — defaults to 48; Home's header bell/brand-tile buttons are the mockups' literal 40. */
  size?: number
  accessibilityLabel: string
  style?: StyleProp<ViewStyle>
}

// Circular glass button for icon-only actions (back arrow, search, heart,
// notification bell). `active` swaps the flat glass fill for the tone's CTA
// gradient — the "filled" state used for e.g. a saved/favorited heart.
export function IconButton({
  icon,
  onPress,
  active,
  disabled,
  tone,
  radius = radii.full,
  size = 48,
  accessibilityLabel,
  style,
}: IconButtonProps) {
  const { gemTone } = useGemTone()
  const palette = gemTones[tone ?? gemTone]
  // Only announce a selected state when `active` is meaningfully a toggle
  // (e.g. a favorite heart) — most IconButton uses are plain one-shot
  // actions (back, search) with no on/off state to report.
  const toggleState = active === undefined ? undefined : { selected: active }

  if (active) {
    return (
      <PressableScale
        onPress={onPress}
        disabled={disabled}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={toggleState}
        hitSlop={6}
        style={style}
      >
        <LinearGradient
          colors={[`${palette.cta[0]}0.9)`, `${palette.cta[1]}0.9)`]}
          style={[styles.iconCircle, { width: size, height: size, borderRadius: radius }]}
        >
          {icon}
        </LinearGradient>
      </PressableScale>
    )
  }

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={toggleState}
      hitSlop={6}
      style={style}
    >
      <GlassSurface
        radius={radius}
        clarity={55}
        style={[styles.iconCircle, { width: size, height: size }]}
      >
        {icon}
      </GlassSurface>
    </PressableScale>
  )
}

interface SegmentOption<T extends string> {
  label: string
  value: T
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  tone?: GemTone
  /**
   * 'solid' (default) is the fully-opaque CTA-gradient pill used by e.g.
   * locale-settings' language switch. 'glass' is the translucent
   * halo-glow tab used by Login's mode switch (and Signup's `roles`
   * formula, unused there) — same low-alpha `glass()` fill, its own
   * track/item radii (18/14, not `radii.full`), and a halo glow shadow
   * behind the active tab.
   */
  variant?: 'solid' | 'glass'
  style?: StyleProp<ViewStyle>
}

// The pill-track multi-way toggle used for e.g. Buy/Rent, Grid/List,
// currency selection. Track is a flat glass surface; the active segment
// gets the tone's CTA gradient.
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  tone,
  variant = 'solid',
  style,
}: SegmentedControlProps<T>) {
  const { gemTone } = useGemTone()
  const palette = gemTones[tone ?? gemTone]
  const fonts = useFontFamily()

  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  )
  const [trackWidth, setTrackWidth] = useState(0)
  const segmentWidth =
    trackWidth > 0
      ? (trackWidth - SEGMENT_TRACK_PADDING * 2 - SEGMENT_TRACK_GAP * (options.length - 1)) /
        options.length
      : 0
  const reduceMotion = useReducedMotion()
  const translateX = useSharedValue(0)
  const hasMeasuredPill = useRef(false)

  useEffect(() => {
    if (trackWidth <= 0) return
    const target = activeIndex * (segmentWidth + SEGMENT_TRACK_GAP)
    if (!hasMeasuredPill.current) {
      translateX.set(target)
      hasMeasuredPill.current = true
    } else {
      translateX.set(withTiming(target, { duration: reduceMotion ? 0 : 220 }))
    }
  }, [activeIndex, segmentWidth, trackWidth, reduceMotion, translateX])

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.get() }],
  }))

  if (variant === 'glass') {
    return (
      <GlassSurface
        radius={18}
        clarity={55}
        accessibilityRole="tablist"
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        style={[styles.segmentTrackGlass, style]}
      >
        {/* One sliding pill instead of each item swapping its own gradient in/
            out — the CTA glow + gradient fill live here so switching tabs
            reads as the same pill gliding over rather than an instant
            teleport. Only `transform: translateX` is animated per the RN
            skill's rule (never width/left) — every option is `flex: 1`
            (segmentItemWrapper), so the pill's width is a fixed measurement
            from the track's own layout, not something that changes per
            option and needs animating itself. */}
        {trackWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.segmentPill,
              {
                width: segmentWidth,
                borderColor: `rgba(${palette.rim},0.42)`,
                borderTopColor: 'rgba(255,255,255,0.4)',
              },
              Platform.select({
                ios: {
                  shadowColor: `rgb(${palette.halo})`,
                  shadowOffset: { width: 0, height: 7 },
                  shadowOpacity: 0.9,
                  shadowRadius: 12,
                },
                android: { elevation: 4 },
              }),
              pillStyle,
            ]}
          >
            <LinearGradient
              colors={[`${palette.cta[0]}0.5)`, `${palette.cta[1]}0.34)`]}
              start={GRADIENT_140.start}
              end={GRADIENT_140.end}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        ) : null}

        {options.map((option) => {
          const isActive = option.value === value
          return (
            <PressableScale
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="tab"
              accessibilityLabel={option.label}
              accessibilityState={{ selected: isActive }}
              style={styles.segmentItemWrapper}
            >
              <View style={styles.segmentItemGlass}>
                <Text
                  style={[
                    styles.segmentLabelGlass,
                    {
                      fontFamily: fonts.bold,
                      color: isActive ? neutral.white : 'rgba(255,255,255,0.55)',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {option.label}
                </Text>
              </View>
            </PressableScale>
          )
        })}
      </GlassSurface>
    )
  }

  return (
    <GlassSurface
      radius={radii.full}
      clarity={45}
      accessibilityRole="tablist"
      style={[styles.segmentTrack, style]}
    >
      {options.map((option) => {
        const isActive = option.value === value
        return (
          <PressableScale
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: isActive }}
            style={styles.segmentItemWrapper}
          >
            {isActive ? (
              <LinearGradient
                colors={[`${palette.cta[0]}0.9)`, `${palette.cta[1]}0.9)`]}
                style={styles.segmentItem}
              >
                <Text
                  style={[
                    styles.segmentLabel,
                    { fontFamily: fonts.semibold, color: neutral.white },
                  ]}
                  numberOfLines={1}
                >
                  {option.label}
                </Text>
              </LinearGradient>
            ) : (
              <View style={styles.segmentItem}>
                <Text
                  style={[
                    styles.segmentLabel,
                    { fontFamily: fonts.medium, color: 'rgba(255,255,255,0.6)' },
                  ]}
                  numberOfLines={1}
                >
                  {option.label}
                </Text>
              </View>
            )}
          </PressableScale>
        )
      })}
    </GlassSurface>
  )
}

interface ChipProps {
  label: string
  selected?: boolean
  onPress?: () => void
  tone?: GemTone
  style?: StyleProp<ViewStyle>
}

// Small selectable pill for filters/tags (category chips on Post Ad,
// search-filter chips on Saved Searches).
export function Chip({ label, selected, onPress, tone, style }: ChipProps) {
  const { gemTone } = useGemTone()
  const palette = gemTones[tone ?? gemTone]
  const fonts = useFontFamily()

  if (selected) {
    return (
      <PressableScale
        onPress={onPress}
        accessibilityRole="checkbox"
        accessibilityLabel={label}
        accessibilityState={{ checked: true }}
        hitSlop={6}
        style={style}
      >
        <LinearGradient
          colors={[`${palette.cta[0]}0.9)`, `${palette.cta[1]}0.9)`]}
          style={styles.chip}
        >
          <Text style={[styles.chipLabel, { fontFamily: fonts.medium, color: neutral.white }]}>
            {label}
          </Text>
        </LinearGradient>
      </PressableScale>
    )
  }

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: false }}
      hitSlop={6}
      style={style}
    >
      <GlassSurface radius={radii.full} clarity={55} style={styles.chip}>
        <Text
          style={[styles.chipLabel, { fontFamily: fonts.medium, color: 'rgba(255,255,255,0.75)' }]}
        >
          {label}
        </Text>
      </GlassSurface>
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  // height/gap/label size are the mockups' exact ctaStyle values (56, 10,
  // 15) — not the general spacing/fontSize scales.
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  label: {
    fontSize: 15,
  },
  iconCircle: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentTrack: {
    flexDirection: 'row',
    padding: 4,
  },
  segmentItemWrapper: {
    flex: 1,
  },
  segmentItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
  },
  segmentLabel: {
    fontSize: fontSize.sm,
  },
  // Exact values from the Login/Signup mockups' switchWrapStyle/modes —
  // track padding 5 + radius 18, item radius 14 + vertical padding 11 +
  // 13px label — not the general spacing/fontSize/radii scales.
  segmentTrackGlass: {
    flexDirection: 'row',
    gap: 6,
    padding: 5,
  },
  // Position/border match segmentItemGlass below so the pill reads as
  // occupying exactly one track slot; overflow: hidden clips the gradient
  // fill to the rounded corners instead of a separate absoluteFill style.
  segmentPill: {
    position: 'absolute',
    top: SEGMENT_TRACK_PADDING,
    bottom: SEGMENT_TRACK_PADDING,
    left: SEGMENT_TRACK_PADDING,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  segmentItemGlass: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentLabelGlass: {
    fontSize: 13,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  chipLabel: {
    fontSize: fontSize.sm,
  },
})
