import { useSignIn } from '@clerk/expo'
import { fontSize, spacing } from '@ceylon-gems/ui-tokens'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, IconButton, TextField } from '../components'
import { ChevronLeftIcon } from '../components/icons'
import { LiveGradientBackground } from '../components/primitives/LiveGradientBackground'
import { useFontFamily } from '../hooks/useFontFamily'
import { useTranslation } from '../hooks/useTranslation'

// Placeholder screen — no design has been ported for it yet, unlike Forgot
// Password (which reaches here after sending a reset code). Built with the
// same component kit and gem-tone theming so it doesn't look out of place;
// replace with the real "Ceylon Gem Exchange Reset Password.dc.html"
// design when it's ported (the same situation /verify-phone was in before
// its design was ported this session). `channel` arrives as a route param
// from forgot-password.tsx — nothing on the `signIn` resource itself says
// whether a phone or email reset code was sent, so the caller has to pass
// it through.
export default function ResetPasswordScreen() {
  const t = useTranslation()
  const fonts = useFontFamily()
  const router = useRouter()
  const { signIn } = useSignIn()
  const { channel } = useLocalSearchParams<{ channel: 'mobile' | 'email' }>()
  const isMobile = channel === 'mobile'

  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (submitting) return
    if (!code || newPassword.length < 8) {
      setError(t.common.genericError)
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match")
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const resetter = isMobile ? signIn.resetPasswordPhoneCode : signIn.resetPasswordEmailCode

      const { error: verifyError } = await resetter.verifyCode({ code })
      if (verifyError) {
        setError(verifyError.longMessage ?? 'Invalid code. Please try again.')
        return
      }

      const { error: submitError } = await resetter.submitPassword({ password: newPassword })
      if (submitError) {
        setError(submitError.longMessage ?? t.common.genericError)
        return
      }

      if (signIn.status === 'complete') {
        await signIn.finalize()
        router.replace('/')
      }
    } catch {
      setError(t.common.genericError)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <LiveGradientBackground>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.backRow}>
          <IconButton
            icon={<ChevronLeftIcon />}
            accessibilityLabel={t.common.back}
            onPress={() => router.back()}
          />
        </View>
        <View style={styles.content}>
          <Text style={[styles.heading, { fontFamily: fonts.extrabold }]}>
            {t.auth.resetPassword.title}
          </Text>
          <Text style={[styles.subtitle, { fontFamily: fonts.regular }]}>
            {t.auth.resetPassword.subtitle}
          </Text>

          <TextField
            label={t.auth.resetPassword.codeLabel}
            placeholder={t.auth.resetPassword.codePlaceholder}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
          />
          <TextField
            label={t.auth.resetPassword.newPasswordLabel}
            placeholder="••••••••"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />
          <TextField
            label={t.auth.resetPassword.confirmPasswordLabel}
            placeholder="••••••••"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            label={t.auth.resetPassword.submit}
            onPress={handleSubmit}
            loading={submitting}
            style={styles.submitButton}
          />
        </View>
      </SafeAreaView>
    </LiveGradientBackground>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  backRow: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  heading: {
    fontSize: fontSize['2xl'],
    color: '#fff',
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.65)',
    marginTop: -spacing.md,
  },
  error: {
    fontSize: fontSize.sm,
    color: '#ff9b90',
  },
  submitButton: {
    marginTop: spacing.sm,
  },
})
