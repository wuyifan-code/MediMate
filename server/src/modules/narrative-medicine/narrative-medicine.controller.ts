import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { NarrativeMedicineService } from './narrative-medicine.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('narrative-medicine')
@UseGuards(JwtAuthGuard)
export class NarrativeMedicineController {
  constructor(private readonly narrativeMedicineService: NarrativeMedicineService) {}

  @Post('generate-memo')
  async generateMemo(@Body() dto: { orderId: string }, @Req() req: { user: { sub: string } }) {
    return this.narrativeMedicineService.generateRecoveryMemo(dto.orderId, req.user.sub);
  }
}
