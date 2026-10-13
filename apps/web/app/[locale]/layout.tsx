import { isSupportedLocale } from '@ceylon-gems/i18n'
import { notFound } from 'next/navigation'
import { Jost } from 'next/font/google'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '../globals.css'

// Jost, same single typeface (weight-differentiated, not family-swapped)
// as mobile's useFontFamily — loaded via next/font instead of
// @expo-google-fonts since that's the idiomatic Next.js mechanism, same
// "shared choice, platform-appropriate loading" split as
// LiveGradientBackground.web.tsx re-implementing the mobile shader for a
// real <canvas> instead of trying to force the same loader across
// platforms. Sinhala/Tamil script rendering falls back to the OS/browser's
// own font stack for now — no NotoSansSinhala/NotoSansTamil web port yet,
// matching the "don't build ahead of what's asked" scope of this first
// pass (see middleware.ts's same note on Accept-Language detection).
const jost = Jost({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jost',
})

export const metadata: Metadata = {
  title: 'Ceylon Gems',
  description: 'A listing marketplace for Sri Lankan gemstones and lapidary equipment.',
}

// No separate non-dynamic app/layout.tsx above this one — every real route
// lives under app/[locale]/, so this *is* the root layout Next.js renders
// html/body from, with `lang` set per-locale. The standard Next.js App
// Router i18n pattern (same shape next-intl's own docs recommend) rather
// than a workaround.
export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isSupportedLocale(locale)) notFound()

  return (
    <html lang={locale} className={jost.variable}>
      <body>{children}</body>
    </html>
  )
}
