// English, Sinhala, and Tamil — Account Settings' Language picker. The
// `userLocale` pg enum on the backend (apps/api/src/db/schema.ts) and the
// `languages` taxonomy table it reads from are both already keyed on these
// same three codes.
export const SUPPORTED_LOCALES = ['en', 'si', 'ta'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const defaultLocale: Locale = 'en'

export function isSupportedLocale(value: string | null | undefined): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value ?? '')
}
