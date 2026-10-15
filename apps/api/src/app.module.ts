import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthModule } from './auth/auth.module'
import { BlockingModule } from './blocking/blocking.module'
import { CurrenciesModule } from './currencies/currencies.module'
import { FavoritesModule } from './favorites/favorites.module'
import { FiltersModule } from './filters/filters.module'
import { HealthModule } from './health/health.module'
import { InquiriesModule } from './inquiries/inquiries.module'
import { LanguagesModule } from './languages/languages.module'
import { ListingReportsModule } from './listing-reports/listing-reports.module'
import { ListingsModule } from './listings/listings.module'
import { MediaModule } from './media/media.module'
import { NotificationsModule } from './notifications/notifications.module'
import { PhoneRevealModule } from './phone-reveal/phone-reveal.module'
import { SavedSearchesModule } from './saved-searches/saved-searches.module'
import { SearchModule } from './search/search.module'
import { SellersModule } from './sellers/sellers.module'
import { WebhooksModule } from './webhooks/webhooks.module'

@Module({
  imports: [
    // Shared with docker-compose.yml at the monorepo root — one source of
    // truth for local dev credentials.
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),
    // Backs CurrencyRatesService's @Cron sync — the API is a persistent
    // container (see CLAUDE.md "Stack"), so an in-process scheduler needs
    // no extra infra beyond what's already running.
    ScheduleModule.forRoot(),
    HealthModule,
    AuthModule,
    WebhooksModule,
    FiltersModule,
    LanguagesModule,
    CurrenciesModule,
    ListingsModule,
    MediaModule,
    SearchModule,
    InquiriesModule,
    PhoneRevealModule,
    FavoritesModule,
    SavedSearchesModule,
    BlockingModule,
    ListingReportsModule,
    NotificationsModule,
    SellersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
