export interface ListingSpecDetails {
  species?: string
  caratWeight?: number
  shape?: string
  certAuthority?: string
  brand?: string
  equipmentType?: string
  condition?: string
}

// Shared by my-ads.tsx and favourites.tsx — both render a real listing's
// gem/equipment `details` (joined server-side, see GET /listings/mine and
// GET /favorites) as a short spec line on a card.
export function specForDetails(
  type: 'gem' | 'equipment',
  details: ListingSpecDetails | null | undefined,
) {
  if (!details) return ''
  if (type === 'gem') {
    return [
      details.caratWeight !== undefined ? `${details.caratWeight} ct` : null,
      details.shape,
      details.certAuthority,
    ]
      .filter(Boolean)
      .join(' · ')
  }
  return [details.brand ?? details.equipmentType, details.condition].filter(Boolean).join(' · ')
}

// `ListingCard`'s `badge` prop has no real backing concept (it's a
// fixture-only promotional label — "Live"/"Rare"/"New"/"Hot") — for a real
// listing this falls back to its species/equipment-type instead, same
// convention `seller/[id].tsx`'s own `toCard` already established.
export function badgeForDetails(
  type: 'gem' | 'equipment',
  details: ListingSpecDetails | null | undefined,
) {
  return type === 'gem' ? (details?.species ?? 'Gem') : (details?.equipmentType ?? 'Equipment')
}
