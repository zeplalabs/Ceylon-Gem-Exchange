import { useSignUp } from '@clerk/expo'
import { defaultGemTone, gemTones, neutral } from '@ceylon-gems/ui-tokens'
import * as Linking from 'expo-linking'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, GlassSurface, IconButton, PressableScale } from '../components'
import { ArrowRightIcon, ChevronLeftIcon, EnvelopeIcon } from '../components/icons'
import { GRADIENT_140 } from '../components/primitives/gradientAngle'
import { LiveGradientBackground } from '../components/primitives/LiveGradientBackground'
import { useFontFamily } from '../hooks/useFontFamily'
import { useTranslation } from '../hooks/useTranslation'

const tone = gemTones[defaultGemTone]

// Reached from /verify-phone once phone verification completes AND an
// email was supplied (email is optional, so Clerk already marks the
// sign-up "complete" without it — this is a non-blocking nudge, not a
// gate). Ported from "Ceylon Gem Exchange Email Verification.dc.html",
// which uses Clerk's email_link strategy (no code-entry UI at all — just
// "Open mail app" + resend). verifications.waitForEmailLinkVerification()
// is Clerk's own purpose-built helper for this: it polls the sign-up
// resource server-side, so it resolves once the link is confirmed
// regardless of which device/browser actually opened it — this screen
// doesn't need its own deep-link handler for that. `verificationUrl` only
// needs to be *some* resolvable destination for the post-tap redirect
// (this app's own scheme, via Linking.createURL) — the verification
// itself completes on Clerk's own domain, the first hop the emailed link
// visits, before ever reaching verificationUrl.
export default function VerifyEmailScreen() {
  const t = useTranslation()
  const fonts = useFontFamily()
  const router = useRouter()
  const { signUp } = useSignUp()

  const [secondsLeft, setSecondsLeft] = useState(45)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const finalizedRef = useRef(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : s))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    waitForVerification()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once on mount; handlers below always read the latest `signUp`/`router` via closure.
  }, [])

  const canResend = secondsLeft === 0

  async function finalizeAndGoHome() {
    if (finalizedRef.current) return
    finalizedRef.current = true
    try {
      await signUp.finalize()
    } catch {
      // signUp.status was already 'complete' before this screen ever showed
      // (see verify-phone.tsx) — finalize() failing here doesn't block the
      // user from continuing.
    }
    router.replace('/')
  }

  async function waitForVerification() {
    const { error: waitError } = await signUp.verifications.waitForEmailLinkVerification()
    if (finalizedRef.current) return
    if (waitError) {
      setError(
        waitError.longMessage ?? 'The link expired or failed. Resend the email and try again.',
      )
      return
    }
    await finalizeAndGoHome()
  }

  async function handleResend() {
    if (!canResend || resending) return
    setResending(true)
    setError(null)
    try {
      await signUp.verifications.sendEmailLink({ verificationUrl: Linking.createURL('/') })
      setSecondsLeft(45)
      waitForVerification()
    } catch {
      setError('Could not resend the email. Please try again.')
    } finally {
      setResending(false)
    }
  }

  async function openMailApp() {
    try {
      if (Platform.OS === 'ios') {
        const canOpenMail = await Linking.canOpenURL('message://')
        await Linking.openURL(canOpenMail ? 'message://' : 'mailto:')
      } else {
        await Linking.openURL('mailto:')
      }
    } catch {
      // No mail client available to open — nothing actionable to recover
      // into; the emailed link still works if the user opens Mail manually.
    }
  }

  const resendLabel = canResend
    ? t.auth.verifyEmail.resendEmail
    : `${t.auth.verifyEmail.resendIn} ${secondsLeft}s`
  const steps = [t.auth.verifyEmail.step1, t.auth.verifyEmail.step2, t.auth.verifyEmail.step3]

  return (
    <LiveGradientBackground>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.navRow}>
          <IconButton
            icon={<ChevronLeftIcon />}
            accessibilityLabel={t.common.back}
            onPress={finalizeAndGoHome}
            size={40}
            radius={14}
          />
          <Text style={[styles.navTitle, { fontFamily: fonts.extrabold }]}>
            {t.auth.verifyEmail.navTitle}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.topSpacer} />

          <View style={styles.sealWrap}>
            <View
              style={[
                styles.sealShadowWrap,
                Platform.select({
                  ios: {
                    shadowColor: `rgb(${tone.halo})`,
                    shadowOffset: { width: 0, height: 18 },
                    shadowOpacity: 0.9,
                    shadowRadius: 26,
                  },
                  android: { elevation: 8 },
                }),
              ]}
            >
              <GlassSurface clarity={55} rim={tone.rim} radius={50} style={styles.seal}>
                <EnvelopeIcon size={38} color={tone.ink} strokeWidth={1.4} />
              </GlassSurface>
              <View
                style={[
                  styles.ping,
                  { backgroundColor: tone.accent },
                  Platform.select({
                    ios: {
                      shadowColor: tone.accent,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.9,
                      shadowRadius: 7,
                    },
                    android: { elevation: 4 },
                  }),
                ]}
              />
            </View>
          </View>

          <Text style={[styles.heading, { fontFamily: fonts.extrabold }]}>
            {t.auth.verifyEmail.title}
          </Text>
          <Text style={[styles.subheading, { fontFamily: fonts.medium }]}>
            {t.auth.verifyEmail.subtitle}
            {'\n'}
            <Text style={[styles.destination, { fontFamily: fonts.bold }]}>
              {signUp.emailAddress}
            </Text>
            {t.auth.verifyEmail.subtitleSuffix}
          </Text>

          <GlassSurface clarity={55} radius={22} style={styles.card}>
            {steps.map((text, index) => (
              <View key={index} style={styles.stepRow}>
                <LinearGradient
                  colors={[`${tone.cta[0]}0.5)`, `${tone.cta[1]}0.32)`]}
                  start={GRADIENT_140.start}
                  end={GRADIENT_140.end}
                  style={[styles.stepNum, { borderColor: `rgba(${tone.rim},0.45)` }]}
                >
                  <Text style={[styles.stepNumLabel, { fontFamily: fonts.extrabold }]}>
                    {index + 1}
                  </Text>
                </LinearGradient>
                <Text style={[styles.stepText, { fontFamily: fonts.semibold }]}>{text}</Text>
              </View>
            ))}
          </GlassSurface>

          <Button
            label={t.auth.verifyEmail.openMailApp}
            onPress={openMailApp}
            icon={<ArrowRightIcon />}
            iconPosition="right"
            style={styles.cta}
          />

          <PressableScale
            onPress={handleResend}
            disabled={!canResend || resending}
            accessibilityLabel={resendLabel}
          >
            <GlassSurface clarity={55} radius={25} style={styles.resendPill}>
              <Text
                style={[
                  styles.resendLabel,
                  { fontFamily: fonts.bold },
                  { color: canResend ? neutral.white : 'rgba(255,255,255,0.5)' },
                ]}
              >
                {resendLabel}
              </Text>
            </GlassSurface>
          </PressableScale>

          {error ? (
            <Text
              style={[styles.error, { fontFamily: fonts.regular }]}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
            >
              {error}
            </Text>
          ) : null}

          <View style={styles.bottomSpacer} />

          <View style={styles.wrongRow}>
            <Text style={[styles.wrongPrompt, { fontFamily: fonts.medium }]}>
              {t.auth.verifyEmail.wrongAddress}
            </Text>
            <PressableScale
              onPress={finalizeAndGoHome}
              accessibilityLabel={t.auth.verifyEmail.changeEmail}
            >
              <Text style={[styles.wrongLink, { fontFamily: fonts.bold }]}>
                {t.auth.verifyEmail.changeEmail}
              </Text>
            </PressableScale>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LiveGradientBackground>
  )
}

