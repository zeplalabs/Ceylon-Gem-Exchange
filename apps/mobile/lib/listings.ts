export interface Listing {
  id: string
  name: string
  spec: string
  price: string
  badge: string
}

// Placeholder demo data, ported verbatim from the Home mockup's `adData` —
// there's no listings API/Typesense index wired up yet (see CLAUDE.md's
// "Current sequencing"). Swap for a real fetch once the backend exists;
// the shape here (name/spec/price/badge) is what `ListingCard` expects.
export const featuredListings: Listing[] = [
  {
    id: '1',
    name: 'Ceylon Blue Sapphire',
    spec: '3.14 ct · Oval · GIA',
    price: '$ 8,400',
    badge: 'Live',
  },
  {
    id: '2',
    name: 'Padparadscha',
    spec: '2.02 ct · Cushion · SSEF',
    price: '$ 14,900',
    badge: 'Rare',
  },
  {
    id: '3',
    name: 'Star Ruby Cabochon',
    spec: '5.60 ct · Cabochon',
    price: '$ 3,250',
    badge: 'New',
  },
  {
    id: '4',
    name: 'Natural Spinel',
    spec: '1.88 ct · Round · NGJA',
    price: '$ 1,980',
    badge: 'Live',
  },
  {
    id: '5',
    name: "Cat's Eye Chrysoberyl",
    spec: '4.35 ct · Oval',
    price: '$ 6,700',
    badge: 'Hot',
  },
  { id: '6', name: 'Rainbow Moonstone', spec: '6.10 ct · Pear', price: '$ 890', badge: 'New' },
]

export const defaultLikedIds = new Set(['1', '4'])

export interface ListingDetail extends Listing {
  lotNumber: string
  weight: string
  shape: string
  colour: string
  clarity: string
  origin: string
  treatment: string
  dimensions: string
  cutGrade: string
  refractiveIndex: string
  listedDate: string
  description: string
  sellerName: string
  sellerMeta: string
  /** E.164 — feeds the action bar's real `tel:`/`wa.me` links. */
  sellerPhone: string
  certNumber: string
  certIssued: string
  /** Number of gallery placeholder slots to render (hero + thumbnail strip). */
  photoCount: number
}

