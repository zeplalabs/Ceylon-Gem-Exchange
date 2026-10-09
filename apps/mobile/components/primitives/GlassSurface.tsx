import { neutral, radii } from '@ceylon-gems/ui-tokens'
import { BlurView } from 'expo-blur'
import { type ReactNode } from 'react'
import {
  Platform,
  StyleSheet,
  View,
  type AccessibilityRole,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native'

interface GlassSurfaceProps {
  /**
   * 0 (milky, low clarity) to 100 (near-invisible, high clarity) — the same
   * `glassClarity` control every .dc.html mockup exposes. Defaults to the
   * mid value used across most cards/sheets in the design.
   */
  clarity?: number
  /**
   * RGB triple string (e.g. `gemTones.sapphire.rim`) tinting the border and
   * top highlight. Defaults to a tone-neutral white, matching the design's
   * untinted glass surfaces (cards, sheets, inputs).
   */
  rim?: string
  /** Corner radius shared by the blur, tint, and border layers — pass a `radii` token, not the outer `style`. */
  radius?: number
  /**
   * Overrides Android's flat-tint fallback fill opacity (0-1) — ignored on
   * iOS, which always derives its look from `clarity`'s real-blur formula
   * and never reads this prop. Use for persistent chrome that needs to stay
   * legible without a blurred backdrop to lean on (nav bars, sheets,
   * dialogs) when the default `clarity`-driven Android opacity reads too
   * see-through for it — see the Android branch below for why that default
   * exists at all.
   */
  androidFillAlpha?: number
  /** e.g. "tablist" when this surface is the track for a SegmentedControl/SegmentedTabs group. */
  accessibilityRole?: AccessibilityRole
  /** For measuring the surface itself, e.g. a SegmentedControl track sizing a sliding indicator. */
  onLayout?: (event: LayoutChangeEvent) => void
  style?: StyleProp<ViewStyle>
  children?: ReactNode
}

// The web mockups build "glass" from `backdrop-filter: blur() saturate()` +
// a translucent fill + a border that's brighter on top (an inset highlight
// faking light catching the top edge). React Native has no backdrop-filter,
// so this reassembles the same read from three native-friendly layers:
// BlurView (the actual blur), a translucent tint View on top of it, and a
// border whose top edge is overridden to a brighter rgba than the rest.
// Saturation boost has no RN equivalent and is dropped.
//
// `intensity` and `fillAlpha` are NOT a literal transcription of the web
// mockup's `blur(px)` value — expo-blur's `intensity` (0-100) isn't the
// same unit as a CSS blur radius, and a CSS-literal range (14-40) reads as
// barely-there on a real BlurView. These two formulas instead come from the
// project's own native-specific reference port (native/theme.ts's
// `glass()`), which recalibrates for real BlurView output: intensity rises
// with clarity (28-70) rather than falling, trading less tint fill for more
// visible blur passthrough. `rimAlpha`/`sheenAlpha` are unaffected — those
// two already matched exactly between the CSS mockup and the native
// reference.
export function GlassSurface({
  clarity = 55,
  rim = neutral.glassRim,
  radius = radii.md,
  androidFillAlpha,
  accessibilityRole,
  onLayout,
  style,
  children,
}: GlassSurfaceProps) {
  const c = Math.max(0, Math.min(100, clarity)) / 100
  // Android: expo-blur has no real blur to offer (confirmed against its own
  // native source — `BlurMethod` defaults to `NONE`, and with no blur
  // target configured, `<BlurView>` just paints its OWN flat background
  // color instead, computed from `tint`/`intensity` via
  // TintStyle.DARK.toColorInt() — a near-black layer at roughly 19-48%
  // opacity for our intensity range, not a neutral no-op. Left alone, that
  // actively darkens every glass surface with an unintended dark cast
  // underneath our own light tint, on top of there being no blur at all.
  // `intensity: 0` neutralizes that contribution entirely (its opacity
  // formula is a direct function of intensity, so 0 → fully transparent
  // regardless of `tint`), and a meaningfully higher flat `fillAlpha` on
  // our own tint View below takes over as the whole "glass" read — the
  // standard way glassmorphism degrades gracefully without a real
  // backdrop-filter.
  //
  // That tint was white at first (matching the fill color iOS's real blur
  // uses), which was the wrong axis to tune: pushing a *white* fill's alpha
  // up to fight legibility just turns the surface light gray/white — a
  // fundamentally different hue from the app's dark theme, no matter how
  // high the alpha goes (confirmed by direct iOS/Android screenshot
  // comparison — iOS's bar reads dark and cool-toned because real blur
  // samples the dark backdrop *underneath* a subtle white wash; Android's
  // flat white tint has no backdrop to sample, so it just trends toward
  // light/gray instead of staying dark). Filling with this dark navy
  // instead (same `6,11,26` the screen's own `neutral.overlay` gradient
  // uses) means a higher alpha deepens toward dark glass, not white — the
  // right direction for this app's theme. Tuned by eye on-device; there's
  // no Android equivalent of the Claude Design mockups to pixel-match
  // against, and the mockups' own numbers assume real blur Android doesn't
  // have, so "looks right on-device" is the only verification available.
  const isAndroid = Platform.OS === 'android'
  const androidFillColor = '6,11,26'
  const fillAlpha = isAndroid ? (androidFillAlpha ?? 0.42 - c * 0.14) : 0.14 - c * 0.09
  const rimAlpha = 0.1 + c * 0.22
  const sheenAlpha = 0.16 + c * 0.3
  const intensity = isAndroid ? 0 : Math.round(28 + c * 42)

  return (
    <View
      accessibilityRole={accessibilityRole}
      onLayout={onLayout}
      style={[styles.clip, { borderRadius: radius }, style]}
    >
      <BlurView
        intensity={intensity}
        tint="dark"
        style={[StyleSheet.absoluteFill, styles.behindContent]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.tint,
          styles.behindContent,
          {
            borderRadius: radius,
            backgroundColor: `rgba(${isAndroid ? androidFillColor : '255,255,255'},${fillAlpha})`,
            borderColor: `rgba(${rim},${rimAlpha})`,
            borderTopColor: `rgba(255,255,255,${sheenAlpha})`,
          },
        ]}
      />
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
  tint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
  },
  // On web, positioned descendants can paint above later in-flow content
  // regardless of DOM order (a real CSS stacking rule React Native's own
  // renderer doesn't have) — without this, these two absolutely-positioned
  // decorative layers visually cover `children` (icons, text) instead of
  // sitting behind them. Harmless no-op on native.
  behindContent: {
    zIndex: -1,
  },
})
