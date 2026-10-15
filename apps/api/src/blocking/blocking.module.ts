import { Module } from '@nestjs/common'
import { BlockedUsersController } from './blocked-users.controller'
import { SellerBlockController } from './seller-block.controller'

@Module({
  controllers: [SellerBlockController, BlockedUsersController],
})
export class BlockingModule {}
