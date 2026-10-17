export interface CurrencyOption {
  code: string
  /** Matches the mockup's own picker-sheet literal, e.g. "LKR — Sri Lankan rupee". */
  label: string
  symbol: string
  /** Units of this currency per 1 USD — see providers/CurrencyProvider.tsx for why this is the one conversion the app does, and why it needs no app-side content to support a new row (admin-added currencies work immediately, unlike a new language). */
  usdRate: number
}

// Used only if GET /currencies fails outright (offline dev API, request
// error) so price displays don't go blank — not shown while the request is
// merely still in flight. Matches apps/api/src/db/seed-currencies.ts.
export const FALLBACK_CURRENCY: CurrencyOption = {
  code: 'USD',
  label: 'USD — US dollar',
  symbol: '$',
  usdRate: 1,
}

// Every price in the app is authored in USD (lib/listings.ts, chat's demo
// offer) and converted here for display. Matches the mockups' own price
// style exactly: symbol, space, thousands-grouped whole units — no
// decimals, for any currency (gem prices in this marketplace are never
// quoted with cents).
export function formatAmount(amountUsd: number, option: CurrencyOption): string {
  const converted = Math.round(amountUsd * option.usdRate)
  return `${option.symbol} ${converted.toLocaleString('en-US')}`
}

// A real listing's own `priceCurrency` (e.g. "LKR") needs converting back
// to USD before it can go through `formatAmount`'s `amountUsd` param, the
// same way `useCurrency()`'s own `formatPrice` does for the active display
// currency — this is that same lookup for an arbitrary listing's currency
// instead. `currencies` is the full `GET /currencies` catalog from
// `useCurrency()`, not the active one; `null` (still loading) or an
// unrecognized code both fall back to 1 (treat as already-USD) rather than
// throwing, same spirit as `FALLBACK_CURRENCY`.
export function usdRateFor(currencies: CurrencyOption[] | null, code: string): number {
  return currencies?.find((c) => c.code === code)?.usdRate ?? 1
}
