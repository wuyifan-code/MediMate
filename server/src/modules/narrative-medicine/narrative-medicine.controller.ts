import { Controller, Post, Body } from '@nestjs/common';
import { NarrativeMedicineService } from './narrative-medicine.service';

@Controller('narrative-medicine')
export class NarrativeMedicineController {
  constructor(private readonly narrativeMedicineService: NarrativeMedicineService) {}

  @Post('generate-memo')
  async generateMemo(@Body() dto: { orderId: string }) {
    return this.narrativeMedicineService.generateRecoveryMemo(dto.orderId);
  }
}
