import { Module } from '@nestjs/common'
import { InquiriesController } from './inquiries.controller'
import { MyInquiriesController } from './my-inquiries.controller'

@Module({
  controllers: [InquiriesController, MyInquiriesController],
})
export class InquiriesModule {}
