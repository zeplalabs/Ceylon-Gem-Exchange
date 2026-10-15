import { useAuth } from '@clerk/expo'
import { fontSize, gemTones, neutral, radii, spacing, type GemTone } from '@ceylon-gems/ui-tokens'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Modal as RNModal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  Button,
  Chip,
  GhostButton,
  GlassSurface,
  IconButton,
  PressableScale,
  SegmentedControl,
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
import { API_URL } from '../lib/apiUrl'
import { compressAndUploadPhoto } from '../lib/uploadPhoto'
import { useGemTone } from '../providers/GemToneProvider'

type StepIndex = 0 | 1 | 2 | 3
type PhotoTarget = 'cover' | number
type ListingKind = 'gem' | 'equipment'
type PhotoUploadStatus = 'idle' | 'uploading' | 'uploaded' | 'error'

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

// Equipment's own category tiles / condition chips — unlike the gem groups
// above these have no mockup or DB taxonomy to port from (there's no
// equipment Claude Design pass, and `useFilters()`'s `GET /filters` groups
// are gem-only taxonomy), so these are authored fresh rather than ported.
// Still a plain untranslated const, matching the gem option arrays' own
// "screen-local hardcoded dataset" treatment. `CONDITION_OPTIONS` values
// double as `apps/api`'s `equipment_condition` enum values directly
// (lowercase) so a future real submit doesn't need a label->enum mapping.
const EQUIPMENT_TYPE_OPTIONS = [
  'Faceting Machine',
  'Polishing Machine',
  'Dop Station',
  'Tumbler',
  'Digital Scale',
  'Loupe & Tools',
]
const CONDITION_OPTIONS: { label: string; value: 'new' | 'used' | 'refurbished' }[] = [
  { label: 'New', value: 'new' },
  { label: 'Used', value: 'used' },
  { label: 'Refurbished', value: 'refurbished' },
]

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

// Sits over a photo slot's thumbnail while `compressAndUploadPhoto` is
// in flight, or to flag a failed one — renders nothing once a slot is
// empty or has finished uploading, so it's safe to always mount.
function PhotoUploadOverlay({ status }: { status: PhotoUploadStatus }) {
  if (status === 'uploading') {
    return (
      <View style={styles.photoStatusOverlay} pointerEvents="none">
        <ActivityIndicator color={neutral.white} />
      </View>
    )
  }
  if (status === 'error') {
    return (
      <View
        style={[styles.photoStatusOverlay, styles.photoStatusErrorOverlay]}
        pointerEvents="none"
      >
        <Text style={styles.photoStatusErrorText}>!</Text>
      </View>
    )
  }
  return null
}

