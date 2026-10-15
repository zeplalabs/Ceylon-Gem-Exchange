import { Module } from '@nestjs/common'
import { FavoritesController } from './favorites.controller'
import { ListingFavoriteController } from './listing-favorite.controller'

@Module({
  controllers: [FavoritesController, ListingFavoriteController],
})
export class FavoritesModule {}
