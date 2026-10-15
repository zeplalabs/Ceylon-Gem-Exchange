import { Module } from '@nestjs/common'
import { SellerProfileController } from './seller-profile.controller'
import { SellersListController } from './sellers-list.controller'

@Module({
  controllers: [SellersListController, SellerProfileController],
})
export class SellersModule {}
