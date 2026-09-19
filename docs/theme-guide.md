# Theme guide: implementing a screen pixel-perfectly

This is the practical, step-by-step reference for turning a Claude Design
`.dc.html` mockup into a real `apps/mobile` screen that matches it exactly —
not "close enough to compile." Read [`design-tokens.md`](./design-tokens.md)
first for what the token values themselves _are_ (gem tones, type scale,
spacing, radii); this doc is about which number to reach for when, and the
handful of native-rendering gotchas that don't show up until you run the app
on a device.

## Source-of-truth hierarchy

A mockup screen mixes three different kinds of numbers. Getting pixel
fidelity means routing each to the right source — not defaulting everything
to `packages/ui-tokens`' general scale.

1. **Generic values a mockup doesn't pin down itself** (e.g. a card radius
   that isn't computed by the script) → `packages/ui-tokens` (`spacing`,
   `radii`, `fontSize`). This is the only case where the shared scale is
   authoritative.
2. **Values the mockup's own script computes exactly** — its `d()`
   density function (field height/radius, button height, heading size,
   margins) or a fixed literal inside a `*Style` template string (label
   font-size/letter-spacing/color, checkbox gap/radius, border widths) →
   read the literal number out of the script and hardcode it, with a comment
   citing the source (e.g. `// D.field/fieldStyle`). Do **not** round
   this to the nearest token — a field mockup-computed as
   `border-radius:18; padding:14` is wrong at `radii.md`/`spacing.lg` (10/16)
   even though those look plausible. This was the exact mistake on the first
   Sign Up pass and the user correctly rejected it as not pixel-accurate.
3. **Blur/glow magnitude** (intensity, opacity, size — anything going
   through `BlurView`, a shadow, or an SVG/Skia glow) → **never** the
   `.dc.html`'s literal CSS number. See the next section.

Two mockup details that are easy to miss entirely rather than just
approximate:

