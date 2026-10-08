import { fontSize, gemTones, neutral, radii, spacing, type GemTone } from '@ceylon-gems/ui-tokens'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Modal as RNModal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  Button,
  Chip,
  GhostButton,
  GlassSurface,
  IconButton,
  PressableScale,
  StepMeter,
  TextField,
  Toggle,
} from '../components'
import {
  ArrowRightIcon,
  BinIcon,
  CameraIcon,
  ChevronLeftIcon,
  EditIcon,
  GalleryIcon,
  GemIcon,
  PublishCheckIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  TipIcon,
  TrashIcon,
  VideoIcon,
} from '../components/icons'
import { GRADIENT_140 } from '../components/primitives/gradientAngle'
import { LiveGradientBackground } from '../components/primitives/LiveGradientBackground'
import { useFilters } from '../hooks/useFilters'
import { useFontFamily } from '../hooks/useFontFamily'
import { useTranslation } from '../hooks/useTranslation'
import { useGemTone } from '../providers/GemToneProvider'

type StepIndex = 0 | 1 | 2 | 3
type PhotoTarget = 'cover' | number

// Shape/treatment/certificate/district chip options are still ported
// verbatim from "Ceylon Gem Exchange Post Ad.dc.html"'s own chip-group
// arrays — demo/taxonomy content, not translated (same treatment as every
// other screen-local hardcoded dataset in this app). Category is the one
// group DB-backed via `useFilters()`'s "Stone" group instead (same
// `GET /filters` taxonomy Home's filter sheet reads — keyed by the group's
// display label, not a lowercase slug, see FiltersController's own
// comment) per explicit request — the rest don't have a matching real
// taxonomy group to source from (no `treatment` group at all;
// `shape`/`district` exist but don't exactly match this screen's own
// option sets — see the consts below).
const SHAPE_OPTIONS = ['Oval', 'Cushion', 'Round', 'Emerald cut', 'Pear', 'Cabochon']
const TREATMENT_OPTIONS = ['Unheated', 'Heated', 'Diffusion', 'Unknown']
const CERTIFICATE_OPTIONS = ['GIA', 'NGJA', 'SSEF', 'Uncertified']
const DISTRICT_OPTIONS = ['Ratnapura', 'Elahera', 'Balangoda', 'Kandy', 'Colombo']

// Grid slots beyond the dedicated cover-photo hero — matches the mockup's
// own `mediaSlots` ([1,2,3,4,5]).
const GRID_PHOTO_COUNT = 5

interface CategoryTileProps {
  name: string
  active: boolean
  tone: GemTone
  onPress: () => void
}

// Step 1's selectable category card — active state swaps the flat glass
// fill for the tone's CTA gradient at low alpha, exactly mirroring the
// mockup's own per-category `style` branch. The mockup's per-category
// "N ads" count has no backing data (no listings table yet, see this
// screen's own file comment) and is dropped rather than shown as a fake
// number next to a real, DB-backed category name.
function CategoryTile({ name, active, tone, onPress }: CategoryTileProps) {
  const fonts = useFontFamily()
  const palette = gemTones[tone]
  const inkColor = active ? neutral.white : 'rgba(255,255,255,0.55)'

  const inner = (
    <>
      <View
        style={[
          styles.categoryIconTile,
          {
            backgroundColor: `rgba(${palette.rim},${active ? 0.18 : 0.1})`,
            borderColor: `rgba(${palette.rim},${active ? 0.32 : 0.2})`,
          },
        ]}
      >
        <GemIcon size={20} ink={inkColor} inkSoft="rgba(255,255,255,0.35)" strokeWidth={1.6} />
      </View>
      <Text
        style={[
          styles.categoryName,
          {
            fontFamily: active ? fonts.extrabold : fonts.bold,
            color: active ? neutral.white : 'rgba(255,255,255,0.85)',
          },
        ]}
      >
        {name}
      </Text>
    </>
  )

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityState={{ selected: active }}
      style={styles.categoryTileWrap}
    >
      {active ? (
        <LinearGradient
          colors={[`${palette.cta[0]}0.3)`, `${palette.cta[1]}0.18)`]}
          start={GRADIENT_140.start}
          end={GRADIENT_140.end}
          style={[styles.categoryTile, { borderColor: `rgba(${palette.rim},0.45)` }]}
        >
          {inner}
        </LinearGradient>
      ) : (
        <GlassSurface clarity={55} radius={22} style={styles.categoryTile}>
          {inner}
        </GlassSurface>
      )}
    </PressableScale>
  )
}

