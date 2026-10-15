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

// No Account's seal icon — a person mark with a small alert badge
// overlapping its shoulder, distinct from the plain `PersonIcon` below
// (different viewBox/proportions and the extra badge circle + "!" glyph).
export function PersonAlertIcon({ size = 36, color = '#fff', strokeWidth = 1.5 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="8.2" r="3.6" stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M4.2 20c.7-3.7 3.5-5.6 6.8-5.6 1 0 2 .2 2.9.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Circle cx="17.4" cy="17.4" r="4.1" stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M17.4 15.4v2.4M17.4 19.9h.01"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  )
}

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

// Chat composer's attach button.
export function AttachIcon({ size = 16, color = '#fff', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d="M10 4v12M4 10h12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  )
}

// Chat composer's send button.
export function SendIcon({ size = 16, color = '#fff', strokeWidth = 1.9 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M10 16V4M4.5 9.5 10 4l5.5 5.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// Gallery Viewer's top-chrome share/export button.
export function ShareIcon({ size = 15, color = '#fff', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M10 13V3M6.5 6.5 10 3l3.5 3.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M3.5 12.5v3a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5v-3"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// Notifications screen's "mark all as read" button — a double checkmark,
// distinct from the single-stroke CheckIcon used elsewhere.
export function DoubleCheckIcon({ size = 18, color = '#fff', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={(size / 22) * 14} viewBox="0 0 22 14" fill="none">
      <Path
        d="M1 7.5 5 11.5 12 3"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M10 11.5 17.5 3"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// Notifications screen's "price drops"/membership-renewal row icon.
export function BagIcon({ size = 17, color = '#fff', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3.5 6.5h17v12h-17zM3.5 6.5 5 3.5h14l1.5 3M9 11.5a3 3 0 0 0 6 0"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// Notifications screen's empty-state bell — a different proportioned bell
// than the header `BellIcon` (different viewBox/path numbers in the
// mockup, not a reusable scale of the same shape), so kept separate
// rather than stretching `BellIcon` to fit both.
export function BellEmptyIcon({ size = 26, color = '#fff', strokeWidth = 1.5 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 8.5a7 7 0 0 1 14 0c0 5.5 2 7.5 2 7.5H3s2-2 2-7.5zM10 20a2.6 2.6 0 0 0 4 0"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// Account Settings' "Theme" row icon (a crescent moon).
export function MoonIcon({ size = 17, color = '#fff', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20.5 14.5A8.6 8.6 0 0 1 9.5 3.5a8.6 8.6 0 1 0 11 11z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// Account Settings' "Language" row icon.
export function LanguageIcon({ size = 17, color = '#fff', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 5h11M9.5 3v2c0 4.2-2.2 7.5-5.5 9M7 9.5c0 3 2.6 5.5 6.5 6.5M13 21l4.2-10L21.5 21M14.8 17.6h4.8"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// Account Settings' "Country" row icon — a globe with two meridian curves,
// distinct from any other icon in the kit.
export function GlobeIcon({ size = 17, color = '#fff', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3.5 9h17M3.5 15h17M12 3c2.6 2.6 2.6 15.4 0 18M12 3c-2.6 2.6-2.6 15.4 0 18"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// Account Settings' "Currency" row icon — a circled dollar sign.
export function CurrencyIcon({ size = 17, color = '#fff', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.2A2.6 2.6 0 0 1 12 7.5c1.4 0 2.5.9 2.5 2M9.5 14.8c.5 1 1.4 1.7 2.5 1.7 1.4 0 2.5-.9 2.5-2 0-2.6-5-1.6-5-3.8M12 6v12"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// Account Settings' "Price drops" notification-row icon.
export function TrendDownIcon({ size = 17, color = '#fff', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3v14M6.5 11.5 12 17l5.5-5.5M4 21h16"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// Account Settings' "Offers & tips" notification-row icon (a price tag).
export function TagIcon({ size = 17, color = '#fff', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2A2 2 0 0 1 2.8 12L3 4l8-.2a2 2 0 0 1 1.4.6l8.2 8.2a1 1 0 0 1 0 .8zM7.5 7.5h.01"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// Account Settings' "Saved search digest" notification-row icon — a flat
// envelope, distinct from MailIcon/EnvelopeIcon's rounded-rect drawings.
export function DigestIcon({ size = 17, color = '#fff', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 6h18v12H3zM3.6 6.8 12 13l8.4-6.2"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// Account Settings' "Change password" row icon — a different padlock
// drawing from LockIcon/LockResetIcon (own viewBox/proportions).
export function PadlockIcon({ size = 17, color = '#fff', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 10.5V7.5a6 6 0 0 1 12 0v3M4.5 10.5h15v11h-15z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// Account Settings' "Two-step verification" row icon — a plain shield
// outline, distinct from ShieldCheckIcon (no checkmark, different viewBox).
export function ShieldIcon({ size = 17, color = '#fff', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2.2 4 5.6v6c0 5.2 3.5 8.5 8 10.2 4.5-1.7 8-5 8-10.2v-6z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// Account Settings' "Devices & sessions" row icon (a monitor on a stand).
export function MonitorIcon({ size = 17, color = '#fff', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 5.5h18v10H3zM8 20h8M12 15.5V20"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// Account Settings' "SMS" deliver-via chip icon (a phone-shaped rectangle).
export function SmsIcon({ size = 15, color = '#fff', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 2h8v20H8zM10.5 4.8h3M12 18.8h.01"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// Account Settings' "WhatsApp" deliver-via chip — a plain themeable bubble
// outline, distinct from the brand-colored WhatsAppIcon used on Login/Chat
// (that one's stroke is fixed per the design, not themeable; this chip
// needs to switch between the tone's ink and a muted grey on/off).
export function WhatsAppOutlineIcon({ size = 15, color = '#fff', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20.5 11.7A8.4 8.4 0 0 1 7.9 19L3.5 20.5l1.6-4.3a8.4 8.4 0 1 1 15.4-4.5z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// Profile screen's edit-pencil button on the identity card.
export function EditIcon({ size = 15, color = '#fff', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M13.2 2.8a2 2 0 0 1 2.8 2.8L6.5 15.1l-3.7 1 1-3.7z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// Profile screen's "Favourites" row icon — a heart drawing of this
// mockup's own (different viewBox/numbers from the shared bottom-nav
// HeartIcon, which stays as-is there for cross-screen nav consistency —
// see the Profile screen's own notes on why).
export function FavouritesIcon({ size = 16, color = '#fff', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21S3 14.5 3 8.7A5.7 5.7 0 0 1 12 5a5.7 5.7 0 0 1 9 3.7C21 14.5 12 21 12 21z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// Profile screen's "Saved searches" row icon — a magnifying glass drawing
// of this mockup's own (different viewBox/numbers from the shared
// SearchIcon used in Home's search bar).
export function SavedSearchIcon({ size = 16, color = '#fff', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM17 17l4 4"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// Profile screen's "FAQ" row icon.
export function FaqIcon({ size = 16, color = '#fff', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.6 9.2a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.2 1-1.2 1.9M12 17h.01"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// Profile screen's "How to sell fast" row icon (a lightning bolt).
export function LightningIcon({ size = 16, color = '#fff', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// Profile screen's "Terms and conditions" row icon (a document).
export function DocumentIcon({ size = 16, color = '#fff', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 2.5h8l4 4v15H6zM14 2.5v4h4M9 12h6M9 16h4"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// Profile screen's "Log out" row icon.
export function LogOutIcon({ size = 16, color = '#ff8f80', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 4.5h3.5A1.5 1.5 0 0 1 20 6v12a1.5 1.5 0 0 1-1.5 1.5H15M10 8.5 6.5 12l3.5 3.5M6.5 12H15"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// Profile screen's "change photo" sheet — no mockup covers this action
// sheet (none of the 21 Claude Design screens has a photo picker), so
// these three are hand-authored in the kit's own stroke style rather than
// ported from a design file, the one deliberate exception to "port exact
// mockup paths" in this file.
export function CameraIcon({ size = 18, color = '#fff', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 8.5h3l1.5-2h7l1.5 2h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="13.5" r="3.3" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  )
}

export function GalleryIcon({ size = 18, color = '#fff', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="16" rx="3" stroke={color} strokeWidth={strokeWidth} />
      <Circle cx="8.5" cy="9.5" r="1.5" stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M3.8 17.5 9 12l3.5 3.5L16 12l4.2 4.2"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export function TrashIcon({ size = 18, color = '#ff8f80', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 7h16M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7M6 7l1 13a2 2 0 0 0 2 1.8h6a2 2 0 0 0 2-1.8l1-13"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// My Ads card's "views" stat glyph — a wide, flat eye shape distinct from
// `EyeIcon` (password-reveal toggle), which has a different viewBox/path.
export function ViewsIcon({
  size = 14,
  color = 'rgba(255,255,255,0.55)',
  strokeWidth = 1.6,
}: IconProps) {
  return (
    <Svg width={size} height={(size / 22) * 14} viewBox="0 0 22 14" fill="none">
      <Path
        d="M1 7s3.6-6 10-6 10 6 10 6-3.6 6-10 6S1 7 1 7z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="11" cy="7" r="2.6" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  )
}

// My Ads' floating "Post a new ad" button's plus glyph.
export function PlusIcon({ size = 16, color = '#fff', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d="M10 3v14M3 10h14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  )
}

// My Membership's payment-method row glyph — a plain credit card.
export function CardIcon({ size = 18, color = '#fff', strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={(size / 22) * 16} viewBox="0 0 22 16" fill="none">
      <Rect x="1" y="1" width="20" height="14" rx="3" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M1 6h20M5 11h3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  )
}

// Payment Card's "Add a new card" row glyph — a smaller, more inset plus
// than `PlusIcon` (different coordinates within the same 20x20 viewBox,
// not a rounding gap from it).
export function AddIcon({ size = 14, color = '#fff', strokeWidth = 1.9 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d="M10 4v12M4 10h12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  )
}

// Payment Card's CVV-field hint glyph — a plain info circle.
export function InfoCircleIcon({
  size = 16,
  color = 'rgba(255,255,255,0.45)',
  strokeWidth = 1.6,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Circle cx="10" cy="10" r="7.5" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M10 9v5M10 6.2h.01" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  )
}

// Saved Searches card's own glyph — distinct viewBox/coordinates from the
// generic `SearchIcon` (Home's search bar) and `SavedSearchIcon` (Profile's
// row icon), not a rounding gap from either.
export function QuerySearchIcon({ size = 16, color = '#fff', strokeWidth = 1.9 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="10.5" cy="10.5" r="7" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M15.8 15.8 21 21" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  )
}

// Saved Searches card's delete glyph — a small bin, distinct viewBox/path
// from `TrashIcon` (the photo-sheet "Remove photo" icon).
export function BinIcon({ size = 14, color = '#ff8f80', strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={(size / 16) * 17} viewBox="0 0 16 17" fill="none">
      <Path
        d="M2.5 4.5h11M6 4.5V2.5h4v2M4 4.5l.7 10h6.6l.7-10M6.6 7.5v5M9.4 7.5v5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// Profile's "Live gradient" toggle row icon — no mockup covers this
// setting (it's a real feature with no .dc.html screen of its own), same
// deliberate hand-authored exception as CameraIcon/GalleryIcon/TrashIcon
// above. A simple four-point sparkle, standing in for "animated/shimmer".
export function SparkleIcon({ size = 17, color = '#fff', strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3c.7 3.6 2.3 5.3 5.8 6-3.5.7-5.1 2.4-5.8 6-.7-3.6-2.3-5.3-5.8-6 3.5-.7 5.1-2.4 5.8-6z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <Path
        d="M19 15.5c.25 1.3.8 1.85 2 2.1-1.2.25-1.75.8-2 2.1-.25-1.3-.8-1.85-2-2.1 1.2-.25 1.75-.8 2-2.1z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// Post Ad's photo/review-step tip glyph — a sun/idea mark, distinct from
// `SparkleIcon` (different ray pattern, not a rounding gap from it).
export function TipIcon({ size = 16, color = '#fff', strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3v1.5M12 19.5V21M4.5 12H3M21 12h-1.5M6.7 6.7 5.6 5.6M18.4 18.4l-1.1-1.1M6.7 17.3l-1.1 1.1M18.4 5.6l-1.1 1.1"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  )
}

// Post Ad's "Add video" media-grid glyph.
export function VideoIcon({ size = 20, color = '#fff', strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={(size / 24) * 18} viewBox="0 0 24 18" fill="none">
      <Rect x="1" y="1" width="15" height="16" rx="3" stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M16 7l7-4v12l-7-4z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// Post Ad's publish-confirmation dialog icon — a shield with an alert
// mark, distinct from `ShieldCheckIcon` (different viewBox/path, a
// checkmark rather than an alert dot).
export function ShieldAlertIcon({ size = 26, color = '#fff', strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3.2 3.5 6.6v5.9c0 5.1 3.6 8.4 8.5 10.3 4.9-1.9 8.5-5.2 8.5-10.3V6.6z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 8.6v4.6M12 16.4h.01"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  )
}

// Post Ad's "Publish now" button checkmark — distinct viewBox/path from
// the shared `CheckIcon` (used for completed-step indicators elsewhere).
export function PublishCheckIcon({ size = 15, color = '#fff', strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg width={size} height={(size / 14) * 11} viewBox="0 0 14 11" fill="none">
      <Path
        d="M1 5.5 5 9.5 13 1.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// Chat's header "more options" trigger (opens the Report/Block sheet) —
// a plain vertical-dots overflow glyph. No Claude Design mockup backs
// this screen (see chat/[id].tsx's own comment), so this is hand-authored
// to match the kit's existing simple stroke icons rather than ported from
// a design file.
export function MoreVerticalIcon({ size = 18, color = '#fff', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Circle cx="10" cy="4" r="1.1" fill={color} stroke={color} strokeWidth={strokeWidth / 4} />
      <Circle cx="10" cy="10" r="1.1" fill={color} stroke={color} strokeWidth={strokeWidth / 4} />
      <Circle cx="10" cy="16" r="1.1" fill={color} stroke={color} strokeWidth={strokeWidth / 4} />
    </Svg>
  )
}

// Chat header sheet's "Block seller" row glyph — a universal no-entry
// circle-slash. Same no-mockup caveat as `MoreVerticalIcon` above.
export function BlockIcon({ size = 17, color = '#fff', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Circle cx="10" cy="10" r="7.5" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M4.8 4.8l10.4 10.4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  )
}

// Edit Profile's "Display name / Shop" field glyph — a storefront
// (awning + box), exact path ported from the Edit Profile mockup.
export function StoreIcon({ size = 17, color = '#fff', strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3.5 8.5h17v11h-17zM3.5 8.5 5 4.5h14l1.5 4"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// Edit Profile's "District" field glyph — a map pin, exact path ported
// from the mockup (also reused for the district-picker sheet's rows).
export function PinIcon({ size = 17, color = '#fff', strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="10" r="2.6" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  )
}

// Delete Account's warning seal — a triangle exclamation mark, exact path
// ported from that mockup. Distinct from `ShieldAlertIcon` (a rounded
// shield outline, used for Post Ad's moderation notice and Chat's Report
// row), which this screen's mockup doesn't use.
export function AlertTriangleIcon({ size = 26, color = '#fff', strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3.2 21 19.5H3z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 9.5v4.4M12 16.8h.01"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  )
}
