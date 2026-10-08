import { en } from '../src/dictionaries/en'
import { si } from '../src/dictionaries/si'
import { ta } from '../src/dictionaries/ta'

// Belt-and-braces alongside each locale's `: Dictionary` exact-match typing
// in its own file: that already fails `tsc` on a missing/extra key, but
// this gives a dedicated, readable CI failure naming the exact dot-path —
// and keeps working even if the dictionary typing is ever loosened (e.g. to
// `Partial<Dictionary>`) for pragmatic reasons down the line.
function leafPaths(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) {
    return [prefix]
  }
  return Object.entries(value).flatMap(([key, nested]) =>
    leafPaths(nested, prefix ? `${prefix}.${key}` : key),
  )
}

const enPaths = new Set(leafPaths(en))
const otherLocales: { name: string; dictionary: unknown }[] = [
  { name: 'si', dictionary: si },
  { name: 'ta', dictionary: ta },
]

let hasMismatch = false

for (const { name, dictionary } of otherLocales) {
  const paths = new Set(leafPaths(dictionary))
  const missing = [...enPaths].filter((path) => !paths.has(path)).sort()
  const extra = [...paths].filter((path) => !enPaths.has(path)).sort()

  if (missing.length === 0 && extra.length === 0) {
    console.error(`✓ ${enPaths.size} translation keys match between en and ${name}`)
    continue
  }

  hasMismatch = true
  if (missing.length > 0) {
    console.error(`Missing from ${name}.ts (${missing.length}):`)
    for (const path of missing) console.error(`  - ${path}`)
  }
  if (extra.length > 0) {
    console.error(`In ${name}.ts but not en.ts (${extra.length}):`)
    for (const path of extra) console.error(`  - ${path}`)
  }
}

process.exit(hasMismatch ? 1 : 0)
