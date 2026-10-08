import { gemTones, neutral } from '@ceylon-gems/ui-tokens'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { GlassSurface, IconButton, PressableScale } from '../components'
import {
  BagIcon,
  BellEmptyIcon,
  ChatIcon,
  ChevronLeftIcon,
  DoubleCheckIcon,
  GemIcon,
} from '../components/icons'
import { GRADIENT_140 } from '../components/primitives/gradientAngle'
import { LiveGradientBackground } from '../components/primitives/LiveGradientBackground'
import { useFontFamily } from '../hooks/useFontFamily'
import { useTranslation } from '../hooks/useTranslation'
import { NOTIFICATIONS, type NotificationItem, type NotificationKind } from '../lib/notifications'
import { useGemTone } from '../providers/GemToneProvider'
import { useNotifications } from '../providers/NotificationsProvider'

type TabKey = 'all' | NotificationKind

const TAB_KEYS: TabKey[] = ['all', 'enquiries', 'priceDrops', 'newListings']
const GROUP_ORDER: NotificationItem['when'][] = ['TODAY', 'EARLIER']

// Reached by tapping the bell icon on Home. Ports "Ceylon Gem Exchange
// Notifications.dc.html" — filter tabs (with per-tab unread counts) over a
// TODAY/EARLIER-grouped list, each row a glass card with an icon or photo
// placeholder, title/body/time, and an unread dot. Read state lives in
// NotificationsProvider now (shared with Home's bell dot — see that
// provider's own comment), not a local `readIds` here; this screen just
// reads/mutates it via `useNotifications()`.
export default function NotificationsScreen() {
  const t = useTranslation()
  const fonts = useFontFamily()
  const router = useRouter()
  const { gemTone } = useGemTone()
  const tone = gemTones[gemTone]
  const { isUnread, markRead, markAllRead } = useNotifications()

  const [tab, setTab] = useState<TabKey>('all')

  function goBack() {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/')
    }
  }

  function tabLabel(key: TabKey) {
    switch (key) {
      case 'all':
        return t.notifications.tabAll
      case 'enquiries':
        return t.notifications.tabEnquiries
      case 'priceDrops':
        return t.notifications.tabPriceDrops
      case 'newListings':
        return t.notifications.tabNewListings
    }
  }

  function countFor(key: TabKey) {
    const items = key === 'all' ? NOTIFICATIONS : NOTIFICATIONS.filter((n) => n.kind === key)
    return items.filter(isUnread).length
  }

  const shown = tab === 'all' ? NOTIFICATIONS : NOTIFICATIONS.filter((n) => n.kind === tab)
  const groups = GROUP_ORDER.map((label) => ({
    label,
    items: shown.filter((n) => n.when === label),
  })).filter((grp) => grp.items.length > 0)
  const isEmpty = shown.length === 0

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
            {t.notifications.title}
          </Text>
          <IconButton
            icon={<DoubleCheckIcon size={18} color={tone.accent} />}
            accessibilityLabel={t.notifications.markAllRead}
            onPress={markAllRead}
            size={40}
            radius={14}
          />
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <GlassSurface clarity={55} radius={18} style={styles.tabsBar}>
            <View style={styles.tabsRow}>
              {TAB_KEYS.map((key) => {
                const active = tab === key
                const count = countFor(key)
                const label = tabLabel(key)
                const pill = (
                  <View style={styles.tabPillInner}>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.tabLabel,
                        {
                          fontFamily: fonts.bold,
                          color: active ? neutral.white : 'rgba(255,255,255,0.55)',
                        },
                      ]}
                    >
                      {label}
                    </Text>
                    {count > 0 ? (
                      <View
                        style={[
                          styles.tabCount,
                          {
                            backgroundColor: `rgba(${tone.rim},0.2)`,
                            borderColor: `rgba(${tone.rim},0.32)`,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.tabCountLabel,
                            {
                              fontFamily: fonts.extrabold,
                              color: active ? neutral.white : tone.accent,
                            },
                          ]}
                        >
                          {count}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                )
                return (
                  <PressableScale
                    key={key}
                    onPress={() => setTab(key)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={label}
                    style={styles.tabPressable}
                  >
                    {active ? (
                      <LinearGradient
                        colors={[`${tone.cta[0]}0.5)`, `${tone.cta[1]}0.32)`]}
                        start={GRADIENT_140.start}
                        end={GRADIENT_140.end}
                        style={[styles.tabPill, { borderColor: `rgba(${tone.rim},0.42)` }]}
                      >
                        {pill}
                      </LinearGradient>
                    ) : (
                      <View style={[styles.tabPill, { borderColor: 'transparent' }]}>{pill}</View>
                    )}
                  </PressableScale>
                )
              })}
            </View>
          </GlassSurface>

          {groups.map((grp) => (
            <View key={grp.label}>
              <Text style={[styles.groupLabel, { fontFamily: fonts.extrabold }]}>{grp.label}</Text>
              <GlassSurface clarity={55} radius={22} style={styles.listCard}>
                {grp.items.map((n, i) => {
                  const unread = isUnread(n)
                  return (
                    <PressableScale
                      key={n.id}
                      onPress={() => markRead(n.id)}
                      accessibilityLabel={n.title}
                      style={[
                        styles.row,
                        i < grp.items.length - 1 && styles.rowDivider,
                        unread ? { backgroundColor: `rgba(${tone.rim},0.07)` } : null,
                      ]}
                    >
                      {n.thumb ? (
                        <GlassSurface clarity={55} rim={tone.rim} radius={14} style={styles.avatar}>
                          <GemIcon
                            size={18}
                            ink="rgba(255,255,255,0.22)"
                            inkSoft="rgba(255,255,255,0.12)"
                          />
                        </GlassSurface>
                      ) : (
                        <View
                          style={[
                            styles.iconTile,
                            {
                              backgroundColor: `rgba(${tone.rim},0.13)`,
                              borderColor: `rgba(${tone.rim},0.26)`,
                            },
                          ]}
                        >
                          {n.icon === 'chat' ? (
                            <ChatIcon size={17} color={tone.ink} strokeWidth={1.8} />
                          ) : n.icon === 'gem' ? (
                            <GemIcon
                              size={17}
                              ink={tone.ink}
                              inkSoft={tone.ink}
                              strokeWidth={1.8}
                            />
                          ) : (
                            <BagIcon size={17} color={tone.ink} strokeWidth={1.8} />
                          )}
                        </View>
                      )}
                      <View style={styles.textCol}>
                        <Text
                          style={[
                            styles.itemTitle,
                            { fontFamily: unread ? fonts.extrabold : fonts.bold },
                          ]}
                        >
                          {n.title}
                        </Text>
                        <Text style={[styles.itemBody, { fontFamily: fonts.medium }]}>
                          {n.body}
                        </Text>
                        <Text style={[styles.itemTime, { fontFamily: fonts.bold }]}>{n.time}</Text>
                      </View>
                      {unread ? (
                        <View
                          style={[
                            styles.unreadDot,
                            { backgroundColor: tone.accent, shadowColor: tone.accent },
                          ]}
                        />
                      ) : null}
                    </PressableScale>
                  )
                })}
              </GlassSurface>
            </View>
          ))}

          {isEmpty ? (
            <GlassSurface clarity={55} radius={24} style={styles.emptyPanel}>
              <View
                style={[
                  styles.emptyIconTile,
                  {
                    backgroundColor: `rgba(${tone.rim},0.13)`,
                    borderColor: `rgba(${tone.rim},0.26)`,
                  },
                ]}
              >
                <BellEmptyIcon size={26} color={tone.ink} strokeWidth={1.5} />
              </View>
              <Text style={[styles.emptyTitle, { fontFamily: fonts.extrabold }]}>
                {t.notifications.empty}
              </Text>
              <Text style={[styles.emptySubtitle, { fontFamily: fonts.medium }]}>
                {t.notifications.emptySubtitle}
              </Text>
            </GlassSurface>
          ) : null}
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
    paddingBottom: 8,
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    letterSpacing: -0.2,
    color: neutral.white,
  },
  body: {
    paddingHorizontal: 22,
  },
  tabsBar: {
    flexDirection: 'row',
    padding: 5,
    marginBottom: 4,
  },
  // width:'100%' (not just flexDirection:'row') — this View is GlassSurface's
  // sole in-flow child (the blur/tint layers behind it are absolutely
  // positioned), and a lone child with no explicit size shrinks to fit its
  // content instead of filling the surface, leaving the `flex:1` tabs below
  // with no actual row width to distribute into.
  tabsRow: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
  },
  // flex:1 on the pressable (not just the pill inside it) so each tab
  // claims an equal share of the row — PressableScale's own children don't
  // stretch to fill it otherwise.
  tabPressable: {
    flex: 1,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
  },
  tabPillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  tabLabel: {
    fontSize: 12,
    flexShrink: 1,
  },
  tabCount: {
    minWidth: 17,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabCountLabel: {
    fontSize: 9,
  },
  groupLabel: {
    color: 'rgba(255,255,255,0.42)',
    fontSize: 11,
    letterSpacing: 0.6,
    marginTop: 20,
    marginHorizontal: 4,
    marginBottom: 10,
  },
  listCard: {
    flexDirection: 'column',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  avatar: {
    flexShrink: 0,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTile: {
    flexShrink: 0,
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  textCol: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  itemTitle: {
    color: neutral.white,
    fontSize: 13,
    lineHeight: 13 * 1.35,
  },
  itemBody: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    lineHeight: 11 * 1.5,
  },
  itemTime: {
    color: 'rgba(255,255,255,0.32)',
    fontSize: 10,
    marginTop: 1,
  },
  unreadDot: {
    flexShrink: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  emptyPanel: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    marginTop: 22,
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  emptyIconTile: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  emptyTitle: {
    color: neutral.white,
    fontSize: 15,
  },
  emptySubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 12 * 1.55,
  },
})
