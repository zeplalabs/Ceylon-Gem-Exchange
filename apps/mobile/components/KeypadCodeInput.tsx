import { gemTones, neutral } from '@ceylon-gems/ui-tokens'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useState } from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'
import { useFontFamily } from '../hooks/useFontFamily'
import { useGemTone } from '../providers/GemToneProvider'
import { BackspaceIcon } from './icons'
import { GlassSurface } from './primitives/GlassSurface'
import { GRADIENT_140 } from './primitives/gradientAngle'
import { PressableScale } from './primitives/PressableScale'

// Shared between /verify-phone and /verify-email so the two code-entry
// screens stay visually and behaviorally identical, per the app's design —
// its own on-screen numeric keypad (ported from the "Ceylon Gem Exchange
// Verification.dc.html" mockup), not the OS keyboard, so entry is fully
// tap-driven (no TextInput/focus involved). Split into a hook
// (useKeypadCode) plus two independent pieces (CodeCellRow, Keypad) rather
// than one bundled component, because both screens place the cell row near
// the top (under the destination text) and the keypad pinned to the
// bottom via a flex spacer, with status text/CTA/resend row in between —
// they're not adjacent in the layout, so they can't be one fragment.
export type KeypadKey = { kind: 'digit'; value: string } | { kind: 'clear' } | { kind: 'back' }

const KEYPAD_KEYS: KeypadKey[] = [
  { kind: 'digit', value: '1' },
  { kind: 'digit', value: '2' },
  { kind: 'digit', value: '3' },
  { kind: 'digit', value: '4' },
  { kind: 'digit', value: '5' },
  { kind: 'digit', value: '6' },
  { kind: 'digit', value: '7' },
  { kind: 'digit', value: '8' },
  { kind: 'digit', value: '9' },
  { kind: 'clear' },
  { kind: 'digit', value: '0' },
  { kind: 'back' },
]
const KEYPAD_ROWS = [
  KEYPAD_KEYS.slice(0, 3),
  KEYPAD_KEYS.slice(3, 6),
  KEYPAD_KEYS.slice(6, 9),
  KEYPAD_KEYS.slice(9, 12),
]

interface UseKeypadCodeParams {
  length: number
  value: string[]
  onChangeText: (value: string[]) => void
}

// All the press logic + the "which cell is active" cursor, decoupled from
// where CodeCellRow/Keypad actually render in a given screen's layout.
export function useKeypadCode({ length, value, onChangeText }: UseKeypadCodeParams) {
  const [active, setActive] = useState(0)

  // Re-syncs the active cell when the parent resets `value` externally
  // (e.g. a resend) — user-driven edits already keep `active` in step via
  // press() below.
  useEffect(() => {
    if (value.every((digit) => digit === '')) setActive(0)
  }, [value])

  function press(key: KeypadKey) {
    if (key.kind === 'clear') {
      onChangeText(Array(length).fill(''))
      setActive(0)
      return
    }
    if (key.kind === 'back') {
      const next = [...value]
      const i = next[active] ? active : Math.max(0, active - 1)
      next[i] = ''
      onChangeText(next)
      setActive(i)
      return
    }
    const next = [...value]
    const empty = next.findIndex((digit) => digit === '')
    const at = empty === -1 ? length - 1 : empty
    next[at] = key.value
    onChangeText(next)
    setActive(Math.min(length - 1, at + 1))
  }

  const filled = value.every((digit) => digit !== '')

  return { active, setActive, press, filled }
}

interface CodeCellRowProps {
  length: number
  value: string[]
  active: number
  filled: boolean
  onPressCell: (index: number) => void
}

export function CodeCellRow({ length, value, active, filled, onPressCell }: CodeCellRowProps) {
  const fonts = useFontFamily()
  return (
    <View style={styles.codeRow}>
      {value.map((digit, index) => (
        <CodeCell
          key={index}
          digit={digit}
          index={index}
          length={length}
          active={index === active && !filled}
          onPress={() => onPressCell(index)}
          fonts={fonts}
        />
      ))}
    </View>
  )
}

interface KeypadProps {
  onPressKey: (key: KeypadKey) => void
  clearAccessibilityLabel?: string
  backAccessibilityLabel?: string
}

export function Keypad({
  onPressKey,
  clearAccessibilityLabel = 'Clear code',
  backAccessibilityLabel = 'Delete',
}: KeypadProps) {
  return (
    <View style={styles.keypad}>
      {KEYPAD_ROWS.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.keypadRow}>
          {row.map((key, keyIndex) => (
            <KeypadKeyButton
              key={keyIndex}
              keyDef={key}
              onPress={() => onPressKey(key)}
              clearLabel={clearAccessibilityLabel}
              backLabel={backAccessibilityLabel}
            />
          ))}
        </View>
      ))}
    </View>
  )
}

