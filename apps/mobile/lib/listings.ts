export interface Listing {
  id: string
  name: string
  spec: string
  /** Always USD — the app's one real currency conversion happens at display time, via `useCurrency()` + `lib/currency.ts`'s `formatCurrency`, not here. */
  priceUsd: number
  badge: string
}

// Placeholder demo data, ported verbatim from the Home mockup's `adData` —
// there's no listings API/Typesense index wired up yet (see CLAUDE.md's
// "Current sequencing"). Swap for a real fetch once the backend exists;
// the shape here (name/spec/priceUsd/badge) is what `ListingCard` expects.
export const featuredListings: Listing[] = [
  {
    id: '1',
    name: 'Ceylon Blue Sapphire',
    spec: '3.14 ct · Oval · GIA',
    priceUsd: 8400,
    badge: 'Live',
  },
  {
    id: '2',
    name: 'Padparadscha',
    spec: '2.02 ct · Cushion · SSEF',
    priceUsd: 14900,
    badge: 'Rare',
  },
  {
    id: '3',
    name: 'Star Ruby Cabochon',
    spec: '5.60 ct · Cabochon',
    priceUsd: 3250,
    badge: 'New',
  },
  {
    id: '4',
    name: 'Natural Spinel',
    spec: '1.88 ct · Round · NGJA',
    priceUsd: 1980,
    badge: 'Live',
  },
  {
    id: '5',
    name: "Cat's Eye Chrysoberyl",
    spec: '4.35 ct · Oval',
    priceUsd: 6700,
    badge: 'Hot',
  },
  { id: '6', name: 'Rainbow Moonstone', spec: '6.10 ct · Pear', priceUsd: 890, badge: 'New' },
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
  /** Static-fixture seller id — keys `SELLER_PROFILES` below and routes `/seller/[id]`'s static path (see that screen's own comment). Several listings share a seller id (e.g. '1' and '4' are both Perera Gem House), same as the real world. */
  sellerId: string
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
    sellerId: 's-perera',
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
    sellerId: 's-fernando',
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
    sellerId: 's-silva',
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
    sellerId: 's-perera',
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
    sellerId: 's-bandara',
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
    sellerId: 's-wickrama',
    certNumber: 'NGJA Report 44955',
    certIssued: 'Issued 17 Sep 2026 · verified by the exchange',
    photoCount: 4,
  },
}

export function getListingDetail(id: string): ListingDetail | undefined {
  return listingDetails[id]
}

export interface SellerProfile {
  id: string
  name: string
  location: string
  since: string
  bio: string
  licence: string
  office: string
  hours: string
  languages: string
  payments: string
  rating: number
  /** Only set for the stores.tsx directory's own 7 fixture entries — the Stores list's "(186)" count. No real review system exists to back this for a real seller either (see sellers-list.controller.ts's own comment). */
  reviewCount?: number
  lotsSold: number
  replyTime: string
  listingIds: string[]
  /** Storefront.html's "Shop gallery" row — set only for the 7 directory fixtures (see DEFAULT_GALLERY_LABELS below). A real seller has no photo backend at all yet (same recurring gap as every other image area in this app), so that section is simply omitted on the real path rather than showing a fabricated "See all N" count. */
  galleryLabels?: string[]
}

// Reused by every directory fixture seller below — plausible, invented
// placeholder captions (same spirit as their bios), not meant to be
// per-seller-distinct since there's no real photo behind any of them.
const DEFAULT_GALLERY_LABELS = ['Showroom', 'Cutting bench', 'Rough parcels']

