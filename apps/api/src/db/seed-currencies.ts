import { db, pool } from './client'
import { currencies } from './schema'

// Seeds Account Settings' Currency picker taxonomy — re-runnable (upserts
// by the unique `code`), same pattern as seed-filters.ts/seed-languages.ts.
// `usdRate` here is just the starting value for a fresh DB; CurrencyRatesService
// overwrites it with a live rate on the API's next startup/cron tick — see
// schema.ts's `currencies` table comment.
const CURRENCIES: { code: string; label: string; symbol: string; usdRate: number }[] = [
  { code: 'USD', label: 'USD — US dollar', symbol: '$', usdRate: 1 },
  { code: 'LKR', label: 'LKR — Sri Lankan rupee', symbol: 'Rs', usdRate: 302 },
  { code: 'EUR', label: 'EUR — Euro', symbol: '€', usdRate: 0.92 },
  { code: 'GBP', label: 'GBP — Pound sterling', symbol: '£', usdRate: 0.79 },
  { code: 'AED', label: 'AED — UAE dirham', symbol: 'AED', usdRate: 3.67 },
  { code: 'SGD', label: 'SGD — Singapore dollar', symbol: 'S$', usdRate: 1.34 },
  { code: 'JPY', label: 'JPY — Japanese yen', symbol: '¥', usdRate: 157 },
]

async function seed() {
  for (const [index, currency] of CURRENCIES.entries()) {
    await db
      .insert(currencies)
      .values({ ...currency, displayOrder: index })
      .onConflictDoUpdate({
        target: currencies.code,
        set: {
          label: currency.label,
          symbol: currency.symbol,
          usdRate: currency.usdRate,
          displayOrder: index,
        },
      })
  }

  console.warn(`Seeded ${CURRENCIES.length} currencies`)
}

seed()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err)
    return pool.end().finally(() => process.exit(1))
  })
