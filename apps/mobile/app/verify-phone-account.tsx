import { useAuth, useUser } from '@clerk/expo'
import { gemTones, neutral } from '@ceylon-gems/ui-tokens'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
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
import { API_URL } from '../lib/apiUrl'
import { useGemTone } from '../providers/GemToneProvider'

const CODE_LENGTH = 6

// Re-verifies the *current* signed-in user's phone — distinct from
// verify-phone.tsx, which only works mid-sign-up (it's built on Clerk's
// `useSignUp()` resource, which doesn't exist once an account is already
// created). This screen uses the authenticated-user API instead
// (`user.primaryPhoneNumber.prepareVerification()`/`.attemptVerification()`
// — verified against the installed `@clerk/shared` `.d.ts`, not assumed,
// per this project's own documented Clerk "Future API" gotcha). Reached
// from two places: post-ad.tsx's publish flow, when `PATCH /listings/:id/
// status {action:'submit'}` 403s with `code: 'phone_not_verified'` (the
// Phone-verify-to-post hard gate, listings.controller.ts); and
// edit-profile.tsx's own "Verify now" link, shown whenever the phone on
// file isn't verified — covers both "never verified" and "changed their
// number, which clears `phoneVerifiedAt`" (see `PATCH /me`'s own comment).
//
// On a successful `attemptVerification`, calls the new `POST /me/
// sync-phone-verification` rather than waiting on the Clerk webhook —
// that webhook can't reach a local dev server with no public tunnel, so
// without this the hard gate above would never actually clear locally
// even after a real, successful verification. See that endpoint's own
// comment for why it re-checks with Clerk's backend API instead of
// trusting this call's mere existence.
export default function VerifyPhoneAccountScreen() {
  const t = useTranslation()
  const fonts = useFontFamily()
  const router = useRouter()
  const { redirect } = useLocalSearchParams<{ redirect?: string }>()
  const { getToken } = useAuth()
  const { user, isLoaded: userLoaded } = useUser()
  const { gemTone } = useGemTone()
  const tone = gemTones[gemTone]

  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''))
  const [verified, setVerified] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(42)
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const prepared = useRef(false)

  const phoneNumber = user?.primaryPhoneNumber ?? null

  // Fires the SMS once the screen mounts with a known phone to verify —
  // unlike verify-phone.tsx, nothing earlier in this flow already sent
  // one. Guarded by a ref (not state) so React's dev-mode double-invoke
  // and `userLoaded` settling on a later render can't fire it twice.
  useEffect(() => {
    if (!userLoaded || !phoneNumber || prepared.current) return
    prepared.current = true
    phoneNumber.prepareVerification().catch(() => {
      setError(t.common.genericError)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoaded, phoneNumber])

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : s))
    }, 1000)
    return () => clearInterval(timer)
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
    if (!filled || submitting || !phoneNumber) return
    setSubmitting(true)
    setError(null)
    try {
      await phoneNumber.attemptVerification({ code: code.join('') })
      setVerified(true)

      const token = await getToken()
      if (token) {
        await fetch(`${API_URL}/me/sync-phone-verification`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {})
      }

      if (redirect) router.replace(redirect as never)
      else router.back()
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t.auth.verifyPhone.statusExpires)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend() {
    if (!canResend || resending || !phoneNumber) return
    setResending(true)
    setError(null)
    try {
      await phoneNumber.prepareVerification()
      setSecondsLeft(42)
      setCode(Array(CODE_LENGTH).fill(''))
      setVerified(false)
    } catch {
      setError('Could not resend the code. Please try again.')
    } finally {
      setResending(false)
    }
  }

  const statusText = verified
    ? t.auth.verifyPhone.statusVerified
    : filled
      ? t.auth.verifyPhone.statusReadyToConfirm
      : t.auth.verifyPhone.statusExpires
  const ctaLabel = submitting
    ? '…'
    : verified
      ? t.auth.verifyPhone.verified
      : t.auth.verifyPhone.submit
  const resendLabel = canResend
    ? t.auth.verifyPhone.resendCode
    : `${t.auth.verifyPhone.resendIn} ${secondsLeft}s`

  function goBack() {
    if (router.canGoBack()) router.back()
    else router.replace('/profile')
  }

  return (
    <LiveGradientBackground>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.navRow}>
          <IconButton
            icon={<ChevronLeftIcon />}
            accessibilityLabel={t.common.back}
            onPress={goBack}
            size={40}
            radius={14}
          />
          <Text style={[styles.navTitle, { fontFamily: fonts.extrabold }]} pointerEvents="none">
            {t.auth.verifyPhone.navTitle}
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

          {!userLoaded || phoneNumber ? (
            <>
              <Text style={[styles.heading, { fontFamily: fonts.extrabold }]}>
                {t.auth.verifyPhone.title}
              </Text>
              <Text style={[styles.subheading, { fontFamily: fonts.medium }]}>
                {t.auth.verifyPhone.subtitle}
                {'\n'}
                <Text style={[styles.destination, { fontFamily: fonts.bold }]}>
                  {phoneNumber?.phoneNumber ?? '—'}
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
                {/* Shadow lives on this unclipped wrapper, not the
                    LinearGradient itself — see Button.tsx's identical
                    comment on why a shadow set alongside borderRadius on a
                    clipped gradient layer never renders on iOS. */}
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
                  {t.auth.verifyPhone.resendPrompt}
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

              <View style={styles.spacer} />

              <Keypad onPressKey={press} />
            </>
          ) : (
            <>
              <Text style={[styles.heading, { fontFamily: fonts.extrabold }]}>
                {t.auth.verifyPhone.noPhoneTitle}
              </Text>
              <Text style={[styles.subheading, { fontFamily: fonts.medium }]}>
                {t.auth.verifyPhone.noPhoneSubtitle}
              </Text>

              <PressableScale
                onPress={() => router.replace('/edit-profile')}
                accessibilityLabel={t.auth.verifyPhone.addPhoneButton}
              >
                <View style={styles.ctaShadowWrap}>
                  <LinearGradient
                    colors={[`${tone.cta[0]}0.9)`, `${tone.cta[1]}0.76)`]}
                    start={GRADIENT_140.start}
                    end={GRADIENT_140.end}
                    style={[styles.cta, { borderColor: `rgba(${tone.rim},0.5)` }]}
                  >
                    <Text
                      style={[
                        styles.ctaLabel,
                        { fontFamily: fonts.semibold, color: neutral.white },
                      ]}
                    >
                      {t.auth.verifyPhone.addPhoneButton}
                    </Text>
                    <ArrowRightIcon size={17} />
                  </LinearGradient>
                </View>
              </PressableScale>

              <View style={styles.spacer} />
            </>
          )}
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
  spacer: {
    flex: 1,
    minHeight: 14,
  },
})
