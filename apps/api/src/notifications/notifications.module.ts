import { Module } from '@nestjs/common'
import { NotificationsController } from './notifications.controller'
import { SavedSearchDigestService } from './saved-search-digest.service'

@Module({
  controllers: [NotificationsController],
  providers: [SavedSearchDigestService],
})
export class NotificationsModule {}
