import Svg, { Circle, Path, Rect } from 'react-native-svg'

interface FillIconProps {
  size?: number
  color?: string
}

interface IconProps {
  size?: number
  color?: string
  strokeWidth?: number
}

// Ported directly from the Claude Design mockups' inline SVGs (exact path
// data), not swapped for a generic icon library — the brief is pixel
// fidelity to the provided designs, and a different icon set (even a good
// one) would read as a different stroke weight/style throughout the app.

export function PersonIcon({ size = 17, color = '#fff', strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Circle cx="10" cy="6.5" r="3.2" stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M3.8 17c.6-3.2 3.1-4.8 6.2-4.8s5.6 1.6 6.2 4.8"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  )
}

export function MailIcon({ size = 17, color = '#fff', strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Rect
        x="2.5"
        y="5"
        width="15"
        height="10"
        rx="2.2"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Path d="M3 6l7 5 7-5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  )
}

// Email Verification's seal icon — a distinct envelope drawing from
// MailIcon above (different viewBox, proportions, and round line caps/
// joins), not a rounding gap from it, so it's its own component rather
// than an override of MailIcon's props.
export function EnvelopeIcon({ size = 38, color = '#fff', strokeWidth = 1.4 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="2.5"
        y="5"
        width="19"
        height="14"
        rx="3.4"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M3.4 6.4 12 13l8.6-6.6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export function LockIcon({ size = 17, color = '#fff', strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Rect
        x="3.5"
        y="8.5"
        width="13"
        height="9"
        rx="2.5"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Path
        d="M6.75 8.5V6a3.25 3.25 0 0 1 6.5 0v2.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  )
}

// Forgot Password's seal icon — a distinct padlock drawing from LockIcon
// above (different viewBox/proportions, round line caps/joins, and a
// keyhole dash LockIcon doesn't have), not a rounding gap from it.
export function LockResetIcon({ size = 32, color = '#fff', strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="4"
        y="10.5"
        width="16"
        height="10.5"
        rx="3"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8 10.5V7.2A4 4 0 0 1 16 7v.8"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M12 14.5v2.6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  )
}

// The safety-note shield-check glyph (Forgot Password's "active bids are
// paused" hint).
export function ShieldCheckIcon({
  size = 14,
  color = 'rgba(255,255,255,0.7)',
  strokeWidth = 1.5,
}: IconProps) {
  const height = (size / 16) * 17
  return (
    <Svg width={size} height={height} viewBox="0 0 16 17" fill="none">
      <Path
        d="M8 1.2 2 3.8v4.4c0 3.9 2.6 6.3 6 7.6 3.4-1.3 6-3.7 6-7.6V3.8z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5.6 8.4 7.4 10.2 10.8 6.6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

interface EyeIconProps extends IconProps {
  /** true = password currently shown (renders with a slash through the eye). */
  revealed?: boolean
}

export function EyeIcon({
  size = 18,
  color = 'rgba(255,255,255,0.55)',
  strokeWidth = 1.7,
  revealed,
}: EyeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <Path
        d="M1.5 11S5 4.5 11 4.5 20.5 11 20.5 11 17 17.5 11 17.5 1.5 11 1.5 11z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Circle cx="11" cy="11" r="2.8" stroke={color} strokeWidth={strokeWidth} />
      {revealed ? (
        <Path d="M3 19 19 3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      ) : null}
    </Svg>
  )
}

export function ChevronDownIcon({
  size = 10,
  color = 'rgba(255,255,255,0.6)',
  strokeWidth = 1.6,
}: IconProps) {
  const height = size * 0.7
  return (
    <Svg width={size} height={height} viewBox="0 0 10 7" fill="none">
      <Path
        d="M1 1.5 5 5.5l4-4"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// Nav-row back chevron (Verification, and any other screen with its own
// in-body back button rather than the native-stack header's).
export function ChevronLeftIcon({ size = 10, color = '#fff', strokeWidth = 2.2 }: IconProps) {
  const height = (size / 10) * 16
  return (
    <Svg width={size} height={height} viewBox="0 0 10 16" fill="none">
      <Path
        d="M7.5 1.5 2 8l5.5 6.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export function ArrowRightIcon({ size = 17, color = '#fff', strokeWidth = 2 }: IconProps) {
  const height = (size / 18) * 14
  return (
    <Svg width={size} height={height} viewBox="0 0 18 14" fill="none">
      <Path
        d="M1 7h15m-5.5-5.5L16.5 7l-5.5 5.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export function CheckIcon({ size = 11, color = '#04121f', strokeWidth = 2.2 }: IconProps) {
  const height = (size / 12) * 10
  return (
    <Svg width={size} height={height} viewBox="0 0 12 10" fill="none">
      <Path
        d="M1 5l3.2 3.2L11 1.4"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export function CloseIcon({
  size = 12,
  color = 'rgba(255,255,255,0.8)',
  strokeWidth = 1.8,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <Path
        d="M1 1l10 10M11 1L1 11"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  )
}

export function SearchIcon({
  size = 16,
  color = 'rgba(255,255,255,0.55)',
  strokeWidth = 1.8,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Circle cx="8.5" cy="8.5" r="6" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M13.5 13.5 18 18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  )
}

interface GemIconProps {
  size?: number
  ink?: string
  inkSoft?: string
  strokeWidth?: number
  /** 'simple' (default) is Signup's 2-line facet mark; 'detailed' adds Login's two extra corner-facet strokes — a real difference between the two mockups, not a rounding gap, so it's a variant rather than a silent change to the shared default. */
  facets?: 'simple' | 'detailed'
}

// The brand mark shown in every screen's header row.
export function GemIcon({
  size = 20,
  ink = '#fff',
  inkSoft = 'rgba(255,255,255,0.75)',
  strokeWidth = 1.7,
  facets = 'simple',
}: GemIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 3h10l4 6-9 12L3 9z"
        stroke={ink}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <Path
        d={
          facets === 'detailed'
            ? 'M3 9h18M9.5 9 12 21 14.5 9M7 3l2.5 6M17 3l-2.5 6'
            : 'M3 9h18M9.5 9 12 21 14.5 9'
        }
        stroke={inkSoft}
        strokeWidth={strokeWidth * 0.7}
      />
    </Svg>
  )
}

export function PhoneIcon({ size = 17, color = '#fff', strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M6.5 2h7v16h-7z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8.75 4.75h2.5M10 15.5h.01"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  )
}

// Ported from the Login mockup's social-login row. Brand marks, so the
// fixed stroke color (rgba(255,255,255,0.85)) isn't themeable like the
// other icons — it's the same on every gem tone in the mockup.
export function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 12.2c0 5.1-3.5 8.8-8.9 8.8A9 9 0 1 1 12.1 3c2.4 0 4.4.9 5.9 2.3l-2.4 2.3A5.1 5.1 0 0 0 12.1 6a6 6 0 0 0 0 12c3.1 0 4.9-1.8 5.2-4.3h-5.2v-3H21z"
        stroke="rgba(255,255,255,0.85)"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export function AppleIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16.4 12.7c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.1-2.8.9-3.5.9s-1.9-.9-3.1-.8c-1.6 0-3.1 1-3.9 2.5-1.7 2.9-.4 7.2 1.2 9.6.8 1.1 1.7 2.4 3 2.4 1.2 0 1.7-.8 3.2-.8s1.9.8 3.1.8 2.2-1.2 3-2.3c.6-.9.9-1.4 1.3-2.4-2.4-.9-2.9-3.9-2.9-4.3zM14.3 5.3c.7-.8 1.1-1.9 1-3-1.1.1-2.3.7-3 1.5-.6.7-1.1 1.9-1 2.9 1.2.1 2.4-.6 3-1.4z"
        stroke="rgba(255,255,255,0.85)"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20.5 11.7A8.4 8.4 0 0 1 7.9 19L3.5 20.5l1.6-4.3a8.4 8.4 0 1 1 15.4-4.5zM8.6 8.2c-.3 0-.7.1-1 .5-.4.4-.9 1-.9 1.9 0 1 .7 2 .8 2.1.1.2 1.4 2.2 3.4 3 1.7.7 2.3.6 2.8.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3l-1.5-.7c-.2-.1-.4-.1-.5.1l-.6.8c-.1.2-.3.2-.5.1-.2-.1-.9-.4-1.7-1.1-.6-.6-1-1.2-1.1-1.4-.1-.2 0-.3.1-.4l.4-.5c.1-.2.2-.3.1-.5l-.6-1.5c-.2-.3-.3-.3-.4-.3z"
        stroke="rgba(255,255,255,0.85)"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// Ported from the Home mockup. Notification bell (header) — no filled/dot
// state built in, the red dot is a separate absolutely-positioned sibling
// (see Home screen) since its color is the tone accent, not part of the
// glyph itself.
export function BellIcon({
  size = 17,
  color = 'rgba(255,255,255,0.85)',
  strokeWidth = 1.7,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M5 8.5a5 5 0 0 1 10 0c0 4 1.4 5.5 1.4 5.5H3.6S5 12.5 5 8.5z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8 16.8a2.2 2.2 0 0 0 4 0"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  )
}

// The "adjustments" filter-trigger icon (Home's search row).
export function FilterIcon({ size = 18, color = '#fff', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path
        d="M2 5h9M14 5h2M2 13h2M7 13h9"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Circle cx="12.5" cy="5" r="2" stroke={color} strokeWidth={strokeWidth} />
      <Circle cx="5.5" cy="13" r="2" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  )
}

// Save/favorite heart — shared by the ad-card overlay (Home) and the
// bottom-nav "Saved" tab, which use the same shape at two different sizes.
// `filled` swaps the fill from transparent to `color` for the liked state.
export function HeartIcon({
  size = 13,
  color = '#fff',
  filled = false,
}: FillIconProps & { filled?: boolean }) {
  return (
    <Svg width={size} height={(size / 20) * 18} viewBox="0 0 20 18" fill={filled ? color : 'none'}>
      <Path
        d="M10 17S1 11.5 1 6.2A5.2 5.2 0 0 1 10 3a5.2 5.2 0 0 1 9 3.2C19 11.5 10 17 10 17z"
        stroke={color}
        strokeWidth={1.8}
      />
    </Svg>
  )
}

// Hero-banner play button glyph — a plain filled triangle, no stroke.
export function PlayIcon({ size = 13, color = '#fff' }: FillIconProps) {
  return (
    <Svg width={size} height={(size / 13) * 15} viewBox="0 0 13 15" fill={color}>
      <Path d="M1 1.2 12 7.5 1 13.8z" />
    </Svg>
  )
}

// Bottom-nav glyphs — ported one-for-one from the Home mockup's `navIcons`
// array. Distinct from the generic PersonIcon/etc. above because they're a
// different path family (this mockup's own 24x24 icon set), not a rounding
// gap from an existing shared glyph.
export function HomeTabIcon({
  size = 20,
  color = 'rgba(255,255,255,0.5)',
  strokeWidth = 1.9,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export function ExploreTabIcon({
  size = 20,
  color = 'rgba(255,255,255,0.5)',
  strokeWidth = 1.9,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM15.5 8.5l-2 5-5 2 2-5z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export function BidsTabIcon({
  size = 20,
  color = 'rgba(255,255,255,0.5)',
  strokeWidth = 1.9,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14 3l7 7-3.5 3.5-7-7zM10.5 6.5 3 14v7h7l7.5-7.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// Keypad backspace glyph (Verification's on-screen numeric keypad).
export function BackspaceIcon({
  size = 20,
  color = 'rgba(255,255,255,0.8)',
  strokeWidth = 1.8,
}: IconProps) {
  const height = (size / 22) * 16
  return (
    <Svg width={size} height={height} viewBox="0 0 22 16" fill="none">
      <Path
        d="M7 1.5h13v13H7L1 8z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M11 5.5 16 10.5M16 5.5 11 10.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  )
}

export function ProfileTabIcon({
  size = 20,
  color = 'rgba(255,255,255,0.5)',
  strokeWidth = 1.9,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 21c.8-4.3 4-6.5 7.5-6.5s6.7 2.2 7.5 6.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// Listing Detail's action-bar phone-handset glyph ("Call").
export function CallIcon({ size = 17, color = '#fff', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 16.9v2.6a2 2 0 0 1-2.2 2 19.6 19.6 0 0 1-8.5-3 19.3 19.3 0 0 1-6-6A19.6 19.6 0 0 1 1.3 4 2 2 0 0 1 3.3 2h2.6a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L7 9.8a16 16 0 0 0 6 6l1.2-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// Chat-bubble glyph — Listing Detail's action bar ("Chat") and Seller-tab
// chat button reuse this at different rendered sizes (the mockup's own two
// instances are the same shape hand-tuned a few px apart per context, not
// a deliberate two-icon system like Envelope/Mail).
export function ChatIcon({ size = 17, color = '#fff', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 11.5a8.4 8.4 0 0 1-12.6 7.3L3.5 20.5l1.7-4.7A8.4 8.4 0 1 1 21 11.5z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// Small "view more" chevron (Listing Detail's certificate row).
export function ChevronRightIcon({
  size = 8,
  color = 'rgba(255,255,255,0.55)',
  strokeWidth = 1.8,
}: IconProps) {
  const height = (size / 8) * 13
  return (
    <Svg width={size} height={height} viewBox="0 0 8 14" fill="none">
      <Path
        d="M1.5 1.5 6 7l-4.5 5.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}
