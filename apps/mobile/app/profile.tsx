import { useAuth, useUser } from '@clerk/expo'
import { gemTones, neutral, type GemTone } from '@ceylon-gems/ui-tokens'
import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from 'expo-linear-gradient'
import { Redirect, useRouter } from 'expo-router'
import { useState, type ReactNode } from 'react'
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Avatar,
  BottomNavBar,
  BottomSheet,
  ConfirmDialog,
  GlassSurface,
  PressableScale,
  Toggle,
} from '../components'
import {
  BagIcon,
  BellEmptyIcon,
  BidsTabIcon,
  CameraIcon,
  ChatIcon,
  CheckIcon,
  ChevronRightIcon,
  CloseIcon,
  CurrencyIcon,
  DigestIcon,
  DocumentIcon,
  ExploreTabIcon,
  FaqIcon,
  FavouritesIcon,
  GalleryIcon,
  GemIcon,
  GlobeIcon,
  HeartIcon,
  HomeTabIcon,
  LanguageIcon,
  LightningIcon,
  LogOutIcon,
  MonitorIcon,
  PadlockIcon,
  ProfileTabIcon,
  SavedSearchIcon,
  ShieldCheckIcon,
  ShieldIcon,
  SparkleIcon,
  TagIcon,
  TrashIcon,
  TrendDownIcon,
} from '../components/icons'
import { GRADIENT_140 } from '../components/primitives/gradientAngle'
import { LiveGradientBackground } from '../components/primitives/LiveGradientBackground'
import { useFontFamily } from '../hooks/useFontFamily'
import { useLanguages } from '../hooks/useLanguages'
import { useTranslation } from '../hooks/useTranslation'
import { useCurrency } from '../providers/CurrencyProvider'
import { useGemTone } from '../providers/GemToneProvider'
import { useLiveGradient } from '../providers/LiveGradientProvider'
import { useLocale } from '../providers/LocaleProvider'

