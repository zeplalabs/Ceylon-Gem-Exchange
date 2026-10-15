import { Module } from '@nestjs/common'
import { ListingReportsController } from './listing-reports.controller'

@Module({
  controllers: [ListingReportsController],
})
export class ListingReportsModule {}
