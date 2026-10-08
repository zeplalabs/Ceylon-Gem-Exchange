import { Module } from '@nestjs/common'
import { CurrenciesController } from './currencies.controller'
import { CurrencyRatesService } from './currency-rates.service'

@Module({
  controllers: [CurrenciesController],
  providers: [CurrencyRatesService],
})
export class CurrenciesModule {}