interface CodeCellProps {
  digit: string
  index: number
  length: number
  active: boolean
  onPress: () => void
  fonts: ReturnType<typeof useFontFamily>
}

// One cell of the code row — plain glass when empty, a stronger tone-tinted
// ring + caret when it's the active (next-to-fill) cell, and a gradient
// fill once a digit lands. `filled`/`active` styling matches the mockup's
// cells() computation exactly (see Ceylon Gem Exchange Verification.dc.html).
function CodeCell({ digit, index, length, active, onPress, fonts }: CodeCellProps) {
  const { gemTone } = useGemTone()
  const tone = gemTones[gemTone]
  const label = `Digit ${index + 1} of ${length}${digit ? `: ${digit}` : ', empty'}`

  if (digit) {
    return (
      <PressableScale onPress={onPress} accessibilityLabel={label} hitSlop={4}>
        <View
          style={[
            styles.cellShadowWrap,
            Platform.select({
              ios: {
                shadowColor: `rgb(${tone.halo})`,
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.9,
                shadowRadius: 18,
              },
              android: { elevation: 8 },
            }),
          ]}
        >
          <LinearGradient
            colors={[`${tone.cta[0]}0.5)`, `${tone.cta[1]}0.34)`]}
            start={GRADIENT_140.start}
            end={GRADIENT_140.end}
            style={[styles.cell, { borderWidth: 1, borderColor: `rgba(${tone.rim},0.45)` }]}
          >
            <Text style={[styles.cellDigit, { fontFamily: fonts.extrabold }]}>{digit}</Text>
          </LinearGradient>
        </View>
      </PressableScale>
    )
  }

  if (active) {
    return (
      <PressableScale onPress={onPress} accessibilityLabel={label} hitSlop={4}>
        <View style={[styles.cellActiveRing, { backgroundColor: `rgba(${tone.halo},0.14)` }]}>
          <GlassSurface clarity={55} rim={tone.rim} radius={22} style={styles.cell}>
            <View style={[styles.caret, { backgroundColor: tone.accent }]} />
          </GlassSurface>
        </View>
      </PressableScale>
    )
  }

  return (
    <PressableScale onPress={onPress} accessibilityLabel={label} hitSlop={4}>
      <GlassSurface clarity={55} radius={22} style={styles.cell} />
    </PressableScale>
  )
}

function KeypadKeyButton({
  keyDef,
  onPress,
  clearLabel,
  backLabel,
}: {
  keyDef: KeypadKey
  onPress: () => void
  clearLabel: string
  backLabel: string
}) {
  const fonts = useFontFamily()
  const label =
    keyDef.kind === 'digit' ? keyDef.value : keyDef.kind === 'clear' ? clearLabel : backLabel

  if (keyDef.kind === 'digit') {
    return (
      <PressableScale onPress={onPress} accessibilityLabel={label} style={styles.keyWrapper}>
        <GlassSurface clarity={55} radius={16} style={styles.key}>
          <Text style={[styles.keyLabel, { fontFamily: fonts.semibold }]}>{keyDef.value}</Text>
        </GlassSurface>
      </PressableScale>
    )
  }

  return (
    <PressableScale onPress={onPress} accessibilityLabel={label} style={styles.keyWrapper}>
      <View style={[styles.key, styles.keyGhost]}>
        {keyDef.kind === 'back' ? (
          <BackspaceIcon />
        ) : (
          <Text style={[styles.keyLabelGhost, { fontFamily: fonts.semibold }]}>C</Text>
        )}
      </View>
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  // No borderWidth here — GlassSurface draws its own border internally
  // (empty/active cells); the filled gradient cell adds borderWidth inline
  // since LinearGradient isn't glass and needs an explicit one.
  cell: {
    width: 46,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  cellShadowWrap: {
    borderRadius: 16,
  },
  // Approximates the mockup's `0 0 0 4px rgba(halo,0.14)` focus ring — a
  // zero-blur spread shadow is just a solid ring, reproduced here as a
  // padded background rather than a shadow RN can't express directly.
  cellActiveRing: {
    padding: 4,
    borderRadius: 20,
  },
  cellDigit: {
    fontSize: 20,
    color: neutral.white,
  },
  caret: {
    width: 2,
    height: 24,
    borderRadius: 1,
    opacity: 0.85,
  },
  keypad: {
    gap: 10,
    paddingTop: 6,
    paddingBottom: 16,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 10,
  },
  keyWrapper: {
    flex: 1,
  },
  key: {
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyGhost: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  keyLabel: {
    fontSize: 19,
    color: neutral.white,
  },
  keyLabelGhost: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
})
