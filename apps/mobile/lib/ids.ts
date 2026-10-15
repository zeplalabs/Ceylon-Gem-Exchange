// A real `listings`/`users`/etc. row has a uuid `id`; every static fixture
// in lib/listings.ts uses a short plain string ('1'..'6', 's-*') instead —
// see chat/[id].tsx's and seller/[id].tsx's own copies of this same regex
// for the original rationale. New real/fixture branches should import this
// one rather than adding a fourth copy.
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isRealId(id: string | null | undefined) {
  return UUID_PATTERN.test(id ?? '')
}
