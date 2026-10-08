// Source of truth: the "Ceylon Gem Exchange Signup" Claude Design mockup.
// Its CSS names 'Brandon Text','Brandon Grotesque','Jost' in that order, but
// Brandon Text/Grotesque (HVD Fonts, commercial) are never actually loaded —
// only Jost is pulled in via a Google Fonts <link>, so Jost is what genuinely
// renders. One family covers both display and UI, differentiated by weight,
// not by swapping typefaces the way the old Cormorant Garamond system did.
//
// Font family names match what @expo-google-fonts packages name their
// per-weight files (each weight is technically its own family internally,
// e.g. "Jost_600SemiBold") — that's also what expo-font's config plugin
// registers them as when embedded via raw file paths in app.json.
//
export const fontFamilies = {
  en: {
    regular: 'Jost_400Regular',
    medium: 'Jost_500Medium',
    semibold: 'Jost_600SemiBold',
    bold: 'Jost_700Bold',
    extrabold: 'Jost_800ExtraBold',
  },
  si: {
    regular: 'NotoSansSinhala_400Regular',
    medium: 'NotoSansSinhala_500Medium',
    semibold: 'NotoSansSinhala_600SemiBold',
    bold: 'NotoSansSinhala_700Bold',
    extrabold: 'NotoSansSinhala_800ExtraBold',
  },
  ta: {
    regular: 'NotoSansTamil_400Regular',
    medium: 'NotoSansTamil_500Medium',
    semibold: 'NotoSansTamil_600SemiBold',
    bold: 'NotoSansTamil_700Bold',
    extrabold: 'NotoSansTamil_800ExtraBold',
  },
} as const

export type SupportedLocale = keyof typeof fontFamilies

// A modest scale for mobile — not a generic default, sized for a listing
// marketplace where prices, titles, and captions need clear rhythm without
// many distinct sizes (per the RN skill: vary weight/color over size count).
export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 22,
  '2xl': 28,
  '3xl': 34,
} as const

export const lineHeight = {
  xs: 16,
  sm: 20,
  base: 24,
  lg: 26,
  xl: 30,
  '2xl': 36,
  '3xl': 42,
} as const

export type FontSizeToken = keyof typeof fontSize
