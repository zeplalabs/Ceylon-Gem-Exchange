import { gemTones, neutral } from '@ceylon-gems/ui-tokens'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { GlassSurface, IconButton, ProgressBar, PressableScale } from '../components'
import { CardIcon, CheckIcon, ChevronLeftIcon, GemIcon } from '../components/icons'
import { GRADIENT_140 } from '../components/primitives/gradientAngle'
import { LiveGradientBackground } from '../components/primitives/LiveGradientBackground'
import { useFontFamily } from '../hooks/useFontFamily'
import { useTranslation } from '../hooks/useTranslation'
import { useCurrency } from '../providers/CurrencyProvider'
import { useGemTone } from '../providers/GemToneProvider'

type PlanKey = 'basic' | 'plus' | 'pro'

const PLAN_ORDER: PlanKey[] = ['basic', 'plus', 'pro']
const BEST_VALUE_PLAN: PlanKey = 'pro'
const PLAN_PRICES_USD: Record<PlanKey, number> = { basic: 8, plus: 24, pro: 59 }
// Basic/Plus's own listing caps (from each tier's first benefit line);
// Pro's is `null` — its benefit is "Unlimited active listings", so there's
// no denominator to show a fraction/bar against.
const PLAN_QUOTA: Record<PlanKey, number | null> = { basic: 5, plus: 20, pro: null }

// Demo-only account/billing state — this app has no membership or payments
// backend at all (Phase 1 is listings-only, no buyer/seller payments, no
// commission — see CLAUDE.md's opening line), so every number here is local
// fixture data, same treatment as My Ads' `INITIAL_ADS`. Renewal date and
// card details stay as raw literal strings (not routed through
// `packages/i18n`) for the same reason My Ads' "2d ago" timestamps do —
// they're demo values, not UI chrome.
const ACTIVE_LISTINGS = 5
const RENEWAL_DATE = '12 Sep 2026'
const CARD_LABEL = 'Visa ending 4412'
const CARD_EXPIRY = '08/29'

function interpolate(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.split(`{{${key}}}`).join(value),
    template,
  )
}

