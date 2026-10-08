import { gemTones, neutral, type GemTone } from '@ceylon-gems/ui-tokens'
import {
  Canvas,
  Fill,
  Shader,
  Skia,
  useCanvasSize,
  useClock,
  type SkRuntimeEffect,
} from '@shopify/react-native-skia'
import { LinearGradient } from 'expo-linear-gradient'
import { useMemo, type ReactNode } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { useDerivedValue, useReducedMotion } from 'react-native-reanimated'
import { useGemTone } from '../../providers/GemToneProvider'
import { useLiveGradient } from '../../providers/LiveGradientProvider'

// Ported near-verbatim from the mockups' own WebGL background
// (native/velaris.js in the Claude Design project) — the fragment-shader
// logic only, since Skia's RuntimeEffect has no vertex stage: `varying vUv`
// becomes a direct fragCoord/u_resolution computation in main() instead.
// This is the real per-pixel simplex-noise shader running on native now,
// not an SVG-blob approximation of it — see CLAUDE.md's "Implementing a
// screen from a Claude Design .dc.html file" for why the earlier
// SVG-blob version could never read as "covers the whole screen, moves
// fast" no matter how it was tuned (a handful of discrete soft circles vs.
// a continuous per-pixel field are different in kind, not magnitude).
// Requires `react-native-skia`, a real native module — the app now needs a
// custom dev client (`expo prebuild` + `expo run:ios`/`expo run:android` or
// an EAS dev build) instead of Expo Go for this to render.
const SHADER_SOURCE = `
uniform float2 u_resolution;
uniform float u_time;
uniform float u_grain;
uniform float3 u_colors[4];
uniform float3 u_bg;

float3 permute(float3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(float2 v){
  const float4 C = float4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  float2 i  = floor(v + dot(v, C.yy));
  float2 x0 = v - i + dot(i, C.xx);
  float2 i1 = (x0.x > x0.y) ? float2(1.0, 0.0) : float2(0.0, 1.0);
  float4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  float3 p = permute(permute(i.y + float3(0.0, i1.y, 1.0)) + i.x + float3(0.0, i1.x, 1.0));
  float3 m = max(0.5 - float3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m;
  m = m*m;
  float3 x = 2.0 * fract(p * C.www) - 1.0;
  float3 h = abs(x) - 0.5;
  float3 ox = floor(x + 0.5);
  float3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  float3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

half4 main(float2 fragCoord) {
  float2 uv = fragCoord / u_resolution;
  float ratio = u_resolution.x / u_resolution.y;
  float2 p = uv - 0.5;
  p.x *= ratio;

  float t = u_time * 0.1;

  float n1 = snoise(p * 0.4 + float2(t * 0.2, -t * 0.3));
  float n2 = snoise(p * 0.55 + float2(-t * 0.15, t * 0.25) + n1 * 0.25);
  float n3 = snoise(p * 0.75 + float2(t * 0.1, -t * 0.2) + n2 * 0.2);

  float3 col = u_bg;

  float dist = length(p) * 1.5;
  float vignette = 1.0 - smoothstep(0.3, 1.2, dist);

  col = mix(col, u_colors[0], smoothstep(-0.2, 0.5, n1) * 0.85);
  col = mix(col, u_colors[1], smoothstep(-0.1, 0.6, n2) * 0.7);
  col = mix(col, u_colors[2], smoothstep(-0.3, 0.4, n3) * 0.6);
  col = mix(col, u_colors[3], smoothstep(0.0, 0.7, n1 * n2) * 0.5);

  float glow = smoothstep(0.8, 0.0, dist) * 0.3;
  col += u_colors[1] * glow;

  col = mix(col * 0.2, col, vignette);

  float grain = fract(sin(dot(uv, float2(12.9898, 78.233))) * 43758.5453 + u_time);
  col += (grain - 0.5) * u_grain * 0.1;

  return half4(col, 1.0);
}
`

interface LiveGradientBackgroundProps {
  tone?: GemTone
  children?: ReactNode
  style?: StyleProp<ViewStyle>
}

// Matches the mockups' exact <x-import component-from-global-scope=
// "velaris-bg" ... speed="1.5" grain="0.22" ...> invocation values.
const SPEED = 1.5
const GRAIN = 0.22

function hexToRgb01(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ]
}

// Compiled once at module load, not per-mount — every screen wraps itself
// in its own LiveGradientBackground, so a navigation push/pop mounts a
// fresh instance of this component on every single transition. SHADER_SOURCE
// never changes, so a per-instance `useMemo(() => Skia.RuntimeEffect.Make(...), [])`
// doesn't help: useMemo only caches for that instance's lifetime, not across
// unmount/remount, meaning every navigation was recompiling the identical
// shader from scratch right as the transition animation needed to be
// smooth. Module scope compiles it exactly once for the app's lifetime.
const compiledShader = Skia.RuntimeEffect.Make(SHADER_SOURCE)
if (!compiledShader) {
  throw new Error('LiveGradientBackground: failed to compile the aurora shader')
}
// Explicitly typed non-null — TS's control-flow narrowing from the check
// above doesn't carry through to the component function below, since it's
// a closure over this module-scope binding rather than the same scope.
const SHADER_EFFECT: SkRuntimeEffect = compiledShader

// The screen-level animated background every real screen sits on — the
// mockups' own WebGL simplex-noise shader (see SHADER_SOURCE above),
// running via react-native-skia instead of an approximation of it. `u_time`
// freezes at 0 — a static but still colorful frame, not a blank one — under
// either the OS's reduced-motion setting or Appearance's own explicit
// "Live gradient" toggle (LiveGradientProvider); either one is enough.
export function LiveGradientBackground({ tone, children, style }: LiveGradientBackgroundProps) {
  const { gemTone } = useGemTone()
  const palette = gemTones[tone ?? gemTone]
  const clock = useClock()
  const reduceMotion = useReducedMotion()
  const { liveGradientEnabled } = useLiveGradient()
  const frozen = reduceMotion || !liveGradientEnabled
  const { ref, size } = useCanvasSize()
  const source = SHADER_EFFECT

  // Matches the mockups' own velBg/velColors mapping exactly: the
  // background is the darkest screen stop, and the four shader colors are
  // the three glow colors plus that same darkest stop as the fourth.
  const bg = useMemo(() => hexToRgb01(palette.screen[2]), [palette])
  const colors = useMemo(
    () =>
      [
        ...palette.glow.map(([r, g, b]) => [r / 255, g / 255, b / 255] as [number, number, number]),
        bg,
      ] as [number, number, number][],
    [palette, bg],
  )

  const uniforms = useDerivedValue(() => {
    return {
      u_resolution: [size.width, size.height],
      u_time: frozen ? 0 : clock.value * 0.001 * SPEED,
      u_grain: GRAIN,
      u_colors: colors,
      u_bg: bg,
    }
  }, [clock, size, frozen, colors, bg])

  return (
    <View style={[styles.fill, style]}>
      <Canvas ref={ref} style={StyleSheet.absoluteFill}>
        <Fill>
          <Shader source={source} uniforms={uniforms} />
        </Fill>
      </Canvas>
      <LinearGradient
        colors={neutral.overlay}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    overflow: 'hidden',
  },
})
