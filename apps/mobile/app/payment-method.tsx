import { gemTones, neutral } from '@ceylon-gems/ui-tokens'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Button,
  Checkbox,
  GlassSurface,
  IconButton,
  PressableScale,
  TextField,
} from '../components'
import {
  AddIcon,
  ArrowRightIcon,
  CardIcon,
  CheckIcon,
  ChevronLeftIcon,
  InfoCircleIcon,
  LockIcon,
  PersonIcon,
} from '../components/icons'
import { GRADIENT_140 } from '../components/primitives/gradientAngle'
import { LiveGradientBackground } from '../components/primitives/LiveGradientBackground'
import { useFontFamily } from '../hooks/useFontFamily'
import { useTranslation } from '../hooks/useTranslation'
import { useGemTone } from '../providers/GemToneProvider'

type CardBrand = 'VISA' | 'MASTERCARD' | 'AMEX' | 'CARD'

interface SavedCard {
  id: string
  brand: CardBrand
  label: string
  last4: string
  exp: string
  name: string
}

// Ported verbatim from "Ceylon Gem Exchange Payment Card.dc.html"'s own
// `state.cards` — demo data in the same sense as My Membership's own
// hardcoded "Visa ending 4412" row (not shared/synced with it: this screen
// keeps its own independent local state, same as every other screen-local
// demo dataset in this app — there's no backend or cross-screen store for
// payment methods to sync through).
const INITIAL_CARDS: SavedCard[] = [
  {
    id: 'visa',
    brand: 'VISA',
    label: 'Visa ending 4412',
    last4: '4412',
    exp: '08/29',
    name: 'NIMAL PERERA',
  },
  {
    id: 'mc',
    brand: 'MASTERCARD',
    label: 'Mastercard ending 9031',
    last4: '9031',
    exp: '02/27',
    name: 'NIMAL PERERA',
  },
]

const RENEWAL_DATE = '12 Sep 2026'

function interpolate(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.split(`{{${key}}}`).join(value),
    template,
  )
}

function brandOf(digits: string): CardBrand {
  if (/^4/.test(digits)) return 'VISA'
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'MASTERCARD'
  if (/^3[47]/.test(digits)) return 'AMEX'
  return 'CARD'
}

