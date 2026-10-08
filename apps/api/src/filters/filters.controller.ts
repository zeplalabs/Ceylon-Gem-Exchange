import { Controller, Get } from '@nestjs/common'
import { asc, eq } from 'drizzle-orm'
import { db } from '../db/client'
import { filterGroups, filterOptions } from '../db/schema'

// Public, unauthenticated — this is taxonomy data (Stone/Shape/District/...
// and their options), not anything user-specific, so buyers browsing
// before sign-in can load it same as signed-in ones.
@Controller('filters')
export class FiltersController {
  @Get()
  async getFilters() {
    const [groups, options] = await Promise.all([
      db
        .select()
        .from(filterGroups)
        .where(eq(filterGroups.isActive, true))
        .orderBy(asc(filterGroups.displayOrder)),
      db
        .select()
        .from(filterOptions)
        .where(eq(filterOptions.isActive, true))
        .orderBy(asc(filterOptions.displayOrder)),
    ])

    const optionsByGroupId = new Map<string, string[]>()
    for (const option of options) {
      const list = optionsByGroupId.get(option.groupId) ?? []
      list.push(option.value)
      optionsByGroupId.set(option.groupId, list)
    }

    // Keyed by `label`, not the stable `key` slug — apps/mobile's filter
    // sheet currently uses the display label itself as both the UI text
    // and the local filter-pick state key (ported as-is from the static
    // object this replaces, see apps/mobile/hooks/useFilters.ts). Revisit
    // if a group's label ever needs to change independently of what
    // in-flight client state keys off.
    const result: Record<string, string[]> = {}
    for (const group of groups) {
      result[group.label] = optionsByGroupId.get(group.id) ?? []
    }
    return result
  }
}
