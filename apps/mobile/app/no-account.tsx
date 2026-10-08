import { gemTones, neutral } from '@ceylon-gems/ui-tokens'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, GhostButton, GlassSurface, IconButton } from '../components'
import { ArrowRightIcon, CheckIcon, ChevronLeftIcon, PersonAlertIcon } from '../components/icons'
import { GRADIENT_140 } from '../components/primitives/gradientAngle'
import { LiveGradientBackground } from '../components/primitives/LiveGradientBackground'
import { useFontFamily } from '../hooks/useFontFamily'
import { useTranslation } from '../hooks/useTranslation'
import { useGemTone } from '../providers/GemToneProvider'

// Reached from Sign In when `signIn.password()` comes back with Clerk's
// `form_identifier_not_found` error code — the phone/email the user typed
// genuinely has no trader profile, as opposed to a wrong password or a
// network error (both of which stay on Sign In as an inline form error).
// Ports "Ceylon Gem Exchange No Account.dc.html": a seal icon, a two-line
// heading, a subhead naming the identifier that wasn't found, a perks card,
// and two actions — "Please Sign Up" (the real next step) and "Try
// different number or email" (back to Sign In to correct a typo).
export default function NoAccountScreen() {
  const t = useTranslation()
  const fonts = useFontFamily()
  const router = useRouter()
  const { gemTone } = useGemTone()
  const tone = gemTones[gemTone]
  const { identifier } = useLocalSearchParams<{ identifier?: string }>()

  const [subheadBefore, subheadAfter] = t.noAccount.subhead.split('{{identifier}}')

  const perks = [t.noAccount.perkBidding, t.noAccount.perkValuations, t.noAccount.perkEscrow]

  function goBack() {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/sign-in')
    }
  }

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
          <Text style={[styles.navTitle, { fontFamily: fonts.extrabold }]} numberOfLines={1}>
            {t.noAccount.navTitle}
          </Text>
          <View style={styles.navSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.spacer} />

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
              <GlassSurface clarity={55} rim={tone.rim} radius={50} style={styles.seal}>
                <PersonAlertIcon size={36} color={tone.ink} strokeWidth={1.5} />
              </GlassSurface>
            </View>
          </View>

          <Text style={[styles.heading, { fontFamily: fonts.extrabold }]}>
            {t.noAccount.heading}
          </Text>
          <Text style={[styles.subhead, { fontFamily: fonts.medium }]}>
            {subheadBefore}
            <Text style={[styles.subheadStrong, { fontFamily: fonts.bold }]}>
              {identifier ?? ''}
            </Text>
            {subheadAfter}
          </Text>

          <GlassSurface clarity={55} rim={tone.rim} radius={22} style={styles.card}>
            {perks.map((perk) => (
              <View key={perk} style={styles.perkRow}>
                <LinearGradient
                  colors={[`${tone.cta[0]}0.95)`, `${tone.cta[1]}0.8)`]}
                  start={GRADIENT_140.start}
                  end={GRADIENT_140.end}
                  style={[styles.perkTick, { borderColor: `rgba(${tone.rim},0.6)` }]}
                >
                  <CheckIcon size={11} color={tone.tickInk} />
                </LinearGradient>
                <Text style={[styles.perkText, { fontFamily: fonts.semibold }]}>{perk}</Text>
              </View>
            ))}
          </GlassSurface>

          <Button
            label={t.noAccount.signUpButton}
            onPress={() => router.replace('/sign-up')}
            icon={<ArrowRightIcon size={17} color={neutral.white} />}
            iconPosition="right"
            style={styles.signUpButton}
          />
          <GhostButton
            label={t.noAccount.tryDifferent}
            onPress={goBack}
            style={styles.tryDifferentButton}
          />

          <View style={styles.spacer} />

          <View style={styles.helpRow}>
            <Text style={[styles.helpPrompt, { fontFamily: fonts.medium }]}>
              {t.noAccount.helpPrompt}
            </Text>
            {/* No real support flow exists yet — plain text, not a tap
                target, same "don't wire a dead link" rule as Account
                Settings' Change password/Devices & sessions rows. */}
            <Text style={[styles.contactLink, { fontFamily: fonts.bold, color: tone.accent }]}>
              {t.noAccount.contactLink}
            </Text>
          </View>
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
    gap: 10,
    paddingTop: 10,
    paddingHorizontal: 22,
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    letterSpacing: -0.2,
    color: neutral.white,
  },
  navSpacer: {
    width: 40,
  },
  body: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingBottom: 16,
  },
  spacer: {
    flex: 1,
    minHeight: 10,
  },
  sealWrap: {
    alignItems: 'center',
    marginTop: 8,
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
  heading: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 30,
    lineHeight: 30 * 1.12,
    letterSpacing: -0.5,
    color: neutral.white,
  },
  subhead: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 13 * 1.55,
    color: 'rgba(255,255,255,0.55)',
  },
  subheadStrong: {
    color: neutral.white,
  },
  card: {
    flexDirection: 'column',
    gap: 11,
    marginTop: 22,
    padding: 16,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  perkTick: {
    flexShrink: 0,
    width: 20,
    height: 20,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perkText: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(255,255,255,0.72)',
  },
  signUpButton: {
    marginTop: 20,
  },
  tryDifferentButton: {
    marginTop: 12,
  },
  helpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: 16,
  },
  helpPrompt: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
  },
  contactLink: {
    fontSize: 12,
  },
})
