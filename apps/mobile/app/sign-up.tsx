import { useSignUp } from '@clerk/expo'
import { fontSize, gemTones, spacing } from '@ceylon-gems/ui-tokens'
import { Link, useRouter } from 'expo-router'
import { useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  BottomSheet,
  Button,
  Checkbox,
  GlassSurface,
  ListRow,
  PhoneField,
  SearchBar,
  TextField,
} from '../components'
import {
  ArrowRightIcon,
  CheckIcon,
  CloseIcon,
  EyeIcon,
  GemIcon,
  LockIcon,
  MailIcon,
  PersonIcon,
  SearchIcon,
} from '../components/icons'
import { LiveGradientBackground } from '../components/primitives/LiveGradientBackground'
import { useFontFamily } from '../hooks/useFontFamily'
import { useTranslation } from '../hooks/useTranslation'
import { countries, defaultCountryIndex, type Country } from '../lib/countries'
import { useGemTone } from '../providers/GemToneProvider'

interface FieldErrors {
  name?: string
  mobile?: string
  email?: string
  password?: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// UI + real Clerk sign-up per the "Ceylon Gem Exchange Signup.dc.html"
// design. Phone and email are both required and both verified (see
// /verify-phone and /verify-email) — this Clerk instance's own config
// marks email_address as required, not just phone_number, regardless of
// what the original mockup's copy implied. The design computes a
// password-strength meter and a Dealer/Cutter/Collector role picker, but
// neither is actually rendered in its visible markup, so neither is built
// here.
export default function SignUpScreen() {
  const t = useTranslation()
  const fonts = useFontFamily()
  const router = useRouter()
  const { signUp } = useSignUp()
  const { gemTone } = useGemTone()
  const tone = gemTones[gemTone]
  const iconSoft = `rgba(${tone.rim},0.75)`

  const [name, setName] = useState('')
  const [countryIndex, setCountryIndex] = useState(defaultCountryIndex)
  const [mobile, setMobile] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [revealPassword, setRevealPassword] = useState(false)
  const [agreed, setAgreed] = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [countryQuery, setCountryQuery] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  // countryIndex only ever comes from defaultCountryIndex or
  // countries.indexOf(...) on a country drawn from this same array, so it's
  // always a valid index — noUncheckedIndexedAccess can't see that.
  const country = countries[countryIndex] as Country
  const filteredCountries = countries.filter((c) => {
    const q = countryQuery.trim().toLowerCase()
    return !q || c.name.toLowerCase().includes(q) || c.dial.includes(q)
  })

  async function handleSubmit() {
    if (submitting) return

    const trimmedEmail = email.trim()
    const errors: FieldErrors = {}
    if (!name.trim()) errors.name = 'Enter your full name'
    if (!mobile.trim()) errors.mobile = 'Enter your mobile number'
    if (!trimmedEmail) errors.email = 'Enter your email address'
    else if (!EMAIL_PATTERN.test(trimmedEmail)) errors.email = 'Enter a valid email address'
    if (password.length < 8) errors.password = 'Use at least 8 characters'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    setFormError(null)
    try {
      const [firstName, ...rest] = name.trim().split(/\s+/)
      const lastName = rest.join(' ') || undefined

      const { error } = await signUp.password({
        phoneNumber: `${country.dial}${mobile.replace(/\s+/g, '')}`,
        password,
        firstName,
        lastName,
        emailAddress: trimmedEmail,
      })

      if (error) {
        console.error('[SignUp] signUp.password() returned an error', JSON.stringify(error))
        setFormError(error.longMessage ?? 'Something went wrong. Please try again.')
        return
      }

      if (signUp.status === 'complete') {
        await signUp.finalize()
        router.replace('/')
        return
      }

      await signUp.verifications.sendPhoneCode()
      router.push('/verify-phone')
    } catch (err) {
      console.error('[SignUp] handleSubmit failed', err)
      setFormError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const [termsBefore, termsAfter] = t.auth.signUp.termsAgreement.split('{{tradingTerms}}')

  return (
    <LiveGradientBackground>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.headerRow}>
          <GlassSurface radius={14} clarity={55} style={styles.brandTile}>
            <GemIcon size={20} ink={tone.ink} inkSoft={iconSoft} />
          </GlassSurface>
          <Text style={[styles.brandText, { fontFamily: fonts.extrabold }]}>
            Ceylon Gem Exchange
          </Text>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={[styles.heading, { fontFamily: fonts.extrabold }]}>
              {t.auth.signUp.title}
            </Text>

            {formError ? <Text style={styles.formError}>{formError}</Text> : null}

            <View style={styles.fields}>
              <TextField
                label={t.auth.signUp.nameLabel}
                placeholder={t.auth.signUp.namePlaceholder}
                value={name}
                onChangeText={setName}
                leftIcon={<PersonIcon color={iconSoft} />}
                error={fieldErrors.name}
                autoCapitalize="words"
              />

              <PhoneField
                label={t.auth.signUp.mobileLabel}
                countryFlag={country.flag}
                countryDial={country.dial}
                onPressCountry={() => {
                  setCountryQuery('')
                  setPickerOpen(true)
                }}
                value={mobile}
                onChangeText={setMobile}
                placeholder={country.hint}
                error={fieldErrors.mobile}
              />

              <TextField
                label={t.auth.signUp.emailLabel}
                placeholder={t.auth.signUp.emailPlaceholder}
                value={email}
                onChangeText={setEmail}
                leftIcon={<MailIcon color={iconSoft} />}
                keyboardType="email-address"
                autoCapitalize="none"
                error={fieldErrors.email}
              />

              <TextField
                label={t.auth.signUp.passwordLabel}
                placeholder={t.auth.signUp.passwordPlaceholder}
                value={password}
                onChangeText={setPassword}
                leftIcon={<LockIcon color={iconSoft} />}
                rightIcon={
                  <Pressable
                    onPress={() => setRevealPassword((v) => !v)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={revealPassword ? 'Hide password' : 'Show password'}
                  >
                    <EyeIcon revealed={revealPassword} />
                  </Pressable>
                }
                secureTextEntry={!revealPassword}
                error={fieldErrors.password}
              />
            </View>

            <Checkbox
              checked={agreed}
              onValueChange={setAgreed}
              accessibilityLabel={t.auth.signUp.termsAgreement.replace(
                '{{tradingTerms}}',
                t.auth.signUp.tradingTerms,
              )}
              style={styles.terms}
            >
              <Text style={[styles.termsText, { fontFamily: fonts.medium }]}>
                {termsBefore}
                <Text style={{ fontFamily: fonts.semibold, color: tone.accent }}>
                  {t.auth.signUp.tradingTerms}
                </Text>
                {termsAfter}
              </Text>
            </Checkbox>

            <Button
              label={t.auth.signUp.submit}
              onPress={handleSubmit}
              loading={submitting}
              disabled={!agreed}
              icon={<ArrowRightIcon />}
              iconPosition="right"
              style={styles.submitButton}
            />

            <View style={styles.footerRow}>
              <Text style={[styles.footerText, { fontFamily: fonts.medium }]}>
                {t.auth.signUp.hasAccount}
              </Text>
              <Link
                href="/sign-in"
                style={[styles.footerLink, { fontFamily: fonts.semibold, color: tone.accent }]}
              >
                {t.auth.signUp.signInLink}
              </Link>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <BottomSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        closeAccessibilityLabel={t.common.cancel}
        radius={30}
      >
        <View style={styles.pickerHeader}>
          <Text style={[styles.pickerTitle, { fontFamily: fonts.extrabold }]}>
            {t.countryPicker.title}
          </Text>
          <Pressable
            onPress={() => setPickerOpen(false)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t.common.cancel}
            style={styles.pickerClose}
          >
            <CloseIcon />
          </Pressable>
        </View>
        <SearchBar
          value={countryQuery}
          onChangeText={setCountryQuery}
          placeholder={t.countryPicker.searchPlaceholder}
          leftIcon={<SearchIcon />}
          radius={16}
          style={styles.pickerSearch}
        />
        <ScrollView style={styles.pickerList} keyboardShouldPersistTaps="handled">
          {filteredCountries.map((c) => {
            const isActive = c.dial === country.dial && c.name === country.name
            return (
              <ListRow
                key={c.name}
                title={c.name}
                leading={<Text style={styles.pickerFlag}>{c.flag}</Text>}
                trailing={
                  <View style={styles.pickerTrailing}>
                    <Text style={styles.pickerDial}>{c.dial}</Text>
                    {isActive ? <CheckIcon size={14} color={tone.accent} /> : null}
                  </View>
                }
                onPress={() => {
                  setCountryIndex(countries.indexOf(c))
                  setPickerOpen(false)
                }}
              />
            )
          })}
        </ScrollView>
      </BottomSheet>
    </LiveGradientBackground>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  // Most values below are the mockup's exact numbers at its default
  // glassClarity (55) / density ("Airy") — not the general spacing/
  // fontSize scales, which don't happen to land on these numbers.
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 10,
    paddingHorizontal: 22,
  },
  brandTile: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontSize: fontSize.base,
    letterSpacing: -0.2,
    color: 'rgba(255,255,255,0.9)',
  },
  content: {
    paddingHorizontal: 22,
    paddingBottom: spacing['3xl'],
  },
  heading: {
    marginTop: 22,
    fontSize: 32,
    lineHeight: 32 * 1.1,
    letterSpacing: -0.6,
    color: '#fff',
  },
  formError: {
    marginTop: spacing.sm,
    fontSize: fontSize.sm,
    color: '#ff9b90',
  },
  fields: {
    marginTop: 20,
    gap: spacing.md,
  },
  terms: {
    alignItems: 'flex-start',
    marginTop: 18,
  },
  termsText: {
    flex: 1,
    fontSize: fontSize.xs,
    lineHeight: fontSize.xs * 1.5,
    color: 'rgba(255,255,255,0.62)',
  },
  submitButton: {
    marginTop: 18,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingTop: 14,
  },
  footerText: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.5)',
  },
  footerLink: {
    fontSize: fontSize.xs,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
  },
  pickerTitle: {
    fontSize: fontSize.base,
    color: '#fff',
  },
  pickerClose: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  pickerSearch: {
    marginBottom: spacing.md,
  },
  pickerList: {
    maxHeight: 360,
  },
  pickerFlag: {
    fontSize: fontSize.lg,
  },
  pickerTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pickerDial: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.55)',
  },
})