const styles = StyleSheet.create({
  safeArea: {
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
    flexGrow: 1,
    paddingHorizontal: 22,
  },
  topSpacer: {
    flex: 1,
    minHeight: 8,
  },
  sealWrap: {
    alignItems: 'center',
    marginTop: 10,
  },
  sealShadowWrap: {
    borderRadius: 50,
  },
  seal: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ping: {
    position: 'absolute',
    top: 8,
    right: 10,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  heading: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 28,
    letterSpacing: -0.4,
    color: neutral.white,
  },
  subheading: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 13 * 1.55,
    color: 'rgba(255,255,255,0.55)',
  },
  destination: {
    color: neutral.white,
  },
  card: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 22,
    padding: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumLabel: {
    fontSize: 11,
    color: neutral.white,
  },
  stepText: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(255,255,255,0.72)',
  },
  cta: {
    marginTop: 20,
  },
  resendPill: {
    marginTop: 12,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendLabel: {
    fontSize: 14,
  },
  error: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 12,
    color: neutral.danger.textStrong,
  },
  bottomSpacer: {
    flex: 1,
    minHeight: 16,
  },
  wrongRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: 16,
  },
  wrongPrompt: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
  },
  wrongLink: {
    fontSize: 12,
    color: tone.accent,
  },
})