- Label text in the JSX is often already authored in caps (`"FULL NAME"`) —
  reproduce that with `textTransform: 'uppercase'` on the lowercase
  translated string, never by uppercasing the translation itself (breaks
  Sinhala casing rules and any future locale that doesn't cap the same way).
- An icon the mockup defines inline (e.g. a dial-code chevron) needs the
  actual ported icon component from `components/icons.tsx`, not a
  placeholder Unicode glyph standing in for it.

## Blur/glow: use the `native/` reference port, not the CSS

A literal transcription of `backdrop-filter: blur(px)` or a small-radius,
low-alpha `radial-gradient`/`box-shadow` reads as barely-there — or
completely invisible — once composited through `BlurView`, `react-native-svg`,
or a `LinearGradient` on a real device or simulator. This has bitten the
project twice: "I still don't see glass effect" (blur magnitude was
CSS-literal), and "still don't see the glow" on the primary CTA button (the
shadow was structurally clipped — see below). Every Claude Design project
ships a `native/` folder alongside the `.dc.html` files — a real RN/TypeScript
reference port (`native/theme.ts`, `native/components/*.tsx`) with values
already recalibrated for native rendering. Fetch it via the design MCP's
`get_file`, same as any other project file, and use **its** numbers.

Locked-in, native-calibrated values already applied throughout the kit:

- **`GlassSurface`** (`components/primitives/GlassSurface.tsx`) clarity→blur:
  `intensity = Math.round(28 + c * 42)` — _rises_ with clarity (28–70), the
  opposite direction from the `.dc.html`'s own `blur(px)` formula, because
  `expo-blur`'s `intensity` (0–100) isn't the same unit as a CSS blur radius.
  `fillAlpha = 0.14 - c * 0.09` (coefficient `0.09`, not the CSS mockup's
  `0.11`). `rimAlpha`/`sheenAlpha` (`0.1 + c*0.22` / `0.16 + c*0.3`) are
  unaffected — those two already matched exactly between the `.dc.html` and
  the native reference, so they're the one part of `glass()` that _is_ a
  literal transcription.
- **`Button`'s primary CTA glow** (`components/Button.tsx`): shadow values
  come from `native/components/PrimaryButton.tsx`, not the `.dc.html`'s
  `box-shadow: 0 18px 36px -12px rgba(halo,0.9)` — `shadowOpacity: 0.9`,
  `shadowRadius: 18`, `shadowOffset: {0, 12}`, Android `elevation: 8`.
- **CTA-style gradients** (`Button`'s primary pill, `Checkbox`'s checked
  fill) need a 140° diagonal, not RN's default top-to-bottom —
  `components/primitives/gradientAngle.ts`'s `GRADIENT_140` is the
  deg→point conversion; reuse it wherever a mockup or its `native/theme.ts`
  counterpart specifies `linear-gradient(140deg,...)`.
- **`LiveGradientBackground`** glow: the mockups' actual WebGL simplex-noise
  shader, ported near-verbatim to SkSL and run via `react-native-skia` — not
  an approximation. See [`component-kit.md`](./component-kit.md) for the
  full story of why an earlier SVG-blob approximation was abandoned.

## Native rendering gotchas that only show up on a real run

**A shadow set on the same node as a clipped `borderRadius` never renders on
iOS.** `expo-linear-gradient` clips its own layer to `borderRadius` so the
gradient fill respects the pill/rounded shape — and on iOS, a layer's own
drop shadow is clipped by that same `masksToBounds`/`clipsToBounds`. So a
`shadowColor`/`shadowRadius`/etc. set directly on a `LinearGradient` (or any
view) that also has `borderRadius` + implicit corner-clipping is invisible,
no matter how the opacity/radius numbers are tuned — this isn't a magnitude
problem like the blur ones above, it's structural. Fix: put the shadow on an
**unclipped wrapping `View`** (no `overflow`/`backgroundColor`, but _do_ give
it the same `borderRadius` so iOS derives a rounded shadow path instead of a
plain rectangle), and keep the `borderRadius`/border/gradient fill on the
inner clipped node. `Button`'s primary CTA (`components/Button.tsx`) is the
reference implementation of this pattern — copy its structure for any other
gradient-filled shape that needs a glow (e.g. a future `Checkbox` glow).

**`BlurView` strength cannot be verified from an iOS Simulator screenshot.**
The Simulator does not reliably render `UIVisualEffectView` blur at all,
regardless of the `intensity` value passed — confirmed by forcing `intensity`
to 26, then 51, then 100 and diffing the resulting screenshots pixel-by-pixel
(near-zero difference every time, non-blur elements included as a control).
Gradient/color/layout/shadow/SVG-animation changes render correctly in the
Simulator and are safe to verify that way — it's specifically blur that
needs a real device.

**A clean bundle proves the JS resolves, not that it renders.** `GestureDetector must be used as a descendant of GestureHandlerRootView`
and the invisible-shadow bug above both only show up at runtime. Any real
UI/navigation change needs an actual run (`expo run:ios`/`expo start --ios`
against a simulator or device, screenshot or visual check) before calling it
verified — not just `tsc`/`eslint`/`expo export` passing.

## Pixel-perfect verification workflow

1. Implement the screen, routing every value per the hierarchy above.
2. Run the app on **"iPhone 14 (Design Match)"** specifically, not whatever
   simulator happens to be booted — the mockups' `bezelStyle` is a fixed
   390×844pt frame, and other simulators (e.g. "iPhone 17") render at a
   different point size, which skews any visual diff.
3. Override the status bar to the mockups' fixed presentation values before
   screenshotting, so the real clock/battery doesn't read as a spurious diff:
   ```
   xcrun simctl status_bar <device-udid> override --time "9:41" \
     --dataNetwork wifi --wifiMode active --wifiBars 3 \
     --cellularMode notSupported --batteryState charged --batteryLevel 100
   ```
4. Screenshot (`xcrun simctl io <udid> screenshot <path>`) and compare against
   the mockup's own rendered preview, side by side — layout, spacing, type,
   color, gradient angle, corner radii.
5. Anything involving `BlurView` needs a second pass on a real device — the
   Simulator can't validate it either direction (see above).
6. Run the repo's standard verification trio before calling the task done:
   `pnpm lint`, `pnpm typecheck`, `pnpm format:check` (see the root
   `CLAUDE.md` — the formatter doesn't block anything and is easy to skip by
   accident). If you touched `packages/i18n`, also run `pnpm check-i18n`.

## Where to look next

- [`design-tokens.md`](./design-tokens.md) — the token values themselves
  (gem tones, type, spacing, radii).
- [`component-kit.md`](./component-kit.md) — per-component API and behavior
  notes for everything already built.
- The root `CLAUDE.md`'s "React Native / Expo development standards" section
  — list virtualization, image handling, navigation, animation rules that
  apply regardless of which screen you're building.
