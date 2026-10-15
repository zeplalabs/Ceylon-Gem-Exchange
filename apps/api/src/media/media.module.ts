import { Module } from '@nestjs/common'
import { MediaController } from './media.controller'
import { ListingPhotosController } from './listing-photos.controller'

@Module({
  controllers: [MediaController, ListingPhotosController],
})
export class MediaModule {}
