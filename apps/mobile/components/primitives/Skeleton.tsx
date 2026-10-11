import { radii } from '@ceylon-gems/ui-tokens'
import { useEffect } from 'react'
import { type DimensionValue, type StyleProp, type ViewStyle } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

interface SkeletonProps {
  width: DimensionValue
  height: number
  /** Defaults to `radii.sm` (chips/badges) — pass `radii.full` for pill-shaped rows, `radii.md`/`lg` for cards. */
  radius?: number
  style?: StyleProp<ViewStyle>
}

// A loading placeholder block — a pulsing translucent-white rect, same
// `rgba(255,255,255,0.a)` family every other low-emphasis surface in the
// kit already uses (filter pills' inactive fill is 0.07/0.16, this just
// breathes between two values in that range) rather than a generic gray
// box, so it reads as part of this app's theme instead of a bolted-on
// library default. `useReducedMotion()` freezes it at the midpoint instead
// of animating, same pattern as Toggle/PressableScale.
export function Skeleton({ width, height, radius = radii.sm, style }: SkeletonProps) {
  const reduceMotion = useReducedMotion()
  const opacity = useSharedValue(reduceMotion ? 0.7 : 0.4)

  useEffect(() => {
    if (reduceMotion) return
    opacity.set(withRepeat(withTiming(1, { duration: 700 }), -1, true))
  }, [reduceMotion, opacity])

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }))

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: 'rgba(255,255,255,0.14)' },
        animatedStyle,
        style,
      ]}
    />
  )
}
