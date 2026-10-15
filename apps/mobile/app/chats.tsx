import { useAuth } from '@clerk/expo'
import { gemTones, neutral } from '@ceylon-gems/ui-tokens'
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list'
import { useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Avatar, BottomNavBar, GlassSurface, PressableScale, SearchBar } from '../components'
import {
  BidsTabIcon,
  ChatIcon,
  DoubleCheckIcon,
  HeartIcon,
  HomeTabIcon,
  ProfileTabIcon,
  SearchIcon,
} from '../components/icons'
import { LiveGradientBackground } from '../components/primitives/LiveGradientBackground'
import { useFontFamily } from '../hooks/useFontFamily'
import { useTranslation } from '../hooks/useTranslation'
import { API_URL } from '../lib/apiUrl'
import { useGemTone } from '../providers/GemToneProvider'

interface InquiryPreview {
  threadId: string
  listingId: string
  listingTitle: string
  sellerName: string | null
  updatedAt: string
  lastMessage: { body: string; fromMe: boolean; createdAt: string } | null
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Today -> "HH:MM" (read in the accent color at render time); yesterday ->
// "Yesterday"; within the last 6 days -> a short weekday name; older ->
// "DD/MM" — same display convention as the Chats mockup's own seed data.
function formatThreadTime(iso: string) {
  const date = new Date(iso)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const dayDiff = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000)

  if (dayDiff === 0) {
    return {
      label: `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`,
      isRecent: true,
    }
  }
  if (dayDiff === 1) return { label: 'Yesterday', isRecent: false }
  if (dayDiff > 1 && dayDiff < 7) return { label: WEEKDAY_NAMES[date.getDay()]!, isRecent: false }
  return {
    label: `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`,
    isRecent: false,
  }
}

function initialsFor(name: string) {
  return name
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

// Reached from the bottom nav's Chat tab (home.tsx/profile.tsx — both
// used to jump straight into the first demo listing's thread, since this
// screen didn't exist yet; see those files' own nav-handler comments,
// updated alongside this screen to push here instead). Ports the real
// Chats `.dc.html` mockup (found in ~/Downloads/ — see git history), now
// backed by the real `GET /me/inquiries` endpoint (my-inquiries.
// controller.ts) rather than the static seed this screen launched with —
// buyer-only, same scope boundary as chat/[id].tsx's own real-data path
// (no seller inbox exists yet). Tapping a row opens the real per-listing
// `chat/[id]` screen; there's no "start a new conversation" entry point
// anywhere in this app (you only ever reach Chat from a listing), so the
// mockup's own header compose button was dropped rather than wired to
// nothing or left decorative.
export default function ChatsScreen() {
  const t = useTranslation()
  const fonts = useFontFamily()
  const router = useRouter()
  const { getToken } = useAuth()
  const { gemTone } = useGemTone()
  const tone = gemTones[gemTone]
  const [query, setQuery] = useState('')
  const [threads, setThreads] = useState<InquiryPreview[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const token = await getToken()
        if (!token) return
        const res = await fetch(`${API_URL}/me/inquiries`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok || cancelled) return
        setThreads((await res.json()) as InquiryPreview[])
      } catch {
        // Leave `threads` null — renders as the empty state below, same
        // as a genuinely empty inbox (a network hiccup isn't worth a
        // separate error screen for a buyer-facing list like this one).
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
    // `getToken` deliberately excluded — see edit-profile.tsx's identical
    // fix; Clerk's `useAuth()` hands back a new function identity on every
    // render, which would re-fetch on every render instead of once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const list = threads ?? []
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((c) => (c.sellerName ?? '').toLowerCase().includes(q))
  }, [threads, query])

  const renderItem = ({ item }: ListRenderItemInfo<InquiryPreview>) => {
    const sellerName = item.sellerName ?? '—'
    const time = formatThreadTime(item.lastMessage?.createdAt ?? item.updatedAt)
    const previewText = item.lastMessage
      ? item.lastMessage.fromMe
        ? `${t.chats.youPrefix}${item.lastMessage.body}`
        : item.lastMessage.body
      : item.listingTitle

    return (
      <PressableScale
        onPress={() => router.push(`/chat/${item.listingId}`)}
        accessibilityLabel={`${sellerName}, ${previewText}`}
        style={styles.row}
      >
        <Avatar initials={initialsFor(sellerName)} size={52} accessibilityLabel={sellerName} />
        <View style={styles.rowCol}>
          <View style={styles.rowTopLine}>
            <Text style={[styles.rowName, { fontFamily: fonts.bold }]} numberOfLines={1}>
              {sellerName}
            </Text>
            <Text
              style={[
                styles.rowTime,
                { fontFamily: fonts.bold },
                time.isRecent && { color: tone.accent },
              ]}
            >
              {time.label}
            </Text>
          </View>
          <View style={styles.rowBottomLine}>
            {item.lastMessage?.fromMe ? (
              <DoubleCheckIcon size={13} color="rgba(255,255,255,0.4)" strokeWidth={2.2} />
            ) : null}
            <Text style={[styles.rowPreview, { fontFamily: fonts.medium }]} numberOfLines={1}>
              {previewText}
            </Text>
          </View>
        </View>
      </PressableScale>
    )
  }

  return (
    <LiveGradientBackground>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={styles.navRow}>
          <Text style={[styles.navTitle, { fontFamily: fonts.extrabold }]} numberOfLines={1}>
            {t.chats.title}
          </Text>
        </View>

        <SearchBar
          value={query}
          onChangeText={setQuery}
          onClear={() => setQuery('')}
          placeholder={t.chats.searchPlaceholder}
          clearAccessibilityLabel={t.common.close}
          leftIcon={<SearchIcon />}
          radius={18}
          style={styles.searchBar}
        />

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={neutral.white} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
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
                <ChatIcon size={22} color={tone.ink} strokeWidth={1.8} />
              </View>
              <Text style={[styles.emptyTitle, { fontFamily: fonts.extrabold }]}>
                {t.chats.emptyTitle}
              </Text>
              <Text style={[styles.emptySubtitle, { fontFamily: fonts.medium }]}>
                {t.chats.emptySubtitle}
              </Text>
            </GlassSurface>
          </View>
        ) : (
          <FlashList
            data={filtered}
            keyExtractor={(item) => item.threadId}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </SafeAreaView>

      <BottomNavBar
        value="chat"
        onChange={(value) => {
          if (value === 'home') router.push('/home')
          if (value === 'profile') router.push('/profile')
          if (value === 'saved') router.push('/favourites')
        }}
        style={styles.floatingNav}
        items={[
          { value: 'home', label: 'Home', icon: (color) => <HomeTabIcon color={color} /> },
          {
            value: 'chat',
            label: 'Chat',
            icon: (color) => <ChatIcon size={20} color={color} strokeWidth={1.9} />,
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
    </LiveGradientBackground>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  navRow: {
    paddingTop: 10,
    paddingHorizontal: 22,
    paddingBottom: 14,
  },
  navTitle: {
    fontSize: 28,
    letterSpacing: -0.5,
    color: neutral.white,
  },
  searchBar: {
    marginHorizontal: 22,
    marginBottom: 6,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 20,
  },
  emptyPanel: {
    alignItems: 'center',
    padding: 28,
    gap: 10,
  },
  emptyIconTile: {
    width: 52,
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    color: neutral.white,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 13 * 1.5,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 160,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginLeft: 64,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  rowCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  rowTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowName: {
    flex: 1,
    fontSize: 15,
    color: neutral.white,
  },
  rowTime: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
  rowBottomLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  rowPreview: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
  },
  floatingNav: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 36,
  },
})
