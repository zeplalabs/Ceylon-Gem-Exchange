import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { eq, ne } from 'drizzle-orm'
import { db } from '../db/client'
import { currencies } from '../db/schema'

// open.er-api.com is a free, keyless USD-base forex feed — fine for this
// app's $0-infra local-first phase (see CLAUDE.md "Current sequencing").
// It refreshes once/day on its end, so polling it hourly would be wasted
// requests; every 6h keeps `usdRate` within a few hours of its source
// without hammering a free, unauthenticated endpoint.
const RATES_URL = 'https://open.er-api.com/v6/latest/USD'

interface RatesResponse {
  result: string
  rates: Record<string, number>
}

// Keeps `currencies.usdRate` live against a real forex feed instead of the
// static seed-currencies.ts approximation. Deliberately UPDATE-only: it
// never inserts/removes rows or touches label/symbol/displayOrder/isActive
// — the catalog itself stays admin-owned (CurrenciesController's write
// endpoints); this only refreshes the one field a human shouldn't have to
// keep re-typing. USD itself is excluded (always 1, by definition of the
// feed's base currency).
@Injectable()
export class CurrencyRatesService implements OnModuleInit {
  private readonly logger = new Logger(CurrencyRatesService.name)

  async onModuleInit() {
    await this.syncRates()
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async syncRates() {
    let rates: Record<string, number>
    try {
      const res = await fetch(RATES_URL)
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      const body = (await res.json()) as RatesResponse
      if (body.result !== 'success') throw new Error(`unexpected result: ${body.result}`)
      rates = body.rates
    } catch (err) {
      // Stale rates in the DB are strictly better than a crash or a blank
      // price — keep whatever was last synced (or the seed value, on a
      // freshly-provisioned DB) and try again on the next tick.
      this.logger.warn(`Currency rate sync failed, keeping existing rates: ${String(err)}`)
      return
    }

    const rows = await db
      .select({ id: currencies.id, code: currencies.code })
      .from(currencies)
      .where(ne(currencies.code, 'USD'))

    let updated = 0
    for (const row of rows) {
      const rate = rates[row.code]
      if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) continue

      await db
        .update(currencies)
        .set({ usdRate: rate, updatedAt: new Date() })
        .where(eq(currencies.id, row.id))
      updated += 1
    }

    this.logger.log(`Synced live rates for ${updated}/${rows.length} currencies`)
  }
}
