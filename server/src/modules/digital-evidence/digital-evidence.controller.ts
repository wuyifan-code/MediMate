import { Controller, Post, Body, Get, Param, UseGuards, Req } from '@nestjs/common';
import { DigitalEvidenceService } from './digital-evidence.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('digital-evidence')
@UseGuards(JwtAuthGuard)
export class DigitalEvidenceController {
  constructor(private readonly digitalEvidenceService: DigitalEvidenceService) {}

  @Post('submit')
  async submit(@Body() dto: {
    orderId: string;
    nodeName: string;
    type: string;
    url?: string;
    content?: string;
    metadata?: any;
  }, @Req() req: { user: { sub: string } }) {
    return this.digitalEvidenceService.submitEvidence(dto, req.user.sub);
  }

  @Get('order/:orderId')
  async getByOrder(@Param('orderId') orderId: string, @Req() req: { user: { sub: string } }) {
    return this.digitalEvidenceService.getEvidencesByOrder(orderId, req.user.sub);
  }

  @Post('verify/:evidenceId')
  async verify(@Param('evidenceId') evidenceId: string, @Req() req: { user: { sub: string } }) {
    return this.digitalEvidenceService.verifyEvidenceHash(evidenceId, req.user.sub);
  }
}
