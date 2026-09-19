import { defaultGemTone, gemTones, type GemTone } from '@ceylon-gems/ui-tokens'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, type ReactNode } from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { GRADIENT_140 } from './primitives/gradientAngle'
import { PressableScale } from './primitives/PressableScale'

interface ToggleProps {
  value: boolean
  onValueChange: (value: boolean) => void
  disabled?: boolean
  tone?: GemTone
  accessibilityLabel: string
}

// The pill switch used on Account Settings / Notifications rows. Track
// color and thumb position both animate on the UI thread; the thumb is a
// plain white circle rather than glass since it's small enough that a real
// blur would be imperceptible and not worth a second BlurView per row.
export function Toggle({
  value,
  onValueChange,
  disabled,
  tone = defaultGemTone,
  accessibilityLabel,
}: ToggleProps) {
  const palette = gemTones[tone]
  const progress = useSharedValue(value ? 1 : 0)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    progress.set(withTiming(value ? 1 : 0, { duration: reduceMotion ? 0 : 160 }))
  }, [value, progress, reduceMotion])

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.get(),
      [0, 1],
      ['rgba(255,255,255,0.16)', `${palette.cta[1]}0.9)`],
    ),
  }))

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.get() * 20 }],
  }))

  return (
    <PressableScale
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value }}
      scaleTo={0.98}
    >
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </Animated.View>
    </PressableScale>
  )
}

interface CheckboxProps {
  checked: boolean
  onValueChange: (value: boolean) => void
  disabled?: boolean
  tone?: GemTone
  /**
   * Full spoken content, e.g. "I agree to the Trading Terms and NGJA
   * certification checks" — PressableScale's wrapper silences the rich
   * `children` text for screen readers, so this needs to say the whole
   * thing, not just a short name.
   */
  accessibilityLabel: string
  /** The visible label — can include an inline styled span (e.g. a bold "Trading Terms"). Tapping anywhere in the row toggles the checkbox, matching the design; there's no separate terms link target yet. */
  children: ReactNode
  style?: StyleProp<ViewStyle>
}

// Checkbox + inline label row (Signup's terms agreement). Unlike Toggle,
// there's no continuous animation to speak of — just a static gradient
// fill flip, so no reduced-motion handling is needed here.
export function Checkbox({
  checked,
  onValueChange,
  disabled,
  tone = defaultGemTone,
  accessibilityLabel,
  children,
  style,
}: CheckboxProps) {
  const palette = gemTones[tone]

  return (
    <PressableScale
      onPress={() => onValueChange(!checked)}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked }}
      scaleTo={0.98}
      style={[styles.checkboxRow, style]}
    >
      {checked ? (
        <LinearGradient
          colors={[`${palette.cta[0]}0.95)`, `${palette.cta[1]}0.8)`]}
          start={GRADIENT_140.start}
          end={GRADIENT_140.end}
          style={[
            styles.checkboxBox,
            { borderColor: `rgba(${palette.rim},0.6)`, borderTopColor: 'rgba(255,255,255,0.5)' },
          ]}
        >
          <Text style={[styles.checkboxTick, { color: palette.tickInk }]}>✓</Text>
        </LinearGradient>
      ) : (
        <View style={styles.checkboxBoxEmpty} />
      )}
      {children}
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  track: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  // gap and box radius are the mockups' exact termsRowStyle/boxStyle
  // values (10, 7) — not the general spacing/radii scales.
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxEmpty: {
    width: 20,
    height: 20,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  checkboxTick: {
    fontSize: 12,
    fontWeight: '700',
  },
})
