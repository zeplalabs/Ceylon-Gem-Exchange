import { isClerkAPIResponseError, useUser } from '@clerk/expo'
import { gemTones, neutral } from '@ceylon-gems/ui-tokens'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, GlassSurface, IconButton, TextField } from '../components'
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronLeftIcon,
  EyeIcon,
  LockIcon,
  LockResetIcon,
} from '../components/icons'
import { GRADIENT_140 } from '../components/primitives/gradientAngle'
import { LiveGradientBackground } from '../components/primitives/LiveGradientBackground'
import { useFontFamily } from '../hooks/useFontFamily'
import { useTranslation } from '../hooks/useTranslation'
import { useGemTone } from '../providers/GemToneProvider'

// Reached from Profile's "Change password" row (Account Settings' Security
// section). Ports the mockup the user supplied as "the screen design for
// change password" — same data-screen-label ("Reset password") and layout
// as the still-unported app/reset-password.tsx placeholder, but this
// particular mockup's own copy ("you'll be signed out on other devices",
// no OTP/code field) is written for a signed-in user changing their own
// password, not the forgot-password reset-code flow. Per that explicit
// instruction this file is the real "change password" screen; it's not a
// redesign of reset-password.tsx, which stays a placeholder (that one
// needs a code field and the SignIn resource — a genuinely different
// flow). The mockup's own "Back to Sign In" footer link doesn't apply
// here (the user stays signed in on this device) and is dropped, same as
// other screens this session adapting a mockup's chrome to this app's
// real scope rather than porting a piece that doesn't fit.
//
// Uses `UserResource.updatePassword` (confirmed via the installed
// @clerk/shared types: a classic throwing `Promise<UserResource>`, not
// the Future signals API CLAUDE.md documents for SignUp/SignIn — that
// table is specifically about those two resources, not User), with
// `signOutOfOtherSessions: true` to match the subtitle literally.
// `currentPassword` is a required field per explicit product direction
// (added on top of the mockup's own two-field form, which didn't have
// one) — re-verifying the existing password before accepting a new one.
export default function ChangePasswordScreen() {
  const t = useTranslation()
  const fonts = useFontFamily()
  const router = useRouter()
  const { user } = useUser()
  const { gemTone } = useGemTone()
  const tone = gemTones[gemTone]

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function goBack() {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/profile')
    }
  }

  const rules = [
    { key: 'length', text: t.changePassword.ruleLength, ok: newPassword.length >= 8 },
    {
      key: 'numberOrSymbol',
      text: t.changePassword.ruleNumberOrSymbol,
      ok: /[^A-Za-z]/.test(newPassword),
    },
    { key: 'uppercase', text: t.changePassword.ruleUppercase, ok: /[A-Z]/.test(newPassword) },
  ]
  const matched = confirmPassword.length > 0 && newPassword === confirmPassword
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword

  async function handleSubmit() {
    if (submitting) return
    if (!currentPassword || !rules.every((r) => r.ok) || newPassword !== confirmPassword) {
      setError(t.common.genericError)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await user?.updatePassword({ currentPassword, newPassword, signOutOfOtherSessions: true })
      goBack()
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        setError(err.errors[0]?.longMessage ?? t.common.genericError)
      } else {
        setError(t.common.genericError)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const fieldIconColor = `rgba(${tone.rim},0.7)`

  return (
    <LiveGradientBackground>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={styles.navRow}>
          <IconButton
            icon={<ChevronLeftIcon />}
            accessibilityLabel={t.common.back}
            onPress={goBack}
            size={40}
            radius={14}
          />
          {/* `pointerEvents="none"` — the mockup's own `margin-left:-40px`
              centering trick makes this Text's hit box (flex:1, so its
              bounds span the full row) overlap the back IconButton to its
              left. A later sibling paints on top, so without this the
              title silently ate every tap meant for the button. */}
          <Text
            style={[styles.navTitle, { fontFamily: fonts.extrabold }]}
            numberOfLines={1}
            pointerEvents="none"
          >
            {t.accountSettings.changePassword}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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
            {t.changePassword.heading}
          </Text>
          <Text style={[styles.subtitle, { fontFamily: fonts.medium }]}>
            {t.changePassword.subtitle}
          </Text>

          <View style={styles.fields}>
            <TextField
              label={t.changePassword.currentPasswordLabel}
              placeholder={t.changePassword.currentPasswordPlaceholder}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              leftIcon={<LockIcon color={fieldIconColor} />}
              rightIcon={
                <Pressable
                  onPress={() => setRevealed((v) => !v)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={
                    revealed ? t.changePassword.hidePassword : t.changePassword.showPassword
                  }
                >
                  <EyeIcon revealed={revealed} />
                </Pressable>
              }
              secureTextEntry={!revealed}
            />

            <TextField
              label={t.changePassword.newPasswordLabel}
              placeholder={t.changePassword.newPasswordPlaceholder}
              value={newPassword}
              onChangeText={setNewPassword}
              leftIcon={<LockIcon color={fieldIconColor} />}
              secureTextEntry={!revealed}
            />

            <View>
              <TextField
                label={t.changePassword.confirmPasswordLabel}
                placeholder={t.changePassword.confirmPasswordPlaceholder}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                leftIcon={<LockIcon color={fieldIconColor} />}
                rightIcon={
                  matched ? (
                    <CheckIcon size={15} color={tone.accent} strokeWidth={2.2} />
                  ) : undefined
                }
                secureTextEntry={!revealed}
              />
              {mismatch ? (
                <Text style={[styles.mismatch, { fontFamily: fonts.semibold }]}>
                  {t.changePassword.mismatch}
                </Text>
              ) : null}
            </View>
          </View>

          <GlassSurface clarity={55} radius={20} style={styles.rules}>
            {rules.map((rule) => (
              <View key={rule.key} style={styles.ruleRow}>
                {rule.ok ? (
                  <LinearGradient
                    colors={[`${tone.cta[0]}0.95)`, `${tone.cta[1]}0.8)`]}
                    start={GRADIENT_140.start}
                    end={GRADIENT_140.end}
                    style={[styles.ruleTick, { borderColor: `rgba(${tone.rim},0.6)` }]}
                  >
                    <CheckIcon size={10} color={tone.tickInk} strokeWidth={2.2} />
                  </LinearGradient>
                ) : (
                  <View style={styles.ruleTickEmpty}>
                    <CheckIcon size={10} color="rgba(255,255,255,0.35)" strokeWidth={2.2} />
                  </View>
                )}
                <Text
                  style={[
                    styles.ruleText,
                    {
                      fontFamily: fonts.semibold,
                      color: rule.ok ? neutral.white : 'rgba(255,255,255,0.5)',
                    },
                  ]}
                >
                  {rule.text}
                </Text>
              </View>
            ))}
          </GlassSurface>

          {error ? (
            <Text style={[styles.error, { fontFamily: fonts.semibold }]}>{error}</Text>
          ) : null}

          <Button
            label={t.changePassword.submit}
            onPress={handleSubmit}
            loading={submitting}
            icon={<ArrowRightIcon size={17} color={neutral.white} strokeWidth={2} />}
            iconPosition="right"
            style={styles.cta}
          />

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </LiveGradientBackground>
  )
}

const styles = StyleSheet.create({
  flex: {
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
  subtitle: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 13 * 1.55,
    color: 'rgba(255,255,255,0.55)',
  },
  fields: {
    marginTop: 24,
    gap: 12,
  },
  mismatch: {
    marginTop: 6,
    fontSize: 11,
    color: '#ff8f80',
  },
  rules: {
    gap: 10,
    marginTop: 20,
    padding: 15,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ruleTick: {
    flexShrink: 0,
    width: 19,
    height: 19,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleTickEmpty: {
    flexShrink: 0,
    width: 19,
    height: 19,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleText: {
    fontSize: 12,
  },
  error: {
    marginTop: 12,
    fontSize: 13,
    color: '#ff9b90',
  },
  cta: {
    marginTop: 20,
  },
  bottomSpacer: {
    height: 14,
  },
})
