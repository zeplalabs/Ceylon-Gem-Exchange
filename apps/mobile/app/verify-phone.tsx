import { useSignUp } from '@clerk/expo'
import { defaultGemTone, gemTones, neutral } from '@ceylon-gems/ui-tokens'
import * as Linking from 'expo-linking'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { GlassSurface, IconButton, PressableScale } from '../components'
import { ArrowRightIcon, BackspaceIcon, ChevronLeftIcon, GemIcon } from '../components/icons'
import { GRADIENT_140 } from '../components/primitives/gradientAngle'
import { LiveGradientBackground } from '../components/primitives/LiveGradientBackground'
import { useFontFamily } from '../hooks/useFontFamily'
import { useTranslation } from '../hooks/useTranslation'

const tone = gemTones[defaultGemTone]

// Clerk's phone_code strategy always issues a 6-digit numeric code — the
// "Ceylon Gem Exchange Verification.dc.html" mockup this screen ports uses
// a 4-cell layout (a generic prototype assumption, not tied to Clerk), so
// cell count follows the real code length rather than the mockup literal.
// Every other value below (seal, keypad, gradients, glow) is ported exactly.
const CODE_LENGTH = 6

type KeypadKey = { kind: 'digit'; value: string } | { kind: 'clear' } | { kind: 'back' }

const KEYPAD_KEYS: KeypadKey[] = [
  { kind: 'digit', value: '1' },
  { kind: 'digit', value: '2' },
  { kind: 'digit', value: '3' },
  { kind: 'digit', value: '4' },
  { kind: 'digit', value: '5' },
  { kind: 'digit', value: '6' },
  { kind: 'digit', value: '7' },
  { kind: 'digit', value: '8' },
  { kind: 'digit', value: '9' },
  { kind: 'clear' },
  { kind: 'digit', value: '0' },
  { kind: 'back' },
]
const KEYPAD_ROWS = [
  KEYPAD_KEYS.slice(0, 3),
  KEYPAD_KEYS.slice(3, 6),
  KEYPAD_KEYS.slice(6, 9),
  KEYPAD_KEYS.slice(9, 12),
]

