import { neutral, radii, spacing, fontSize } from '@ceylon-gems/ui-tokens'
import { useRef, useState, type ReactNode } from 'react'
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  Text,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextInputKeyPressEventData,
  type TextInputProps,
  type ViewStyle,
} from 'react-native'
import { useFontFamily } from '../hooks/useFontFamily'
import { ChevronDownIcon } from './icons'
import { GlassSurface } from './primitives/GlassSurface'

interface TextFieldProps extends Pick<
  TextInputProps,
  | 'value'
  | 'onChangeText'
  | 'placeholder'
  | 'secureTextEntry'
  | 'keyboardType'
  | 'autoCapitalize'
  | 'editable'
  | 'multiline'
> {
  label?: string
  error?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  /** Corner radius — defaults to the mockups' exact fieldStyle value (18), not the generic GlassSurface default. */
  radius?: number
  style?: StyleProp<ViewStyle>
}

// The glass text field used for every form across the mockups (email,
// password, name, ad title/description). Focus and error both shift the
// border color rather than changing layout, so the field never jumps.
export function TextField({
  label,
  error,
  leftIcon,
  rightIcon,
  radius = 18,
  style,
  multiline,
  ...inputProps
}: TextFieldProps) {
  const [focused, setFocused] = useState(false)
  const fonts = useFontFamily()

  const rim = error ? '255,140,125' : neutral.glassRim
  const borderOverride = error
    ? { borderColor: neutral.danger.border }
    : focused
      ? { borderColor: 'rgba(255,255,255,0.4)' }
      : null

  return (
    <View style={style}>
      {label ? <Text style={[styles.label, { fontFamily: fonts.semibold }]}>{label}</Text> : null}
      <GlassSurface
        rim={rim}
        clarity={55}
        radius={radius}
        style={[styles.fieldSurface, multiline && styles.fieldSurfaceMultiline, borderOverride]}
      >
        {leftIcon}
        <TextInput
          {...inputProps}
          multiline={multiline}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholderTextColor="rgba(255,255,255,0.4)"
          accessibilityLabel={label}
          accessibilityHint={error}
          style={[styles.input, { fontFamily: fonts.regular }, multiline && styles.inputMultiline]}
        />
        {rightIcon}
      </GlassSurface>
      {error ? (
        <Text
          style={[styles.error, { fontFamily: fonts.regular }]}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      ) : null}
    </View>
  )
}

interface PhoneFieldProps {
  label?: string
  error?: string
  countryFlag: string
  countryDial: string
  onPressCountry: () => void
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  /** Corner radius — defaults to the mockups' exact fieldStyle value (18), not the generic GlassSurface default. */
  radius?: number
  style?: StyleProp<ViewStyle>
}

// Mobile-number field with a pressable country-dial-code prefix (Signup,
// Login — anywhere phone is the primary identifier). The dial-code trigger
// just reports a press; the screen owns opening its own country-picker
// BottomSheet rather than this component owning that state.
export function PhoneField({
  label,
  error,
  countryFlag,
  countryDial,
  onPressCountry,
  value,
  onChangeText,
  placeholder,
  radius = 18,
  style,
}: PhoneFieldProps) {
  const [focused, setFocused] = useState(false)
  const fonts = useFontFamily()

  const rim = error ? '255,140,125' : neutral.glassRim
  const borderOverride = error
    ? { borderColor: neutral.danger.border }
    : focused
      ? { borderColor: 'rgba(255,255,255,0.4)' }
      : null

  return (
    <View style={style}>
      {label ? <Text style={[styles.label, { fontFamily: fonts.semibold }]}>{label}</Text> : null}
      <GlassSurface
        rim={rim}
        clarity={55}
        radius={radius}
        style={[styles.fieldSurface, borderOverride]}
      >
        <Pressable
          onPress={onPressCountry}
          hitSlop={6}
          style={styles.dialTrigger}
          accessibilityRole="button"
          accessibilityLabel={`Country code, ${countryDial}`}
        >
          <Text style={styles.dialFlag}>{countryFlag}</Text>
          <Text style={[styles.dialText, { fontFamily: fonts.semibold }]}>{countryDial}</Text>
          <ChevronDownIcon />
        </Pressable>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.4)"
          keyboardType="phone-pad"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label}
          accessibilityHint={error}
          style={[styles.input, { fontFamily: fonts.regular }]}
        />
      </GlassSurface>
      {error ? (
        <Text
          style={[styles.error, { fontFamily: fonts.regular }]}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      ) : null}
    </View>
  )
}

