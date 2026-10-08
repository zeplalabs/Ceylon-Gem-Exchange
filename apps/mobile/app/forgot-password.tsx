import { useSignIn } from '@clerk/expo'
import { gemTones, neutral } from '@ceylon-gems/ui-tokens'
import { LinearGradient } from 'expo-linear-gradient'
import { Link, useRouter } from 'expo-router'
import { useState, type ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  BottomSheet,
  Button,
  GlassSurface,
  IconButton,
  ListRow,
  PhoneField,
  PressableScale,
  SearchBar,
  TextField,
} from '../components'
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronLeftIcon,
  CloseIcon,
  LockResetIcon,
  MailIcon,
  PhoneIcon,
  SearchIcon,
  ShieldCheckIcon,
} from '../components/icons'
import { GRADIENT_140 } from '../components/primitives/gradientAngle'
import { LiveGradientBackground } from '../components/primitives/LiveGradientBackground'
import { useFontFamily } from '../hooks/useFontFamily'
import { useTranslation } from '../hooks/useTranslation'
import { countries, defaultCountryIndex, type Country } from '../lib/countries'
import { useGemTone } from '../providers/GemToneProvider'

type Channel = 'mobile' | 'email'

// UI + real Clerk password-reset kickoff per the "Ceylon Gem Exchange
// Forgot Password.dc.html" design, reached from sign-in.tsx's existing
// "Forgot password?" link. Uses signIn.create({ identifier }) to look the
// account up, then the matching Future-API reset-code sender
// (resetPasswordPhoneCode/resetPasswordEmailCode.sendCode()) — see the
// Clerk API surface table in CLAUDE.md; these are the SignIn-side
// counterparts to signUp's sendPhoneCode()/sendEmailLink(), verified the
// same way against the installed @clerk/shared type declarations rather
// than assumed. /reset-password (the code + new-password step) is a
// placeholder for now — same situation /verify-phone was in before this
// session ported its real design — since only Forgot Password's design was
// asked for; `channel` is passed through as a route param so that screen
// knows which reset-code verifier to call.
export default function ForgotPasswordScreen() {
  const t = useTranslation()
  const fonts = useFontFamily()
  const router = useRouter()
  const { signIn } = useSignIn()
  const { gemTone } = useGemTone()
  const tone = gemTones[gemTone]
  const iconSoft = `rgba(${tone.rim},0.7)`

  const [channel, setChannel] = useState<Channel>('mobile')
  const [countryIndex, setCountryIndex] = useState(defaultCountryIndex)
  const [mobile, setMobile] = useState('')
  const [email, setEmail] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [countryQuery, setCountryQuery] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // countryIndex only ever comes from defaultCountryIndex or
  // countries.indexOf(...) on a country drawn from this same array, so it's
  // always a valid index — noUncheckedIndexedAccess can't see that.
  const country = countries[countryIndex] as Country
  const filteredCountries = countries.filter((c) => {
    const q = countryQuery.trim().toLowerCase()
    return !q || c.name.toLowerCase().includes(q) || c.dial.includes(q)
  })
  const isMobile = channel === 'mobile'

  async function handleSubmit() {
    if (submitting) return

    const identifier = isMobile ? `${country.dial}${mobile.replace(/\s+/g, '')}` : email.trim()
    if (!identifier) {
      setFormError(t.common.genericError)
      return
    }

    setSubmitting(true)
    setFormError(null)
    try {
      const { error: createError } = await signIn.create({ identifier })
      if (createError) {
        setFormError(createError.longMessage ?? t.common.genericError)
        return
      }

      const { error: sendError } = isMobile
        ? await signIn.resetPasswordPhoneCode.sendCode()
        : await signIn.resetPasswordEmailCode.sendCode()
      if (sendError) {
        setFormError(sendError.longMessage ?? t.common.genericError)
        return
      }

      router.push({ pathname: '/reset-password', params: { channel } })
    } catch {
      setFormError(t.common.genericError)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <LiveGradientBackground>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.navRow}>
          <IconButton
            icon={<ChevronLeftIcon />}
            accessibilityLabel={t.common.back}
            onPress={() => router.back()}
            size={40}
            radius={14}
          />
          {/* `pointerEvents="none"` — the mockup's own `margin-left:-40px`
              centering trick makes this Text's hit box (flex:1, so its
              bounds span the full row) overlap the back IconButton to its
              left. A later sibling paints on top, so without this the
              title silently ate every tap meant for the button. */}
          <Text style={[styles.navTitle, { fontFamily: fonts.extrabold }]} pointerEvents="none">
            {t.auth.forgotPassword.navTitle}
          </Text>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <View style={styles.sealWrap}>
              <View
                style={[
                  styles.sealShadowWrap,
                  Platform.select({
                    ios: {
                      shadowColor: `rgb(${tone.halo})`,
                      shadowOffset: { width: 0, height: 16 },
                      shadowOpacity: 0.9,
                      shadowRadius: 24,
                    },
                    android: { elevation: 8 },
                  }),
                ]}
              >
                <GlassSurface clarity={55} rim={tone.rim} radius={46} style={styles.seal}>
                  <LockResetIcon size={32} color={tone.ink} strokeWidth={1.6} />
                </GlassSurface>
              </View>
            </View>

            <Text style={[styles.heading, { fontFamily: fonts.extrabold }]}>
              {t.auth.forgotPassword.title}
            </Text>
            <Text style={[styles.subheading, { fontFamily: fonts.medium }]}>
              {t.auth.forgotPassword.subtitle}
            </Text>

            <View style={styles.channelWrap}>
              <ChannelRow
                active={channel === 'mobile'}
                icon={
                  <PhoneIcon
                    size={18}
                    color={channel === 'mobile' ? tone.ink : 'rgba(255,255,255,0.6)'}
                    strokeWidth={1.7}
                  />
                }
                title={t.auth.forgotPassword.channelMobileTitle}
                hint={t.auth.forgotPassword.channelMobileHint}
                onPress={() => setChannel('mobile')}
              />
              <ChannelRow
                active={channel === 'email'}
                icon={
                  <MailIcon
                    size={18}
                    color={channel === 'email' ? tone.ink : 'rgba(255,255,255,0.6)'}
                    strokeWidth={1.7}
                  />
                }
                title={t.auth.forgotPassword.channelEmailTitle}
                hint={t.auth.forgotPassword.channelEmailHint}
                onPress={() => setChannel('email')}
              />
            </View>

            {formError ? <Text style={styles.formError}>{formError}</Text> : null}

            {isMobile ? (
              <PhoneField
                label={t.auth.forgotPassword.mobileLabel}
                countryFlag={country.flag}
                countryDial={country.dial}
                onPressCountry={() => {
                  setCountryQuery('')
                  setPickerOpen(true)
                }}
                value={mobile}
                onChangeText={setMobile}
                placeholder={country.hint}
                style={styles.field}
              />
            ) : (
              <TextField
                label={t.auth.forgotPassword.emailLabel}
                placeholder={t.auth.forgotPassword.emailPlaceholder}
                value={email}
                onChangeText={setEmail}
                leftIcon={<MailIcon color={iconSoft} />}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.field}
              />
            )}

            <Button
              label={t.auth.forgotPassword.submit}
              onPress={handleSubmit}
              loading={submitting}
              icon={<ArrowRightIcon />}
              iconPosition="right"
              style={styles.submitButton}
            />

            <View style={styles.note}>
              <ShieldCheckIcon size={14} color={iconSoft} />
              <Text style={[styles.noteText, { fontFamily: fonts.medium }]}>
                {t.auth.forgotPassword.safetyNote}
              </Text>
            </View>

            <View style={styles.footerRow}>
              <Text style={[styles.footerText, { fontFamily: fonts.medium }]}>
                {t.auth.forgotPassword.rememberedIt}
              </Text>
              <Link
                href="/sign-in"
                style={[styles.footerLink, { fontFamily: fonts.bold, color: tone.accent }]}
              >
                {t.auth.forgotPassword.signIn}
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
          <PressableScale
            onPress={() => setPickerOpen(false)}
            hitSlop={8}
            accessibilityLabel={t.common.cancel}
            style={styles.pickerClose}
          >
            <CloseIcon />
          </PressableScale>
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

interface ChannelRowProps {
  active: boolean
  icon: ReactNode
  title: string
  hint: string
  onPress: () => void
}

// One selectable row of the "where should we send your code" choice.
// Active/inactive styling matches the mockup's channels() computation
// exactly (see Ceylon Gem Exchange Forgot Password.dc.html) — a softer
// version of the filled-cell/CTA gradient language elsewhere (0.28/0.16
// alpha, not 0.9/0.76), since this is a selection highlight, not a CTA.
function ChannelRow({ active, icon, title, hint, onPress }: ChannelRowProps) {
  const { gemTone } = useGemTone()
  const tone = gemTones[gemTone]
  const fonts = useFontFamily()

  const content = (
    <>
      <View
        style={[
          styles.channelIconTile,
          active
            ? { backgroundColor: `rgba(${tone.rim},0.18)`, borderColor: `rgba(${tone.rim},0.3)` }
            : { backgroundColor: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.14)' },
        ]}
      >
        {icon}
      </View>
      <View style={styles.channelTextCol}>
        <Text
          style={[
            styles.channelTitle,
            { fontFamily: fonts.bold },
            { color: active ? neutral.white : 'rgba(255,255,255,0.8)' },
          ]}
        >
          {title}
        </Text>
        <Text style={[styles.channelHint, { fontFamily: fonts.medium }]}>{hint}</Text>
      </View>
      <View
        style={[
          styles.channelRadio,
          active
            ? { borderColor: `rgba(${tone.rim},0.7)`, backgroundColor: `rgba(${tone.rim},0.16)` }
            : { borderColor: 'rgba(255,255,255,0.24)' },
        ]}
      >
        {active ? (
          <View
            style={[
              styles.channelRadioDot,
              { backgroundColor: tone.accent, shadowColor: tone.accent },
            ]}
          />
        ) : null}
      </View>
    </>
  )

  if (active) {
    return (
      <PressableScale
        onPress={onPress}
        accessibilityRole="checkbox"
        accessibilityLabel={title}
        accessibilityState={{ checked: true }}
      >
        <View
          style={[
            styles.channelShadowWrap,
            Platform.select({
              ios: {
                shadowColor: `rgb(${tone.halo})`,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.5,
                shadowRadius: 14,
              },
              android: { elevation: 4 },
            }),
          ]}
        >
          <LinearGradient
            colors={[`${tone.cta[0]}0.28)`, `${tone.cta[1]}0.16)`]}
            start={GRADIENT_140.start}
            end={GRADIENT_140.end}
            style={[styles.channelRow, { borderColor: `rgba(${tone.rim},0.42)` }]}
          >
            {content}
          </LinearGradient>
        </View>
      </PressableScale>
    )
  }

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityLabel={title}
      accessibilityState={{ checked: false }}
    >
      <GlassSurface clarity={55} radius={20} style={styles.channelRow}>
        {content}
      </GlassSurface>
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  // Exact values from the mockup's default glassClarity (55)/density
  // ("Airy") computations — not the general spacing/fontSize/radii scales,
  // which don't happen to land on these numbers.
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 22,
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    letterSpacing: -0.2,
    marginLeft: -40,
    color: neutral.white,
  },
  body: {
    paddingHorizontal: 22,
    paddingBottom: 32,
  },
  sealWrap: {
    alignItems: 'center',
    marginTop: 26,
  },
  sealShadowWrap: {
    borderRadius: 46,
  },
  seal: {
    width: 92,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    marginTop: 22,
    textAlign: 'center',
    fontSize: 26,
    letterSpacing: -0.4,
    color: neutral.white,
  },
  subheading: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 13 * 1.55,
    color: 'rgba(255,255,255,0.55)',
  },
  channelWrap: {
    gap: 10,
    marginTop: 24,
  },
  channelShadowWrap: {
    borderRadius: 20,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  channelIconTile: {
    width: 38,
    height: 38,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelTextCol: {
    flex: 1,
    gap: 2,
  },
  channelTitle: {
    fontSize: 14,
  },
  channelHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
  },
  channelRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelRadioDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
  },
  field: {
    marginTop: 18,
  },
  submitButton: {
    marginTop: 20,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  noteText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 11 * 1.5,
    color: 'rgba(255,255,255,0.55)',
  },
  formError: {
    marginTop: 8,
    fontSize: 12,
    color: neutral.danger.textStrong,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  footerLink: {
    fontSize: 12,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  pickerTitle: {
    fontSize: 16,
    color: neutral.white,
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
    marginBottom: 12,
  },
  pickerList: {
    maxHeight: 360,
  },
  pickerFlag: {
    fontSize: 18,
  },
  pickerTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickerDial: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
  },
})
