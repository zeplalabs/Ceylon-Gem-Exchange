import { gemTones, neutral, type GemTone } from '@ceylon-gems/ui-tokens'
import { Image } from 'expo-image'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { useFontFamily } from '../hooks/useFontFamily'
import { useGemTone } from '../providers/GemToneProvider'
import { GlassSurface } from './primitives/GlassSurface'

interface AvatarProps {
  uri?: string
  /** Fallback initials when no `uri` is given (e.g. "AS"). */
  initials?: string
  size?: number
  tone?: GemTone
  /** Small dot in the corner — used for online status or a verified check. */
  badge?: 'online' | 'verified' | null
  /**
   * e.g. a seller's name — announced by screen readers. Omit when the photo
   * is purely decorative next to text that already identifies the person
   * (e.g. inline in a ListRow with its own title); the avatar is then
   * hidden from screen readers instead of announcing bare initials or
   * "image" with no context.
   */
  accessibilityLabel?: string
  style?: StyleProp<ViewStyle>
}

// Profile photo used in headers, list rows, and the Profile screen itself.
// Falls back to a glass circle with initials when there's no photo yet.
export function Avatar({
  uri,
  initials,
  size = 48,
  tone,
  badge,
  accessibilityLabel,
  style,
}: AvatarProps) {
  const { gemTone } = useGemTone()
  const palette = gemTones[tone ?? gemTone]
  const fonts = useFontFamily()

  return (
    <View
      style={[{ width: size, height: size }, style]}
      accessible={accessibilityLabel !== undefined}
      accessibilityRole={accessibilityLabel !== undefined ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel === undefined ? 'no-hide-descendants' : 'yes'}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        />
      ) : (
        <GlassSurface
          radius={size / 2}
          clarity={45}
          style={[styles.fallback, { width: size, height: size }]}
        >
          <Text
            style={[
              styles.initials,
              { fontFamily: fonts.semibold, fontSize: size * 0.36, color: palette.ink },
            ]}
          >
            {initials?.slice(0, 2).toUpperCase()}
          </Text>
        </GlassSurface>
      )}
      {badge ? (
        <View
          style={[
            styles.badge,
            {
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: (size * 0.28) / 2,
              backgroundColor: badge === 'online' ? palette.accent : `${palette.cta[1]}1)`,
            },
          ]}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {},
  badge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: neutral.overlay[1],
  },
})
