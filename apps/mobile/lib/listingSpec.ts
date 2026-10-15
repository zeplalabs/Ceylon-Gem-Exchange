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
