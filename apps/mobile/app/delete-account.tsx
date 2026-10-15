import { useAuth, useUser } from '@clerk/expo'
import { neutral } from '@ceylon-gems/ui-tokens'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Button,
  Checkbox,
  Chip,
  GhostButton,
  GlassSurface,
  IconButton,
  TextField,
} from '../components'
import { AlertTriangleIcon, ChevronLeftIcon, CloseIcon, TrashIcon } from '../components/icons'
import { LiveGradientBackground } from '../components/primitives/LiveGradientBackground'
import { useFontFamily } from '../hooks/useFontFamily'
import { useTranslation } from '../hooks/useTranslation'
import { API_URL } from '../lib/apiUrl'
import { useGemTone } from '../providers/GemToneProvider'

const REASON_KEYS = [
  'reasonSoldWhatIHad',
  'reasonTooManyMessages',
  'reasonFoundAnotherPlatform',
  'reasonPrivacyConcerns',
  'reasonJustTakingABreak',
] as const

interface DeletionImpact {
  activeListings: number
  savedGems: number
  savedSearches: number
}

// Reached from Profile's Security section "Delete account" row. Ports the
// real Delete Account `.dc.html` mockup (found in
// ~/Downloads/Ceylon Gem Exchange/ partway through this screen's build,
// replacing an earlier component-kit-only pass built before that
// mockup's existence was known) — the inline type-DELETE-to-confirm +
// acknowledgement-checkbox gate IS the confirmation step here, so there's
// no separate `ConfirmDialog` on top of it (the earlier pass had one; the
// mockup doesn't). `activeListings`/`savedGems`/`savedSearches` come from
// the real `GET /me/deletion-impact` endpoint rather than the mockup's
// static numbers; the enquiry-history and Trader Plus membership lines
// stay fixed copy with no count, same reasoning as that endpoint's own
// comment (no per-thread count worth surfacing; membership is still
// entirely demo-only — see my-membership.tsx). The leaving-reason chips
// are optional, UI-only context for the person deleting their own
// account — not sent anywhere, since no table exists to store an exit
// reason against an account that's about to be gone.
export default function DeleteAccountScreen() {
  const t = useTranslation()
  const fonts = useFontFamily()
  const router = useRouter()
  const { getToken, signOut } = useAuth()
  const { user } = useUser()
  const { gemTone } = useGemTone()

  const [impact, setImpact] = useState<DeletionImpact | null>(null)
  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const phone = user?.primaryPhoneNumber?.phoneNumber ?? ''
  const canDelete = confirmText.trim() === 'DELETE' && acknowledged && !submitting

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const token = await getToken()
        if (!token) return
        const res = await fetch(`${API_URL}/me/deletion-impact`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok || cancelled) return
        setImpact((await res.json()) as DeletionImpact)
      } catch {
        // Leave the counts out — the static "enquiry history"/"membership"
        // lines below still render regardless.
      }
    }
    void load()
    return () => {
      cancelled = true
    }
    // `getToken` deliberately excluded — Clerk's `useAuth()` hands back a
    // new function identity on every render (not memoized), so listing it
    // here would re-fetch on every keystroke in the fields below instead
    // of once on mount (see edit-profile.tsx's identical fix for the full
    // story — that screen's version of this bug also reset typed text,
    // which this one doesn't since nothing here writes into `impact`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function goBack() {
    if (router.canGoBack()) router.back()
    else router.replace('/profile')
  }

  async function handleDelete() {
    if (!canDelete) return
    setSubmitting(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not signed in')
      const res = await fetch(`${API_URL}/me`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.message ?? `Failed to delete account (${res.status})`)
      }
      await signOut()
      router.replace('/sign-in')
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t.common.genericError)
    } finally {
      setSubmitting(false)
    }
  }

  const impactLines = [
    t.deleteAccount.impactActiveListings.replace('{{count}}', String(impact?.activeListings ?? 0)),
    t.deleteAccount.impactSaved
      .replace('{{gems}}', String(impact?.savedGems ?? 0))
      .replace('{{searches}}', String(impact?.savedSearches ?? 0)),
    t.deleteAccount.impactEnquiries,
    t.deleteAccount.impactMembership,
  ]

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
          <Text
            style={[styles.navTitle, { fontFamily: fonts.extrabold }]}
            numberOfLines={1}
            pointerEvents="none"
          >
            {t.deleteAccount.title}
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
                    shadowColor: 'rgb(255,120,105)',
                    shadowOffset: { width: 0, height: 16 },
                    shadowOpacity: 0.7,
                    shadowRadius: 24,
                  },
                  android: { elevation: 8 },
                }),
              ]}
            >
              <GlassSurface clarity={55} rim="255,120,105" radius={46} style={styles.seal}>
                <AlertTriangleIcon size={28} color={neutral.danger.text} strokeWidth={1.6} />
              </GlassSurface>
            </View>
          </View>

          <Text style={[styles.heading, { fontFamily: fonts.extrabold }]}>
            {t.deleteAccount.heading}
          </Text>
          <Text style={[styles.subtitle, { fontFamily: fonts.semibold }]}>
            {t.deleteAccount.subtitle.replace('{{phone}}', phone)}
          </Text>

          <GlassSurface clarity={55} rim="255,120,105" radius={20} style={styles.impactCard}>
            {impactLines.map((line, i) => (
              <View key={i} style={styles.impactRow}>
                <View style={styles.impactIconWrap}>
                  <CloseIcon size={10} color={neutral.danger.text} strokeWidth={2} />
                </View>
                <Text style={[styles.impactText, { fontFamily: fonts.semibold }]}>{line}</Text>
              </View>
            ))}
          </GlassSurface>

          <Text style={[styles.sectionLabel, { fontFamily: fonts.semibold }]}>
            {t.deleteAccount.reasonLabel}
          </Text>
          <View style={styles.reasonWrap}>
            {REASON_KEYS.map((key) => (
              <Chip
                key={key}
                label={t.deleteAccount[key]}
                selected={selectedReason === key}
                onPress={() => setSelectedReason((prev) => (prev === key ? null : key))}
                style={styles.reasonChip}
              />
            ))}
          </View>

          <TextField
            label={t.deleteAccount.typeToConfirmLabel}
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder={t.deleteAccount.typeToConfirmPlaceholder}
            autoCapitalize="characters"
            style={styles.confirmField}
          />

          <Checkbox
            checked={acknowledged}
            onValueChange={setAcknowledged}
            tone={gemTone}
            accessibilityLabel={t.deleteAccount.acknowledgeLabel}
            style={styles.acknowledgeRow}
          >
            <Text style={[styles.acknowledgeText, { fontFamily: fonts.semibold }]}>
              {t.deleteAccount.acknowledgeLabel}
            </Text>
          </Checkbox>

          {error ? (
            <Text style={[styles.error, { fontFamily: fonts.semibold }]}>{error}</Text>
          ) : null}

          <Button
            label={t.deleteAccount.confirmButton}
            onPress={handleDelete}
            disabled={!canDelete}
            loading={submitting}
            danger
            icon={<TrashIcon size={15} />}
            style={styles.cta}
          />
          <GhostButton
            label={t.deleteAccount.keepAccountButton}
            onPress={goBack}
            style={styles.keepButton}
          />

          <Text style={[styles.footerHint, { fontFamily: fonts.semibold }]}>
            {t.deleteAccount.footerHint}
          </Text>
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
    gap: 11,
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
    marginTop: 22,
    marginBottom: 16,
  },
  sealShadowWrap: {
    borderRadius: 46,
  },
  seal: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    textAlign: 'center',
    fontSize: 20,
    letterSpacing: -0.3,
    color: neutral.white,
  },
  subtitle: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 13 * 1.5,
    color: 'rgba(255,255,255,0.6)',
  },
  impactCard: {
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  impactIconWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginTop: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: neutral.danger.surface,
    borderWidth: 1,
    borderColor: neutral.danger.border,
  },
  impactText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 13 * 1.4,
    color: 'rgba(255,255,255,0.85)',
  },
  sectionLabel: {
    marginTop: 22,
    marginBottom: 10,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.62)',
  },
  reasonWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonChip: {
    marginBottom: 0,
  },
  confirmField: {
    marginTop: 20,
  },
  acknowledgeRow: {
    marginTop: 16,
  },
  acknowledgeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 12 * 1.5,
    color: 'rgba(255,255,255,0.75)',
  },
  error: {
    marginTop: 14,
    textAlign: 'center',
    fontSize: 13,
    color: '#ff9b90',
  },
  cta: {
    marginTop: 20,
  },
  keepButton: {
    marginTop: 10,
  },
  footerHint: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 11 * 1.5,
    color: 'rgba(255,255,255,0.4)',
  },
})
