import {
  defaultGemTone,
  fontSize,
  gemTones,
  neutral,
  spacing,
  type GemTone,
} from '@ceylon-gems/ui-tokens'
import { type ReactNode } from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { useFontFamily } from '../hooks/useFontFamily'
import { GlassSurface } from './primitives/GlassSurface'
import { PressableScale } from './primitives/PressableScale'

interface TabItem<T extends string> {
  label: string
  value: T
}

interface SegmentedTabsProps<T extends string> {
  tabs: TabItem<T>[]
  value: T
  onChange: (value: T) => void
  tone?: GemTone
  style?: StyleProp<ViewStyle>
}

// Page-level section tabs (Listing Detail's Details/Seller/Reviews,
// Profile's Ads/Reviews) — an underline indicator under plain text, not a
// filled pill like Button.tsx's SegmentedControl (that one is for choosing
// a value like a filter; this one is for switching page sections).
export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  tone = defaultGemTone,
  style,
}: SegmentedTabsProps<T>) {
  const palette = gemTones[tone]
  const fonts = useFontFamily()

  return (
    <View style={[styles.tabsRow, style]} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const isActive = tab.value === value
        return (
          <PressableScale
            key={tab.value}
            onPress={() => onChange(tab.value)}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: isActive }}
            style={styles.tabItem}
            scaleTo={0.98}
          >
            <Text
              style={[
                styles.tabLabel,
                {
                  fontFamily: isActive ? fonts.semibold : fonts.medium,
                  color: isActive ? neutral.white : 'rgba(255,255,255,0.5)',
                },
              ]}
            >
              {tab.label}
            </Text>
            <View style={[styles.tabIndicator, isActive && { backgroundColor: palette.accent }]} />
          </PressableScale>
        )
      })}
    </View>
  )
}

interface NavItem<T extends string> {
  value: T
  label: string
  icon: (color: string) => ReactNode
}

interface BottomNavBarProps<T extends string> {
  items: NavItem<T>[]
  value: T
  onChange: (value: T) => void
  tone?: GemTone
  style?: StyleProp<ViewStyle>
}

// Floating icon-only pill nav (Home's `navStyle`/`nav`) — a rim-tinted glass
// bar the screen positions absolutely over its scroll content. The active
// item gets a rim-tinted pill background (not just a color shift — an
// earlier, unverified pass at this component assumed no per-item fill,
// which the real Home mockup contradicts) plus a small glowing accent "pip"
// beneath the icon. `label` is spoken to screen readers via
// `accessibilityLabel` only — the mockup renders icons with no visible
// text.
export function BottomNavBar<T extends string>({
  items,
  value,
  onChange,
  tone = defaultGemTone,
  style,
}: BottomNavBarProps<T>) {
  const palette = gemTones[tone]

  return (
    <GlassSurface
      radius={26}
      clarity={55}
      rim={palette.rim}
      accessibilityRole="tablist"
      style={[styles.navBar, style]}
    >
      {items.map((item) => {
        const isActive = item.value === value
        const color = isActive ? palette.accent : 'rgba(255,255,255,0.5)'
        return (
          <PressableScale
            key={item.value}
            onPress={() => onChange(item.value)}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: isActive }}
            style={[
              styles.navItem,
              isActive && {
                backgroundColor: `rgba(${palette.rim},0.14)`,
                borderColor: `rgba(${palette.rim},0.26)`,
              },
            ]}
          >
            {item.icon(color)}
            {isActive ? (
              <View
                style={[
                  styles.navPip,
                  {
                    backgroundColor: palette.accent,
                    shadowColor: palette.accent,
                  },
                ]}
              />
            ) : null}
          </PressableScale>
        )
      })}
    </GlassSurface>
  )
}

const styles = StyleSheet.create({
  tabsRow: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  tabItem: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  tabLabel: {
    fontSize: fontSize.sm,
  },
  tabIndicator: {
    height: 2,
    width: '100%',
    borderRadius: 1,
    backgroundColor: 'transparent',
  },
  // Exact values from the Home mockup's navStyle/nav — radius 26, padding
  // 7, item height 46/radius 16, pip 14x3/radius 2 — not the general
  // radii/spacing scales.
  navBar: {
    flexDirection: 'row',
    gap: 4,
    padding: 7,
  },
  navItem: {
    position: 'relative',
    flex: 1,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  navPip: {
    position: 'absolute',
    bottom: 5,
    width: 14,
    height: 3,
    borderRadius: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
})
