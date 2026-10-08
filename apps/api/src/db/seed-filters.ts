import { db, pool } from './client'
import { filterGroups, filterOptions } from './schema'

// Seeds the initial filter taxonomy — ported verbatim (same groups, same
// order, same values) from apps/mobile/lib/filters.ts, which this DB-backed
// table now replaces. Re-runnable: upserts by the stable `key`/`(groupId,
// value)` uniques rather than assuming an empty table, so running it again
// after an admin dashboard has added more options won't duplicate or wipe
// anything — it only touches rows matching this seed's own keys/values.
const GROUPS: { key: string; label: string; options: string[] }[] = [
  {
    key: 'stone',
    label: 'Stone',
    options: [
      'Blue Sapphire',
      'Padparadscha',
      'Ruby',
      'Spinel',
      'Moonstone',
      "Cat's Eye",
      'Alexandrite',
    ],
  },
  {
    key: 'shape',
    label: 'Shape',
    options: ['Oval', 'Cushion', 'Round', 'Emerald cut', 'Pear'],
  },
  {
    key: 'district',
    label: 'District',
    options: [
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
  },
  {
    key: 'origin',
    label: 'Origin',
    options: ['Ratnapura', 'Elahera', 'Balangoda', 'Okkampitiya'],
  },
  {
    key: 'certificate',
    label: 'Certificate',
    options: ['GIA', 'NGJA', 'SSEF', 'Uncertified'],
  },
]

async function seed() {
  for (const [groupIndex, group] of GROUPS.entries()) {
    const [row] = await db
      .insert(filterGroups)
      .values({ key: group.key, label: group.label, displayOrder: groupIndex })
      .onConflictDoUpdate({
        target: filterGroups.key,
        set: { label: group.label, displayOrder: groupIndex },
      })
      .returning({ id: filterGroups.id })

    if (!row) {
      throw new Error(`Failed to upsert filter group "${group.key}"`)
    }

    for (const [optionIndex, value] of group.options.entries()) {
      await db
        .insert(filterOptions)
        .values({ groupId: row.id, value, displayOrder: optionIndex })
        .onConflictDoUpdate({
          target: [filterOptions.groupId, filterOptions.value],
          set: { displayOrder: optionIndex },
        })
    }

    console.warn(`Seeded "${group.label}" (${group.options.length} options)`)
  }
}

seed()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err)
    return pool.end().finally(() => process.exit(1))
  })
