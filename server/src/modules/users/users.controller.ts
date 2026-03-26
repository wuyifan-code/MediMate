import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/users.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Request() req: any) {
    return this.usersService.findById(req.user.sub);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.sub, dto);
  }

  @Get('escort-profile')
  @ApiOperation({ summary: 'Get escort profile (for escorts)' })
  async getEscortProfile(@Request() req: any) {
    return this.usersService.getEscortProfile(req.user.sub);
  }

  @Patch('escort-profile')
  @ApiOperation({ summary: 'Update escort profile' })
  async updateEscortProfile(
    @Request() req: any,
    @Body() data: { bio?: string; hourlyRate?: number; specialties?: string[] },
  ) {
    return this.usersService.updateEscortProfile(req.user.sub, data);
  }

  @Get('notification-settings')
  @ApiOperation({ summary: 'Get notification settings' })
  async getNotificationSettings(@Request() req: any) {
    return this.usersService.getNotificationSettings(req.user.sub);
  }

  @Patch('notification-settings')
  @ApiOperation({ summary: 'Update notification settings' })
  async updateNotificationSettings(
    @Request() req: any,
    @Body() settings: {
      emailNotifications?: boolean;
      pushNotifications?: boolean;
      smsNotifications?: boolean;
      promotionalNotifications?: boolean;
    },
  ) {
    return this.usersService.updateNotificationSettings(req.user.sub, settings);
  }
}
