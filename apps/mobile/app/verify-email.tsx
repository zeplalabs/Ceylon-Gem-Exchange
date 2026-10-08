import { useSignUp } from '@clerk/expo'
import { gemTones, neutral } from '@ceylon-gems/ui-tokens'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  CodeCellRow,
  GlassSurface,
  IconButton,
  Keypad,
  PressableScale,
  useKeypadCode,
} from '../components'
import { ArrowRightIcon, ChevronLeftIcon, GemIcon } from '../components/icons'
import { GRADIENT_140 } from '../components/primitives/gradientAngle'
import { LiveGradientBackground } from '../components/primitives/LiveGradientBackground'
import { useFontFamily } from '../hooks/useFontFamily'
import { useTranslation } from '../hooks/useTranslation'
import { useGemTone } from '../providers/GemToneProvider'
const CODE_LENGTH = 6

// Reached from /verify-phone once phone verification completes AND an
// email was supplied — this Clerk instance requires a supplied email to
// be verified before the sign-up can complete (status stays
// 'missing_requirements' until then), so this is a real gate, not a
// skippable nudge. Uses Clerk's `email_code` strategy (sendEmailCode()/
// verifyEmailCode()), which is what this instance's environment config
// actually lists for email_address — an earlier version of this screen
// used the `email_link` strategy instead, which doesn't match. Layout and
// the keypad/cell UI itself are shared with /verify-phone (via
// components/KeypadCodeInput.tsx) so the two code-entry screens stay
// visually and behaviorally uniform, per the app's own on-screen-keypad
// design rather than the OS keyboard.
export default function VerifyEmailScreen() {
  const t = useTranslation()
  const fonts = useFontFamily()
  const router = useRouter()
  const { signUp } = useSignUp()
  const { gemTone } = useGemTone()
  const tone = gemTones[gemTone]

  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''))
  const [verified, setVerified] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(45)
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : s))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    signUp.verifications.sendEmailCode()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once on mount; handlers below always read the latest `signUp` via closure.
  }, [])

  const canResend = secondsLeft === 0

  function handleChangeCode(next: string[]) {
    setCode(next)
    setVerified(false)
    setError(null)
  }

  const { active, setActive, press, filled } = useKeypadCode({
    length: CODE_LENGTH,
    value: code,
    onChangeText: handleChangeCode,
  })

  async function handleConfirm() {
    if (!filled || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const { error: verifyError } = await signUp.verifications.verifyEmailCode({
        code: code.join(''),
      })
      if (verifyError) {
        setError(verifyError.longMessage ?? 'Invalid code. Please try again.')
        return
      }
      setVerified(true)
      if (signUp.status === 'complete') {
        await signUp.finalize()
        router.replace('/')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend() {
    if (!canResend || resending) return
    setResending(true)
    setError(null)
    try {
      await signUp.verifications.sendEmailCode()
      setSecondsLeft(45)
      setCode(Array(CODE_LENGTH).fill(''))
      setVerified(false)
    } catch {
      setError('Could not resend the code. Please try again.')
    } finally {
      setResending(false)
    }
  }

  // The stack is [sign-up, verify-email] at this point — verify-phone.tsx
  // reaches here via router.replace(), not push(), so a single back() step
  // lands back on sign-up with the entered fields intact, letting the user
  // correct the email address rather than restarting from nothing.
  function goBackToEditEmail() {
    router.back()
  }

  const statusText = verified
    ? t.auth.verifyEmail.statusVerified
    : filled
      ? t.auth.verifyEmail.statusReadyToConfirm
      : t.auth.verifyEmail.statusExpires
  const ctaLabel = submitting
    ? '…'
    : verified
      ? t.auth.verifyEmail.verified
      : t.auth.verifyEmail.submit
  const resendLabel = canResend
    ? t.auth.verifyEmail.resendCode
    : `${t.auth.verifyEmail.resendIn} ${secondsLeft}s`

  return (
    <LiveGradientBackground>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.navRow}>
          <IconButton
            icon={<ChevronLeftIcon />}
            accessibilityLabel={t.common.back}
            onPress={goBackToEditEmail}
            size={40}
            radius={14}
          />
          {/* `pointerEvents="none"` — the mockup's own `margin-left:-40px`
              centering trick makes this Text's hit box (flex:1, so its
              bounds span the full row) overlap the back IconButton to its
              left. A later sibling paints on top, so without this the
              title silently ate every tap meant for the button. */}
          <Text style={[styles.navTitle, { fontFamily: fonts.extrabold }]} pointerEvents="none">
            {t.auth.verifyEmail.navTitle}
          </Text>
        </View>

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
              <GlassSurface clarity={55} rim={tone.rim} radius={48} style={styles.seal}>
                <GemIcon
                  size={34}
                  ink={tone.ink}
                  inkSoft={`rgba(${tone.rim},0.7)`}
                  strokeWidth={1.5}
                />
              </GlassSurface>
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
          </Text>

          <CodeCellRow
            length={CODE_LENGTH}
            value={code}
            active={active}
            filled={filled}
            onPressCell={setActive}
          />

          <Text
            style={[
              styles.status,
              { fontFamily: fonts.semibold },
              verified && { color: tone.accent },
            ]}
            accessibilityLiveRegion="polite"
          >
            {statusText}
          </Text>

          {error ? (
            <Text
              style={[styles.error, { fontFamily: fonts.regular }]}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
            >
              {error}
            </Text>
          ) : null}

          <PressableScale
            onPress={handleConfirm}
            disabled={submitting}
            accessibilityLabel={ctaLabel}
          >
            {/* Shadow lives on this unclipped wrapper, not the LinearGradient
                itself — see Button.tsx's identical comment on why a shadow
                set alongside borderRadius on a clipped gradient layer never
                renders on iOS. */}
            <View
              style={[
                styles.ctaShadowWrap,
                Platform.select({
                  ios: {
                    shadowColor: `rgb(${tone.halo})`,
                    shadowOffset: { width: 0, height: 12 },
                    shadowOpacity: filled ? 0.9 : 0.35,
                    shadowRadius: 18,
                  },
                  android: { elevation: filled ? 8 : 2 },
                }),
              ]}
            >
              <LinearGradient
                colors={[
                  `${tone.cta[0]}${filled ? '0.9' : '0.45'})`,
                  `${tone.cta[1]}${filled ? '0.76' : '0.32'})`,
                ]}
                start={GRADIENT_140.start}
                end={GRADIENT_140.end}
                style={[
                  styles.cta,
                  { borderColor: `rgba(${tone.rim},${filled ? '0.5' : '0.28'})` },
                ]}
              >
                <Text
                  style={[
                    styles.ctaLabel,
                    { fontFamily: fonts.semibold },
                    { color: filled ? neutral.white : 'rgba(255,255,255,0.65)' },
                  ]}
                >
                  {ctaLabel}
                </Text>
                <ArrowRightIcon size={17} />
              </LinearGradient>
            </View>
          </PressableScale>

          <View style={styles.resendRow}>
            <Text style={[styles.resendPrompt, { fontFamily: fonts.medium }]}>
              {t.auth.verifyEmail.resendPrompt}
            </Text>
            <PressableScale
              onPress={handleResend}
              disabled={!canResend || resending}
              accessibilityLabel={resendLabel}
            >
              <Text style={[styles.resendLink, { fontFamily: fonts.bold, color: tone.accent }]}>
                {resendLabel}
              </Text>
            </PressableScale>
          </View>

          <View style={styles.wrongRow}>
            <Text style={[styles.wrongPrompt, { fontFamily: fonts.medium }]}>
              {t.auth.verifyEmail.wrongAddress}
            </Text>
            <PressableScale
              onPress={goBackToEditEmail}
              accessibilityLabel={t.auth.verifyEmail.changeEmail}
            >
              <Text style={[styles.wrongLink, { fontFamily: fonts.bold, color: tone.accent }]}>
                {t.auth.verifyEmail.changeEmail}
              </Text>
            </PressableScale>
          </View>

          <View style={styles.spacer} />

          <Keypad onPressKey={press} />
        </ScrollView>
      </SafeAreaView>
    </LiveGradientBackground>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
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
    justifyContent: 'space-between',
  },
  sealWrap: {
    alignItems: 'center',
    marginTop: 26,
  },
  sealShadowWrap: {
    borderRadius: 48,
  },
  seal: {
    width: 96,
    height: 96,
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
  destination: {
    color: neutral.white,
  },
  status: {
    marginTop: 12,
    minHeight: 18,
    textAlign: 'center',
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
  },
  error: {
    marginTop: 4,
    textAlign: 'center',
    fontSize: 12,
    color: neutral.danger.textStrong,
  },
  ctaShadowWrap: {
    marginTop: 20,
    borderRadius: 28,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.4)',
  },
  ctaLabel: {
    fontSize: 15,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
  },
  resendPrompt: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  resendLink: {
    fontSize: 12,
  },
  wrongRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  wrongPrompt: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
  },
  wrongLink: {
    fontSize: 12,
  },
  spacer: {
    flex: 1,
    minHeight: 14,
  },
})