// Reached from Home's raised "+" nav button. Ports "Ceylon Gem Exchange
// Post Ad.dc.html" — a 4-step wizard (Category → Photos → Details →
// Review) with a step meter, a centered publish-confirmation dialog, and
// a floating Back/Next action bar. The mockup only covers a gem listing;
// the Gem/Equipment `SegmentedControl` on Step 1 and Step 3's swapped-out
// equipment detail fields (brand/model/condition/year/specs/warranty, no
// mockup or DB taxonomy to port — see EQUIPMENT_TYPE_OPTIONS/
// CONDITION_OPTIONS above) are new work on top of it, per E1.1's "type
// toggle swapping the detail schema" item in docs/remaining-work.md.
// Every step's own state (category, photos, fields, chips, negotiable
// toggle) is real and local, and `apps/api`'s `POST /listings` (+ gem/
// equipment detail payload) now exists to receive it — but this screen
// doesn't call it yet, so "Publish now" still can't create a real
// server-side listing; it closes the confirmation and returns to My Ads,
// the same build-the-real-interaction-but-no-backend-wiring-yet
// precedent as every other screen this session (Saved Searches' alert
// toggle, Payment Method's card list). "Add video" stays a decorative
// tile — no video-picker flow exists, same "don't wire a dead tap target"
// rule as My Ads'/Saved
// Searches' own undestined buttons.
export default function PostAdScreen() {
  const t = useTranslation()
  const fonts = useFontFamily()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { gemTone } = useGemTone()
  const tone = gemTones[gemTone]
  const scrollRef = useRef<ScrollView>(null)

  // Presence of `id` switches this whole screen into edit mode — reached
  // from my-ads.tsx's "Edit" action on a `draft`/`pending_review` ad (the
  // only statuses `PATCH /listings/:id` allows; my-ads.tsx only ever
  // offers Edit for those two). `type` can't change once a listing exists
  // (`assertValidUpdateBody` 400s a `gemDetails`/`equipmentDetails`
  // mismatch against the current type), so Step 1's gem/equipment switch
  // becomes inert in edit mode (see its own `onChange` below) while
  // everything else on that step (species/equipment-type) stays editable.
  // Photos aren't: `UpdateListingBody` has no photo fields at all (the
  // backend doesn't support editing them yet), so Step 2 shows a plain
  // notice instead of the picker grid when editing, rather than letting a
  // seller "add" photos here that silently go nowhere.
  const { id: editId } = useLocalSearchParams<{ id?: string }>()
  const isEditing = editId !== undefined
  const [loadingEdit, setLoadingEdit] = useState(isEditing)
  const [editLoadError, setEditLoadError] = useState(false)

  const filterGroups = useFilters()

  const [step, setStep] = useState<StepIndex>(0)
  const [listingKind, setListingKind] = useState<ListingKind>('gem')
  const categoryOptions =
    listingKind === 'gem' ? (filterGroups?.Stone ?? []) : EQUIPMENT_TYPE_OPTIONS
  const [category, setCategory] = useState('')

  // Defaults to the taxonomy's first category once `GET /filters` resolves
  // — can't pick a default synchronously at init like the old hardcoded
  // array did, since this is now a DB-backed async fetch. Also re-runs
  // whenever `listingKind` flips, since the option list (and therefore
  // what counts as a valid "first" default) swaps out entirely between
  // the DB-backed gem taxonomy and equipment's hardcoded list.
  useEffect(() => {
    const first = listingKind === 'gem' ? filterGroups?.Stone?.[0] : EQUIPMENT_TYPE_OPTIONS[0]
    if (first) setCategory(first)
  }, [filterGroups, listingKind])

  const { getToken } = useAuth()
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null)
  const [photos, setPhotos] = useState<(string | null)[]>(Array(GRID_PHOTO_COUNT).fill(null))
  const [pickerTarget, setPickerTarget] = useState<PhotoTarget | null>(null)
  const [photoSheetVisible, setPhotoSheetVisible] = useState(false)

  // Parallel to `coverPhoto`/`photos` above rather than widening those into
  // objects — keeps the existing `<Image source={{ uri: coverPhoto }}>`-
  // style render sites untouched. `*Key` is the MinIO storage key once
  // compressAndUploadPhoto resolves (null until then, and again if the
  // slot is cleared); `*UploadStatus` drives the small spinner/error badge
  // on each thumbnail. Nothing attaches these keys to a listing yet — see
  // compressAndUploadPhoto's own comment on why upload happens
  // independently of a listing existing.
  const [coverPhotoKey, setCoverPhotoKey] = useState<string | null>(null)
  const [coverUploadStatus, setCoverUploadStatus] = useState<PhotoUploadStatus>('idle')
  const [photoKeys, setPhotoKeys] = useState<(string | null)[]>(Array(GRID_PHOTO_COUNT).fill(null))
  const [photoUploadStatuses, setPhotoUploadStatuses] = useState<PhotoUploadStatus[]>(
    Array(GRID_PHOTO_COUNT).fill('idle'),
  )

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

  // Equipment's own detail fields — parallel to the gem ones above, only
  // rendered/used for a Step 3/Step 4 when `listingKind === 'equipment'`.
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [condition, setCondition] = useState(CONDITION_OPTIONS[0]!.value)
  const [yearManufactured, setYearManufactured] = useState('')
  const [specifications, setSpecifications] = useState('')
  const [warrantyInfo, setWarrantyInfo] = useState('')

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  // Set specifically when `PATCH /listings/:id/status {action:'submit'}`
  // 403s with `code: 'phone_not_verified'` — the Phone-verify-to-post hard
  // gate (listings.controller.ts). Swaps the modal's error text for an
  // actionable "Verify phone number" button instead of a dead-end message,
  // since the generic `publishError` text alone gives the seller nowhere
  // to go from here.
  const [needsPhoneVerify, setNeedsPhoneVerify] = useState(false)

  useEffect(() => {
    if (!isEditing || !editId) return
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`${API_URL}/listings/${editId}`)
        if (!res.ok || cancelled) return
        const data = (await res.json()) as {
          type: ListingKind
          title: string
          description: string | null
          priceAmountCents: number
          details: Record<string, unknown> | null
        }
        if (cancelled) return
        setListingKind(data.type)
        setTitle(data.title)
        setDescription(data.description ?? '')
        setPrice((data.priceAmountCents / 100).toString())

        const d = data.details ?? {}
        if (data.type === 'gem') {
          if (typeof d.species === 'string') setCategory(d.species)
          if (typeof d.caratWeight === 'number') setCarat(String(d.caratWeight))
          if (typeof d.shape === 'string') setShape(d.shape)
          if (typeof d.treatment === 'string') setTreatment(d.treatment)
          if (typeof d.certAuthority === 'string') setCertificate(d.certAuthority)
          if (typeof d.origin === 'string') setDistrict(d.origin)
          if (typeof d.dimensions === 'string') setDimensions(d.dimensions)
        } else {
          if (typeof d.equipmentType === 'string') setCategory(d.equipmentType)
          if (typeof d.brand === 'string') setBrand(d.brand)
          if (typeof d.model === 'string') setModel(d.model)
          if (typeof d.condition === 'string') {
            setCondition(d.condition as 'new' | 'used' | 'refurbished')
          }
          if (typeof d.yearManufactured === 'number')
            setYearManufactured(String(d.yearManufactured))
          if (typeof d.specifications === 'string') setSpecifications(d.specifications)
          if (typeof d.warrantyInfo === 'string') setWarrantyInfo(d.warrantyInfo)
        }
      } catch {
        setEditLoadError(true)
      } finally {
        if (!cancelled) setLoadingEdit(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [editId, isEditing])

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
      setPublishError(null)
      setConfirmOpen(true)
      return
    }
    setStep((s) => (s + 1) as StepIndex)
  }

  function setPhotoAt(target: PhotoTarget, uri: string | null) {
    if (target === 'cover') setCoverPhoto(uri)
    else setPhotos((prev) => prev.map((p, i) => (i === target ? uri : p)))
  }

  function setPhotoKeyAt(target: PhotoTarget, key: string | null) {
    if (target === 'cover') setCoverPhotoKey(key)
    else setPhotoKeys((prev) => prev.map((k, i) => (i === target ? key : k)))
  }

  function setUploadStatusAt(target: PhotoTarget, status: PhotoUploadStatus) {
    if (target === 'cover') setCoverUploadStatus(status)
    else setPhotoUploadStatuses((prev) => prev.map((s, i) => (i === target ? status : s)))
  }

  // Fire-and-forget from the picker handlers below — compresses and
  // uploads in the background while the wizard stays interactive, with the
  // slot's own spinner/error badge (see styles.photoStatusOverlay below)
  // as the only feedback. No retry button yet: the simplest recovery is
  // just picking a replacement photo for that slot again, which re-runs
  // this from scratch.
  async function uploadPhotoAt(
    target: PhotoTarget,
    asset: Pick<ImagePicker.ImagePickerAsset, 'uri' | 'width' | 'height'>,
  ) {
    setUploadStatusAt(target, 'uploading')
    try {
      const key = await compressAndUploadPhoto(asset, getToken)
      setPhotoKeyAt(target, key)
      setUploadStatusAt(target, 'uploaded')
    } catch {
      setUploadStatusAt(target, 'error')
    }
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
    if (!result.canceled) {
      setPhotoAt(pickerTarget, result.assets[0]!.uri)
      void uploadPhotoAt(pickerTarget, result.assets[0]!)
    }
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
    if (!result.canceled) {
      setPhotoAt(pickerTarget, result.assets[0]!.uri)
      void uploadPhotoAt(pickerTarget, result.assets[0]!)
    }
    setPhotoSheetVisible(false)
  }

  function handleRemovePhoto() {
    if (pickerTarget !== null) {
      setPhotoAt(pickerTarget, null)
      setPhotoKeyAt(pickerTarget, null)
      setUploadStatusAt(pickerTarget, 'idle')
    }
    setPhotoSheetVisible(false)
  }

  // Create → attach already-uploaded photos → submit for review, in that
  // order — a listing has to exist before a photo can be attached to it,
  // and attaching happens before `submit` so a failed attach still leaves
  // the listing sitting in `draft` (editable, re-attachable) rather than
  // already in the review queue missing photos. Each of the three steps
  // throws on failure, so an error partway through (e.g. photos attached
  // but submit failed) is surfaced rather than silently treated as success
  // — the listing is left as whatever `apps/api` actually has, visible via
  // My Ads once that screen is wired to GET /listings/mine.
  async function handlePublish() {
    setNeedsPhoneVerify(false)
    if (!title.trim()) {
      setPublishError(t.common.genericError)
      return
    }
    const priceAmountCents = Math.round(Number.parseFloat(price || '0') * 100)
    if (!Number.isFinite(priceAmountCents) || priceAmountCents <= 0) {
      setPublishError(t.common.genericError)
      return
    }
    if (
      !isEquipment &&
      (!Number.isFinite(Number.parseFloat(carat)) || Number.parseFloat(carat) <= 0)
    ) {
      setPublishError(t.common.genericError)
      return
    }

    setPublishing(true)
    setPublishError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not signed in')
      const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

      const detailsBody = isEquipment
        ? {
            equipmentDetails: {
              equipmentType: category,
              brand: brand.trim() || undefined,
              model: model.trim() || undefined,
              condition,
              yearManufactured: yearManufactured
                ? Number.parseInt(yearManufactured, 10)
                : undefined,
              specifications: specifications.trim() || undefined,
              warrantyInfo: warrantyInfo.trim() || undefined,
            },
          }
        : {
            gemDetails: {
              species: category,
              caratWeight: Number.parseFloat(carat),
              shape,
              treatment,
              certAuthority: certificate,
              origin: district,
              dimensions: dimensions.trim() || undefined,
            },
          }

      // Editing an existing listing — `PATCH /listings/:id` (no photos, no
      // status change: the seller decides separately, from my-ads.tsx,
      // whether a draft is ready to submit or a pending one should stay
      // as-is) rather than this function's usual create-then-submit path.
      if (isEditing && editId) {
        const updateRes = await fetch(`${API_URL}/listings/${editId}`, {
          method: 'PATCH',
          headers: authHeaders,
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || undefined,
            priceAmountCents,
            priceCurrency: 'USD',
            ...detailsBody,
          }),
        })
        if (!updateRes.ok) {
          const body = await updateRes.json().catch(() => null)
          throw new Error(body?.message ?? `Failed to save changes (${updateRes.status})`)
        }
        setConfirmOpen(false)
        router.replace('/my-ads')
        return
      }

      const createRes = await fetch(`${API_URL}/listings`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          type: isEquipment ? 'equipment' : 'gem',
          title: title.trim(),
          description: description.trim() || undefined,
          priceAmountCents,
          priceCurrency: 'USD',
          ...detailsBody,
        }),
      })
      if (!createRes.ok) {
        const body = await createRes.json().catch(() => null)
        throw new Error(body?.message ?? `Failed to create listing (${createRes.status})`)
      }
      const listing = (await createRes.json()) as { id: string }

      const photoAttachments = [
        ...(coverPhotoKey ? [{ storageKey: coverPhotoKey, isCover: true }] : []),
        ...photoKeys
          .filter((key): key is string => key !== null)
          .map((key) => ({ storageKey: key })),
      ]
      for (const attachment of photoAttachments) {
        const photoRes = await fetch(`${API_URL}/listings/${listing.id}/photos`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(attachment),
        })
        if (!photoRes.ok) {
          throw new Error(`Failed to attach a photo (${photoRes.status})`)
        }
      }

      const submitRes = await fetch(`${API_URL}/listings/${listing.id}/status`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ action: 'submit' }),
      })
      if (!submitRes.ok) {
        const submitBody = await submitRes.json().catch(() => null)
        if (submitBody?.code === 'phone_not_verified') {
          setNeedsPhoneVerify(true)
          throw new Error(submitBody.message)
        }
        throw new Error(submitBody?.message ?? `Failed to submit for review (${submitRes.status})`)
      }

      setConfirmOpen(false)
      router.replace('/my-ads')
    } catch (err) {
      // Surfaces the backend's own validation message (e.g. "priceCurrency
      // must be an active currency code") when there is one, rather than
      // only ever showing the generic fallback — this flow has no
      // server-side review step of its own, so a precise message here is
      // the only debugging signal a seller (or developer testing this) gets.
      setPublishError(err instanceof Error && err.message ? err.message : t.common.genericError)
    } finally {
      setPublishing(false)
    }
  }

  function handleDeleteDraft() {
    setConfirmOpen(false)
    if (router.canGoBack()) router.back()
    else router.replace('/home')
  }

  const photoCount = (coverPhoto ? 1 : 0) + photos.filter(Boolean).length
  // Of the picked photos, how many have actually finished uploading to
  // MinIO (vs. still compressing/uploading, or failed) — surfaced in the
  // Step 4 summary below so a seller isn't told "6 photos" and then finds
  // out at publish time that some never made it off the device.
  const uploadedPhotoCount = (coverPhotoKey ? 1 : 0) + photoKeys.filter(Boolean).length
  const photosSummaryValue =
    uploadedPhotoCount === photoCount
      ? `${photoCount} ${photoCount === 1 ? 'photo' : 'photos'}`
      : `${uploadedPhotoCount}/${photoCount} uploaded`
  const targetHasPhoto =
    pickerTarget === 'cover'
      ? coverPhoto !== null
      : pickerTarget !== null && photos[pickerTarget] !== null

  const isEquipment = listingKind === 'equipment'
  const stepHeading = [
    t.postAd.step1Title,
    t.postAd.step2Title,
    isEquipment ? t.postAd.step3TitleEquipment : t.postAd.step3Title,
    t.postAd.step4Title,
  ][step]!
  const stepHint = [
    isEquipment ? t.postAd.step1HintEquipment : t.postAd.step1Hint,
    t.postAd.step2Hint,
    t.postAd.step3Hint,
    t.postAd.step4Hint,
  ][step]!
  const nextLabel = [
    t.common.continue,
    t.common.continue,
    t.postAd.reviewAdCta,
    t.postAd.publishAdCta,
  ][step]!

  const conditionLabel = CONDITION_OPTIONS.find((option) => option.value === condition)!.label

  // Preview card / confirm dialog's compact "spec line" — gem's is
  // weight · shape · treatment · certificate, equipment's is brand ·
  // model · condition. Shared between the Step 4 preview card and the
  // publish-confirmation dialog below so the two can't drift apart.
  const specLine = isEquipment
    ? `${brand || '—'} · ${model || '—'} · ${conditionLabel}`
    : `${carat || '—'} ct · ${shape} · ${treatment} · ${certificate}`

  const summaryRows = isEquipment
    ? [
        { label: t.postAd.summaryCategory, value: category },
        { label: t.postAd.summaryBrand, value: brand || '—' },
        { label: t.postAd.summaryModel, value: model || '—' },
        { label: t.postAd.summaryCondition, value: conditionLabel },
        { label: t.postAd.summaryYear, value: yearManufactured || '—' },
        {
          label: t.postAd.summaryPhotos,
          value: photosSummaryValue,
        },
      ]
    : [
        { label: t.postAd.summaryCategory, value: category },
        { label: t.postAd.summaryWeight, value: carat ? `${carat} ct` : '—' },
        { label: t.postAd.summaryDimensions, value: dimensions || '—' },
        { label: t.postAd.summaryTreatment, value: treatment },
        { label: t.postAd.summaryCertificate, value: certificate },
        { label: t.postAd.summaryDistrict, value: district },
        {
          label: t.postAd.summaryPhotos,
          value: photosSummaryValue,
        },
      ]

  if (isEditing && loadingEdit) {
    return (
      <LiveGradientBackground>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={neutral.white} />
          </View>
        </SafeAreaView>
      </LiveGradientBackground>
    )
  }

  if (isEditing && editLoadError) {
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
          </View>
          <View style={styles.loadingWrap}>
            <Text style={styles.publishError}>{t.common.genericError}</Text>
          </View>
        </SafeAreaView>
      </LiveGradientBackground>
    )
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
          <Text
            style={[styles.navTitle, { fontFamily: fonts.extrabold }]}
            numberOfLines={1}
            pointerEvents="none"
          >
            {isEditing ? t.postAd.editTitle : t.postAd.title}
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
            <>
              <SegmentedControl
                variant="glass"
                options={[
                  { label: t.postAd.typeGemLabel, value: 'gem' as const },
                  { label: t.postAd.typeEquipmentLabel, value: 'equipment' as const },
                ]}
                value={listingKind}
                onChange={isEditing ? () => {} : setListingKind}
                style={styles.kindSwitch}
              />
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
            </>
          ) : null}

          {step === 1 && isEditing ? (
            <GlassSurface clarity={55} radius={20} style={styles.editPhotosNotice}>
              <Text style={styles.editPhotosNoticeText}>{t.postAd.editPhotosNotice}</Text>
            </GlassSurface>
          ) : null}

          {step === 1 && !isEditing ? (
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
                  <PhotoUploadOverlay status={coverUploadStatus} />
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
                        <PhotoUploadOverlay status={photoUploadStatuses[index]!} />
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
                        <PhotoUploadOverlay status={photoUploadStatuses[index]!} />
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

              {!isEquipment ? (
                <>
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
                </>
              ) : (
                <>
                  <TextField
                    label={t.postAd.priceLabel}
                    placeholder={t.postAd.pricePlaceholder}
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="number-pad"
                    leftIcon={<Text style={styles.fieldPrefix}>$</Text>}
                  />
                  <TextField
                    label={t.postAd.brandLabel}
                    placeholder={t.postAd.brandPlaceholder}
                    value={brand}
                    onChangeText={setBrand}
                  />
                  <TextField
                    label={t.postAd.modelLabel}
                    placeholder={t.postAd.modelPlaceholder}
                    value={model}
                    onChangeText={setModel}
                  />
                  <TextField
                    label={t.postAd.yearLabel}
                    placeholder={t.postAd.yearPlaceholder}
                    value={yearManufactured}
                    onChangeText={setYearManufactured}
                    keyboardType="number-pad"
                  />

                  <View style={styles.chipGroup}>
                    <Text style={styles.fieldLabel}>{t.postAd.conditionGroupLabel}</Text>
                    <View style={styles.chipsRow}>
                      {CONDITION_OPTIONS.map((option) => (
                        <Chip
                          key={option.value}
                          label={option.label}
                          selected={condition === option.value}
                          onPress={() => setCondition(option.value)}
                        />
                      ))}
                    </View>
                  </View>

                  <TextField
                    label={t.postAd.specificationsLabel}
                    placeholder={t.postAd.specificationsPlaceholder}
                    value={specifications}
                    onChangeText={setSpecifications}
                    multiline
                  />
                  <TextField
                    label={t.postAd.warrantyLabel}
                    placeholder={t.postAd.warrantyPlaceholder}
                    value={warrantyInfo}
                    onChangeText={setWarrantyInfo}
                  />
                </>
              )}

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
                  <Text style={styles.previewSpec}>{specLine}</Text>
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
              {isEditing ? t.postAd.confirmTitleEdit : t.postAd.confirmTitle}
            </Text>
            <Text style={styles.confirmBody}>
              {isEditing ? t.postAd.confirmBodyEdit : t.postAd.confirmBody}
            </Text>

            <View style={styles.confirmSummary}>
              <Text
                style={[styles.confirmSummaryTitle, { fontFamily: fonts.extrabold }]}
                numberOfLines={1}
              >
                {title || t.postAd.titlePlaceholder}
              </Text>
              <Text style={styles.confirmSummarySpec}>{specLine}</Text>
              <Text
                style={[
                  styles.confirmSummaryPrice,
                  { color: tone.accent, fontFamily: fonts.extrabold },
                ]}
              >
                {price ? `$ ${price}` : '$ —'}
              </Text>
            </View>

            {publishError ? <Text style={styles.publishError}>{publishError}</Text> : null}
            {needsPhoneVerify ? (
              <GhostButton
                label={t.postAd.verifyPhoneButton}
                onPress={() => router.push('/verify-phone-account')}
                style={styles.confirmVerifyPhone}
              />
            ) : null}

            <Button
              label={isEditing ? t.postAd.saveChanges : t.postAd.publishNow}
              onPress={handlePublish}
              loading={publishing}
              disabled={publishing}
              icon={<PublishCheckIcon size={15} />}
              style={styles.confirmPublish}
            />
            <PressableScale
              onPress={() => setStep(2)}
              disabled={publishing}
              style={styles.confirmSecondaryRow}
            >
              <EditIcon size={14} />
              <Text style={[styles.confirmSecondaryLabel, { fontFamily: fonts.bold }]}>
                {t.postAd.goBackAndEdit}
              </Text>
            </PressableScale>
            {/* Deleting an existing listing belongs to my-ads.tsx's own
                action (a real hard DELETE for a draft, a soft remove
                otherwise) — this row only ever meant "discard this unsaved
                form," which doesn't apply once there's a real backend
                record behind the wizard. */}
            {!isEditing ? (
              <PressableScale
                onPress={handleDeleteDraft}
                disabled={publishing}
                style={styles.confirmDeleteRow}
              >
                <BinIcon size={14} />
                <Text style={[styles.confirmDeleteLabel, { fontFamily: fonts.bold }]}>
                  {t.postAd.deleteDraft}
                </Text>
              </PressableScale>
            ) : null}
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
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  kindSwitch: {
    marginTop: 20,
  },
  categoryGrid: {
    marginTop: 16,
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
  photoStatusOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(4,8,16,0.45)',
  },
  photoStatusErrorOverlay: {
    backgroundColor: neutral.danger.surfaceStrong,
  },
  photoStatusErrorText: {
    color: neutral.danger.text,
    fontSize: 18,
    fontWeight: '800',
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
  editPhotosNotice: {
    padding: 16,
  },
  editPhotosNoticeText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    lineHeight: 19,
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
  publishError: {
    color: neutral.danger.textStrong,
    fontSize: 13,
    textAlign: 'center',
  },
  confirmVerifyPhone: {
    marginTop: 10,
    width: '100%',
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