// Reached from /sign-up after signUp.password() leaves the sign-up in a
// "needs phone verification" state (sendPhoneCode() already fired there).
// Ported from the real "Ceylon Gem Exchange Verification.dc.html" design —
// its own on-screen numeric keypad, not the OS keyboard, so entry is fully
// tap-driven (no TextInput/focus involved).
export default function VerifyPhoneScreen() {
  const t = useTranslation()
  const fonts = useFontFamily()
  const router = useRouter()
  const { signUp } = useSignUp()

  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''))
  const [active, setActive] = useState(0)
  const [verified, setVerified] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(42)
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : s))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const filled = code.every((digit) => digit !== '')
  const canResend = secondsLeft === 0

  function press(key: KeypadKey) {
    setError(null)
    if (key.kind === 'clear') {
      setCode(Array(CODE_LENGTH).fill(''))
      setActive(0)
      setVerified(false)
      return
    }
    if (key.kind === 'back') {
      setCode((prev) => {
        const next = [...prev]
        const i = next[active] ? active : Math.max(0, active - 1)
        next[i] = ''
        setActive(i)
        return next
      })
      setVerified(false)
      return
    }
    setCode((prev) => {
      const next = [...prev]
      const empty = next.findIndex((digit) => digit === '')
      const at = empty === -1 ? CODE_LENGTH - 1 : empty
      next[at] = key.value
      setActive(Math.min(CODE_LENGTH - 1, at + 1))
      return next
    })
    setVerified(false)
  }

  async function handleConfirm() {
    if (!filled || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const { error: verifyError } = await signUp.verifications.verifyPhoneCode({
        code: code.join(''),
      })
      if (verifyError) {
        setError(verifyError.longMessage ?? 'Invalid code. Please try again.')
        return
      }
      setVerified(true)
      if (signUp.status === 'complete') {
        if (signUp.unverifiedFields.includes('email_address')) {
          // Email is optional, so Clerk marks the sign-up complete without it
          // being verified — detour through a non-blocking verification nudge
          // before finalizing, mirroring how sign-up.tsx sends the phone code
          // before navigating here.
          await signUp.verifications.sendEmailLink({ verificationUrl: Linking.createURL('/') })
          router.replace('/verify-email')
        } else {
          await signUp.finalize()
          router.replace('/')
        }
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
      await signUp.verifications.sendPhoneCode()
      setSecondsLeft(42)
      setCode(Array(CODE_LENGTH).fill(''))
      setActive(0)
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
          <Text style={[styles.navTitle, { fontFamily: fonts.extrabold }]}>
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

          <Text style={[styles.heading, { fontFamily: fonts.extrabold }]}>
            {t.auth.verifyPhone.title}
          </Text>
          <Text style={[styles.subheading, { fontFamily: fonts.medium }]}>
            {t.auth.verifyPhone.subtitle}
            {'\n'}
            <Text style={[styles.destination, { fontFamily: fonts.bold }]}>
              {signUp.phoneNumber}
            </Text>
          </Text>

          <View style={styles.codeRow}>
            {code.map((digit, index) => (
              <CodeCell
                key={index}
                digit={digit}
                index={index}
                active={index === active && !filled}
                onPress={() => setActive(index)}
                fonts={fonts}
              />
            ))}
          </View>

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
              {t.auth.verifyPhone.resendPrompt}
            </Text>
            <PressableScale
              onPress={handleResend}
              disabled={!canResend || resending}
              accessibilityLabel={resendLabel}
            >
              <Text style={[styles.resendLink, { fontFamily: fonts.bold }]}>{resendLabel}</Text>
            </PressableScale>
          </View>

          <View style={styles.spacer} />

          <View style={styles.keypad}>
            {KEYPAD_ROWS.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.keypadRow}>
                {row.map((key, keyIndex) => (
                  <KeypadKeyButton key={keyIndex} keyDef={key} onPress={() => press(key)} />
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LiveGradientBackground>
  )
}

interface CodeCellProps {
  digit: string
  index: number
  active: boolean
  onPress: () => void
  fonts: ReturnType<typeof useFontFamily>
}

// One cell of the code row — plain glass when empty, a stronger tone-tinted
// ring + caret when it's the active (next-to-fill) cell, and a gradient
// fill once a digit lands. `filled`/`active` styling matches the mockup's
// cells() computation exactly (see Ceylon Gem Exchange Verification.dc.html).
function CodeCell({ digit, index, active, onPress, fonts }: CodeCellProps) {
  const label = `Digit ${index + 1} of ${CODE_LENGTH}${digit ? `: ${digit}` : ', empty'}`

  if (digit) {
    return (
      <PressableScale onPress={onPress} accessibilityLabel={label} hitSlop={4}>
        <View
          style={[
            styles.cellShadowWrap,
            Platform.select({
              ios: {
                shadowColor: `rgb(${tone.halo})`,
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.9,
                shadowRadius: 18,
              },
              android: { elevation: 8 },
            }),
          ]}
        >
          <LinearGradient
            colors={[`${tone.cta[0]}0.5)`, `${tone.cta[1]}0.34)`]}
            start={GRADIENT_140.start}
            end={GRADIENT_140.end}
            style={[styles.cell, { borderWidth: 1, borderColor: `rgba(${tone.rim},0.45)` }]}
          >
            <Text style={[styles.cellDigit, { fontFamily: fonts.extrabold }]}>{digit}</Text>
          </LinearGradient>
        </View>
      </PressableScale>
    )
  }

  if (active) {
    return (
      <PressableScale onPress={onPress} accessibilityLabel={label} hitSlop={4}>
        <View style={styles.cellActiveRing}>
          <GlassSurface clarity={55} rim={tone.rim} radius={22} style={styles.cell}>
            <View style={styles.caret} />
          </GlassSurface>
        </View>
      </PressableScale>
    )
  }

  return (
    <PressableScale onPress={onPress} accessibilityLabel={label} hitSlop={4}>
      <GlassSurface clarity={55} radius={22} style={styles.cell} />
    </PressableScale>
  )
}

function KeypadKeyButton({ keyDef, onPress }: { keyDef: KeypadKey; onPress: () => void }) {
  const fonts = useFontFamily()
  const label =
    keyDef.kind === 'digit' ? keyDef.value : keyDef.kind === 'clear' ? 'Clear code' : 'Delete'

  if (keyDef.kind === 'digit') {
    return (
      <PressableScale onPress={onPress} accessibilityLabel={label} style={styles.keyWrapper}>
        <GlassSurface clarity={55} radius={16} style={styles.key}>
          <Text style={[styles.keyLabel, { fontFamily: fonts.semibold }]}>{keyDef.value}</Text>
        </GlassSurface>
      </PressableScale>
    )
  }

  return (
    <PressableScale onPress={onPress} accessibilityLabel={label} style={styles.keyWrapper}>
      <View style={[styles.key, styles.keyGhost]}>
        {keyDef.kind === 'back' ? (
          <BackspaceIcon />
        ) : (
          <Text style={[styles.keyLabelGhost, { fontFamily: fonts.semibold }]}>C</Text>
        )}
      </View>
    </PressableScale>
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
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 24,
  },
  // No borderWidth here — GlassSurface draws its own border internally
  // (empty/active cells); the filled gradient cell adds borderWidth inline
  // since LinearGradient isn't glass and needs an explicit one.
  cell: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  cellShadowWrap: {
    borderRadius: 22,
  },
  // Approximates the mockup's `0 0 0 4px rgba(halo,0.14)` focus ring — a
  // zero-blur spread shadow is just a solid ring, reproduced here as a
  // padded background rather than a shadow RN can't express directly.
  cellActiveRing: {
    padding: 4,
    borderRadius: 26,
    backgroundColor: `rgba(${tone.halo},0.14)`,
  },
  cellDigit: {
    fontSize: 24,
    color: neutral.white,
  },
  caret: {
    width: 2,
    height: 24,
    borderRadius: 1,
    backgroundColor: tone.accent,
    opacity: 0.85,
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
    color: tone.accent,
  },
  spacer: {
    flex: 1,
    minHeight: 14,
  },
  keypad: {
    gap: 10,
    paddingTop: 6,
    paddingBottom: 16,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 10,
  },
  keyWrapper: {
    flex: 1,
  },
  key: {
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyGhost: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  keyLabel: {
    fontSize: 19,
    color: neutral.white,
  },
  keyLabelGhost: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
})
