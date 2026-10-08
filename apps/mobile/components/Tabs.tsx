import { fontSize, gemTones, neutral, radii, spacing, type GemTone } from '@ceylon-gems/ui-tokens'
import { LinearGradient } from 'expo-linear-gradient'
import { type ReactNode } from 'react'
import { Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { useFontFamily } from '../hooks/useFontFamily'
import { useGemTone } from '../providers/GemToneProvider'
import { GRADIENT_140 } from './primitives/gradientAngle'
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
  tone,
  style,
}: SegmentedTabsProps<T>) {
  const { gemTone } = useGemTone()
  const palette = gemTones[tone ?? gemTone]
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
  /**
   * Renders as an elevated circular CTA (gradient fill, floating above the
   * bar's top edge) instead of the flat icon-slot treatment — Home's
   * middle "Post ad" button, shape/position referenced from a competitor
   * screenshot the user supplied (ikman's bottom-nav "+"), everything else
   * (colors, glass bar, icon set) stays this app's own design language. At
   * most one item should set this.
   */
  raised?: boolean
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
  tone,
  style,
}: BottomNavBarProps<T>) {
  const { gemTone } = useGemTone()
  const palette = gemTones[tone ?? gemTone]
  const raisedItem = items.find((item) => item.raised)

  return (
    // `style` (Home/Profile's absolute floating position) moves to this
    // outer, unclipped wrapper rather than onto GlassSurface directly —
    // GlassSurface's own `overflow:hidden` (needed for its blur/border
    // radius) would otherwise cut off the raised button where it pokes
    // above the bar's top edge.
    <View style={style}>
      <GlassSurface
        radius={22}
        clarity={55}
        rim={palette.rim}
        accessibilityRole="tablist"
        style={styles.navBar}
      >
        {items.map((item) => {
          if (item.raised) {
            // Reserves this slot's width in the row so the other icons
            // keep their usual spacing — the real button renders as a
            // sibling below, unclipped.
            return <View key={item.value} style={styles.navItem} />
          }

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

      {raisedItem ? (
        <View pointerEvents="box-none" style={styles.raisedWrap}>
          <PressableScale
            onPress={() => onChange(raisedItem.value)}
            accessibilityRole="button"
            accessibilityLabel={raisedItem.label}
          >
            {/* Shadow lives on this unclipped View, not the LinearGradient
                below — same split Button.tsx's CTA pill uses, since a
                layer's own iOS shadow is clipped by the
                `overflow`/borderRadius masking its gradient fill needs. */}
            <View
              style={[
                styles.raisedShadow,
                Platform.select({
                  ios: {
                    shadowColor: `rgb(${palette.halo})`,
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.85,
                    shadowRadius: 16,
                  },
                  android: { elevation: 10 },
                }),
              ]}
            >
              <LinearGradient
                colors={[`${palette.cta[0]}1)`, `${palette.cta[1]}1)`]}
                start={GRADIENT_140.start}
                end={GRADIENT_140.end}
                style={[
                  styles.raisedCircle,
                  {
                    borderColor: `rgba(${palette.rim},0.5)`,
                    borderTopColor: 'rgba(255,255,255,0.45)',
                  },
                ]}
              >
                {raisedItem.icon(neutral.white)}
              </LinearGradient>
            </View>
          </PressableScale>
        </View>
      ) : null}
    </View>
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
  // Thinned down from the Home mockup's navStyle/nav literal values
  // (radius 26, padding 7, item height 46/radius 16, pip 14x3/radius 2) per
  // explicit request — not pixel-matched to the mockup anymore.
  navBar: {
    flexDirection: 'row',
    gap: 4,
    padding: 5,
  },
  navItem: {
    position: 'relative',
    flex: 1,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  navPip: {
    position: 'absolute',
    bottom: 4,
    width: 14,
    height: 3,
    borderRadius: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  // Centers the raised button over its reserved slot and pulls it up so it
  // floats above the bar's top edge, matching the referenced screenshot's
  // shape — nudged down/up several times (20, -5, +2, -1) per explicit
  // request to land here.
  raisedWrap: {
    position: 'absolute',
    top: -4,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  raisedShadow: {
    borderRadius: radii.full,
  },
  raisedCircle: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
})
