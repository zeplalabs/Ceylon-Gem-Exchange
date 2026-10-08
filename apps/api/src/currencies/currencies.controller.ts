import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { asc, eq } from 'drizzle-orm'
import { ClerkAuthGuard } from '../auth/clerk-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { db } from '../db/client'
import { currencies } from '../db/schema'

interface CurrencyBody {
  code?: string
  label?: string
  symbol?: string
  usdRate?: number
  displayOrder?: number
  isActive?: boolean
}

function assertValidCreate(body: CurrencyBody) {
  if (!body.code || !body.label || !body.symbol) {
    throw new BadRequestException('code, label, and symbol are required')
  }
  if (typeof body.usdRate !== 'number' || !Number.isFinite(body.usdRate) || body.usdRate <= 0) {
    throw new BadRequestException('usdRate must be a positive number')
  }
}

// GET is public, unauthenticated — currency taxonomy, not user-specific,
// same as FiltersController/LanguagesController. The write endpoints below
// are the admin-panel surface this table exists for (see schema.ts's
// `currencies` comment) — gated the same way the existing `GET /me/admin-
// check` endpoint is (`ClerkAuthGuard` + `RolesGuard` + `@Roles('admin')`),
// there's no separate admin app yet to call them from, but the API side
// doesn't need one to exist first.
@Controller('currencies')
export class CurrenciesController {
  @Get()
  async getCurrencies() {
    return db
      .select({
        id: currencies.id,
        code: currencies.code,
        label: currencies.label,
        symbol: currencies.symbol,
        usdRate: currencies.usdRate,
      })
      .from(currencies)
      .where(eq(currencies.isActive, true))
      .orderBy(asc(currencies.displayOrder))
  }

  @Post()
  @UseGuards(ClerkAuthGuard, RolesGuard)
  @Roles('admin')
  async createCurrency(@Body() body: CurrencyBody) {
    assertValidCreate(body)

    const [row] = await db
      .insert(currencies)
      .values({
        code: body.code!,
        label: body.label!,
        symbol: body.symbol!,
        usdRate: body.usdRate!,
        displayOrder: body.displayOrder ?? 0,
        isActive: body.isActive ?? true,
      })
      .returning()

    return row
  }

  // Partial update — every field optional, only what's supplied changes.
  // Used both for editing an existing currency's rate/label/symbol and for
  // retiring one (`isActive: false`) without losing its history the way a
  // hard delete would (DELETE below still exists for a genuine mistake).
  @Patch(':id')
  @UseGuards(ClerkAuthGuard, RolesGuard)
  @Roles('admin')
  async updateCurrency(@Param('id') id: string, @Body() body: CurrencyBody) {
    if (body.usdRate !== undefined && (!Number.isFinite(body.usdRate) || body.usdRate <= 0)) {
      throw new BadRequestException('usdRate must be a positive number')
    }

    const [row] = await db
      .update(currencies)
      .set({
        ...(body.code !== undefined && { code: body.code }),
        ...(body.label !== undefined && { label: body.label }),
        ...(body.symbol !== undefined && { symbol: body.symbol }),
        ...(body.usdRate !== undefined && { usdRate: body.usdRate }),
        ...(body.displayOrder !== undefined && { displayOrder: body.displayOrder }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        updatedAt: new Date(),
      })
      .where(eq(currencies.id, id))
      .returning()

    if (!row) {
      throw new NotFoundException(`No currency with id ${id}`)
    }
    return row
  }

  @Delete(':id')
  @UseGuards(ClerkAuthGuard, RolesGuard)
  @Roles('admin')
  async deleteCurrency(@Param('id') id: string) {
    const [row] = await db.delete(currencies).where(eq(currencies.id, id)).returning({
      id: currencies.id,
    })

    if (!row) {
      throw new NotFoundException(`No currency with id ${id}`)
    }
    return { deleted: true }
  }
}
