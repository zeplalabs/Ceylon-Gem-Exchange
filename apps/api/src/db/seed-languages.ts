import { db, pool } from './client'
import { languages } from './schema'

// Seeds Account Settings' Language picker taxonomy — re-runnable (upserts
// by the unique `code`), same pattern as seed-filters.ts. `code` must stay
// in sync with the `userLocale` pg enum in schema.ts (what `users.locale`
// actually accepts) and with packages/i18n's `SUPPORTED_LOCALES` (which
// dictionary ships for it) — this table only controls what the picker
// *offers* and in what order, not whether the app can render that locale.
const LANGUAGES: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'si', label: 'සිංහල' },
  { code: 'ta', label: 'தமிழ்' },
]

async function seed() {
  for (const [index, lang] of LANGUAGES.entries()) {
    await db
      .insert(languages)
      .values({ code: lang.code, label: lang.label, displayOrder: index })
      .onConflictDoUpdate({
        target: languages.code,
        set: { label: lang.label, displayOrder: index },
      })
  }

  console.warn(`Seeded ${LANGUAGES.length} languages`)
}

seed()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err)
    return pool.end().finally(() => process.exit(1))
  })
