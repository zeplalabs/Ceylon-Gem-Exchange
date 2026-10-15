import { useAuth, useUser } from '@clerk/expo'
import { gemTones, neutral, type GemTonePalette } from '@ceylon-gems/ui-tokens'
import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Avatar,
  BottomSheet,
  Button,
  GlassSurface,
  IconButton,
  PressableScale,
  SearchBar,
  TextField,
  Toggle,
} from '../components'
import {
  CameraIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  CloseIcon,
  GalleryIcon,
  MailIcon,
  PersonIcon,
  PhoneIcon,
  PinIcon,
  SearchIcon,
  StoreIcon,
  TrashIcon,
} from '../components/icons'
import { GRADIENT_140 } from '../components/primitives/gradientAngle'
import { LiveGradientBackground } from '../components/primitives/LiveGradientBackground'
import { useFontFamily } from '../hooks/useFontFamily'
import { useTranslation } from '../hooks/useTranslation'
import { API_URL } from '../lib/apiUrl'
import { useGemTone } from '../providers/GemToneProvider'

const BIO_MAX_LENGTH = 160

// Every Sri Lankan district, exact order ported from the Edit Profile
// mockup's own district-picker sheet — not a general taxonomy table (see
// users.location's own schema comment for why this stays a plain string
// column rather than an enum/reference table).
const DISTRICTS = [
  'Ratnapura',
  'Colombo',
  'Gampaha',
  'Kalutara',
  'Kandy',
  'Matale',
  'Nuwara Eliya',
  'Galle',
  'Matara',
  'Hambantota',
  'Jaffna',
  'Kilinochchi',
  'Mannar',
  'Vavuniya',
  'Mullaitivu',
  'Batticaloa',
  'Ampara',
  'Trincomalee',
  'Kurunegala',
  'Puttalam',
  'Anuradhapura',
  'Polonnaruwa',
  'Badulla',
  'Monaragala',
  'Kegalle',
]

interface MeResponse {
  displayName: string | null
  phone: string | null
  phoneVerified: boolean
  email: string | null
  bio: string | null
  location: string | null
  shopName: string | null
  showPhoneOnListings: boolean
  publicCollectorProfile: boolean
}

function CameraFab({ onPress, tone }: { onPress: () => void; tone: GemTonePalette }) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityLabel="Change photo"
      style={[styles.cameraFab, { borderColor: `rgba(${tone.rim},0.5)` }]}
    >
      <LinearGradient
        colors={[`${tone.cta[0]}0.95)`, `${tone.cta[1]}0.85)`]}
        start={GRADIENT_140.start}
        end={GRADIENT_140.end}
        style={styles.cameraFabFill}
      >
        <CameraIcon size={15} color={neutral.white} strokeWidth={1.8} />
      </LinearGradient>
    </PressableScale>
  )
}

function ScreenLink({
  label,
  onPress,
  color,
}: {
  label: string
  onPress: () => void
  color: string
}) {
  const fonts = useFontFamily()
  return (
    <PressableScale onPress={onPress} accessibilityLabel={label} hitSlop={8}>
      <Text style={[styles.linkText, { fontFamily: fonts.bold, color }]}>{label}</Text>
    </PressableScale>
  )
}

