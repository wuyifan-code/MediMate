import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        escortProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Remove password hash from response
    const { passwordHash, ...result } = user;
    return result;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update profile
    return this.prisma.userProfile.update({
      where: { userId },
      data: {
        name: dto.name,
        phone: dto.phone,
        bio: dto.bio,
        gender: dto.gender,
        age: dto.age,
        avatarUrl: dto.avatarUrl,
      },
    });
  }

  async getEscortProfile(userId: string) {
    const profile = await this.prisma.escortProfile.findUnique({
      where: { userId },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Escort profile not found');
    }

    return profile;
  }

  async updateEscortProfile(userId: string, data: {
    bio?: string;
    hourlyRate?: number;
    specialties?: string[];
  }) {
    return this.prisma.escortProfile.update({
      where: { userId },
      data: {
        bio: data.bio,
        hourlyRate: data.hourlyRate,
        specialties: data.specialties,
      },
    });
  }

  async getNotificationSettings(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: {
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: true,
        promotionalNotifications: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('User profile not found');
    }

    return profile;
  }

  async updateNotificationSettings(
    userId: string,
    settings: {
      emailNotifications?: boolean;
      pushNotifications?: boolean;
      smsNotifications?: boolean;
      promotionalNotifications?: boolean;
    },
  ) {
    return this.prisma.userProfile.update({
      where: { userId },
      data: settings,
    });
  }
}