// Placeholder demo detail data, same situation as `featuredListings` above
// (no backend yet). Only item '1' is the mockup's own real content (see
// "Ceylon Gem Exchange Listing Detail.dc.html") — it and `featuredListings[0]`
// are the same lot by design. The rest are plausible, invented detail for
// the other Home cards so every tap leads somewhere real rather than a
// dead end; not mockup-sourced.
const listingDetails: Record<string, ListingDetail> = {
  '1': {
    ...featuredListings[0]!,
    lotNumber: 'Lot #CGX-2418',
    weight: '3.14 ct',
    shape: 'Oval',
    colour: 'Royal blue',
    clarity: 'VS / eye-clean',
    origin: 'Ratnapura, Sri Lanka',
    treatment: 'Unheated',
    dimensions: '9.2 × 7.4 × 5.1 mm',
    cutGrade: 'Excellent',
    refractiveIndex: '1.762 – 1.770',
    listedDate: '12 Aug 2026',
    description:
      'A vivid royal-blue sapphire from the Ratnapura alluvial fields, cut as a brilliant oval with excellent symmetry. No heat treatment, eye-clean under 10× loupe, with strong saturation holding under both daylight and incandescent light.',
    sellerName: 'Perera Gem House',
    sellerMeta: 'NGJA licensed · 214 lots sold · 4.9 ★',
    sellerPhone: '+94712345678',
    certNumber: 'GIA Report 2215486301',
    certIssued: 'Issued 12 Mar 2026 · verified by the exchange',
    photoCount: 4,
  },
  '2': {
    ...featuredListings[1]!,
    lotNumber: 'Lot #CGX-2419',
    weight: '2.02 ct',
    shape: 'Cushion',
    colour: 'Pinkish orange',
    clarity: 'VVS / eye-clean',
    origin: 'Embilipitiya, Sri Lanka',
    treatment: 'Unheated',
    dimensions: '7.6 × 6.9 × 4.4 mm',
    cutGrade: 'Very good',
    refractiveIndex: '1.760 – 1.768',
    listedDate: '3 Sep 2026',
    description:
      'A rare unheated padparadscha with a balanced pink-orange hue, cushion-cut to maximise face-up colour. SSEF-certified with no indications of treatment.',
    sellerName: 'Fernando Lapidary',
    sellerMeta: 'NGJA licensed · 96 lots sold · 4.8 ★',
    sellerPhone: '+94772345678',
    certNumber: 'SSEF Report 118453',
    certIssued: 'Issued 20 Jul 2026 · verified by the exchange',
    photoCount: 3,
  },
  '3': {
    ...featuredListings[2]!,
    lotNumber: 'Lot #CGX-2420',
    weight: '5.60 ct',
    shape: 'Cabochon',
    colour: 'Deep red',
    clarity: 'Translucent',
    origin: 'Mogok, Myanmar',
    treatment: 'Heated',
    dimensions: '11.4 × 9.8 × 6.2 mm',
    cutGrade: '—',
    refractiveIndex: '1.762 – 1.770',
    listedDate: '28 Aug 2026',
    description:
      'A well-domed star ruby cabochon showing a sharp six-ray asterism under a single light source. Traditionally heat-treated to improve clarity, a widely accepted practice for this material.',
    sellerName: 'Silva Gem Traders',
    sellerMeta: 'NGJA licensed · 58 lots sold · 4.7 ★',
    sellerPhone: '+94752345678',
    certNumber: 'GIA Report 2215491207',
    certIssued: 'Issued 2 Aug 2026 · verified by the exchange',
    photoCount: 3,
  },
  '4': {
    ...featuredListings[3]!,
    lotNumber: 'Lot #CGX-2421',
    weight: '1.88 ct',
    shape: 'Round',
    colour: 'Vivid pink',
    clarity: 'VS / eye-clean',
    origin: 'Mogok, Myanmar',
    treatment: 'Untreated',
    dimensions: '6.9 × 6.9 × 4.6 mm',
    cutGrade: 'Excellent',
    refractiveIndex: '1.712 – 1.717',
    listedDate: '15 Sep 2026',
    description:
      'A bright, untreated natural spinel with an even round brilliant cut and vivid pink saturation that reads clean under both daylight and incandescent light.',
    sellerName: 'Perera Gem House',
    sellerMeta: 'NGJA licensed · 214 lots sold · 4.9 ★',
    sellerPhone: '+94712345678',
    certNumber: 'NGJA Report 44921',
    certIssued: 'Issued 10 Sep 2026 · verified by the exchange',
    photoCount: 4,
  },
  '5': {
    ...featuredListings[4]!,
    lotNumber: 'Lot #CGX-2422',
    weight: '4.35 ct',
    shape: 'Oval',
    colour: 'Honey brown',
    clarity: 'Eye-clean',
    origin: 'Elahera, Sri Lanka',
    treatment: 'Untreated',
    dimensions: '10.8 × 8.1 × 5.6 mm',
    cutGrade: 'Very good',
    refractiveIndex: '1.746 – 1.755',
    listedDate: '6 Sep 2026',
    description:
      "A well-cut cat's eye chrysoberyl with a tight, centred chatoyant band that stays sharp as the light source moves across it.",
    sellerName: 'Bandara Fine Gems',
    sellerMeta: 'NGJA licensed · 37 lots sold · 4.6 ★',
    sellerPhone: '+94762345678',
    certNumber: 'NGJA Report 44888',
    certIssued: 'Issued 30 Aug 2026 · verified by the exchange',
    photoCount: 3,
  },
  '6': {
    ...featuredListings[5]!,
    lotNumber: 'Lot #CGX-2423',
    weight: '6.10 ct',
    shape: 'Pear',
    colour: 'Blue sheen',
    clarity: 'Eye-clean',
    origin: 'Meetiyagoda, Sri Lanka',
    treatment: 'Untreated',
    dimensions: '14.2 × 9.6 × 5.8 mm',
    cutGrade: '—',
    refractiveIndex: '1.518 – 1.526',
    listedDate: '18 Sep 2026',
    description:
      'A classic Sri Lankan rainbow moonstone, pear-cut to show a broad, centred blue sheen (adularescence) that moves smoothly across the stone.',
    sellerName: 'Wickrama Gems',
    sellerMeta: 'NGJA licensed · 81 lots sold · 4.7 ★',
    sellerPhone: '+94782345678',
    certNumber: 'NGJA Report 44955',
    certIssued: 'Issued 17 Sep 2026 · verified by the exchange',
    photoCount: 4,
  },
}

export function getListingDetail(id: string): ListingDetail | undefined {
  return listingDetails[id]
}