interface SearchBarProps {
  value: string
  onChangeText: (text: string) => void
  onClear?: () => void
  /** Fires on the keyboard's own "search" key — Home uses this to push to the real Search Results screen instead of (or alongside) its own live in-place filtering. */
  onSubmitEditing?: () => void
  placeholder?: string
  /** Screen-reader label for the clear (✕) button — pass a translated string; defaults to English. */
  clearAccessibilityLabel?: string
  leftIcon?: ReactNode
  /** Default full-pill (Home header); a picker sheet's inline search wants the squarer 16 from its own searchStyle instead. */
  radius?: number
  style?: StyleProp<ViewStyle>
}

// Full-pill search field (Home header, Saved Searches).
export function SearchBar({
  value,
  onChangeText,
  onClear,
  onSubmitEditing,
  placeholder,
  clearAccessibilityLabel = 'Clear search',
  leftIcon,
  radius = radii.full,
  style,
}: SearchBarProps) {
  const fonts = useFontFamily()

  return (
    <GlassSurface radius={radius} clarity={55} style={[styles.searchSurface, style]}>
      {leftIcon}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.4)"
        accessibilityLabel={placeholder}
        style={[styles.input, { fontFamily: fonts.regular }]}
        returnKeyType="search"
      />
      {value.length > 0 && onClear ? (
        <Pressable
          onPress={onClear}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={clearAccessibilityLabel}
        >
          <Text style={styles.searchClear}>✕</Text>
        </Pressable>
      ) : null}
    </GlassSurface>
  )
}

interface OtpInputProps {
  length?: number
  value: string
  onChangeText: (text: string) => void
  autoFocus?: boolean
}

// Generic one-glass-cell-per-digit input, OS-keyboard-driven. Not currently
// used — Verification (app/verify-phone.tsx) built its own on-screen-
// keypad-driven cells instead, since its design has no system keyboard at
// all; kept for a future OTP screen (e.g. Email Verification, Reset
// Password) whose design does use a plain keyboard-driven field. Value
// lives in the parent as a single string; this just splits/joins it and
// manages per-cell focus.
export function OtpInput({ length = 6, value, onChangeText, autoFocus }: OtpInputProps) {
  const fonts = useFontFamily()
  const inputs = useRef<Array<TextInput | null>>([])
  const digits = Array.from({ length }, (_, i) => value[i] ?? '')

  const setDigit = (index: number, char: string) => {
    const next = digits.slice()
    next[index] = char
    onChangeText(next.join('').slice(0, length))
    if (char && index < length - 1) {
      inputs.current[index + 1]?.focus()
    }
  }

  const handleKeyPress =
    (index: number) => (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
        inputs.current[index - 1]?.focus()
      }
    }

  return (
    <View style={styles.otpRow}>
      {digits.map((digit, index) => (
        <GlassSurface key={index} clarity={55} radius={radii.md} style={styles.otpCell}>
          <TextInput
            ref={(ref) => {
              inputs.current[index] = ref
            }}
            value={digit}
            onChangeText={(text) => setDigit(index, text.replace(/[^0-9]/g, '').slice(-1))}
            onKeyPress={handleKeyPress(index)}
            keyboardType="number-pad"
            maxLength={1}
            autoFocus={Boolean(autoFocus) && index === 0}
            accessibilityLabel={`Digit ${index + 1} of ${length}`}
            style={[styles.otpDigit, { fontFamily: fonts.semibold }]}
            textAlign="center"
          />
        </GlassSurface>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  // Exact values from the Claude Design mockups' labelStyle — fixed
  // regardless of clarity/density, not derived from the fontSize/spacing
  // token scales.
  label: {
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.62)',
    marginBottom: spacing.sm,
  },
  // Exact values from fieldStyle at the mockups' default glassClarity
  // (55)/density ("Airy"): height 54, padding 14, gap 11 — not the
  // general spacing scale, which doesn't happen to land on these numbers.
  fieldSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    minHeight: 54,
  },
  fieldSurfaceMultiline: {
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    minHeight: 120,
  },
  input: {
    flex: 1,
    fontSize: fontSize.sm,
    color: neutral.white,
    paddingVertical: spacing.md,
  },
  inputMultiline: {
    paddingVertical: 0,
    textAlignVertical: 'top',
  },
  error: {
    fontSize: fontSize.xs,
    color: neutral.danger.text,
    marginTop: spacing.xs,
  },
  dialTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 11,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.16)',
  },
  dialFlag: {
    fontSize: fontSize.base,
  },
  dialText: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.85)',
  },
  searchSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    minHeight: 44,
  },
  searchClear: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: fontSize.sm,
    paddingHorizontal: spacing.xs,
  },
  otpRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  otpCell: {
    width: 48,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpDigit: {
    width: '100%',
    height: '100%',
    fontSize: fontSize.xl,
    color: neutral.white,
  },
})