function initialsFor(name: string) {
  return name
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

// Demo engagement counters — no backend for any of these yet (saved
// listings, enquiry threads, completed purchases), same situation as
// every other placeholder number in this app (Home's featuredListings,
// Notifications' demo items). Matches the Profile mockup's own literal
// values.
const STATS = { saved: 12, enquiries: 3, purchased: 2 } as const

// Country is still plain local demo content, not routed through
// `packages/i18n` — a real country switch would come from the account's
// own stored preference, not a translation file, and it isn't wired to
// anything real yet (unlike Language/Currency below, which are: see
// hooks/useLanguages.ts + providers/LocaleProvider.tsx, and
// providers/CurrencyProvider.tsx).
const COUNTRY_OPTIONS = [
  'Sri Lanka',
  'India',
  'Thailand',
  'Singapore',
  'United Arab Emirates',
  'Hong Kong',
  'United Kingdom',
  'United States',
  'Switzerland',
  'Japan',
]

// Gem tone swatch gradients — the mockup's own literal hex pair per tone
// (distinct from `gemTones[x].cta`'s rgba stops, which are tuned for CTA
// fills, not this small circular swatch), plus a display name. Not
// translated: these are the tone's own brand names, same as "Sapphire" /
// "Padparadscha" / "Emerald" showing up untranslated anywhere else a
// `GemTone` is named.
const GEM_TONE_SWATCHES: { key: GemTone; name: string; from: string; to: string }[] = [
  { key: 'sapphire', name: 'Sapphire', from: '#6fd3ff', to: '#2867e6' },
  { key: 'padparadscha', name: 'Padparadscha', from: '#ffb08a', to: '#e85650' },
  { key: 'emerald', name: 'Emerald', from: '#6fe8bd', to: '#149682' },
]

type SheetKey = 'language' | 'country' | 'currency' | null
interface SheetOption {
  id: string
  label: string
}

interface NotificationRow {
  key: 'enquiries' | 'priceDrops' | 'newListings' | 'savedDigest' | 'marketing'
  title: string
  hint: string
  icon: ReactNode
}

interface ProfileRow {
  key: string
  name: string
  icon: ReactNode
  count?: number
  danger?: boolean
  hasChevron?: boolean
  onPress?: () => void
}

// One simple navigation-row card (My gems / Settings / Support / Log out) —
// pulled out of the main component since it's rendered at several points
// in the JSX now that Account Settings' own sections (Appearance,
// Language & region, etc.) are spliced in between them. Uses Profile's own
// row padding (15px, from this mockup's own `D.row`), distinct from the
// Account-Settings-origin sections below (14px, from that mockup's own
// `D.row`) — each section keeps the exact literal its own mockup computed,
// per CLAUDE.md's "don't round a mockup-computed literal" rule, rather
// than forcing one shared row style across both merged screens.
function ProfileRowGroup({ label, rows }: { label: string; rows: ProfileRow[] }) {
  const fonts = useFontFamily()
  const { gemTone } = useGemTone()
  const tone = gemTones[gemTone]

  return (
    <View>
      {label ? (
        <Text style={[styles.sectionLabel, { fontFamily: fonts.extrabold }]}>{label}</Text>
      ) : (
        <View style={styles.sectionSpacer} />
      )}
      <GlassSurface clarity={55} rim={tone.rim} radius={22} style={styles.listCard}>
        {rows.map((row, i) => {
          const content = (
            <View style={[styles.row, i < rows.length - 1 && styles.rowDivider]}>
              <View
                style={[
                  styles.iconTile,
                  row.danger
                    ? styles.iconTileDanger
                    : {
                        backgroundColor: `rgba(${tone.rim},0.13)`,
                        borderColor: `rgba(${tone.rim},0.24)`,
                      },
                ]}
              >
                {row.icon}
              </View>
              <Text
                style={[
                  styles.rowLabel,
                  { fontFamily: fonts.bold },
                  row.danger ? styles.rowLabelDanger : null,
                ]}
                numberOfLines={1}
              >
                {row.name}
              </Text>
              {row.count !== undefined ? (
                <View
                  style={[
                    styles.countPill,
                    {
                      backgroundColor: `rgba(${tone.rim},0.16)`,
                      borderColor: `rgba(${tone.rim},0.28)`,
                    },
                  ]}
                >
                  <Text
                    style={[styles.countLabel, { fontFamily: fonts.extrabold, color: tone.accent }]}
                  >
                    {row.count}
                  </Text>
                </View>
              ) : null}
              {row.hasChevron !== false ? <ChevronRightIcon color="rgba(255,255,255,0.5)" /> : null}
            </View>
          )

          if (!row.onPress) {
            return <View key={row.key}>{content}</View>
          }

          return (
            <PressableScale key={row.key} onPress={row.onPress} accessibilityLabel={row.name}>
              {content}
            </PressableScale>
          )
        })}
      </GlassSurface>
    </View>
  )
}

// The account hub, reached from the bottom nav's Profile tab — now also
// where Account Settings used to live as a separate screen (merged in
// here on request, keeping Account Settings' own interaction style for
// Language/Country/Currency: a row that opens a bottom-sheet picker,
// rather than Profile's plain navigate-away rows). Ports both "Ceylon Gem
// Exchange Profile.dc.html" (identity card, stats, My gems / Settings /
// Support lists, Log out) and "Ceylon Gem Exchange Account Settings.dc.html"
// (Appearance, Language & region, Notifications, Security) — "Deliver via"
// was dropped on request — spliced into one scroll. The Settings group's
// own "Location, language & currency" and "Account settings" rows are
// gone — their content is now directly on this page instead of a tap
// away; "Notifications" stays as a
// row since it links to the separate notifications *inbox* screen, a
// different thing from the Notifications *preferences* toggle list further
// down. The mockup's own Light/Dark/System theme toggle was dropped — no
// light mode exists in this app (see CLAUDE.md). Gem tone, Language, and
// Currency are the three real, app-wide preferences here: gem tone is
// backed by GemToneProvider (re-themes every screen); language is backed
// by LocaleProvider (re-renders every screen's copy) and its option list
// comes from GET /languages; currency is backed by CurrencyProvider
// (re-formats every price already on screen) and its option list comes
// from GET /currencies — both DB-backed so either list can grow without an
// app release. Language's choice is also persisted to the account (see
// hooks/useSyncDeviceLocale.ts); currency's choice is on-device only.
// Country and everything else (notification preferences, two-factor, My
// gems counts, Support) stays local component state only — no backend
// persists those yet. Rows/sections with no real destination (My profile,
// Devices & sessions, all of Support) render without a Pressable — don't
// wire a dead tap target — while still showing
// their chevron for visual fidelity. "My ads", "My membership", "Saved
// searches", "Favourites", and "Change password" are the exceptions now
// that app/my-ads.tsx, app/my-membership.tsx, app/saved-searches.tsx,
// app/favourites.tsx, and app/change-password.tsx exist — they navigate
// for real.
export default function ProfileScreen() {
  const t = useTranslation()
  const fonts = useFontFamily()
  const router = useRouter()
  const { isLoaded, isSignedIn, signOut } = useAuth()
  const { user } = useUser()
  const { gemTone, setGemTone } = useGemTone()
  const { liveGradientEnabled, setLiveGradientEnabled } = useLiveGradient()
  const { locale, setLocale } = useLocale()
  const languages = useLanguages()
  const { currency, setCurrency, currencies } = useCurrency()
  const tone = gemTones[gemTone]
  const [logOutVisible, setLogOutVisible] = useState(false)
  const [photoSheetVisible, setPhotoSheetVisible] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const [country, setCountry] = useState(COUNTRY_OPTIONS[0]!)
  const [notif, setNotif] = useState({
    enquiries: true,
    priceDrops: true,
    newListings: true,
    savedDigest: false,
    marketing: false,
  })
  const [twoFactor, setTwoFactor] = useState(true)
  const [sheet, setSheet] = useState<SheetKey>(null)

  if (isLoaded && !isSignedIn) {
    return <Redirect href="/sign-in" />
  }
  if (!isLoaded) {
    return null
  }

  const displayName = user?.fullName ?? 'Asitha Perera'
  const displayPhone = user?.primaryPhoneNumber?.phoneNumber ?? '+94 71 234 5678'

  async function confirmLogOut() {
    setLogOutVisible(false)
    await signOut()
    router.replace('/sign-in')
  }

  // Clerk's `setProfileImage({ file })` is typed for the web (`Blob | File
  // | string | null`), but its React Native resource layer actually
  // expects the same `{ uri, name, type }` shape RN's own `fetch`/
  // `FormData` use for a file field — the documented pattern for Clerk's
  // Expo SDK, not representable in that web-oriented public type, hence
  // the cast. Not independently verified against a real upload in this
  // environment (no device interaction available here) — worth confirming
  // on-device.
  async function uploadAsset(asset: ImagePicker.ImagePickerAsset) {
    setUploadingPhoto(true)
    try {
      await user?.setProfileImage({
        file: {
          uri: asset.uri,
          name: asset.fileName ?? 'profile.jpg',
          type: asset.mimeType ?? 'image/jpeg',
        } as unknown as File,
      })
      await user?.reload()
    } finally {
      setUploadingPhoto(false)
      setPhotoSheetVisible(false)
    }
  }

  async function handleTakePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) return
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (!result.canceled) await uploadAsset(result.assets[0]!)
  }

  async function handleChooseFromLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) return
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (!result.canceled) await uploadAsset(result.assets[0]!)
  }

  async function handleRemovePhoto() {
    setUploadingPhoto(true)
    try {
      await user?.setProfileImage({ file: null })
      await user?.reload()
    } finally {
      setUploadingPhoto(false)
      setPhotoSheetVisible(false)
    }
  }

  // Shared icon-tile tint for the Account-Settings-origin sections below —
  // identical background/border on every row across Appearance/Language &
  // region/Notifications/Security (that mockup's own `iconTileStyle` is a
  // single shared formula for the same reason).
  const settingsTintStyle = {
    backgroundColor: `rgba(${tone.rim},0.13)`,
    borderColor: `rgba(${tone.rim},0.24)`,
  }

  const notifRows: NotificationRow[] = [
    {
      key: 'enquiries',
      title: t.accountSettings.notifEnquiriesTitle,
      hint: t.accountSettings.notifEnquiriesHint,
      icon: <ChatIcon size={17} color={tone.ink} strokeWidth={1.8} />,
    },
    {
      key: 'priceDrops',
      title: t.accountSettings.notifPriceDropsTitle,
      hint: t.accountSettings.notifPriceDropsHint,
      icon: <TrendDownIcon size={17} color={tone.ink} strokeWidth={1.8} />,
    },
    {
      key: 'newListings',
      title: t.accountSettings.notifNewListingsTitle,
      hint: t.accountSettings.notifNewListingsHint,
      icon: <GemIcon size={17} ink={tone.ink} inkSoft={tone.ink} strokeWidth={1.8} />,
    },
    {
      key: 'savedDigest',
      title: t.accountSettings.notifSavedDigestTitle,
      hint: t.accountSettings.notifSavedDigestHint,
      icon: <DigestIcon size={17} color={tone.ink} strokeWidth={1.8} />,
    },
    {
      key: 'marketing',
      title: t.accountSettings.notifMarketingTitle,
      hint: t.accountSettings.notifMarketingHint,
      icon: <TagIcon size={17} color={tone.ink} strokeWidth={1.8} />,
    },
  ]

  // Current language's own display label, in its own script — "English" /
  // "සිංහල" / "தமிழ்" — not translated through `t.*` (a language names
  // itself, the same way GEM_TONE_SWATCHES' tone names aren't translated
  // either). Falls back to the bare code while `languages` is still loading.
  const currentLanguageLabel =
    languages?.find((l) => l.code === locale)?.label ?? locale.toUpperCase()
  // Shown as just the code ("LKR"), matching the mockup's own
  // `s.currency.split(" — ")[0]` — falls back to the bare code while
  // `currencies` is still loading.
  const currentCurrencyLabel = currencies?.find((c) => c.code === currency)?.code ?? currency

  const pickerRows = [
    {
      key: 'language' as const,
      label: t.accountSettings.language,
      value: currentLanguageLabel,
      icon: <LanguageIcon size={17} color={tone.ink} strokeWidth={1.8} />,
    },
    {
      key: 'country' as const,
      label: t.accountSettings.country,
      value: country,
      icon: <GlobeIcon size={17} color={tone.ink} strokeWidth={1.8} />,
    },
    {
      key: 'currency' as const,
      label: t.accountSettings.currency,
      value: currentCurrencyLabel,
      icon: <CurrencyIcon size={17} color={tone.ink} strokeWidth={1.8} />,
    },
  ]

  const sheetTitle =
    sheet === 'language'
      ? t.accountSettings.sheetSelectLanguage
      : sheet === 'country'
        ? t.accountSettings.sheetSelectCountry
        : sheet === 'currency'
          ? t.accountSettings.sheetSelectCurrency
          : ''
  const sheetOptions: SheetOption[] =
    sheet === 'language'
      ? (languages ?? []).map((l) => ({ id: l.code, label: l.label }))
      : sheet === 'country'
        ? COUNTRY_OPTIONS.map((c) => ({ id: c, label: c }))
        : sheet === 'currency'
          ? (currencies ?? []).map((c) => ({ id: c.code, label: c.label }))
          : []
  const sheetActiveId = sheet === 'language' ? locale : sheet === 'country' ? country : currency

  function selectSheetOption(id: string) {
    if (sheet === 'language') setLocale(id as typeof locale)
    else if (sheet === 'country') setCountry(id)
    else if (sheet === 'currency') setCurrency(id)
    setSheet(null)
  }

  const rowIconColor = tone.ink
  const myGemsRows: ProfileRow[] = [
    {
      key: 'myAds',
      name: t.profile.myAds,
      icon: <TagIcon size={16} color={rowIconColor} />,
      count: 5,
      onPress: () => router.push('/my-ads'),
    },
    {
      key: 'myMembership',
      name: t.profile.myMembership,
      icon: <BagIcon size={16} color={rowIconColor} />,
      onPress: () => router.push('/my-membership'),
    },
    {
      key: 'myProfile',
      name: t.profile.myProfile,
      icon: <ProfileTabIcon size={16} color={rowIconColor} />,
    },
    {
      key: 'savedSearches',
      name: t.profile.savedSearches,
      icon: <SavedSearchIcon size={16} color={rowIconColor} />,
      count: 5,
      onPress: () => router.push('/saved-searches'),
    },
    {
      key: 'favourites',
      name: t.profile.favourites,
      icon: <FavouritesIcon size={16} color={rowIconColor} />,
      count: 2,
      onPress: () => router.push('/favourites'),
    },
  ]
  const settingsRows: ProfileRow[] = [
    {
      key: 'notifications',
      name: t.profile.notifications,
      icon: <BellEmptyIcon size={16} color={rowIconColor} />,
      onPress: () => router.push('/notifications'),
    },
  ]
  const supportRows: ProfileRow[] = [
    {
      key: 'staySafe',
      name: t.profile.staySafe,
      icon: <ShieldIcon size={16} color={rowIconColor} />,
    },
    { key: 'faq', name: t.profile.faq, icon: <FaqIcon size={16} color={rowIconColor} /> },
    {
      key: 'howToSellFast',
      name: t.profile.howToSellFast,
      icon: <LightningIcon size={16} color={rowIconColor} />,
    },
    {
      key: 'terms',
      name: t.profile.termsConditions,
      icon: <DocumentIcon size={16} color={rowIconColor} />,
    },
    {
      key: 'privacy',
      name: t.profile.privacyPolicy,
      icon: <PadlockIcon size={16} color={rowIconColor} />,
    },
  ]
  const logOutRows: ProfileRow[] = [
    {
      key: 'logOut',
      name: t.profile.logOut,
      icon: <LogOutIcon size={16} />,
      danger: true,
      hasChevron: false,
      onPress: () => setLogOutVisible(true),
    },
  ]

  return (
    <LiveGradientBackground>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={styles.navRow}>
          <Text style={[styles.navTitle, { fontFamily: fonts.extrabold }]} numberOfLines={1}>
            {t.profile.navTitle}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <GlassSurface clarity={55} rim={tone.rim} radius={24} style={styles.identity}>
            <Avatar
              uri={user?.imageUrl}
              initials={initialsFor(displayName)}
              size={62}
              accessibilityLabel={displayName}
            />
            <View style={styles.identityCol}>
              <Text
                style={[styles.identityName, { fontFamily: fonts.extrabold }]}
                numberOfLines={1}
              >
                {displayName}
              </Text>
              <Text style={[styles.identityPhone, { fontFamily: fonts.semibold }]}>
                {displayPhone}
              </Text>
              <View
                style={[
                  styles.verifiedPill,
                  {
                    backgroundColor: `rgba(${tone.rim},0.14)`,
                    borderColor: `rgba(${tone.rim},0.3)`,
                  },
                ]}
              >
                <ShieldCheckIcon size={12} color={tone.ink} strokeWidth={1.7} />
                <Text
                  style={[
                    styles.verifiedLabel,
                    { fontFamily: fonts.extrabold, color: tone.accent },
                  ]}
                >
                  {t.profile.verifiedBuyer}
                </Text>
              </View>
            </View>
            {/* Opens the change-photo sheet below — the mockup's own
                edit-pencil glyph was dropped in favor of a camera icon now
                that this button has a real action (it used to be
                decorative, with no destination). */}
            <PressableScale
              onPress={() => setPhotoSheetVisible(true)}
              accessibilityLabel={t.profile.editAccessibilityLabel}
            >
              <LinearGradient
                colors={[`${tone.cta[0]}0.62)`, `${tone.cta[1]}0.42)`]}
                start={GRADIENT_140.start}
                end={GRADIENT_140.end}
                style={[styles.editBtn, { borderColor: `rgba(${tone.rim},0.45)` }]}
              >
                <CameraIcon size={15} color={neutral.white} strokeWidth={1.8} />
              </LinearGradient>
            </PressableScale>
          </GlassSurface>

          <View style={styles.statsRow}>
            {(
              [
                { value: STATS.saved, label: t.profile.statSaved },
                { value: STATS.enquiries, label: t.profile.statEnquiries },
                { value: STATS.purchased, label: t.profile.statPurchased },
              ] as const
            ).map((stat) => (
              <GlassSurface
                key={stat.label}
                clarity={55}
                rim={tone.rim}
                radius={20}
                style={styles.statTile}
              >
                <Text style={[styles.statValue, { fontFamily: fonts.extrabold }]}>
                  {stat.value}
                </Text>
                <Text style={[styles.statLabel, { fontFamily: fonts.bold }]}>{stat.label}</Text>
              </GlassSurface>
            ))}
          </View>

          <ProfileRowGroup label={t.profile.groupMyGems} rows={myGemsRows} />
          <ProfileRowGroup label={t.profile.groupSettings} rows={settingsRows} />

          {/* Appearance (from Account Settings) */}
          <Text style={[styles.settingsSectionLabel, { fontFamily: fonts.extrabold }]}>
            {t.accountSettings.sectionAppearance}
          </Text>
          <GlassSurface clarity={55} rim={tone.rim} radius={22} style={styles.settingsCard}>
            <View style={styles.settingsRow}>
              <View style={[styles.settingsIconTile, settingsTintStyle]}>
                <GemIcon size={17} ink={tone.ink} inkSoft={tone.ink} strokeWidth={1.8} />
              </View>
              <View style={styles.settingsRowText}>
                <Text style={[styles.settingsRowTitle, { fontFamily: fonts.bold }]}>
                  {t.accountSettings.gemTone}
                </Text>
                <Text style={[styles.settingsRowHint, { fontFamily: fonts.medium }]}>
                  {t.accountSettings.gemToneHint}
                </Text>
              </View>
            </View>

            <View style={styles.toneRow}>
              {GEM_TONE_SWATCHES.map((swatch) => {
                const active = gemTone === swatch.key
                return (
                  <PressableScale
                    key={swatch.key}
                    onPress={() => setGemTone(swatch.key)}
                    accessibilityRole="button"
                    accessibilityLabel={swatch.name}
                    accessibilityState={{ selected: active }}
                    style={styles.toneItemWrapper}
                  >
                    {active ? (
                      <LinearGradient
                        colors={[`${tone.cta[0]}0.34)`, `${tone.cta[1]}0.2)`]}
                        start={GRADIENT_140.start}
                        end={GRADIENT_140.end}
                        style={[styles.toneItem, { borderColor: `rgba(${tone.rim},0.45)` }]}
                      >
                        <View
                          style={[
                            styles.toneSwatch,
                            { backgroundColor: swatch.from, borderColor: 'rgba(255,255,255,0.6)' },
                          ]}
                        >
                          <LinearGradient
                            colors={[swatch.from, swatch.to]}
                            start={GRADIENT_140.start}
                            end={GRADIENT_140.end}
                            style={styles.toneSwatchFill}
                          />
                        </View>
                        <Text
                          style={[styles.toneLabel, { fontFamily: fonts.extrabold, color: '#fff' }]}
                        >
                          {swatch.name}
                        </Text>
                      </LinearGradient>
                    ) : (
                      <View style={[styles.toneItem, styles.toneItemInactive]}>
                        <View
                          style={[
                            styles.toneSwatch,
                            { backgroundColor: swatch.from, borderColor: 'rgba(255,255,255,0.28)' },
                          ]}
                        >
                          <LinearGradient
                            colors={[swatch.from, swatch.to]}
                            start={GRADIENT_140.start}
                            end={GRADIENT_140.end}
                            style={styles.toneSwatchFill}
                          />
                        </View>
                        <Text
                          style={[
                            styles.toneLabel,
                            { fontFamily: fonts.extrabold, color: 'rgba(255,255,255,0.6)' },
                          ]}
                        >
                          {swatch.name}
                        </Text>
                      </View>
                    )}
                  </PressableScale>
                )
              })}
            </View>

            <View style={[styles.settingsRow, styles.settingsRowDividerTop]}>
              <View style={[styles.settingsIconTile, settingsTintStyle]}>
                <SparkleIcon size={17} color={tone.ink} strokeWidth={1.6} />
              </View>
              <View style={styles.settingsRowText}>
                <Text style={[styles.settingsRowTitle, { fontFamily: fonts.bold }]}>
                  {t.accountSettings.liveGradient}
                </Text>
                <Text style={[styles.settingsRowHint, { fontFamily: fonts.medium }]}>
                  {t.accountSettings.liveGradientHint}
                </Text>
              </View>
              <Toggle
                value={liveGradientEnabled}
                onValueChange={setLiveGradientEnabled}
                accessibilityLabel={t.accountSettings.liveGradient}
              />
            </View>
          </GlassSurface>

          {/* Language & region (from Account Settings) */}
          <Text style={[styles.settingsSectionLabel, { fontFamily: fonts.extrabold }]}>
            {t.accountSettings.sectionLanguageRegion}
          </Text>
          <GlassSurface clarity={55} rim={tone.rim} radius={22} style={styles.settingsListCard}>
            {pickerRows.map((p, i) => (
              <PressableScale
                key={p.key}
                onPress={() => setSheet(p.key)}
                accessibilityLabel={`${p.label}, ${p.value}`}
                style={[styles.settingsRow, i < pickerRows.length - 1 && styles.settingsRowDivider]}
              >
                <View style={[styles.settingsIconTile, settingsTintStyle]}>{p.icon}</View>
                <Text
                  style={[
                    styles.settingsRowTitle,
                    styles.settingsFlexGrow,
                    { fontFamily: fonts.bold },
                  ]}
                >
                  {p.label}
                </Text>
                <Text style={[styles.settingsRowValue, { fontFamily: fonts.bold }]}>{p.value}</Text>
                <ChevronRightIcon color="rgba(255,255,255,0.5)" />
              </PressableScale>
            ))}
          </GlassSurface>

          {/* Notifications preferences (from Account Settings — distinct
              from the "Notifications" inbox row above) */}
          <Text style={[styles.settingsSectionLabel, { fontFamily: fonts.extrabold }]}>
            {t.accountSettings.notifications}
          </Text>
          <GlassSurface clarity={55} rim={tone.rim} radius={22} style={styles.settingsListCard}>
            {notifRows.map((n, i) => (
              <View
                key={n.key}
                style={[styles.settingsRow, i < notifRows.length - 1 && styles.settingsRowDivider]}
              >
                <View style={[styles.settingsIconTile, settingsTintStyle]}>{n.icon}</View>
                <View style={styles.settingsRowText}>
                  <Text style={[styles.settingsRowTitle, { fontFamily: fonts.bold }]}>
                    {n.title}
                  </Text>
                  <Text style={[styles.settingsRowHint, { fontFamily: fonts.medium }]}>
                    {n.hint}
                  </Text>
                </View>
                <Toggle
                  value={notif[n.key]}
                  onValueChange={(value) => setNotif((prev) => ({ ...prev, [n.key]: value }))}
                  accessibilityLabel={n.title}
                />
              </View>
            ))}
          </GlassSurface>

          {/* Security (from Account Settings) */}
          <Text style={[styles.settingsSectionLabel, { fontFamily: fonts.extrabold }]}>
            {t.accountSettings.sectionSecurity}
          </Text>
          <GlassSurface clarity={55} rim={tone.rim} radius={22} style={styles.settingsListCard}>
            <PressableScale
              onPress={() => router.push('/change-password')}
              accessibilityLabel={t.accountSettings.changePassword}
              style={[styles.settingsRow, styles.settingsRowDivider]}
            >
              <View style={[styles.settingsIconTile, settingsTintStyle]}>
                <PadlockIcon size={17} color={tone.ink} strokeWidth={1.8} />
              </View>
              <Text
                style={[
                  styles.settingsRowTitle,
                  styles.settingsFlexGrow,
                  { fontFamily: fonts.bold },
                ]}
              >
                {t.accountSettings.changePassword}
              </Text>
              <ChevronRightIcon color="rgba(255,255,255,0.5)" />
            </PressableScale>

            <View style={[styles.settingsRow, styles.settingsRowDivider]}>
              <View style={[styles.settingsIconTile, settingsTintStyle]}>
                <ShieldIcon size={17} color={tone.ink} strokeWidth={1.8} />
              </View>
              <Text
                style={[
                  styles.settingsRowTitle,
                  styles.settingsFlexGrow,
                  { fontFamily: fonts.bold },
                ]}
              >
                {t.accountSettings.twoStepVerification}
              </Text>
              <Toggle
                value={twoFactor}
                onValueChange={setTwoFactor}
                accessibilityLabel={t.accountSettings.twoStepVerification}
              />
            </View>

            <View style={styles.settingsRow}>
              <View style={[styles.settingsIconTile, settingsTintStyle]}>
                <MonitorIcon size={17} color={tone.ink} strokeWidth={1.8} />
              </View>
              <Text
                style={[
                  styles.settingsRowTitle,
                  styles.settingsFlexGrow,
                  { fontFamily: fonts.bold },
                ]}
              >
                {t.accountSettings.devicesSessions}
              </Text>
              <ChevronRightIcon color="rgba(255,255,255,0.5)" />
            </View>
          </GlassSurface>

          <ProfileRowGroup label={t.profile.groupSupport} rows={supportRows} />
          <ProfileRowGroup label="" rows={logOutRows} />

          <Text style={[styles.footer, { fontFamily: fonts.semibold }]}>{t.profile.footer}</Text>

          <View style={styles.navSpacer} />
        </ScrollView>

        <BottomNavBar
          value="profile"
          onChange={(value) => {
            if (value === 'home') router.push('/home')
          }}
          style={styles.floatingNav}
          items={[
            { value: 'home', label: 'Home', icon: (color) => <HomeTabIcon color={color} /> },
            {
              value: 'explore',
              label: 'Explore',
              icon: (color) => <ExploreTabIcon color={color} />,
            },
            { value: 'bids', label: 'Bids', icon: (color) => <BidsTabIcon color={color} /> },
            {
              value: 'saved',
              label: 'Saved',
              icon: (color) => <HeartIcon size={20} color={color} />,
            },
            {
              value: 'profile',
              label: 'Profile',
              icon: (color) => <ProfileTabIcon color={color} />,
            },
          ]}
        />
      </SafeAreaView>

      <BottomSheet
        visible={sheet !== null}
        onClose={() => setSheet(null)}
        closeAccessibilityLabel={t.common.close}
        radius={30}
        style={styles.sheet}
      >
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { fontFamily: fonts.extrabold }]}>{sheetTitle}</Text>
          <PressableScale
            onPress={() => setSheet(null)}
            accessibilityLabel={t.common.close}
            hitSlop={8}
            style={styles.sheetClose}
          >
            <CloseIcon />
          </PressableScale>
        </View>

        <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
          {sheetOptions.map((option) => {
            const active = option.id === sheetActiveId
            return (
              <PressableScale
                key={option.id}
                onPress={() => selectSheetOption(option.id)}
                accessibilityRole="checkbox"
                accessibilityLabel={option.label}
                accessibilityState={{ checked: active }}
                style={[
                  styles.sheetOption,
                  active
                    ? {
                        backgroundColor: `rgba(${tone.rim},0.14)`,
                        borderColor: `rgba(${tone.rim},0.3)`,
                      }
                    : styles.sheetOptionInactive,
                ]}
              >
                <Text
                  style={[
                    styles.sheetOptionLabel,
                    styles.settingsFlexGrow,
                    { fontFamily: fonts.semibold },
                  ]}
                >
                  {option.label}
                </Text>
                {active ? <CheckIcon size={14} color={tone.accent} /> : null}
              </PressableScale>
            )
          })}
        </ScrollView>
      </BottomSheet>

      {/* Change-photo action sheet — same `BottomSheet` + header/close +
          selectable-row style as the Language/Country/Currency picker
          above, just content-sized instead of a fixed 62% height (a
          3-row action list, not a long scrollable one). */}
      <BottomSheet
        visible={photoSheetVisible}
        onClose={() => setPhotoSheetVisible(false)}
        closeAccessibilityLabel={t.common.close}
        radius={30}
        style={styles.photoSheet}
      >
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { fontFamily: fonts.extrabold }]}>
            {t.profile.changePhotoTitle}
          </Text>
          <PressableScale
            onPress={() => setPhotoSheetVisible(false)}
            accessibilityLabel={t.common.close}
            hitSlop={8}
            style={styles.sheetClose}
          >
            <CloseIcon />
          </PressableScale>
        </View>

        {(
          [
            {
              key: 'camera',
              label: t.profile.takePhoto,
              icon: CameraIcon,
              onPress: handleTakePhoto,
            },
            {
              key: 'library',
              label: t.profile.chooseFromLibrary,
              icon: GalleryIcon,
              onPress: handleChooseFromLibrary,
            },
            ...(user?.hasImage
              ? [
                  {
                    key: 'remove',
                    label: t.profile.removePhoto,
                    icon: TrashIcon,
                    onPress: handleRemovePhoto,
                    danger: true,
                  },
                ]
              : []),
          ] as const
        ).map((option) => {
          const Icon = option.icon
          const danger = 'danger' in option && option.danger
          return (
            <PressableScale
              key={option.key}
              onPress={option.onPress}
              disabled={uploadingPhoto}
              accessibilityLabel={option.label}
              style={styles.photoOption}
            >
              <View
                style={[
                  styles.settingsIconTile,
                  danger
                    ? styles.iconTileDanger
                    : {
                        backgroundColor: `rgba(${tone.rim},0.13)`,
                        borderColor: `rgba(${tone.rim},0.24)`,
                      },
                ]}
              >
                <Icon size={17} color={danger ? neutral.danger.text : tone.ink} strokeWidth={1.8} />
              </View>
              <Text
                style={[
                  styles.sheetOptionLabel,
                  { fontFamily: fonts.semibold },
                  danger ? styles.rowLabelDanger : null,
                ]}
              >
                {option.label}
              </Text>
            </PressableScale>
          )
        })}
      </BottomSheet>

      <ConfirmDialog
        visible={logOutVisible}
        title={t.profile.logOutConfirmTitle}
        message={t.profile.logOutConfirmMessage}
        confirmLabel={t.profile.logOutConfirmButton}
        cancelLabel={t.common.cancel}
        destructive
        onConfirm={confirmLogOut}
        onCancel={() => setLogOutVisible(false)}
      />
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
    paddingBottom: 6,
  },
  navTitle: {
    flex: 1,
    fontSize: 17,
    letterSpacing: -0.3,
    color: neutral.white,
  },
  body: {
    paddingHorizontal: 22,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 10,
    padding: 16,
  },
  identityCol: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  identityName: {
    fontSize: 17,
    letterSpacing: -0.2,
    color: neutral.white,
  },
  identityPhone: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  verifiedPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 11,
    borderWidth: 1,
  },
  verifiedLabel: {
    fontSize: 10,
    letterSpacing: 0.3,
  },
  editBtn: {
    flexShrink: 0,
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  statTile: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  statValue: {
    fontSize: 18,
    color: neutral.white,
  },
  statLabel: {
    fontSize: 10,
    letterSpacing: 0.4,
    color: 'rgba(255,255,255,0.45)',
  },
  // Profile's own list sections (My gems / Settings / Support / Log out) —
  // this mockup's own `D.row`/label-margin literals (15/22), distinct from
  // the Account-Settings-origin `settings*` styles below (14/4).
  sectionLabel: {
    color: 'rgba(255,255,255,0.42)',
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 22,
    marginHorizontal: 4,
    marginBottom: 10,
  },
  sectionSpacer: {
    height: 22,
  },
  listCard: {
    marginBottom: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: 14,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  iconTile: {
    flexShrink: 0,
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTileDanger: {
    backgroundColor: 'rgba(255,120,105,0.14)',
    borderColor: 'rgba(255,120,105,0.28)',
  },
  rowLabel: {
    flex: 1,
    fontSize: 13,
    color: neutral.white,
  },
  rowLabelDanger: {
    color: neutral.danger.text,
  },
  countPill: {
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 9,
    borderWidth: 1,
  },
  countLabel: {
    fontSize: 11,
  },
  footer: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    marginTop: 18,
  },
  navSpacer: {
    height: 120,
  },
  floatingNav: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 36,
  },
  // Account-Settings-origin styles below (Appearance / Language & region /
  // Notifications preferences / Security + the picker sheet) — that
  // mockup's own literals, kept separate from Profile's `row`/
  // `iconTile`/etc. above rather than unified, since the two source
  // mockups computed different numbers for what looks like the same kind
  // of row.
  settingsSectionLabel: {
    color: 'rgba(255,255,255,0.42)',
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 4,
    marginHorizontal: 4,
    marginBottom: 10,
  },
  settingsCard: {
    padding: 14,
    marginBottom: 20,
  },
  settingsListCard: {
    marginBottom: 20,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  settingsRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  // Caps off the gem-tone swatch picker above it within the same
  // Appearance card — a top border rather than `settingsRowDivider`'s
  // bottom one, since this row follows a non-row block (the swatches),
  // not another row in a list.
  settingsRowDividerTop: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  settingsIconTile: {
    flexShrink: 0,
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsRowText: {
    flex: 1,
    gap: 2,
  },
  settingsFlexGrow: {
    flex: 1,
  },
  settingsRowTitle: {
    color: neutral.white,
    fontSize: 13,
  },
  settingsRowHint: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
  },
  settingsRowValue: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
  },
  toneRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 12,
  },
  toneItemWrapper: {
    flex: 1,
  },
  toneItem: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 18,
    borderWidth: 1,
  },
  toneItemInactive: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderColor: 'rgba(255,255,255,0.16)',
  },
  toneSwatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  toneSwatchFill: {
    width: '100%',
    height: '100%',
  },
  toneLabel: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
  sheet: {
    height: '62%',
    padding: 0,
    borderBottomLeftRadius: 44,
    borderBottomRightRadius: 44,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  sheetTitle: {
    fontSize: 16,
    color: neutral.white,
  },
  sheetClose: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  sheetBody: {
    flex: 1,
    paddingHorizontal: 14,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 2,
  },
  sheetOptionInactive: {
    borderColor: 'transparent',
  },
  sheetOptionLabel: {
    color: neutral.white,
    fontSize: 14,
  },
  photoSheet: {
    padding: 0,
    paddingBottom: 20,
  },
  photoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 20,
  },
})