// Static-fixture counterpart to the real `GET /sellers/:id` response (see
// apps/api/src/sellers/seller-profile.controller.ts) — same reasoning as
// chat/[id].tsx's dual real/static path: every current entry point into
// Seller Profile (Listing Detail's seller row) still passes one of these
// synthetic `s-*` ids, since Listing Detail itself isn't wired to the real
// API yet. One profile per unique seller across the 6 listing fixtures
// above (Perera Gem House sells both '1' and '4'). `licence`/`office`/
// `hours`/`languages`/`payments`/`rating`/`lotsSold`/`replyTime` have no
// real backing data anywhere (same gap the real endpoint's own comment
// documents) — this is the mockup's own demo content, not derived from
// anything.
const SELLER_PROFILES: Record<string, SellerProfile> = {
  's-perera': {
    id: 's-perera',
    name: 'Perera Gem House',
    location: 'Ratnapura, Sri Lanka',
    since: '2011',
    bio: 'Family-run gem house trading Ratnapura sapphires, padparadscha and spinel since 2011. Every stone is sold with an independent lab report, and viewings are available at our office by appointment.',
    licence: 'NGJA · PL/2011/0418',
    office: 'Main St, Ratnapura',
    hours: 'Mon–Sat, 9:00–17:30',
    languages: 'Sinhala, English, Tamil',
    payments: 'Escrow, bank transfer',
    rating: 4.9,
    reviewCount: 186,
    lotsSold: 214,
    replyTime: '~5 min',
    listingIds: ['1', '4'],
    galleryLabels: DEFAULT_GALLERY_LABELS,
  },
  's-fernando': {
    id: 's-fernando',
    name: 'Fernando Lapidary',
    location: 'Embilipitiya, Sri Lanka',
    since: '2015',
    bio: 'Specialists in unheated padparadscha and fancy-colour sapphires, cut and polished in-house. Certificates from SSEF and GIA accompany every stone.',
    licence: 'NGJA · PL/2015/0732',
    office: 'Pallegama Rd, Embilipitiya',
    hours: 'Mon–Sat, 9:00–17:00',
    languages: 'Sinhala, English',
    payments: 'Escrow, bank transfer',
    rating: 4.8,
    lotsSold: 96,
    replyTime: '~15 min',
    listingIds: ['2'],
  },
  's-silva': {
    id: 's-silva',
    name: 'Silva Gem Traders',
    location: 'Colombo, Sri Lanka',
    since: '2009',
    bio: 'Trading Sri Lankan and Myanmar coloured stones for over 15 years, with a focus on rubies and star sapphires sourced directly from mining cooperatives.',
    licence: 'NGJA · PL/2009/0206',
    office: 'Sea St, Colombo 11',
    hours: 'Mon–Sat, 9:30–18:00',
    languages: 'Sinhala, English, Tamil',
    payments: 'Escrow, bank transfer, cash',
    rating: 4.7,
    lotsSold: 58,
    replyTime: '~20 min',
    listingIds: ['3'],
  },
  's-bandara': {
    id: 's-bandara',
    name: 'Bandara Fine Gems',
    location: 'Elahera, Sri Lanka',
    since: '2017',
    bio: "Boutique dealer focused on cat's eye chrysoberyl and alexandrite from the Elahera gem fields, each stone personally inspected before listing.",
    licence: 'NGJA · PL/2017/0951',
    office: 'Elahera–Dambulla Rd, Elahera',
    hours: 'Tue–Sun, 10:00–17:00',
    languages: 'Sinhala, English',
    payments: 'Escrow, bank transfer',
    rating: 4.6,
    lotsSold: 37,
    replyTime: '~30 min',
    listingIds: ['5'],
  },
  's-wickrama': {
    id: 's-wickrama',
    name: 'Wickrama Gems',
    location: 'Meetiyagoda, Sri Lanka',
    since: '2013',
    bio: 'Third-generation moonstone miners and dealers from Meetiyagoda, the historic source of Sri Lankan blue-sheen moonstone.',
    licence: 'NGJA · PL/2013/0384',
    office: 'Galle Rd, Meetiyagoda',
    hours: 'Mon–Sat, 8:30–17:00',
    languages: 'Sinhala, English',
    payments: 'Escrow, bank transfer',
    rating: 4.7,
    lotsSold: 81,
    replyTime: '~10 min',
    listingIds: ['6'],
  },
  // The 6 below back stores.tsx's directory (see getStoreDirectory) —
  // ported from "Ceylon Gem Exchange Stores.html"'s own 7 cards (Perera
  // Gem House above is the 7th, already a seller). No listing fixture
  // references these ids, so their Seller Profile "Listings" tab is
  // genuinely empty rather than fabricated — same "plausible, invented,
  // not mockup-sourced" bio/office/licence content as every other
  // SellerProfile entry past the first.
  's-ratnapura-traders': {
    id: 's-ratnapura-traders',
    name: 'Ratnapura Gem Traders',
    location: 'Ratnapura, Sri Lanka',
    since: '2008',
    bio: 'One of Ratnapura’s longest-running trading houses, sourcing directly from local pit mines and offering lab-certified blue and yellow sapphires.',
    licence: 'NGJA · PL/2008/0129',
    office: 'Gem Bureau Rd, Ratnapura',
    hours: 'Mon–Sat, 9:00–17:30',
    languages: 'Sinhala, English',
    payments: 'Escrow, bank transfer',
    rating: 4.8,
    reviewCount: 142,
    lotsSold: 167,
    replyTime: '~10 min',
    listingIds: [],
    galleryLabels: DEFAULT_GALLERY_LABELS,
  },
  's-beruwala-lapidary': {
    id: 's-beruwala-lapidary',
    name: 'Beruwala Lapidary',
    location: 'Beruwala, Sri Lanka',
    since: '2014',
    bio: 'A cutting and polishing workshop on the Beruwala gem corridor, specialising in precision faceting for sapphire, spinel and garnet.',
    licence: 'NGJA · PL/2014/0607',
    office: 'Dharga Town, Beruwala',
    hours: 'Mon–Sat, 8:30–17:00',
    languages: 'Sinhala, English, Tamil',
    payments: 'Escrow, bank transfer',
    rating: 4.7,
    reviewCount: 98,
    lotsSold: 112,
    replyTime: '~20 min',
    listingIds: [],
    galleryLabels: DEFAULT_GALLERY_LABELS,
  },
  's-elahera-mining': {
    id: 's-elahera-mining',
    name: 'Elahera Mining Co.',
    location: 'Elahera, Sri Lanka',
    since: '2005',
    bio: 'A licensed mining cooperative working the Elahera gem fields, selling rough and cut stones straight from its own pits.',
    licence: 'NGJA · PL/2005/0073',
    office: 'Elahera Gem Fields, Elahera',
    hours: 'Tue–Sun, 9:00–16:30',
    languages: 'Sinhala, English',
    payments: 'Escrow, cash',
    rating: 4.6,
    reviewCount: 73,
    lotsSold: 64,
    replyTime: '~45 min',
    listingIds: [],
    galleryLabels: DEFAULT_GALLERY_LABELS,
  },
  's-colombo-bureau': {
    id: 's-colombo-bureau',
    name: 'Colombo Gem Bureau',
    location: 'Colombo, Sri Lanka',
    since: '2010',
    bio: 'A Colombo showroom and export house handling certified Ceylon sapphires, with in-house photography and international shipping.',
    licence: 'NGJA · PL/2010/0355',
    office: 'York St, Colombo 1',
    hours: 'Mon–Sat, 9:30–18:30',
    languages: 'Sinhala, English, Tamil',
    payments: 'Escrow, bank transfer, card',
    rating: 4.9,
    reviewCount: 211,
    lotsSold: 248,
    replyTime: '~5 min',
    listingIds: [],
    galleryLabels: DEFAULT_GALLERY_LABELS,
  },
  's-kandy-sapphire': {
    id: 's-kandy-sapphire',
    name: 'Kandy Sapphire Studio',
    location: 'Kandy, Sri Lanka',
    since: '2016',
    bio: 'A boutique Kandy studio pairing in-house faceting with custom jewellery settings for its own certified sapphires.',
    licence: 'NGJA · PL/2016/0820',
    office: 'Peradeniya Rd, Kandy',
    hours: 'Mon–Sat, 10:00–18:00',
    languages: 'Sinhala, English',
    payments: 'Escrow, bank transfer',
    rating: 4.5,
    reviewCount: 54,
    lotsSold: 41,
    replyTime: '~25 min',
    listingIds: [],
    galleryLabels: DEFAULT_GALLERY_LABELS,
  },
  's-galle-fort': {
    id: 's-galle-fort',
    name: 'Galle Fort Gems',
    location: 'Galle, Sri Lanka',
    since: '2012',
    bio: 'A Galle Fort gem house trading coloured stones for the export and tourist trade, with every lot independently certified.',
    licence: 'NGJA · PL/2012/0481',
    office: 'Church St, Galle Fort',
    hours: 'Mon–Sun, 9:00–19:00',
    languages: 'Sinhala, English',
    payments: 'Escrow, bank transfer, card',
    rating: 4.8,
    reviewCount: 120,
    lotsSold: 139,
    replyTime: '~15 min',
    listingIds: [],
    galleryLabels: DEFAULT_GALLERY_LABELS,
  },
}

export function getSellerProfile(id: string): SellerProfile | undefined {
  return SELLER_PROFILES[id]
}

// The Stores directory (apps/mobile/app/stores.tsx) — exactly the 7
// stores "Ceylon Gem Exchange Stores.html" shows, in the mockup's own
// order, each a real lookup key into SELLER_PROFILES so tapping a card
// opens a fully real Seller Profile rather than a dead end.
const STORE_DIRECTORY_IDS = [
  's-perera',
  's-ratnapura-traders',
  's-beruwala-lapidary',
  's-elahera-mining',
  's-colombo-bureau',
  's-kandy-sapphire',
  's-galle-fort',
]

export function getStoreDirectory(): SellerProfile[] {
  return STORE_DIRECTORY_IDS.map((id) => SELLER_PROFILES[id]!)
}
