import { gemTones, neutral, type GemTone } from '@ceylon-gems/ui-tokens'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useRef, type ReactNode } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { useGemTone } from '../../providers/GemToneProvider'
import { useLiveGradient } from '../../providers/LiveGradientProvider'

// This file's tsconfig include (**/*.tsx) means it's typechecked in the
// same program as every native file, and this project deliberately keeps
// the DOM lib out of that program (mixing it with React Native's own
// globals is a known source of type collisions — see lib/storage.ts).
// These declarations are module-local (this file has imports/exports), so
// they don't leak into that shared global scope the way a real `dom` lib
// addition would.
declare const window: { devicePixelRatio: number }
declare class ResizeObserver {
  constructor(callback: () => void)
  observe(target: unknown): void
  disconnect(): void
}
declare function requestAnimationFrame(callback: (time: number) => void): number
declare function cancelAnimationFrame(handle: number): void

const vertexShaderGLSL = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`

// Ported verbatim from the Claude Design mockups' own WebGL background
// (the "velaris-bg" import) — a real browser has a real <canvas> and
// WebGL, so unlike the native path (which needs react-native-skia and a
// custom dev client to run real shaders, a trade-off explicitly declined),
// there's no reason to approximate this on web.
const fragmentShaderGLSL = `
precision highp float;
varying vec2 vUv;

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_grain;
uniform vec3  u_colors[4];
uniform vec3  u_bg;

vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
    dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  vec2 uv = vUv;
  float ratio = u_resolution.x / u_resolution.y;
  vec2 p = uv - 0.5;
  p.x *= ratio;

  float t = u_time * 0.1;

  float n1 = snoise(p * 0.4 + vec2(t * 0.2, -t * 0.3));
  float n2 = snoise(p * 0.55 + vec2(-t * 0.15, t * 0.25) + n1 * 0.25);
  float n3 = snoise(p * 0.75 + vec2(t * 0.1, -t * 0.2) + n2 * 0.2);

  vec3 col = u_bg;

  float dist = length(p) * 1.5;
  float vignette = 1.0 - smoothstep(0.3, 1.2, dist);

  col = mix(col, u_colors[0], smoothstep(-0.2, 0.5, n1) * 0.85);
  col = mix(col, u_colors[1], smoothstep(-0.1, 0.6, n2) * 0.7);
  col = mix(col, u_colors[2], smoothstep(-0.3, 0.4, n3) * 0.6);
  col = mix(col, u_colors[3], smoothstep(0.0, 0.7, n1 * n2) * 0.5);

  float glow = smoothstep(0.8, 0.0, dist) * 0.3;
  col += u_colors[1] * glow;

  col = mix(col * 0.2, col, vignette);

  float grain = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453 + u_time);
  col += (grain - 0.5) * u_grain * 0.1;

  gl_FragColor = vec4(col, 1.0);
}
`

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ]
}

function rgbToHex([r, g, b]: readonly [number, number, number]): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

interface LiveGradientBackgroundProps {
  tone?: GemTone
  children?: ReactNode
  style?: StyleProp<ViewStyle>
}

// Speed/grain match the mockups' own "velaris-bg" import attributes
// (speed="1.5" grain="0.22") exactly — not exposed as props since the
// native variant doesn't expose them either.
const SPEED = 1.5
const GRAIN = 0.22

export function LiveGradientBackground({ tone, children, style }: LiveGradientBackgroundProps) {
  const { gemTone } = useGemTone()
  const palette = gemTones[tone ?? gemTone]
  const { liveGradientEnabled } = useLiveGradient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- react-native-web's View forwards refs to the real DOM node, but its typed ref shape isn't HTMLCanvasElement
  const canvasRef = useRef<any>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl')
    if (!gl) return

    const createShader = (type: number, src: string) => {
      const shader = gl.createShader(type)
      gl.shaderSource(shader, src)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('LiveGradientBackground shader compile error:', gl.getShaderInfoLog(shader))
      }
      return shader
    }

    const program = gl.createProgram()
    gl.attachShader(program, createShader(gl.VERTEX_SHADER, vertexShaderGLSL))
    gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, fragmentShaderGLSL))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('LiveGradientBackground program link error:', gl.getProgramInfoLog(program))
    }
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)

    const positionLoc = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(positionLoc)
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0)

    const locs = {
      res: gl.getUniformLocation(program, 'u_resolution'),
      time: gl.getUniformLocation(program, 'u_time'),
      grain: gl.getUniformLocation(program, 'u_grain'),
      colors: gl.getUniformLocation(program, 'u_colors'),
      bg: gl.getUniformLocation(program, 'u_bg'),
    }

    // Matches the mockups' own velBg/velColors mapping exactly: the
    // background is the darkest screen stop, and the four shader colors
    // are the three glow colors plus that same darkest stop as the fourth.
    const bg = palette.screen[2]
    const shaderColors = [...palette.glow.map(rgbToHex), palette.screen[2]]

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2)
      canvas.width = canvas.clientWidth * dpr
      canvas.height = canvas.clientHeight * dpr
      gl.viewport(0, 0, canvas.width, canvas.height)
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    let raf: number
    const render = (t: number) => {
      gl.uniform2f(locs.res, canvas.width, canvas.height)
      gl.uniform1f(locs.time, liveGradientEnabled ? t * 0.001 * SPEED : 0)
      gl.uniform1f(locs.grain, GRAIN)
      gl.uniform3f(locs.bg, ...hexToRgb(bg))

      const flat = new Float32Array(shaderColors.flatMap(hexToRgb))
      gl.uniform3fv(locs.colors, flat)

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      raf = requestAnimationFrame(render)
    }

    raf = requestAnimationFrame(render)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [palette, liveGradientEnabled])

  return (
    <View style={[styles.fill, style]}>
      {/*
        @ts-expect-error -- web-only file: `canvas` isn't a View. A plain
        inline object, not StyleSheet.create's output, since a raw DOM
        element expects React's standard camelCase style object, not
        react-native-web's compiled style representation.
      */}
      <canvas ref={canvasRef} style={canvasStyle} />
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

const canvasStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: '100%',
  height: '100%',
} as const

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    overflow: 'hidden',
  },
})
