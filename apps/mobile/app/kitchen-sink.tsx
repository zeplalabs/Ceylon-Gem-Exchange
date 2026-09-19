import { Show, useUser } from '@clerk/expo'
import {
  defaultGemTone,
  fontFamilies,
  fontSize,
  gemTones,
  neutral,
  spacing,
} from '@ceylon-gems/ui-tokens'
import { Link } from 'expo-router'
import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import {
  Avatar,
  Badge,
  BottomNavBar,
  Button,
  Card,
  Chip,
  ConfirmDialog,
  GhostButton,
  IconButton,
  ListRow,
  ProgressBar,
  SearchBar,
  SegmentedControl,
  SegmentedTabs,
  StepMeter,
  TextField,
  Toggle,
} from '../components'
import { useTranslation } from '../hooks/useTranslation'
import { useLocale } from '../providers/LocaleProvider'

const tone = gemTones[defaultGemTone]

// Kitchen-sink screen exercising the full component kit end to end (real
// Metro bundling + on-device render) — kept as a standalone dev route
// (moved out of index.tsx once real screens started landing there) rather
// than deleted, since it's still useful for testing components in
// isolation.
export default function KitchenSink() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'buy' | 'rent'>('buy')
  const [tab, setTab] = useState<'details' | 'seller'>('details')
  const [chipSelected, setChipSelected] = useState(false)
  const [notify, setNotify] = useState(true)
  const [nav, setNav] = useState<'home' | 'profile'>('home')
  const [confirmVisible, setConfirmVisible] = useState(false)
  const { locale, setLocale } = useLocale()
  const t = useTranslation()

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Ceylon Gem Exchange</Text>
          <Link href="/locale-settings" asChild>
            <IconButton
              icon={<Text style={{ color: neutral.white }}>🌐</Text>}
              accessibilityLabel={t.localeSettings.title}
            />
          </Link>
        </View>
        <Show when="signed-in" fallback={<Text style={styles.subtitle}>Not signed in.</Text>}>
          <SignedInGreeting />
        </Show>

        <SegmentedControl
          options={[
            { label: 'English', value: 'en' },
            { label: 'සිංහල', value: 'si' },
          ]}
          value={locale}
          onChange={setLocale}
        />

        <SearchBar
          value={search}
          onChangeText={setSearch}
          onClear={() => setSearch('')}
          placeholder={t.common.search}
        />

        <TextField label="Email" placeholder="you@example.com" value="" onChangeText={() => {}} />

        <SegmentedControl
          options={[
            { label: 'Buy', value: 'buy' },
            { label: 'Rent', value: 'rent' },
          ]}
          value={filter}
          onChange={setFilter}
        />

        <SegmentedTabs
          tabs={[
            { label: 'Details', value: 'details' },
            { label: 'Seller', value: 'seller' },
          ]}
          value={tab}
          onChange={setTab}
        />

        <View style={styles.row}>
          <Chip
            label="Sapphire"
            selected={chipSelected}
            onPress={() => setChipSelected((v) => !v)}
          />
          <Badge label="Verified" />
          <Badge label="Sold" variant="danger" />
        </View>

        <Card>
          <ListRow
            title="Notifications"
            subtitle="Push alerts for new offers"
            trailing={
              <Toggle
                value={notify}
                onValueChange={setNotify}
                accessibilityLabel="Toggle notifications"
              />
            }
          />
          <ListRow title="My Ads" subtitle="3 active listings" onPress={() => {}} />
        </Card>

        <View style={styles.row}>
          <Avatar initials="AS" />
          <IconButton
            icon={<Text style={{ color: neutral.white }}>♥</Text>}
            accessibilityLabel="Favorite"
            active
          />
        </View>

        <StepMeter totalSteps={4} currentStep={1} />
        <ProgressBar progress={0.6} />

        <Button label={t.common.continue} onPress={() => {}} />
        <GhostButton label={t.common.notNow} onPress={() => {}} />
        <Button label={t.common.delete} danger onPress={() => setConfirmVisible(true)} />
      </ScrollView>

      <BottomNavBar
        items={[
          {
            value: 'home',
            label: 'Home',
            icon: () => <Text style={{ color: neutral.white }}>⌂</Text>,
          },
          {
            value: 'profile',
            label: 'Profile',
            icon: () => <Text style={{ color: neutral.white }}>☺</Text>,
          },
        ]}
        value={nav}
        onChange={setNav}
      />

      <ConfirmDialog
        visible={confirmVisible}
        title="Delete account?"
        message="This can't be undone."
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        destructive
        onConfirm={() => setConfirmVisible(false)}
        onCancel={() => setConfirmVisible(false)}
      />
    </View>
  )
}

function SignedInGreeting() {
  const { user } = useUser()
  const name = user?.primaryEmailAddress?.emailAddress ?? user?.primaryPhoneNumber?.phoneNumber
  return <Text style={styles.subtitle}>Signed in{name ? ` as ${name}` : ''}.</Text>
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tone.screen[1],
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: fontSize['2xl'],
    fontFamily: fontFamilies.en.semibold,
    color: neutral.white,
  },
  subtitle: {
    fontFamily: fontFamilies.en.regular,
    color: 'rgba(255,255,255,0.6)',
  },
})