// Reached from My Membership's payment-method "Change" link. Ports "Ceylon
// Gem Exchange Payment Card.dc.html" — a live card preview, a saved-cards
// radio list ("Add a new card" always included), a new-card form (shown
// only while "Add a new card" is selected) with live number/expiry/CVV
// formatting and brand detection, and a CTA whose label switches between
// "Save card" / "Keep as default" / "Use <card>" / a brief "Saved"
// confirmation — all ported from the mockup's own `save()`/`renderVals()`
// logic. Unlike My Membership's own CTA/payment row (which stay decorative
// since nothing backs them), every interactive element here has a real
// `onClick` in the mockup's own script, so it's all wired to real local
// state: this is a functioning card-entry form, just with nowhere to send
// the data (no payment backend exists in Phase 1 — see CLAUDE.md's opening
// line), the same "real but local, no persistence" treatment as My Ads'
// status changes. No card number/CVV is ever transmitted or stored beyond
// this screen's own component state.
export default function PaymentMethodScreen() {
  const t = useTranslation()
  const fonts = useFontFamily()
  const router = useRouter()
  const { gemTone } = useGemTone()
  const tone = gemTones[gemTone]

  const [cards, setCards] = useState<SavedCard[]>(INITIAL_CARDS)
  const [defaultId, setDefaultId] = useState('visa')
  const [sel, setSel] = useState<string>('new')
  const [number, setNumber] = useState('')
  const [name, setName] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [makeDefault, setMakeDefault] = useState(true)
  const [justSaved, setJustSaved] = useState(false)
  const savedTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(savedTimeout.current), [])

  function goBack() {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/my-membership')
    }
  }

  const isNew = sel === 'new'
  const current = cards.find((c) => c.id === sel)
  const digits = number.replace(/\D/g, '')
  const numberValid = digits.length >= 15
  const masked = (digits + '•'.repeat(Math.max(0, 16 - digits.length)))
    .slice(0, 16)
    .replace(/(.{4})/g, '$1 ')
    .trim()

  const previewBrand = isNew ? (digits ? brandOf(digits) : 'CARD') : (current?.brand ?? 'CARD')
  const cardNumberPreview = isNew ? masked : `•••• •••• •••• ${current?.last4 ?? ''}`
  const namePreview = isNew
    ? name.trim().toUpperCase() || t.paymentMethod.yourNamePlaceholder
    : (current?.name ?? '')
  const expiryPreview = isNew ? expiry || t.paymentMethod.expiryPlaceholder : (current?.exp ?? '')

  function handleNumberChange(text: string) {
    setNumber(
      text
        .replace(/\D/g, '')
        .slice(0, 16)
        .replace(/(.{4})(?=.)/g, '$1 '),
    )
  }

  function handleExpiryChange(text: string) {
    const d = text.replace(/\D/g, '').slice(0, 4)
    setExpiry(d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d)
  }

  function handleCvvChange(text: string) {
    setCvv(text.replace(/\D/g, '').slice(0, 4))
  }

  function markSaved() {
    setJustSaved(true)
    clearTimeout(savedTimeout.current)
    savedTimeout.current = setTimeout(() => setJustSaved(false), 1800)
  }

  function selectCard(id: string) {
    setSel(id)
    setJustSaved(false)
  }

  function handleSave() {
    if (isNew) {
      if (digits.length < 15) return
      const brand = brandOf(digits)
      const nice = brand === 'CARD' ? 'Card' : brand[0] + brand.slice(1).toLowerCase()
      const id = `c${Date.now()}`
      const card: SavedCard = {
        id,
        brand,
        label: `${nice} ending ${digits.slice(-4)}`,
        last4: digits.slice(-4),
        exp: expiry.replace(/\s/g, ''),
        name: name.toUpperCase(),
      }
      setCards((prev) => [...prev, card])
      setSel(id)
      if (makeDefault) setDefaultId(id)
      setNumber('')
      setName('')
      setExpiry('')
      setCvv('')
    } else {
      setDefaultId(sel)
    }
    markSaved()
  }

  function handleRemove() {
    setCards((prev) => prev.filter((c) => c.id !== sel))
    setSel(defaultId)
  }

  const ctaLabel = justSaved
    ? t.paymentMethod.ctaSaved
    : isNew
      ? t.paymentMethod.ctaSaveCard
      : sel === defaultId
        ? t.paymentMethod.ctaKeepDefault
        : interpolate(t.paymentMethod.ctaUseCard, { label: current?.label ?? '' })
  const ctaDisabled = isNew && !numberValid && !justSaved
  const showRemove = !isNew && sel !== defaultId
  const disclaimer = interpolate(t.paymentMethod.disclaimer, { date: RENEWAL_DATE })
  const rimSoft = `rgba(${tone.rim},0.75)`

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
            {t.paymentMethod.title}
          </Text>
          <View style={styles.navSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <GlassSurface clarity={55} rim={tone.rim} radius={24} style={styles.cardPreview}>
            <View style={styles.cardTopRow}>
              <LinearGradient
                colors={['rgba(255,235,190,0.9)', 'rgba(210,170,100,0.75)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.chip}
              />
              <Text style={[styles.cardBrand, { fontFamily: fonts.extrabold }]}>
                {previewBrand}
              </Text>
            </View>
            <Text style={[styles.cardNumber, { fontFamily: fonts.bold }]}>{cardNumberPreview}</Text>
            <View style={styles.cardBottomRow}>
              <View style={styles.cardBottomCol}>
                <Text style={[styles.cardFieldLabel, { fontFamily: fonts.extrabold }]}>
                  {t.paymentMethod.cardholderLabel}
                </Text>
                <Text style={[styles.cardFieldValue, { fontFamily: fonts.bold }]} numberOfLines={1}>
                  {namePreview}
                </Text>
              </View>
              <View style={[styles.cardBottomCol, styles.cardBottomColRight]}>
                <Text style={[styles.cardFieldLabel, { fontFamily: fonts.extrabold }]}>
                  {t.paymentMethod.expiresLabel}
                </Text>
                <Text style={[styles.cardFieldValue, { fontFamily: fonts.bold }]}>
                  {expiryPreview}
                </Text>
              </View>
            </View>
          </GlassSurface>

          <Text style={[styles.sectionLabel, { fontFamily: fonts.extrabold }]}>
            {t.paymentMethod.savedCardsLabel}
          </Text>
          <GlassSurface clarity={55} radius={22} style={styles.listCard}>
            {cards.map((card) => {
              const active = sel === card.id
              return (
                <PressableScale
                  key={card.id}
                  onPress={() => selectCard(card.id)}
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={card.label}
                  style={[
                    styles.row,
                    styles.rowDivider,
                    active ? { backgroundColor: `rgba(${tone.rim},0.08)` } : null,
                  ]}
                >
                  <View
                    style={[
                      styles.radio,
                      active
                        ? {
                            borderColor: `rgba(${tone.rim},0.7)`,
                            backgroundColor: `rgba(${tone.rim},0.16)`,
                          }
                        : styles.radioInactive,
                    ]}
                  >
                    {active ? (
                      <View
                        style={[
                          styles.radioDot,
                          { backgroundColor: tone.accent, shadowColor: tone.accent },
                        ]}
                      />
                    ) : null}
                  </View>
                  <View
                    style={[
                      styles.cardIconTile,
                      {
                        backgroundColor: `rgba(${tone.rim},0.13)`,
                        borderColor: `rgba(${tone.rim},0.26)`,
                      },
                    ]}
                  >
                    <CardIcon size={18} color={tone.ink} strokeWidth={1.7} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={[styles.rowLabel, { fontFamily: fonts.bold }]}>{card.label}</Text>
                    <Text style={[styles.rowSub, { fontFamily: fonts.semibold }]}>
                      {interpolate(t.paymentMethod.cardExpiresRow, { date: card.exp })}
                    </Text>
                  </View>
                  {card.id === defaultId ? (
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: `rgba(${tone.rim},0.16)`,
                          borderColor: `rgba(${tone.rim},0.3)`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeLabel,
                          { fontFamily: fonts.extrabold, color: tone.accent },
                        ]}
                      >
                        {t.paymentMethod.defaultBadge}
                      </Text>
                    </View>
                  ) : null}
                </PressableScale>
              )
            })}
            <PressableScale
              onPress={() => selectCard('new')}
              accessibilityState={{ selected: isNew }}
              accessibilityLabel={t.paymentMethod.addNewCard}
              style={[styles.row, isNew ? { backgroundColor: `rgba(${tone.rim},0.08)` } : null]}
            >
              <View
                style={[
                  styles.radio,
                  isNew
                    ? {
                        borderColor: `rgba(${tone.rim},0.7)`,
                        backgroundColor: `rgba(${tone.rim},0.16)`,
                      }
                    : styles.radioInactive,
                ]}
              >
                {isNew ? (
                  <View
                    style={[
                      styles.radioDot,
                      { backgroundColor: tone.accent, shadowColor: tone.accent },
                    ]}
                  />
                ) : null}
              </View>
              <View
                style={[
                  styles.cardIconTile,
                  {
                    backgroundColor: `rgba(${tone.rim},0.13)`,
                    borderColor: `rgba(${tone.rim},0.26)`,
                  },
                ]}
              >
                <AddIcon size={14} color={tone.ink} strokeWidth={1.9} />
              </View>
              <Text style={[styles.rowLabel, styles.rowLabelFlex, { fontFamily: fonts.bold }]}>
                {t.paymentMethod.addNewCard}
              </Text>
            </PressableScale>
          </GlassSurface>

          {isNew ? (
            <>
              <Text style={[styles.sectionLabel, { fontFamily: fonts.extrabold }]}>
                {t.paymentMethod.cardDetailsLabel}
              </Text>
              <View style={styles.formCard}>
                <TextField
                  label={t.paymentMethod.cardNumberLabel}
                  value={number}
                  onChangeText={handleNumberChange}
                  placeholder={t.paymentMethod.cardNumberPlaceholder}
                  keyboardType="numeric"
                  leftIcon={<CardIcon size={18} color={rimSoft} strokeWidth={1.7} />}
                  rightIcon={
                    numberValid ? (
                      <LinearGradient
                        colors={[`${tone.cta[0]}0.95)`, `${tone.cta[1]}0.8)`]}
                        start={GRADIENT_140.start}
                        end={GRADIENT_140.end}
                        style={[styles.tickTile, { borderColor: `rgba(${tone.rim},0.6)` }]}
                      >
                        <CheckIcon size={10} color={tone.tickInk} strokeWidth={2.2} />
                      </LinearGradient>
                    ) : undefined
                  }
                />
                <TextField
                  label={t.paymentMethod.nameOnCardLabel}
                  value={name}
                  onChangeText={setName}
                  placeholder={t.paymentMethod.namePlaceholder}
                  leftIcon={<PersonIcon size={17} color={rimSoft} strokeWidth={1.7} />}
                />
                <View style={styles.formRow}>
                  <TextField
                    label={t.paymentMethod.expiryFieldLabel}
                    value={expiry}
                    onChangeText={handleExpiryChange}
                    placeholder={t.paymentMethod.expiryPlaceholder}
                    keyboardType="numeric"
                    style={styles.formHalf}
                  />
                  <TextField
                    label={t.paymentMethod.cvvLabel}
                    value={cvv}
                    onChangeText={handleCvvChange}
                    placeholder="•••"
                    keyboardType="numeric"
                    secureTextEntry
                    rightIcon={<InfoCircleIcon size={16} />}
                    style={styles.formHalf}
                  />
                </View>
                <Checkbox
                  checked={makeDefault}
                  onValueChange={setMakeDefault}
                  accessibilityLabel={t.paymentMethod.makeDefaultLabel}
                  style={styles.checkboxRow}
                >
                  <Text style={[styles.checkboxLabel, { fontFamily: fonts.semibold }]}>
                    {t.paymentMethod.makeDefaultLabel}
                  </Text>
                </Checkbox>
              </View>
            </>
          ) : null}

          <View style={styles.disclaimerRow}>
            <LockIcon size={14} color={rimSoft} strokeWidth={1.7} />
            <Text style={[styles.disclaimerText, { fontFamily: fonts.semibold }]}>
              {disclaimer}
            </Text>
          </View>

          <Button
            label={ctaLabel}
            onPress={handleSave}
            disabled={ctaDisabled}
            icon={
              justSaved ? undefined : (
                <ArrowRightIcon size={17} color={neutral.white} strokeWidth={2} />
              )
            }
            iconPosition="right"
            style={styles.cta}
          />

          {showRemove ? (
            <PressableScale
              onPress={handleRemove}
              accessibilityLabel={t.paymentMethod.removeCard}
              style={styles.removeWrap}
            >
              <Text style={[styles.removeLabel, { fontFamily: fonts.extrabold }]}>
                {t.paymentMethod.removeCard}
              </Text>
            </PressableScale>
          ) : null}

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
    gap: 10,
    paddingTop: 10,
    paddingHorizontal: 22,
    paddingBottom: 12,
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
    paddingHorizontal: 22,
  },
  cardPreview: {
    marginTop: 16,
    aspectRatio: 1.586,
    padding: 20,
    paddingHorizontal: 22,
    justifyContent: 'space-between',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  chip: {
    width: 38,
    height: 28,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  cardBrand: {
    fontSize: 16,
    fontStyle: 'italic',
    letterSpacing: 0.5,
    color: neutral.white,
  },
  cardNumber: {
    fontSize: 20,
    letterSpacing: 2.5,
    color: neutral.white,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardBottomCol: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  cardBottomColRight: {
    flex: 0,
    alignItems: 'flex-end',
  },
  cardFieldLabel: {
    fontSize: 9,
    letterSpacing: 0.6,
    color: 'rgba(255,255,255,0.55)',
  },
  cardFieldValue: {
    fontSize: 13,
    letterSpacing: 0.6,
    color: neutral.white,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 0.6,
    color: 'rgba(255,255,255,0.42)',
    marginTop: 22,
    marginBottom: 10,
    marginHorizontal: 4,
  },
  listCard: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  radio: {
    flexShrink: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInactive: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  cardIconTile: {
    flexShrink: 0,
    width: 38,
    height: 38,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  rowLabel: {
    fontSize: 13,
    color: neutral.white,
  },
  rowLabelFlex: {
    flex: 1,
  },
  rowSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
  },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeLabel: {
    fontSize: 9,
    letterSpacing: 0.3,
  },
  formCard: {
    gap: 12,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formHalf: {
    flex: 1,
  },
  tickTile: {
    width: 20,
    height: 20,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxRow: {
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16.5,
    color: 'rgba(255,255,255,0.5)',
  },
  cta: {
    marginTop: 20,
  },
  removeWrap: {
    alignSelf: 'center',
    marginTop: 16,
  },
  removeLabel: {
    fontSize: 12,
    color: '#ff8f80',
  },
  bottomSpacer: {
    height: 40,
  },
})
