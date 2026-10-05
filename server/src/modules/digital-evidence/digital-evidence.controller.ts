import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { DigitalEvidenceService } from './digital-evidence.service';

@Controller('digital-evidence')
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
  }) {
    return this.digitalEvidenceService.submitEvidence(dto);
  }

  @Get('order/:orderId')
  async getByOrder(@Param('orderId') orderId: string) {
    return this.digitalEvidenceService.getEvidencesByOrder(orderId);
  }

  @Post('verify/:evidenceId')
  async verify(@Param('evidenceId') evidenceId: string) {
    return this.digitalEvidenceService.verifyEvidenceHash(evidenceId);
  }
}