// Reached from Profile's "My profile" row. Ports the real Edit Profile
// `.dc.html` mockup (found in ~/Downloads/Ceylon Gem Exchange/ partway
// through this screen's build, replacing an earlier component-kit-only
// pass built before that mockup's existence was known) — field set,
// order, icons and copy all come from it. `shopName` and
// `publicCollectorProfile` are new `users` columns added specifically to
// back it (see schema.ts's own comment); `publicCollectorProfile` is
// store-only, same reasoning as `listingReports`, since no public
// collector-profile page exists yet to gate on it.
export default function EditProfileScreen() {
  const t = useTranslation()
  const fonts = useFontFamily()
  const router = useRouter()
  const { getToken } = useAuth()
  const { user, isLoaded: userLoaded } = useUser()
  const { gemTone } = useGemTone()
  const tone = gemTones[gemTone]

  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [email, setEmail] = useState('')
  const [shopName, setShopName] = useState('')
  const [district, setDistrict] = useState('')
  const [bio, setBio] = useState('')
  const [showPhoneOnListings, setShowPhoneOnListings] = useState(true)
  const [publicCollectorProfile, setPublicCollectorProfile] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [districtSheetVisible, setDistrictSheetVisible] = useState(false)
  const [districtSearch, setDistrictSearch] = useState('')

  const [photoSheetVisible, setPhotoSheetVisible] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  function goBack() {
    if (router.canGoBack()) router.back()
    else router.replace('/profile')
  }

  useEffect(() => {
    // Waits for Clerk, not just for the mount tick — `useUser()` can still
    // report `isLoaded: false` (and `user: undefined`) on this screen's
    // very first render even though Profile, one screen back, already had
    // it resolved; each screen's own `useUser()` call re-syncs from the
    // shared ClerkProvider context and can lag a render behind. Depending
    // on `userLoaded` (flips exactly once, false → true) rather than
    // `user` itself means this still only runs once in practice — `user`'s
    // later reference changes (e.g. the avatar `reload()` after a photo
    // change below) won't re-fire it and wipe an in-progress edit.
    if (!userLoaded) return
    let cancelled = false

    async function load() {
      // Our own `users` row only has a field once something actually wrote
      // it — `displayName`/`phone`/`email` are synced in by the Clerk
      // webhook, but that sync can lag or (for a test/dev account) never
      // have run at all. Clerk's own `user` object is the fallback for
      // exactly these three identity fields regardless of whether the
      // `GET /me` call below even succeeds — the two are independent, not
      // sequenced, so a DB hiccup never blanks out what Clerk already
      // knows. `shopName`/district/bio/toggles have no Clerk equivalent
      // and stay empty until the seller fills them in themselves.
      setFullName(user?.fullName ?? '')
      setPhone(user?.primaryPhoneNumber?.phoneNumber ?? user?.phoneNumbers?.[0]?.phoneNumber ?? '')
      setPhoneVerified(user?.primaryPhoneNumber?.verification?.status === 'verified')
      setEmail(user?.primaryEmailAddress?.emailAddress ?? '')

      try {
        const token = await getToken()
        if (!token) return
        const res = await fetch(`${API_URL}/me`, { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok || cancelled) return
        const data = (await res.json()) as MeResponse
        if (cancelled) return
        if (data.displayName) setFullName(data.displayName)
        if (data.phone) setPhone(data.phone)
        if (data.phoneVerified) setPhoneVerified(true)
        if (data.email) setEmail(data.email)
        setShopName(data.shopName ?? '')
        setDistrict(data.location ?? '')
        setBio(data.bio ?? '')
        setShowPhoneOnListings(data.showPhoneOnListings)
        setPublicCollectorProfile(data.publicCollectorProfile)
      } catch {
        // Leave whatever Clerk already filled in above — not fatal, the
        // seller can still fill the rest in and save from scratch.
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
    // `getToken` deliberately excluded — Clerk's `useAuth()` hands back a
    // new function identity on every render (it's not memoized), so
    // listing it here re-ran this whole effect, including every setter
    // above, on every keystroke in any field: the real bug behind "I can't
    // edit any field, it resets itself." `userLoaded` is the only thing
    // this genuinely needs to react to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoaded])

  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not signed in')
      const res = await fetch(`${API_URL}/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          displayName: fullName.trim() || undefined,
          phone,
          email,
          shopName,
          location: district,
          bio,
          showPhoneOnListings,
          publicCollectorProfile,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.message ?? `Failed to save (${res.status})`)
      }
      goBack()
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t.common.genericError)
    } finally {
      setSubmitting(false)
    }
  }

  // Same Clerk `setProfileImage` flow as Profile's own avatar editor
  // (app/profile.tsx) — duplicated here rather than shared, matching this
  // codebase's existing per-screen tolerance for small logic duplication
  // (e.g. chat/[id].tsx's own `UUID_PATTERN`/`formatTime` helpers) rather
  // than introducing a new shared hook for a second consumer.
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

  const filteredDistricts = useMemo(() => {
    const q = districtSearch.trim().toLowerCase()
    if (!q) return DISTRICTS
    return DISTRICTS.filter((d) => d.toLowerCase().includes(q))
  }, [districtSearch])

  const photoOptions = [
    { key: 'camera', label: t.profile.takePhoto, icon: CameraIcon, onPress: handleTakePhoto },
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
            {t.editProfile.title}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={neutral.white} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.avatarWrap}>
              <Avatar
                uri={user?.imageUrl}
                initials={fullName ? fullName.slice(0, 2).toUpperCase() : '—'}
                size={96}
                accessibilityLabel={fullName}
              />
              <CameraFab onPress={() => setPhotoSheetVisible(true)} tone={tone} />
            </View>
            <ScreenLink
              label={t.editProfile.changePhoto}
              onPress={() => setPhotoSheetVisible(true)}
              color={tone.accent}
            />

            <View style={styles.fields}>
              <TextField
                label={t.editProfile.fullNameLabel}
                value={fullName}
                onChangeText={setFullName}
                placeholder={t.editProfile.fullNamePlaceholder}
                leftIcon={<PersonIcon size={17} color="rgba(190,230,255,0.75)" />}
              />
              <View>
                <TextField
                  label={t.editProfile.mobileNumberLabel}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  leftIcon={<PhoneIcon size={17} color="rgba(190,230,255,0.75)" />}
                  rightIcon={
                    phoneVerified ? (
                      <View style={[styles.verifiedPill, { borderColor: `rgba(${tone.rim},0.3)` }]}>
                        <Text style={[styles.verifiedPillText, { fontFamily: fonts.extrabold }]}>
                          {t.editProfile.verifiedBadge}
                        </Text>
                      </View>
                    ) : undefined
                  }
                />
                {/* Closes the loop for the two ways a phone ends up
                    unverified: never verified at all, or just edited here
                    (PATCH /me clears `phoneVerifiedAt` on any phone change
                    — see that endpoint's own comment) — without this,
                    there'd be no way back to verify-phone-account.tsx
                    short of hitting the Phone-verify-to-post hard gate on
                    post-ad.tsx first. */}
                {!phoneVerified && phone.trim() ? (
                  <PressableScale
                    onPress={() => router.push('/verify-phone-account')}
                    accessibilityLabel={t.editProfile.verifyPhoneLink}
                    hitSlop={6}
                    style={styles.verifyPhoneLinkWrap}
                  >
                    <Text
                      style={[
                        styles.verifyPhoneLink,
                        { fontFamily: fonts.bold, color: tone.accent },
                      ]}
                    >
                      {t.editProfile.verifyPhoneLink}
                    </Text>
                  </PressableScale>
                ) : null}
              </View>
              <TextField
                label={t.editProfile.emailLabel}
                value={email}
                onChangeText={setEmail}
                placeholder={t.editProfile.emailPlaceholder}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={<MailIcon size={17} color="rgba(190,230,255,0.75)" />}
              />
              <TextField
                label={t.editProfile.shopNameLabel}
                value={shopName}
                onChangeText={setShopName}
                placeholder={t.editProfile.shopNamePlaceholder}
                leftIcon={<StoreIcon size={17} color="rgba(190,230,255,0.75)" />}
              />

              <View>
                <Text style={[styles.fieldLabel, { fontFamily: fonts.semibold }]}>
                  {t.editProfile.districtLabel}
                </Text>
                <PressableScale
                  onPress={() => setDistrictSheetVisible(true)}
                  accessibilityLabel={t.editProfile.districtLabel}
                >
                  <GlassSurface clarity={55} radius={18} style={styles.selectSurface}>
                    <PinIcon size={17} color="rgba(190,230,255,0.75)" />
                    <Text
                      style={[styles.selectValue, { fontFamily: fonts.regular }]}
                      numberOfLines={1}
                    >
                      {district || t.editProfile.selectDistrictTitle}
                    </Text>
                    <ChevronDownIcon />
                  </GlassSurface>
                </PressableScale>
              </View>

              <View>
                <Text style={[styles.fieldLabel, { fontFamily: fonts.semibold }]}>
                  {t.editProfile.bioLabel}
                </Text>
                <View style={styles.bioWrap}>
                  <TextField
                    value={bio}
                    onChangeText={(text) => setBio(text.slice(0, BIO_MAX_LENGTH))}
                    placeholder={t.editProfile.bioPlaceholder}
                    multiline
                    leftIcon={<PersonIcon size={17} color="rgba(190,230,255,0.75)" />}
                  />
                  <Text
                    style={[styles.bioCounter, { fontFamily: fonts.semibold }]}
                    pointerEvents="none"
                  >
                    {bio.length}/{BIO_MAX_LENGTH}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={[styles.sectionLabel, { fontFamily: fonts.extrabold }]}>
              {t.editProfile.visibilityLabel}
            </Text>
            <GlassSurface clarity={55} rim={tone.rim} radius={20} style={styles.visibilityCard}>
              <View style={[styles.visibilityRow, styles.visibilityRowDivider]}>
                <View style={styles.visibilityCol}>
                  <Text style={[styles.visibilityTitle, { fontFamily: fonts.bold }]}>
                    {t.editProfile.showPhoneToggle}
                  </Text>
                  <Text style={[styles.visibilityHint, { fontFamily: fonts.semibold }]}>
                    {t.editProfile.showPhoneToggleHint}
                  </Text>
                </View>
                <Toggle
                  value={showPhoneOnListings}
                  onValueChange={setShowPhoneOnListings}
                  accessibilityLabel={t.editProfile.showPhoneToggle}
                />
              </View>
              <View style={styles.visibilityRow}>
                <View style={styles.visibilityCol}>
                  <Text style={[styles.visibilityTitle, { fontFamily: fonts.bold }]}>
                    {t.editProfile.publicProfileToggle}
                  </Text>
                  <Text style={[styles.visibilityHint, { fontFamily: fonts.semibold }]}>
                    {t.editProfile.publicProfileToggleHint}
                  </Text>
                </View>
                <Toggle
                  value={publicCollectorProfile}
                  onValueChange={setPublicCollectorProfile}
                  accessibilityLabel={t.editProfile.publicProfileToggle}
                />
              </View>
            </GlassSurface>

            {error ? (
              <Text style={[styles.error, { fontFamily: fonts.semibold }]}>{error}</Text>
            ) : null}

            <Button
              label={t.editProfile.saveChanges}
              onPress={handleSubmit}
              loading={submitting}
              icon={<CheckIcon size={13} color={neutral.white} strokeWidth={2.4} />}
              iconPosition="right"
              style={styles.cta}
            />

            <View style={styles.deleteLinkWrap}>
              <ScreenLink
                label={t.editProfile.deleteMyAccount}
                onPress={() => router.push('/delete-account')}
                color={neutral.danger.text}
              />
            </View>

            <View style={styles.bottomSpacer} />
          </ScrollView>
        )}
      </SafeAreaView>

      <BottomSheet
        visible={districtSheetVisible}
        onClose={() => setDistrictSheetVisible(false)}
        closeAccessibilityLabel={t.common.close}
        radius={30}
        style={styles.districtSheet}
      >
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { fontFamily: fonts.extrabold }]}>
            {t.editProfile.selectDistrictTitle}
          </Text>
          <PressableScale
            onPress={() => setDistrictSheetVisible(false)}
            accessibilityLabel={t.common.close}
            hitSlop={8}
            style={styles.sheetClose}
          >
            <CloseIcon />
          </PressableScale>
        </View>

        <SearchBar
          value={districtSearch}
          onChangeText={setDistrictSearch}
          onClear={() => setDistrictSearch('')}
          placeholder={t.editProfile.searchDistrictPlaceholder}
          clearAccessibilityLabel={t.common.close}
          leftIcon={<SearchIcon />}
          radius={16}
          style={styles.districtSearchBar}
        />

        <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
          {filteredDistricts.map((option) => {
            const active = option === district
            return (
              <PressableScale
                key={option}
                onPress={() => {
                  setDistrict(option)
                  setDistrictSheetVisible(false)
                  setDistrictSearch('')
                }}
                accessibilityRole="checkbox"
                accessibilityLabel={option}
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
                <Text style={[styles.sheetOptionLabel, { fontFamily: fonts.semibold }]}>
                  {option}
                </Text>
                {active ? <CheckIcon size={14} color={tone.accent} /> : null}
              </PressableScale>
            )
          })}
        </ScrollView>
      </BottomSheet>

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

        {photoOptions.map((option) => {
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
                  styles.photoOptionIcon,
                  danger
                    ? styles.photoOptionIconDanger
                    : { backgroundColor: `rgba(${tone.rim},0.13)` },
                ]}
              >
                <Icon size={17} color={danger ? neutral.danger.text : tone.ink} strokeWidth={1.8} />
              </View>
              <Text
                style={[
                  styles.photoOptionLabel,
                  { fontFamily: fonts.semibold },
                  danger && styles.photoOptionLabelDanger,
                ]}
              >
                {option.label}
              </Text>
            </PressableScale>
          )
        })}
      </BottomSheet>
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
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 22,
    paddingBottom: 32,
  },
  avatarWrap: {
    alignSelf: 'center',
    marginTop: 22,
  },
  cameraFab: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    borderRadius: 16,
    borderWidth: 1,
  },
  cameraFabFill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    marginTop: 10,
    alignSelf: 'center',
    fontSize: 13,
  },
  fields: {
    marginTop: 22,
    gap: 12,
  },
  fieldLabel: {
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.62)',
    marginBottom: 6,
  },
  selectSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    minHeight: 54,
  },
  selectValue: {
    flex: 1,
    fontSize: 14,
    color: neutral.white,
  },
  bioWrap: {
    position: 'relative',
  },
  bioCounter: {
    position: 'absolute',
    right: 14,
    bottom: 8,
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
  },
  verifiedPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  verifiedPillText: {
    fontSize: 10,
    color: neutral.white,
  },
  verifyPhoneLinkWrap: {
    marginTop: 6,
    paddingHorizontal: 2,
  },
  verifyPhoneLink: {
    fontSize: 12,
  },
  sectionLabel: {
    marginTop: 24,
    marginBottom: 10,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.62)',
  },
  visibilityCard: {
    paddingHorizontal: 4,
  },
  visibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  visibilityRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  visibilityCol: {
    flex: 1,
    gap: 2,
  },
  visibilityTitle: {
    fontSize: 13,
    color: neutral.white,
  },
  visibilityHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  error: {
    marginTop: 14,
    fontSize: 13,
    color: '#ff9b90',
  },
  cta: {
    marginTop: 20,
  },
  deleteLinkWrap: {
    marginTop: 4,
  },
  bottomSpacer: {
    height: 14,
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
  districtSheet: {
    height: '78%',
    paddingHorizontal: 0,
  },
  districtSearchBar: {
    marginHorizontal: 20,
    marginBottom: 10,
  },
  sheetBody: {
    flex: 1,
    paddingHorizontal: 14,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  photoOptionIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoOptionIconDanger: {
    backgroundColor: neutral.danger.surface,
  },
  photoOptionLabel: {
    fontSize: 14,
    color: neutral.white,
  },
  photoOptionLabelDanger: {
    color: neutral.danger.text,
  },
})
