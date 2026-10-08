import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthModule } from './auth/auth.module'
import { CurrenciesModule } from './currencies/currencies.module'
import { FiltersModule } from './filters/filters.module'
import { HealthModule } from './health/health.module'
import { LanguagesModule } from './languages/languages.module'
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
