# Design tokens

`packages/ui-tokens` is the single source of truth for color, type, spacing,
and radius across the app — plain data, no React, no native dependencies, so
it can be consumed by the mobile app today and a web client later without
change. Source of truth for the values themselves is the 21-screen Claude
Design mockup set (Sign In through Account Settings), not the Confluence
brand page — that page's ivory/gold/Cormorant Garamond system turned out to
be stale and was superseded once the real mockups surfaced.

```ts
import {
  gemTones,
  defaultGemTone,
  fontFamilies,
  fontSize,
  spacing,
  radii,
} from '@ceylon-gems/ui-tokens'
```

## Gem tones (`colors.ts`)

Three dark, glassmorphic themes, each named after the gemstone it evokes.
Every one of the 21 mockup screens defines the identical three palettes —
that cross-screen consistency is what makes these real tokens rather than
one screen's local choice.

| Tone                 | Accent    | Screen gradient               | Feel                                  |
| -------------------- | --------- | ----------------------------- | ------------------------------------- |
| `sapphire` (default) | `#6fd3ff` | `#0d1c3c → #0a1430 → #060b1a` | cool blue, the app's default identity |
| `padparadscha`       | `#ffb08a` | `#3a1a18 → #2a1216 → #150a0d` | warm orange-pink                      |
| `emerald`            | `#6fe8bd` | `#0d3229 → #0a241f → #051312` | green                                 |

```ts
const palette = gemTones[defaultGemTone] // or gemTones['emerald'], etc.
```

Each `GemTonePalette` has:

- **`screen`** — the phone-screen background gradient, top → mid → bottom.
- **`glow`** — three ambient `[r, g, b]` glow colors; screen position varies per layout.
- **`accent`** — links, active icons, progress fills.
- **`ink`** — icon stroke color legible against this tone's glass fill.
- **`tickInk`** — high-contrast color for a checkmark/icon drawn on top of a filled accent shape.
- **`cta`** — a `[from, to]` gradient pair for primary CTAs and active/selected states. Each stop is an **unclosed** `rgba(...,` string — append the alpha and close it yourself: `` `${cta[0]}0.9)` ``. `Button`, `IconButton`, `SegmentedControl`, and `Chip` all do this.
- **`rim`** — an RGB triple (comma-joined, no `rgba()` wrapper) for borders at variable opacity: `` `rgba(${rim},0.3)` ``.
- **`halo`** — same shape as `rim`, for glow/shadow at variable opacity.

**No light mode exists.** Account Settings has a Light/Dark/System toggle
stub in the mockups, but no screen actually renders light colors — inventing
values now would just be a guess. Treat any "add light theme" request as new
design work, not a token lookup.

## Neutral & semantic colors (`colors.ts`)

Tone-independent — identical across all three gem tones.

- **`neutral.white`**, **`neutral.overlay`** (3-stop dark-navy tint over the animated background), **`neutral.glassFill`**/**`neutral.glassRim`** (the default untinted glass border/fill used when a surface doesn't need tone tinting).
- **`neutral.danger`** / **`neutral.warning`** / **`neutral.error`** — semantic, not tone-driven. `neutral.danger` also carries its own `ctaFrom`/`ctaTo` gradient pair (same unclosed-`rgba(` shape as a gem tone's `cta`) for destructive buttons — see `Button`'s `danger` prop.
- **`textOpacity`** — the white-on-dark text hierarchy (`primary: 1, secondary: 0.85, tertiary: 0.6, muted: 0.45, faint: 0.32`). The UI is built on these opacity steps applied to white, not distinct grey hex values.

## Typography (`typography.ts`)

One typeface — **Jost** — for both display and UI, differentiated by weight
rather than by swapping families (unlike the old, superseded Cormorant
Garamond system). Sinhala uses **Noto Sans Sinhala** and Tamil uses **Noto
Sans Tamil**, both at matching weights.

```ts
fontFamilies: {
  en: { regular, medium, semibold, bold, extrabold }, // Jost_400Regular … Jost_800ExtraBold
  si: { regular, medium, semibold, bold, extrabold }, // NotoSansSinhala_400Regular … _800ExtraBold
  ta: { regular, medium, semibold, bold, extrabold }, // NotoSansTamil_400Regular … _800ExtraBold
}
```

The family name strings match exactly what `@expo-google-fonts/*` packages
name their per-weight files, and what `expo-font`'s config plugin registers
them as when embedded at build time (`apps/mobile/app.json`) — see
[the component kit doc](./component-kit.md) for how `useFontFamily()` picks
the active one from `LocaleProvider`.

`fontSize` (`xs: 12` … `3xl: 34`) and matching `lineHeight` are a modest
7-step scale — deliberately few distinct sizes; the RN skill's guidance is to
vary weight and color over size count, not stack up a large type scale.

## Spacing & radii

- **`spacing`** (`spacing.ts`) — a 4px-based scale, named rather than numerically indexed (`spacing.md`, not `spacing[4]`) so call sites read clearly: `xs: 4, sm: 8, md: 12, lg: 16, xl: 20, 2xl: 24, 3xl: 32, 4xl: 40, 5xl: 48, 6xl: 64`.
- **`radii`** (`radii.ts`) — `sm: 6` (chips, badges), `md: 10` (cards, inputs, buttons — the default in `GlassSurface`), `lg: 16` (modals, sheets), `full: 999` (pills, avatars).

## Known limitation

Glass surfaces are semi-transparent — a component's real on-screen contrast
depends on whatever's rendered behind it (the animated gradient background,
another card, etc.), which isn't something a static token file can guarantee
a WCAG contrast ratio for. The `textOpacity` steps and gem-tone `ink`/accent
colors were chosen to read clearly against the mockups' actual dark
backgrounds, but this hasn't been verified with a colorimetric AA audit —
treat opacities below `muted` (0.45) as decorative/low-emphasis only, not for
body text that needs to be reliably legible.
