import { Module } from '@nestjs/common'
import { PhoneRevealController } from './phone-reveal.controller'

@Module({
  controllers: [PhoneRevealController],
})
export class PhoneRevealModule {}
