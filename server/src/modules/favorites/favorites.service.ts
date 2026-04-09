import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async getFavorites(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const items = await this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });
    
    // In a real app, we would join with Hospital/Escort table to get details.
    // For now, we return the IDs as requested by the frontend.
    return items;
  }

  async addFavorite(userId: string, targetId: string, type: string) {
    const existing = await this.prisma.favorite.findFirst({
      where: { userId, targetId, type },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.favorite.create({
      data: {
        userId,
        targetId,
        type,
      },
    });
  }

  async removeFavorite(userId: string, targetId: string) {
    const favorite = await this.prisma.favorite.findFirst({
      where: { userId, targetId },
    });

    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }

    return this.prisma.favorite.delete({
      where: { id: favorite.id },
    });
  }
}
