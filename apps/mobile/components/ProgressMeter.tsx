import { gemTones, type GemTone } from '@ceylon-gems/ui-tokens'
import { LinearGradient } from 'expo-linear-gradient'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { useGemTone } from '../providers/GemToneProvider'

interface ProgressBarProps {
  /** 0 to 1. */
  progress: number
  tone?: GemTone
  style?: StyleProp<ViewStyle>
}

// Linear fill bar (profile-completion meter, upload progress on Post Ad).
export function ProgressBar({ progress, tone, style }: ProgressBarProps) {
  const { gemTone } = useGemTone()
  const palette = gemTones[tone ?? gemTone]
  const clamped = Math.max(0, Math.min(1, progress))

  return (
    <View
      style={[styles.track, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <LinearGradient
        colors={[`${palette.cta[0]}1)`, `${palette.cta[1]}1)`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.fill, { width: `${clamped * 100}%` }]}
      />
    </View>
  )
}

interface StepMeterProps {
  totalSteps: number
  /** 0-indexed — the currently active step is highlighted, earlier ones are marked complete. */
  currentStep: number
  tone?: GemTone
  style?: StyleProp<ViewStyle>
}

// Discrete step dots (Signup's multi-step flow, Post Ad's wizard). Completed
// and current steps get the tone accent; future steps stay dim.
export function StepMeter({ totalSteps, currentStep, tone, style }: StepMeterProps) {
  const { gemTone } = useGemTone()
  const palette = gemTones[tone ?? gemTone]

  return (
    <View
      style={[styles.stepRow, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${currentStep + 1} of ${totalSteps}`}
      accessibilityValue={{ min: 1, max: totalSteps, now: currentStep + 1 }}
    >
      {Array.from({ length: totalSteps }, (_, index) => {
        const isDone = index <= currentStep
        return (
          <View
            key={index}
            style={[
              styles.stepSegment,
              { backgroundColor: isDone ? palette.accent : 'rgba(255,255,255,0.16)' },
            ]}
          />
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 6,
  },
  stepSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
})