// Reached from Home's raised "+" nav button. Ports "Ceylon Gem Exchange
// Post Ad.dc.html" — a 4-step wizard (Category → Photos → Gem details →
// Review) with a step meter, a centered publish-confirmation dialog, and
// a floating Back/Next action bar. Every step's own state (category,
// photos, fields, chips, negotiable toggle) is real and local — there's no
// listings-create endpoint in apps/api yet (see CLAUDE.md's Phase 0
// sequencing), so "Publish now" can't actually create a server-side ad;
// it closes the confirmation and returns to My Ads, the same
// build-the-real-interaction-but-no-backend-yet precedent as every other
// screen this session (Saved Searches' alert toggle, Payment Method's
// card list). "Add video" stays a decorative tile — no video-picker flow
// exists, same "don't wire a dead tap target" rule as My Ads'/Saved
// Searches' own undestined buttons.
export default function PostAdScreen() {
  const t = useTranslation()
  const fonts = useFontFamily()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { gemTone } = useGemTone()
  const tone = gemTones[gemTone]
  const scrollRef = useRef<ScrollView>(null)

  const filterGroups = useFilters()
  const categoryOptions = filterGroups?.Stone ?? []

  const [step, setStep] = useState<StepIndex>(0)
  const [category, setCategory] = useState('')

  // Defaults to the taxonomy's first category once `GET /filters` resolves
  // — can't pick a default synchronously at init like the old hardcoded
  // array did, since this is now a DB-backed async fetch.
  useEffect(() => {
    const first = filterGroups?.Stone?.[0]
    if (!category && first) setCategory(first)
  }, [filterGroups, category])

  const [coverPhoto, setCoverPhoto] = useState<string | null>(null)
  const [photos, setPhotos] = useState<(string | null)[]>(Array(GRID_PHOTO_COUNT).fill(null))
  const [pickerTarget, setPickerTarget] = useState<PhotoTarget | null>(null)
  const [photoSheetVisible, setPhotoSheetVisible] = useState(false)

  const [title, setTitle] = useState('')
  const [carat, setCarat] = useState('')
  const [price, setPrice] = useState('')
  const [dimensions, setDimensions] = useState('')
  const [shape, setShape] = useState(SHAPE_OPTIONS[0]!)
  const [treatment, setTreatment] = useState(TREATMENT_OPTIONS[0]!)
  const [certificate, setCertificate] = useState(CERTIFICATE_OPTIONS[0]!)
  const [district, setDistrict] = useState(DISTRICT_OPTIONS[0]!)
  const [description, setDescription] = useState('')
  const [negotiable, setNegotiable] = useState(true)

  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false })
  }, [step])

  function goBack() {
    if (step > 0) {
      setStep((s) => (s - 1) as StepIndex)
      return
    }
    if (router.canGoBack()) router.back()
    else router.replace('/home')
  }

  function handleNext() {
    if (step === 3) {
      setConfirmOpen(true)
      return
    }
    setStep((s) => (s + 1) as StepIndex)
  }

  function setPhotoAt(target: PhotoTarget, uri: string | null) {
    if (target === 'cover') setCoverPhoto(uri)
    else setPhotos((prev) => prev.map((p, i) => (i === target ? uri : p)))
  }

  function openPhotoSheet(target: PhotoTarget) {
    setPickerTarget(target)
    setPhotoSheetVisible(true)
  }

  async function handleTakePhoto() {
    if (pickerTarget === null) return
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) return
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (!result.canceled) setPhotoAt(pickerTarget, result.assets[0]!.uri)
    setPhotoSheetVisible(false)
  }

  async function handleChooseFromLibrary() {
    if (pickerTarget === null) return
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) return
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (!result.canceled) setPhotoAt(pickerTarget, result.assets[0]!.uri)
    setPhotoSheetVisible(false)
  }

  function handleRemovePhoto() {
    if (pickerTarget !== null) setPhotoAt(pickerTarget, null)
    setPhotoSheetVisible(false)
  }

  function handlePublish() {
    setConfirmOpen(false)
    router.replace('/my-ads')
  }

  function handleDeleteDraft() {
    setConfirmOpen(false)
    if (router.canGoBack()) router.back()
    else router.replace('/home')
  }

  const photoCount = (coverPhoto ? 1 : 0) + photos.filter(Boolean).length
  const targetHasPhoto =
    pickerTarget === 'cover'
      ? coverPhoto !== null
      : pickerTarget !== null && photos[pickerTarget] !== null

  const stepHeading = [
    t.postAd.step1Title,
    t.postAd.step2Title,
    t.postAd.step3Title,
    t.postAd.step4Title,
  ][step]!
  const stepHint = [t.postAd.step1Hint, t.postAd.step2Hint, t.postAd.step3Hint, t.postAd.step4Hint][
    step
  ]!
  const nextLabel = [
    t.common.continue,
    t.common.continue,
    t.postAd.reviewAdCta,
    t.postAd.publishAdCta,
  ][step]!

  const summaryRows = [
    { label: t.postAd.summaryCategory, value: category },
    { label: t.postAd.summaryWeight, value: carat ? `${carat} ct` : '—' },
    { label: t.postAd.summaryDimensions, value: dimensions || '—' },
    { label: t.postAd.summaryTreatment, value: treatment },
    { label: t.postAd.summaryCertificate, value: certificate },
    { label: t.postAd.summaryDistrict, value: district },
    {
      label: t.postAd.summaryPhotos,
      value: `${photoCount} ${photoCount === 1 ? 'photo' : 'photos'}`,
    },
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
            {t.postAd.title}
          </Text>
          <View
            style={[
              styles.stepBadge,
              { backgroundColor: `rgba(${tone.rim},0.14)`, borderColor: `rgba(${tone.rim},0.28)` },
            ]}
          >
            <Text
              style={[styles.stepBadgeText, { color: tone.accent, fontFamily: fonts.extrabold }]}
            >
              {step + 1} / 4
            </Text>
          </View>
        </View>

        <StepMeter totalSteps={4} currentStep={step} style={styles.stepMeter} />

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.heading, { fontFamily: fonts.extrabold }]}>{stepHeading}</Text>
          <Text style={[styles.subhead, { fontFamily: fonts.regular }]}>{stepHint}</Text>

          {step === 0 ? (
            <View style={styles.categoryGrid}>
              {categoryOptions.map((name) => (
                <CategoryTile
                  key={name}
                  name={name}
                  active={category === name}
                  tone={gemTone}
                  onPress={() => setCategory(name)}
                />
              ))}
            </View>
          ) : null}

          {step === 1 ? (
            <>
              <PressableScale
                onPress={() => openPhotoSheet('cover')}
                accessibilityRole="button"
                accessibilityLabel={t.postAd.coverPhotoBadge}
                style={styles.heroSlot}
              >
                <GlassSurface clarity={55} radius={24} style={styles.heroSurface}>
                  {coverPhoto ? (
                    <Image
                      source={{ uri: coverPhoto }}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.heroEmpty}>
                      <GalleryIcon size={26} color="rgba(255,255,255,0.4)" />
                      <Text style={styles.heroEmptyText}>{t.postAd.addCoverPhoto}</Text>
                    </View>
                  )}
                </GlassSurface>
                <LinearGradient
                  colors={[`${tone.cta[0]}0.6)`, `${tone.cta[1]}0.42)`]}
                  start={GRADIENT_140.start}
                  end={GRADIENT_140.end}
                  style={[styles.heroBadge, { borderColor: `rgba(${tone.rim},0.45)` }]}
                >
                  <Text style={[styles.heroBadgeText, { fontFamily: fonts.extrabold }]}>
                    {t.postAd.coverPhotoBadge}
                  </Text>
                </LinearGradient>
              </PressableScale>

              <View style={styles.mediaGrid}>
                {/* Two explicit rows, not `flexWrap` — percentage-width
                    tiles combined with `aspectRatio` inside a wrapping flex
                    row collapse to zero height on every row after the
                    first (a real RN/Yoga quirk, confirmed on-device: only
                    the first row rendered at all). `flex: 1` inside a
                    fixed-count row has no such issue. */}
                <View style={styles.mediaRow}>
                  {[0, 1, 2].map((index) => (
                    <PressableScale
                      key={index}
                      onPress={() => openPhotoSheet(index)}
                      accessibilityRole="button"
                      accessibilityLabel={`${t.postAd.addPhotoAccessibilityLabel} ${index + 2}`}
                      style={styles.mediaSlot}
                    >
                      <GlassSurface clarity={55} radius={18} style={StyleSheet.absoluteFill}>
                        {photos[index] ? (
                          <Image
                            source={{ uri: photos[index]! }}
                            style={StyleSheet.absoluteFill}
                            contentFit="cover"
                          />
                        ) : (
                          <View style={styles.mediaSlotEmpty}>
                            <CameraIcon size={16} color="rgba(255,255,255,0.4)" />
                          </View>
                        )}
                      </GlassSurface>
                    </PressableScale>
                  ))}
                </View>
                <View style={styles.mediaRow}>
                  {[3, 4].map((index) => (
                    <PressableScale
                      key={index}
                      onPress={() => openPhotoSheet(index)}
                      accessibilityRole="button"
                      accessibilityLabel={`${t.postAd.addPhotoAccessibilityLabel} ${index + 2}`}
                      style={styles.mediaSlot}
                    >
                      <GlassSurface clarity={55} radius={18} style={StyleSheet.absoluteFill}>
                        {photos[index] ? (
                          <Image
                            source={{ uri: photos[index]! }}
                            style={StyleSheet.absoluteFill}
                            contentFit="cover"
                          />
                        ) : (
                          <View style={styles.mediaSlotEmpty}>
                            <CameraIcon size={16} color="rgba(255,255,255,0.4)" />
                          </View>
                        )}
                      </GlassSurface>
                    </PressableScale>
                  ))}
                  {/* No video-picker flow exists yet — decorative, same
                      "don't wire a dead tap target" rule as My Ads'/Saved
                      Searches' own undestined buttons. */}
                  <View
                    style={[
                      styles.addVideoTile,
                      {
                        backgroundColor: `rgba(${tone.rim},0.1)`,
                        borderColor: `rgba(${tone.rim},0.35)`,
                      },
                    ]}
                  >
                    <VideoIcon size={20} color={tone.ink} />
                    <Text style={styles.addVideoText}>{t.postAd.addVideo}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.tipRow}>
                <View
                  style={[
                    styles.tipIconTile,
                    {
                      backgroundColor: `rgba(${tone.rim},0.13)`,
                      borderColor: `rgba(${tone.rim},0.24)`,
                    },
                  ]}
                >
                  <TipIcon size={16} color={tone.ink} />
                </View>
                <Text style={styles.tipText}>{t.postAd.photoTip}</Text>
              </View>
            </>
          ) : null}

          {step === 2 ? (
            <View style={styles.fieldsWrap}>
              <TextField
                label={t.postAd.titleLabel}
                placeholder={t.postAd.titlePlaceholder}
                value={title}
                onChangeText={setTitle}
              />
              <TextField
                label={t.postAd.weightLabel}
                placeholder={t.postAd.weightPlaceholder}
                value={carat}
                onChangeText={setCarat}
                keyboardType="decimal-pad"
                rightIcon={<Text style={styles.fieldSuffix}>ct</Text>}
              />
              <TextField
                label={t.postAd.priceLabel}
                placeholder={t.postAd.pricePlaceholder}
                value={price}
                onChangeText={setPrice}
                keyboardType="number-pad"
                leftIcon={<Text style={styles.fieldPrefix}>$</Text>}
              />
              <TextField
                label={t.postAd.dimensionsLabel}
                placeholder={t.postAd.dimensionsPlaceholder}
                value={dimensions}
                onChangeText={setDimensions}
              />

              <View style={styles.chipGroup}>
                <Text style={styles.fieldLabel}>{t.postAd.shapeGroupLabel}</Text>
                <View style={styles.chipsRow}>
                  {SHAPE_OPTIONS.map((option) => (
                    <Chip
                      key={option}
                      label={option}
                      selected={shape === option}
                      onPress={() => setShape(option)}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.chipGroup}>
                <Text style={styles.fieldLabel}>{t.postAd.treatmentGroupLabel}</Text>
                <View style={styles.chipsRow}>
                  {TREATMENT_OPTIONS.map((option) => (
                    <Chip
                      key={option}
                      label={option}
                      selected={treatment === option}
                      onPress={() => setTreatment(option)}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.chipGroup}>
                <Text style={styles.fieldLabel}>{t.postAd.certificateGroupLabel}</Text>
                <View style={styles.chipsRow}>
                  {CERTIFICATE_OPTIONS.map((option) => (
                    <Chip
                      key={option}
                      label={option}
                      selected={certificate === option}
                      onPress={() => setCertificate(option)}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.chipGroup}>
                <Text style={styles.fieldLabel}>{t.postAd.districtGroupLabel}</Text>
                <View style={styles.chipsRow}>
                  {DISTRICT_OPTIONS.map((option) => (
                    <Chip
                      key={option}
                      label={option}
                      selected={district === option}
                      onPress={() => setDistrict(option)}
                    />
                  ))}
                </View>
              </View>

              <TextField
                label={t.postAd.descriptionLabel}
                placeholder={t.postAd.descriptionPlaceholder}
                value={description}
                onChangeText={(text) => setDescription(text.slice(0, 400))}
                multiline
              />
              <Text style={styles.descCount}>{description.length}/400</Text>

              <View style={styles.negotiableRow}>
                <View style={styles.negotiableText}>
                  <Text style={[styles.negotiableTitle, { fontFamily: fonts.bold }]}>
                    {t.postAd.negotiableTitle}
                  </Text>
                  <Text style={styles.negotiableHint}>{t.postAd.negotiableHint}</Text>
                </View>
                <Toggle
                  value={negotiable}
                  onValueChange={setNegotiable}
                  accessibilityLabel={t.postAd.negotiableTitle}
                />
              </View>
            </View>
          ) : null}

          {step === 3 ? (
            <>
              <GlassSurface clarity={55} radius={26} style={styles.previewCard}>
                <View style={styles.previewImageWrap}>
                  {coverPhoto ? (
                    <Image
                      source={{ uri: coverPhoto }}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.previewImageFallback}>
                      <GemIcon size={32} ink="rgba(255,255,255,0.3)" />
                    </View>
                  )}
                  <LinearGradient
                    colors={[`${tone.cta[0]}0.6)`, `${tone.cta[1]}0.42)`]}
                    start={GRADIENT_140.start}
                    end={GRADIENT_140.end}
                    style={[styles.heroBadge, { borderColor: `rgba(${tone.rim},0.45)` }]}
                  >
                    <Text style={[styles.heroBadgeText, { fontFamily: fonts.extrabold }]}>
                      {category}
                    </Text>
                  </LinearGradient>
                </View>
                <View style={styles.previewBody}>
                  <Text
                    style={[styles.previewTitle, { fontFamily: fonts.extrabold }]}
                    numberOfLines={1}
                  >
                    {title || t.postAd.titlePlaceholder}
                  </Text>
                  <Text style={styles.previewSpec}>
                    {`${carat || '—'} ct · ${shape} · ${treatment} · ${certificate}`}
                  </Text>
                  <View style={styles.previewPriceRow}>
                    <Text
                      style={[
                        styles.previewPrice,
                        { color: tone.accent, fontFamily: fonts.extrabold },
                      ]}
                    >
                      {price ? `$ ${price}` : '$ —'}
                    </Text>
                    <View
                      style={[
                        styles.negotiablePill,
                        {
                          backgroundColor: `rgba(${tone.rim},0.14)`,
                          borderColor: `rgba(${tone.rim},0.26)`,
                        },
                      ]}
                    >
                      <Text style={styles.negotiablePillText}>
                        {negotiable ? t.postAd.negotiable : t.postAd.fixedPrice}
                      </Text>
                    </View>
                  </View>
                </View>
              </GlassSurface>

              <GlassSurface clarity={55} radius={22} style={styles.summaryList}>
                {summaryRows.map((row, index) => (
                  <View
                    key={row.label}
                    style={[
                      styles.summaryRow,
                      index === summaryRows.length - 1 ? null : styles.summaryRowDivider,
                    ]}
                  >
                    <Text style={styles.summaryLabel}>{row.label}</Text>
                    <Text style={styles.summaryValue} numberOfLines={1}>
                      {row.value}
                    </Text>
                    <PressableScale onPress={() => setStep(2)} hitSlop={8}>
                      <Text style={[styles.summaryEdit, { color: tone.accent }]}>
                        {t.postAd.edit}
                      </Text>
                    </PressableScale>
                  </View>
                ))}
              </GlassSurface>

              <View style={styles.tipRow}>
                <View
                  style={[
                    styles.tipIconTile,
                    {
                      backgroundColor: `rgba(${tone.rim},0.13)`,
                      borderColor: `rgba(${tone.rim},0.24)`,
                    },
                  ]}
                >
                  <ShieldCheckIcon size={16} color={tone.ink} strokeWidth={1.5} />
                </View>
                <Text style={styles.tipText}>{t.postAd.reviewTip}</Text>
              </View>
            </>
          ) : null}

          <View style={{ height: 110 }} />
        </ScrollView>

        <View style={[styles.actionBar, { bottom: insets.bottom + 16 }]}>
          {step > 0 ? (
            <GhostButton label={t.common.back} onPress={goBack} style={styles.backPill} />
          ) : null}
          <Button
            label={nextLabel}
            onPress={handleNext}
            icon={<ArrowRightIcon size={17} />}
            iconPosition="right"
            style={styles.nextButton}
          />
        </View>
      </SafeAreaView>

      {/* Photo picker sheet — same Take photo / Choose from library /
          Remove photo pattern as Profile's avatar picker. */}
      <RNModal
        visible={photoSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPhotoSheetVisible(false)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setPhotoSheetVisible(false)}
          accessibilityRole="button"
          accessibilityLabel={t.common.cancel}
        />
        <View style={styles.sheetWrap}>
          <GlassSurface clarity={55} radius={radii.lg} style={styles.sheet}>
            <View style={styles.sheetGrabber} />
            <PressableScale onPress={handleTakePhoto} style={styles.sheetRow}>
              <CameraIcon size={18} />
              <Text style={[styles.sheetRowLabel, { fontFamily: fonts.semibold }]}>
                {t.profile.takePhoto}
              </Text>
            </PressableScale>
            <PressableScale onPress={handleChooseFromLibrary} style={styles.sheetRow}>
              <GalleryIcon size={18} />
              <Text style={[styles.sheetRowLabel, { fontFamily: fonts.semibold }]}>
                {t.profile.chooseFromLibrary}
              </Text>
            </PressableScale>
            {targetHasPhoto ? (
              <PressableScale onPress={handleRemovePhoto} style={styles.sheetRow}>
                <TrashIcon size={18} />
                <Text
                  style={[
                    styles.sheetRowLabel,
                    styles.sheetRowDanger,
                    { fontFamily: fonts.semibold },
                  ]}
                >
                  {t.profile.removePhoto}
                </Text>
              </PressableScale>
            ) : null}
          </GlassSurface>
        </View>
      </RNModal>

      {/* Publish confirmation — centered, three actions, matches the
          mockup's own confirmDialogStyle exactly (not the generic
          2-button ConfirmDialog, which doesn't fit this layout). */}
      <RNModal
        visible={confirmOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmOpen(false)}
      >
        <Pressable
          style={styles.confirmBackdrop}
          onPress={() => setConfirmOpen(false)}
          accessibilityRole="button"
          accessibilityLabel={t.common.cancel}
        />
        <View style={styles.confirmWrap} accessibilityViewIsModal>
          <GlassSurface clarity={30} radius={30} style={styles.confirmDialog}>
            <View
              style={[
                styles.confirmIconTile,
                { backgroundColor: `rgba(${tone.rim},0.16)`, borderColor: `rgba(${tone.rim},0.3)` },
              ]}
            >
              <ShieldAlertIcon size={26} color={tone.ink} />
            </View>
            <Text style={[styles.confirmTitle, { fontFamily: fonts.extrabold }]}>
              {t.postAd.confirmTitle}
            </Text>
            <Text style={styles.confirmBody}>{t.postAd.confirmBody}</Text>

            <View style={styles.confirmSummary}>
              <Text
                style={[styles.confirmSummaryTitle, { fontFamily: fonts.extrabold }]}
                numberOfLines={1}
              >
                {title || t.postAd.titlePlaceholder}
              </Text>
              <Text style={styles.confirmSummarySpec}>
                {`${carat || '—'} ct · ${shape} · ${treatment} · ${certificate}`}
              </Text>
              <Text
                style={[
                  styles.confirmSummaryPrice,
                  { color: tone.accent, fontFamily: fonts.extrabold },
                ]}
              >
                {price ? `$ ${price}` : '$ —'}
              </Text>
            </View>

            <Button
              label={t.postAd.publishNow}
              onPress={handlePublish}
              icon={<PublishCheckIcon size={15} />}
              style={styles.confirmPublish}
            />
            <PressableScale onPress={() => setStep(2)} style={styles.confirmSecondaryRow}>
              <EditIcon size={14} />
              <Text style={[styles.confirmSecondaryLabel, { fontFamily: fonts.bold }]}>
                {t.postAd.goBackAndEdit}
              </Text>
            </PressableScale>
            <PressableScale onPress={handleDeleteDraft} style={styles.confirmDeleteRow}>
              <BinIcon size={14} />
              <Text style={[styles.confirmDeleteLabel, { fontFamily: fonts.bold }]}>
                {t.postAd.deleteDraft}
              </Text>
            </PressableScale>
          </GlassSurface>
        </View>
      </RNModal>
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
    paddingBottom: 8,
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    letterSpacing: -0.2,
    color: neutral.white,
  },
  stepBadge: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 13,
    borderWidth: 1,
  },
  stepBadgeText: {
    fontSize: 11,
  },
  stepMeter: {
    paddingHorizontal: 22,
    marginBottom: 4,
  },
  body: {
    paddingHorizontal: 22,
  },
  heading: {
    marginTop: 16,
    color: neutral.white,
    fontSize: 24,
    letterSpacing: -0.4,
  },
  subhead: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    lineHeight: 20,
  },

  // Step 1 — category grid
  categoryGrid: {
    marginTop: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 11,
  },
  categoryTileWrap: {
    width: '47.5%',
  },
  categoryTile: {
    alignItems: 'flex-start',
    gap: 9,
    padding: 15,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryIconTile: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  categoryName: {
    fontSize: 13,
    letterSpacing: -0.1,
  },

  // Step 2 — photos
  heroSlot: {
    marginTop: 20,
    height: 200,
    borderRadius: 24,
  },
  heroSurface: {
    flex: 1,
    overflow: 'hidden',
  },
  heroEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  heroEmptyText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontWeight: '600',
  },
  heroBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  heroBadgeText: {
    color: neutral.white,
    fontSize: 10,
    letterSpacing: 0.3,
  },
  mediaGrid: {
    marginTop: 10,
    gap: 9,
  },
  mediaRow: {
    flexDirection: 'row',
    gap: 9,
  },
  mediaSlot: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 18,
  },
  mediaSlotEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addVideoTile: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  addVideoText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 10,
    fontWeight: '800',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    marginTop: 16,
    padding: 13,
    paddingRight: 14,
    borderRadius: 20,
  },
  tipIconTile: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  tipText: {
    flex: 1,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    lineHeight: 16,
  },

  // Step 3 — details
  fieldsWrap: {
    marginTop: 20,
    gap: 14,
  },
  fieldPrefix: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '700',
    paddingRight: 11,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.16)',
  },
  fieldSuffix: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.62)',
  },
  chipGroup: {
    gap: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  descCount: {
    alignSelf: 'flex-end',
    marginTop: -8,
    color: 'rgba(255,255,255,0.35)',
    fontSize: 10,
    fontWeight: '700',
  },
  negotiableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 20,
  },
  negotiableText: {
    flex: 1,
    gap: 2,
  },
  negotiableTitle: {
    color: neutral.white,
    fontSize: 13,
  },
  negotiableHint: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
  },

  // Step 4 — review
  previewCard: {
    marginTop: 20,
    overflow: 'hidden',
  },
  previewImageWrap: {
    height: 170,
    position: 'relative',
  },
  previewImageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  previewBody: {
    padding: 16,
    gap: 8,
  },
  previewTitle: {
    color: neutral.white,
    fontSize: 17,
    letterSpacing: -0.2,
  },
  previewSpec: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
  },
  previewPriceRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewPrice: {
    fontSize: 19,
  },
  negotiablePill: {
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  negotiablePillText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
    fontWeight: '800',
  },
  summaryList: {
    marginTop: 14,
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  summaryRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  summaryLabel: {
    flex: 1,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
  },
  summaryValue: {
    color: neutral.white,
    fontSize: 12,
    fontWeight: '700',
  },
  summaryEdit: {
    fontSize: 11,
    fontWeight: '800',
  },

  // Action bar
  actionBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backPill: {
    flexShrink: 0,
  },
  nextButton: {
    flex: 1,
  },

  // Photo picker sheet
  sheetBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(4,8,16,0.55)',
  },
  sheetWrap: {
    marginTop: 'auto',
  },
  sheet: {
    padding: spacing.xl,
    paddingBottom: spacing['3xl'],
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  sheetGrabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginBottom: spacing.lg,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: spacing.md,
  },
  sheetRowLabel: {
    color: neutral.white,
    fontSize: fontSize.base,
  },
  sheetRowDanger: {
    color: neutral.danger.text,
  },

  // Publish confirmation dialog
  confirmBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(4,8,16,0.66)',
  },
  confirmWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 26,
  },
  confirmDialog: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
    padding: 24,
    paddingTop: 24,
    paddingBottom: 20,
  },
  confirmIconTile: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 2,
  },
  confirmTitle: {
    color: neutral.white,
    fontSize: 19,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  confirmBody: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
  },
  confirmSummary: {
    width: '100%',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    padding: 13,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  confirmSummaryTitle: {
    color: neutral.white,
    fontSize: 13,
  },
  confirmSummarySpec: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '600',
  },
  confirmSummaryPrice: {
    fontSize: 14,
  },
  confirmPublish: {
    width: '100%',
    marginTop: 8,
  },
  confirmSecondaryRow: {
    width: '100%',
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  confirmSecondaryLabel: {
    color: neutral.white,
    fontSize: 14,
  },
  confirmDeleteRow: {
    width: '100%',
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: 'rgba(255,120,105,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,120,105,0.28)',
  },
  confirmDeleteLabel: {
    color: '#ff8f80',
    fontSize: 14,
  },
})
