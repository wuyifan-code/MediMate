import { Controller, Get, Post, Delete, Body, Query, UseGuards, Request, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FavoritesService } from './favorites.service';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  async getFavorites(
    @Request() req: any,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    const userId = req.user.id;
    const items = await this.favoritesService.getFavorites(
      userId,
      parseInt(page) || 1,
      parseInt(limit) || 20,
    );
    return { success: true, data: items };
  }

  @Post()
  async addFavorite(
    @Request() req: any,
    @Body() body: { targetId: string; type: string },
  ) {
    const userId = req.user.id;
    const favorite = await this.favoritesService.addFavorite(
      userId,
      body.targetId,
      body.type,
    );
    return { success: true, data: favorite };
  }

  @Delete(':targetId')
  async removeFavorite(
    @Request() req: any,
    @Param('targetId') targetId: string,
  ) {
    const userId = req.user.id;
    await this.favoritesService.removeFavorite(userId, targetId);
    return { success: true, message: 'Removed from favorites' };
  }
}
