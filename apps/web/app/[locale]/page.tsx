import { dictionaries, isSupportedLocale, SUPPORTED_LOCALES, type Locale } from '@ceylon-gems/i18n'
import { fontSize, gemTones, lineHeight } from '@ceylon-gems/ui-tokens'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  si: 'සිංහල',
  ta: 'தமிழ்',
}

// Proof-of-concept page for E0.3's two remaining checklist items
// (/[locale] routing, design tokens reaching a real web app) — not a
// production landing page. Renders real packages/i18n dictionary strings
// (same content mobile's home screen uses, in whichever script the active
// locale needs) and the real Sapphire gem-tone palette from
// packages/ui-tokens, not placeholder copy/colors invented for this page.
export default async function LocaleHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isSupportedLocale(locale)) notFound()

  const t = dictionaries[locale]
  const tone = gemTones.sapphire

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        padding: 24,
        textAlign: 'center',
        background: `linear-gradient(180deg, ${tone.screen[0]}, ${tone.screen[1]}, ${tone.screen[2]})`,
        color: '#fff',
        fontFamily: 'var(--font-jost), sans-serif',
      }}
    >
      <nav style={{ display: 'flex', gap: 16 }}>
        {SUPPORTED_LOCALES.map((code) => (
          <Link
            key={code}
            href={`/${code}`}
            style={{
              color: code === locale ? tone.accent : 'rgba(255,255,255,0.6)',
              fontWeight: code === locale ? 700 : 500,
              textDecoration: 'none',
              fontSize: fontSize.sm,
            }}
          >
            {LOCALE_LABELS[code]}
          </Link>
        ))}
      </nav>

      <h1
        style={{
          fontSize: fontSize['3xl'],
          lineHeight: `${lineHeight['3xl']}px`,
          fontWeight: 800,
          margin: 0,
        }}
      >
        Ceylon Gems
      </h1>

      <p
        style={{
          fontSize: fontSize.lg,
          lineHeight: `${lineHeight.lg}px`,
          color: 'rgba(255,255,255,0.75)',
          maxWidth: 480,
          margin: 0,
        }}
      >
        {t.home.searchPlaceholder}
      </p>

      <p style={{ fontSize: fontSize.base, color: tone.accent, margin: 0 }}>
        {t.common.continue} · {t.common.search} · {t.common.done}
      </p>
    </main>
  )
}
