import { fontSize, neutral, radii, spacing, type GemTone } from '@ceylon-gems/ui-tokens'
import { type ReactNode } from 'react'
import {
  Modal as RNModal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { useFontFamily } from '../hooks/useFontFamily'
import { Button, GhostButton } from './Button'
import { GlassSurface } from './primitives/GlassSurface'

interface BottomSheetProps {
  visible: boolean
  onClose: () => void
  /** Screen-reader label for the dimmed backdrop's close tap target — pass a translated string; defaults to English. */
  closeAccessibilityLabel?: string
  /** Top corner radius — the mockups' sheetStyle uses a bigger radius (30) than the general radii.lg default. */
  radius?: number
  /**
   * Overrides the sheet's default padding/height — e.g. a filter sheet
   * needs a fixed height (`76%`) and zero outer padding so its own
   * sections (header/scrollable body/footer) can each carry their own
   * mockup-exact padding instead of one uniform wrapper value.
   */
  style?: StyleProp<ViewStyle>
  children: ReactNode
}

// The native Modal + slide animation drives the sheet motion (no custom
// gesture-driven JS bottom sheet) — used for filter panels, share sheets,
// location/language/currency pickers. Tapping the dimmed backdrop closes it.
// `accessibilityViewIsModal` keeps VoiceOver from navigating into whatever
// is behind the sheet while it's open (Android has no exact equivalent —
// RN just ignores the prop there, which is a safe no-op).
export function BottomSheet({
  visible,
  onClose,
  closeAccessibilityLabel = 'Close',
  radius = radii.lg,
  style,
  children,
}: BottomSheetProps) {
  return (
    <RNModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityLabel={closeAccessibilityLabel}
        accessibilityRole="button"
      />
      <View style={styles.sheetWrap} accessibilityViewIsModal>
        <GlassSurface clarity={55} radius={radius} style={[styles.sheet, style]}>
          <View style={styles.grabber} />
          {children}
        </GlassSurface>
      </View>
    </RNModal>
  )
}

interface ConfirmDialogProps {
  visible: boolean
  title: string
  message?: string
  confirmLabel: string
  cancelLabel: string
  destructive?: boolean
  tone?: GemTone
  onConfirm: () => void
  onCancel: () => void
}

// Centered confirmation dialog (delete account, discard changes, log out).
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive,
  tone,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const fonts = useFontFamily()

  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.dialogBackdrop} accessibilityViewIsModal>
        <GlassSurface clarity={30} radius={radii.lg} style={styles.dialog}>
          <Text style={[styles.dialogTitle, { fontFamily: fonts.semibold }]}>{title}</Text>
          {message ? (
            <Text style={[styles.dialogMessage, { fontFamily: fonts.regular }]}>{message}</Text>
          ) : null}
          <View style={styles.dialogActions}>
            <GhostButton label={cancelLabel} onPress={onCancel} style={styles.dialogButton} />
            <Button
              label={confirmLabel}
              onPress={onConfirm}
              tone={tone}
              danger={destructive}
              style={styles.dialogButton}
            />
          </View>
        </GlassSurface>
      </View>
    </RNModal>
  )
}

const styles = StyleSheet.create({
  // Exact value from the mockups' scrimStyle — a distinct color/alpha from
  // the general screen overlay (neutral.overlay), not the same token. Its
  // 3px backdrop blur isn't reproduced (same no-blur-on-plain-overlays gap
  // as everywhere else outside GlassSurface).
  backdrop: {
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
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginBottom: spacing.lg,
  },
  dialogBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: neutral.overlay[2],
  },
  dialog: {
    width: '100%',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  dialogTitle: {
    fontSize: fontSize.lg,
    color: neutral.white,
  },
  dialogMessage: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.7)',
  },
  dialogActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  dialogButton: {
    flex: 1,
  },
})
