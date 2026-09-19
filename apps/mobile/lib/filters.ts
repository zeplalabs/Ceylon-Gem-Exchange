// Filter taxonomy for Home's filter sheet — ported verbatim from the
// mockup's own `groups` data. Deliberately English-only and not routed
// through the i18n dictionary: like `countries.ts`, this is domain/taxonomy
// data (gem varieties, Sri Lankan districts, certification bodies), not UI
// copy — translating "Blue Sapphire" or "Ratnapura" independently of the
// untranslated option list it sits in would read as inconsistent. Revisit
// if/when the product actually needs localized gem-trade terminology.
export const filterGroups = {
  Stone: [
    'Blue Sapphire',
    'Padparadscha',
    'Ruby',
    'Spinel',
    'Moonstone',
    "Cat's Eye",
    'Alexandrite',
  ],
  Shape: ['Oval', 'Cushion', 'Round', 'Emerald cut', 'Pear'],
  District: [
    'Ratnapura',
    'Colombo',
    'Gampaha',
    'Kalutara',
    'Kandy',
    'Matale',
    'Nuwara Eliya',
    'Galle',
    'Matara',
    'Hambantota',
    'Jaffna',
    'Kilinochchi',
    'Mannar',
    'Vavuniya',
    'Mullaitivu',
    'Batticaloa',
    'Ampara',
    'Trincomalee',
    'Kurunegala',
    'Puttalam',
    'Anuradhapura',
    'Polonnaruwa',
    'Badulla',
    'Monaragala',
    'Kegalle',
  ],
  Origin: ['Ratnapura', 'Elahera', 'Balangoda', 'Okkampitiya'],
  Certificate: ['GIA', 'NGJA', 'SSEF', 'Uncertified'],
} as const

export type FilterGroupKey = keyof typeof filterGroups
