import { gemTones, spacing } from '@ceylon-gems/ui-tokens'
import { ScrollView, StyleSheet, View } from 'react-native'
import { Card, ListRow, SegmentedControl } from '../components'
import { useLanguages, type LanguageOption } from '../hooks/useLanguages'
import { useTranslation } from '../hooks/useTranslation'
import { useCurrency } from '../providers/CurrencyProvider'
import { useGemTone } from '../providers/GemToneProvider'
import { useLocale } from '../providers/LocaleProvider'

// A minimal 2-language placeholder only for the brief window before
// useLanguages' first fetch resolves (it falls back to the real seeded
// list itself on an outright failure — see hooks/useLanguages.ts) — just
// enough so the segmented control never renders with zero options.
const LOADING_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English' },
  { code: 'si', label: 'සිංහල' },
]

// UC-2 (switch language): a real, reachable settings screen, not the
// kitchen-sink demo — `setLocale` persists through LocaleProvider (and, via
// useSyncDeviceLocale, to the account itself), so the choice survives app
// restarts and reinstalls. Only Language is interactive here; Currency
// shows the real value picked in Account Settings (read-only here — that
// screen owns the picker, this one just can't show a stale hardcoded
// value next to it) and Location is read-only info until that feature
// actually exists, rather than wiring up a control that doesn't do
// anything yet.
export default function LocaleSettingsScreen() {
  const t = useTranslation()
  const { locale, setLocale } = useLocale()
  const { gemTone } = useGemTone()
  const tone = gemTones[gemTone]
  const languages = useLanguages() ?? LOADING_LANGUAGES
  const { currency } = useCurrency()

  return (
    <View style={[styles.container, { backgroundColor: tone.screen[1] }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.languageCard}>
          <ListRow title={t.localeSettings.language} />
          <SegmentedControl
            options={languages.map((l) => ({ label: l.label, value: l.code }))}
            value={locale}
            onChange={setLocale}
          />
        </Card>

        <Card>
          <ListRow title={t.localeSettings.currency} subtitle={currency} />
          <ListRow title={t.localeSettings.location} subtitle="Sri Lanka" />
        </Card>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  languageCard: {
    gap: spacing.md,
  },
})