// Reached from Profile's "My membership" row. Ports "Ceylon Gem Exchange My
// Membership.dc.html" — a current-plan summary card (quota bar, "Invoices"
// pill), the current plan's benefit checklist, and a 3-tier plan list. The
// mockup's own radio-select + collapsed-benefits-until-selected interaction
// was replaced on request: every tier's full benefit list is always shown
// (no cascading expand), and each non-current tier gets its own action
// button instead — "Upgrade" (primary) for a tier above the current plan,
// "Change" (secondary) for one below it. Tapping either is a real local
// state change (switches which plan is "current", same as My Ads' Mark
// sold/Relist — no backend needed for a plan swap that's demo data either
// way) rather than a dead tap target. The payment-method row's "Change"
// text now navigates to app/payment-method.tsx (its own real screen, built
// separately from "Ceylon Gem Exchange Payment Card.dc.html"); "Cancel
// membership" still has no `onClick` in this mockup's own script and no
// real payment backend exists (Phase 1 has none at all), so that one stays
// decorative. Badge/eyebrow pill text sizes (9px) are the
// mockup's own exact literals, not the generic `Badge` component's
// `fontSize.xs` (12px) — see CLAUDE.md's "don't round a mockup-computed
// literal" rule.
export default function MyMembershipScreen() {
  const t = useTranslation()
  const fonts = useFontFamily()
  const router = useRouter()
  const { gemTone } = useGemTone()
  const tone = gemTones[gemTone]
  const { formatPrice } = useCurrency()

  const [currentPlan, setCurrentPlan] = useState<PlanKey>('plus')

  function goBack() {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/profile')
    }
  }

  const plans = t.membership.plans
  const planInfo: Record<PlanKey, { name: string; detail: string; benefits: string[] }> = {
    basic: plans.basic,
    plus: plans.plus,
    pro: plans.pro,
  }
  const current = planInfo[currentPlan]
  const currentQuota = PLAN_QUOTA[currentPlan]

  const renewLine = interpolate(t.membership.renewsLine, {
    date: RENEWAL_DATE,
    price: formatPrice(PLAN_PRICES_USD[currentPlan]),
  })
  const listingsText =
    currentQuota === null
      ? interpolate(t.membership.listingsUnlimited, { used: String(ACTIVE_LISTINGS) })
      : interpolate(t.membership.listingsUsed, {
          used: String(ACTIVE_LISTINGS),
          total: String(currentQuota),
        })
  const expiresText = interpolate(t.membership.expiresLabel, { date: CARD_EXPIRY })
  const currentRank = PLAN_ORDER.indexOf(currentPlan)

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
            {t.membership.title}
          </Text>
          <View style={styles.navSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <GlassSurface clarity={55} rim={tone.rim} radius={28} style={styles.planCard}>
            <View style={styles.planTopRow}>
              <View style={styles.planInfo}>
                <View
                  style={[
                    styles.eyebrow,
                    {
                      backgroundColor: `rgba(${tone.rim},0.18)`,
                      borderColor: `rgba(${tone.rim},0.32)`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.eyebrowLabel,
                      { fontFamily: fonts.extrabold, color: tone.accent },
                    ]}
                  >
                    {t.membership.currentPlanBadge}
                  </Text>
                </View>
                <Text style={[styles.planName, { fontFamily: fonts.extrabold }]}>
                  {current.name}
                </Text>
                <Text style={[styles.planRenew, { fontFamily: fonts.semibold }]}>{renewLine}</Text>
              </View>
              <View
                style={[
                  styles.planIconTile,
                  {
                    backgroundColor: `rgba(${tone.rim},0.16)`,
                    borderColor: `rgba(${tone.rim},0.3)`,
                  },
                ]}
              >
                <GemIcon
                  size={24}
                  ink={tone.ink}
                  inkSoft={`rgba(${tone.rim},0.7)`}
                  strokeWidth={1.6}
                />
              </View>
            </View>

            <View style={styles.quotaBlock}>
              <View style={styles.quotaHeader}>
                <Text style={[styles.quotaLabel, { fontFamily: fonts.bold }]}>
                  {t.membership.activeListingsLabel}
                </Text>
                <Text style={[styles.quotaValue, { fontFamily: fonts.extrabold }]}>
                  {listingsText}
                </Text>
              </View>
              {currentQuota !== null ? (
                <ProgressBar progress={ACTIVE_LISTINGS / currentQuota} tone={gemTone} />
              ) : null}
            </View>

            <View style={[styles.pill, styles.pillSecondary]}>
              <Text
                style={[
                  styles.pillLabel,
                  styles.pillLabelSecondary,
                  { fontFamily: fonts.extrabold },
                ]}
              >
                {t.membership.invoices}
              </Text>
            </View>
          </GlassSurface>

          <Text style={[styles.sectionLabel, { fontFamily: fonts.extrabold }]}>
            {t.membership.benefitsLabel}
          </Text>
          <GlassSurface clarity={55} radius={22} style={styles.benefitsCard}>
            {current.benefits.map((text, i) => (
              <View
                key={text}
                style={[
                  styles.benefitRow,
                  i < current.benefits.length - 1 && styles.benefitRowDivider,
                ]}
              >
                <LinearGradient
                  colors={[`${tone.cta[0]}0.95)`, `${tone.cta[1]}0.8)`]}
                  start={GRADIENT_140.start}
                  end={GRADIENT_140.end}
                  style={[styles.tick, { borderColor: `rgba(${tone.rim},0.6)` }]}
                >
                  <CheckIcon size={11} color={tone.tickInk} strokeWidth={2.2} />
                </LinearGradient>
                <Text style={[styles.benefitText, { fontFamily: fonts.semibold }]}>{text}</Text>
              </View>
            ))}
          </GlassSurface>

          <Text style={[styles.sectionLabel, { fontFamily: fonts.extrabold }]}>
            {t.membership.upgradeLabel}
          </Text>
          <View style={styles.plansWrap}>
            {PLAN_ORDER.map((key, rank) => {
              const plan = planInfo[key]
              const isCurrent = key === currentPlan
              const content = (
                <>
                  <View style={styles.planRowTop}>
                    <View style={styles.planRowText}>
                      <View style={styles.planRowNameLine}>
                        <Text
                          style={[styles.planRowName, { fontFamily: fonts.extrabold }]}
                          numberOfLines={1}
                        >
                          {plan.name}
                        </Text>
                        {isCurrent ? (
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
                              {t.membership.currentBadge}
                            </Text>
                          </View>
                        ) : null}
                        {key === BEST_VALUE_PLAN ? (
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
                              {t.membership.bestValueBadge}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text
                        style={[styles.planRowDetail, { fontFamily: fonts.semibold }]}
                        numberOfLines={1}
                      >
                        {plan.detail}
                      </Text>
                    </View>
                    <View style={styles.planRowPriceCol}>
                      <Text
                        style={[
                          styles.planRowPrice,
                          { fontFamily: fonts.extrabold, color: tone.accent },
                        ]}
                      >
                        {formatPrice(PLAN_PRICES_USD[key])}
                      </Text>
                      <Text style={[styles.planRowPeriod, { fontFamily: fonts.bold }]}>
                        {t.membership.perMonth}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.planBenefits}>
                    {plan.benefits.map((text) => (
                      <View key={text} style={styles.planBenefitRow}>
                        <View
                          style={[
                            styles.planBenefitTick,
                            { borderColor: `rgba(${tone.rim},0.55)` },
                          ]}
                        >
                          <CheckIcon size={10} color={tone.tickInk} strokeWidth={2.2} />
                        </View>
                        <Text style={[styles.planBenefitText, { fontFamily: fonts.semibold }]}>
                          {text}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {isCurrent ? null : (
                    <PressableScale
                      onPress={() => setCurrentPlan(key)}
                      accessibilityLabel={
                        rank > currentRank
                          ? interpolate(t.membership.upgradeTo, { name: plan.name })
                          : interpolate(t.membership.changeTo, { name: plan.name })
                      }
                      style={styles.planActionWrap}
                    >
                      {rank > currentRank ? (
                        <LinearGradient
                          colors={[`${tone.cta[0]}0.72)`, `${tone.cta[1]}0.5)`]}
                          start={GRADIENT_140.start}
                          end={GRADIENT_140.end}
                          style={[styles.pill, { borderColor: `rgba(${tone.rim},0.45)` }]}
                        >
                          <Text style={[styles.pillLabel, { fontFamily: fonts.extrabold }]}>
                            {t.membership.upgradeAction}
                          </Text>
                        </LinearGradient>
                      ) : (
                        <View style={[styles.pill, styles.pillSecondary]}>
                          <Text
                            style={[
                              styles.pillLabel,
                              styles.pillLabelSecondary,
                              { fontFamily: fonts.extrabold },
                            ]}
                          >
                            {t.membership.change}
                          </Text>
                        </View>
                      )}
                    </PressableScale>
                  )}
                </>
              )

              return (
                <View key={key} style={isCurrent ? undefined : styles.planRowOuter}>
                  {isCurrent ? (
                    <LinearGradient
                      colors={[`${tone.cta[0]}0.28)`, `${tone.cta[1]}0.16)`]}
                      start={GRADIENT_140.start}
                      end={GRADIENT_140.end}
                      style={[styles.planRow, { borderColor: `rgba(${tone.rim},0.42)` }]}
                    >
                      {content}
                    </LinearGradient>
                  ) : (
                    <GlassSurface clarity={55} radius={22} style={styles.planRow}>
                      {content}
                    </GlassSurface>
                  )}
                </View>
              )
            })}
          </View>

          <Text style={[styles.sectionLabel, { fontFamily: fonts.extrabold }]}>
            {t.membership.paymentMethodLabel}
          </Text>
          <GlassSurface clarity={55} radius={22} style={styles.payRow}>
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
            <View style={styles.payText}>
              <Text style={[styles.payLabel, { fontFamily: fonts.semibold }]}>{CARD_LABEL}</Text>
              <Text style={[styles.payExpiry, { fontFamily: fonts.semibold }]}>{expiresText}</Text>
            </View>
            <PressableScale
              onPress={() => router.push('/payment-method')}
              accessibilityLabel={t.membership.change}
            >
              <Text style={[styles.payChange, { fontFamily: fonts.extrabold, color: tone.accent }]}>
                {t.membership.change}
              </Text>
            </PressableScale>
          </GlassSurface>

          <Text style={[styles.cancelLabel, { fontFamily: fonts.extrabold }]}>
            {t.membership.cancelMembership}
          </Text>

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
  planCard: {
    marginTop: 16,
    padding: 20,
  },
  planTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  planInfo: {
    gap: 6,
  },
  eyebrow: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 11,
    borderWidth: 1,
  },
  eyebrowLabel: {
    fontSize: 9,
    letterSpacing: 0.5,
  },
  planName: {
    fontSize: 24,
    letterSpacing: -0.4,
    color: neutral.white,
  },
  planRenew: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
  },
  planIconTile: {
    flexShrink: 0,
    width: 48,
    height: 48,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quotaBlock: {
    marginTop: 18,
    gap: 9,
  },
  quotaHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  quotaLabel: {
    fontSize: 11,
    letterSpacing: 0.4,
    color: 'rgba(255,255,255,0.6)',
  },
  quotaValue: {
    fontSize: 12,
    color: neutral.white,
  },
  pill: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  pillSecondary: {
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  pillLabel: {
    fontSize: 12,
    color: neutral.white,
  },
  pillLabelSecondary: {
    color: 'rgba(255,255,255,0.75)',
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 0.6,
    color: 'rgba(255,255,255,0.42)',
    marginTop: 22,
    marginBottom: 10,
    marginHorizontal: 4,
  },
  benefitsCard: {
    overflow: 'hidden',
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  benefitRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  tick: {
    flexShrink: 0,
    width: 20,
    height: 20,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.82)',
  },
  plansWrap: {
    gap: 10,
  },
  planRowOuter: {
    marginTop: 0,
  },
  planRow: {
    padding: 14,
    borderRadius: 22,
  },
  planRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  planRowText: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  planRowNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planRowName: {
    fontSize: 14,
    color: neutral.white,
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
  planRowDetail: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  planRowPriceCol: {
    alignItems: 'flex-end',
    gap: 1,
  },
  planRowPrice: {
    fontSize: 15,
  },
  planRowPeriod: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
  },
  planBenefits: {
    gap: 9,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  planBenefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  planBenefitTick: {
    flexShrink: 0,
    width: 18,
    height: 18,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  planBenefitText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17.4,
    color: 'rgba(255,255,255,0.8)',
  },
  planActionWrap: {
    marginTop: 12,
  },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
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
  payText: {
    flex: 1,
    gap: 2,
  },
  payLabel: {
    fontSize: 13,
    color: neutral.white,
  },
  payExpiry: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
  },
  payChange: {
    fontSize: 12,
  },
  cancelLabel: {
    textAlign: 'center',
    marginTop: 22,
    fontSize: 12,
    color: '#ff8f80',
  },
  bottomSpacer: {
    height: 40,
  },
})
