import { fontSize, gemTones, neutral, radii, spacing, type GemTone } from '@ceylon-gems/ui-tokens'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { useFontFamily } from '../hooks/useFontFamily'
import { useGemTone } from '../providers/GemToneProvider'

type BadgeVariant = 'accent' | 'success' | 'warning' | 'danger' | 'neutral'

interface BadgeProps {
  label: string
  variant?: BadgeVariant
  tone?: GemTone
  style?: StyleProp<ViewStyle>
}

// Small status pill — "Verified", "New", "Sold", membership tier labels.
// Flat tinted fill (no blur/glass, no press state — badges aren't
// interactive anywhere in the mockups).
export function Badge({ label, variant = 'accent', tone, style }: BadgeProps) {
  const fonts = useFontFamily()
  const { gemTone } = useGemTone()
  const palette = gemTones[tone ?? gemTone]
  const colors = variantColors(variant, palette)

  return (
    <View
      style={[styles.badge, { backgroundColor: colors.surface, borderColor: colors.border }, style]}
    >
      <Text
        style={[styles.label, { fontFamily: fonts.medium, color: colors.text }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  )
}

function variantColors(variant: BadgeVariant, palette: (typeof gemTones)[GemTone]) {
  switch (variant) {
    case 'success':
      return {
        text: palette.accent,
        surface: `rgba(${palette.halo},0.14)`,
        border: `rgba(${palette.halo},0.28)`,
      }
    case 'warning':
      return {
        text: neutral.warning.text,
        surface: 'rgba(255,198,92,0.12)',
        border: 'rgba(255,198,92,0.28)',
      }
    case 'danger':
      return {
        text: neutral.danger.text,
        surface: neutral.danger.surface,
        border: neutral.danger.border,
      }
    case 'neutral':
      return {
        text: 'rgba(255,255,255,0.75)',
        surface: 'rgba(255,255,255,0.08)',
        border: 'rgba(255,255,255,0.16)',
      }
    case 'accent':
    default:
      return {
        text: palette.accent,
        surface: `rgba(${palette.rim},0.1)`,
        border: `rgba(${palette.rim},0.24)`,
      }
  }
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  label: {
    fontSize: fontSize.xs,
  },
})
