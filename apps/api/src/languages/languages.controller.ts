import { Controller, Get } from '@nestjs/common'
import { asc, eq } from 'drizzle-orm'
import { db } from '../db/client'
import { languages } from '../db/schema'

// Public, unauthenticated — language taxonomy, not user-specific, same as
// FiltersController. Lets Account Settings' Language picker (and
// locale-settings.tsx) offer/reorder/retire languages without an app
// release; see schema.ts's `languages` table comment for what this does
// and doesn't remove the need for a release.
@Controller('languages')
export class LanguagesController {
  @Get()
  async getLanguages() {
    return db
      .select({ code: languages.code, label: languages.label })
      .from(languages)
      .where(eq(languages.isActive, true))
      .orderBy(asc(languages.displayOrder))
  }
}
