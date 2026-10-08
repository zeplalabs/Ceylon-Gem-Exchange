import { useSignIn } from '@clerk/expo'
import { fontSize, gemTones, spacing } from '@ceylon-gems/ui-tokens'
import { LinearGradient } from 'expo-linear-gradient'
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
import { Button, Checkbox, GlassSurface, SegmentedControl, TextField } from '../components'
import {
  AppleIcon,
  ArrowRightIcon,
  EyeIcon,
  GemIcon,
  GoogleIcon,
  LockIcon,
  MailIcon,
  PhoneIcon,
  WhatsAppIcon,
} from '../components/icons'
import { LiveGradientBackground } from '../components/primitives/LiveGradientBackground'
import { useFontFamily } from '../hooks/useFontFamily'
import { useTranslation } from '../hooks/useTranslation'
import { countries, defaultCountryIndex, type Country } from '../lib/countries'
import { useGemTone } from '../providers/GemToneProvider'
// countries[defaultCountryIndex] is always Sri Lanka — a fixed array entry,
// not user input — so this cast is safe under noUncheckedIndexedAccess.
const defaultCountry = countries[defaultCountryIndex] as Country

type IdentifierMode = 'mobile' | 'email'

// UI + real Clerk sign-in per the "Ceylon Gem Exchange Login.dc.html"
// design. Three deliberate deviations from the mockup's visible markup:
// (1) the heading personalizes with a returning user's name ("Welcome
// back, Asitha") — dropped since there's no mechanism yet for remembering
// a prior signed-out user's name; a plain "Welcome back" is used instead.
// (2) "Keep me signed in" is rendered but not wired to anything — Clerk's
// Future API has no per-sign-in session-lifetime flag for it to call.
// (3) the Google/Apple/WhatsApp row is visual only — real OAuth needs
// Clerk dashboard strategy configuration and native SDK setup, a separate
// task from porting this screen.
export default function SignInScreen() {
  const t = useTranslation()
  const fonts = useFontFamily()
  const router = useRouter()
  const { signIn } = useSignIn()
  const { gemTone } = useGemTone()
  const tone = gemTones[gemTone]
  const iconSoft = `rgba(${tone.rim},0.75)`

  const [mode, setMode] = useState<IdentifierMode>('mobile')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [revealPassword, setRevealPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const isMobile = mode === 'mobile'

  async function handleSubmit() {
    if (submitting) return

    const trimmed = identifier.trim()
    if (!trimmed || !password) {
      setFormError(t.common.genericError)
      return
    }

    setSubmitting(true)
    setFormError(null)
    try {
      const { error } = await signIn.password({ identifier: trimmed, password })

      if (error) {
        // Clerk's own code for "no user matches this identifier" — a
        // distinct case from a wrong password or a network error (both of
        // which stay here as an inline form error), so it gets its own
        // screen (No Account) naming what was typed, rather than a generic
        // error banner.
        if (error.code === 'form_identifier_not_found') {
          router.push({ pathname: '/no-account', params: { identifier: trimmed } })
          return
        }
        setFormError(error.longMessage ?? t.common.genericError)
        return
      }

      if (signIn.status === 'complete') {
        await signIn.finalize()
        router.replace('/')
        return
      }

      setFormError(t.common.genericError)
    } catch {
      setFormError(t.common.genericError)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <LiveGradientBackground>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.headerRow}>
              <GlassSurface radius={16} clarity={55} style={styles.brandTile}>
                <GemIcon size={22} ink={tone.ink} inkSoft={iconSoft} facets="detailed" />
              </GlassSurface>
              <Text style={[styles.brandText, { fontFamily: fonts.extrabold }]}>
                Ceylon Gem Exchange
              </Text>
            </View>

            <Text style={[styles.heading, { fontFamily: fonts.extrabold }]}>
              {t.auth.signIn.title}
            </Text>
            <Text style={[styles.subtitle, { fontFamily: fonts.medium }]}>
              {t.auth.signIn.subtitle}
            </Text>

            <SegmentedControl
              variant="glass"
              options={[
                { label: t.auth.signIn.mobileMode, value: 'mobile' as const },
                { label: t.auth.signIn.emailMode, value: 'email' as const },
              ]}
              value={mode}
              onChange={setMode}
              style={styles.modeSwitch}
            />

            {formError ? <Text style={styles.formError}>{formError}</Text> : null}

            <View style={styles.fields}>
              <TextField
                label={isMobile ? t.auth.signIn.mobileFieldLabel : t.auth.signIn.emailFieldLabel}
                placeholder={
                  isMobile
                    ? `${defaultCountry.dial} ${defaultCountry.hint}`
                    : t.auth.signIn.emailPlaceholder
                }
                value={identifier}
                onChangeText={setIdentifier}
                leftIcon={isMobile ? <PhoneIcon color={iconSoft} /> : <MailIcon color={iconSoft} />}
                keyboardType={isMobile ? 'phone-pad' : 'email-address'}
                autoCapitalize="none"
              />

              <TextField
                label={t.auth.signIn.passwordLabel}
                placeholder="••••••••"
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
              />
            </View>

            <View style={styles.optionsRow}>
              <Checkbox
                checked={remember}
                onValueChange={setRemember}
                accessibilityLabel={t.auth.signIn.rememberMe}
              >
                <Text style={[styles.rememberText, { fontFamily: fonts.semibold }]}>
                  {t.auth.signIn.rememberMe}
                </Text>
              </Checkbox>
              <Link
                href="/forgot-password"
                style={[styles.forgotLink, { fontFamily: fonts.bold, color: tone.accent }]}
              >
                {t.auth.signIn.forgotPassword}
              </Link>
            </View>

            <Button
              label={t.auth.signIn.submit}
              onPress={handleSubmit}
              loading={submitting}
              icon={<ArrowRightIcon />}
              iconPosition="right"
              style={styles.submitButton}
            />

            <View style={styles.dividerRow}>
              <LinearGradient
                colors={['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.22)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.dividerLine}
              />
              <Text style={[styles.dividerText, { fontFamily: fonts.semibold }]}>
                {t.auth.signIn.orContinueWith}
              </Text>
              <LinearGradient
                colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.02)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.dividerLine}
              />
            </View>

            <View style={styles.socialRow}>
              <GlassSurface clarity={55} radius={18} style={styles.socialButton}>
                <GoogleIcon />
                <Text style={[styles.socialLabel, { fontFamily: fonts.semibold }]}>Google</Text>
              </GlassSurface>
              <GlassSurface clarity={55} radius={18} style={styles.socialButton}>
                <AppleIcon />
                <Text style={[styles.socialLabel, { fontFamily: fonts.semibold }]}>Apple</Text>
              </GlassSurface>
              <GlassSurface clarity={55} radius={18} style={styles.socialButton}>
                <WhatsAppIcon />
                <Text style={[styles.socialLabel, { fontFamily: fonts.semibold }]}>WhatsApp</Text>
              </GlassSurface>
            </View>

            <View style={styles.footerRow}>
              <Text style={[styles.footerText, { fontFamily: fonts.medium }]}>
                {t.auth.signIn.noAccount}
              </Text>
              <Link
                href="/sign-up"
                style={[styles.footerLink, { fontFamily: fonts.semibold, color: tone.accent }]}
              >
                {t.auth.signIn.signUpLink}
              </Link>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
  content: {
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: spacing['3xl'],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandTile: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontSize: 15,
    letterSpacing: -0.2,
    color: 'rgba(255,255,255,0.9)',
  },
  heading: {
    marginTop: 34,
    fontSize: 34,
    lineHeight: 34 * 1.1,
    letterSpacing: -0.6,
    color: '#fff',
  },
  // 13px is the mockup's subheadStyle literal, not fontSize.sm (14).
  subtitle: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 13 * 1.5,
    color: 'rgba(255,255,255,0.55)',
  },
  modeSwitch: {
    marginTop: 24,
  },
  formError: {
    marginTop: spacing.sm,
    fontSize: fontSize.sm,
    color: '#ff9b90',
  },
  fields: {
    marginTop: 18,
    gap: 12,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  rememberText: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.7)',
  },
  forgotLink: {
    fontSize: fontSize.xs,
  },
  submitButton: {
    marginTop: 22,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  // 11px is the mockup's dividerRowStyle span literal, not fontSize.xs (12).
  dividerText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.42)',
  },
  socialRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  socialButton: {
    flex: 1,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  socialLabel: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.75)',
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
})
