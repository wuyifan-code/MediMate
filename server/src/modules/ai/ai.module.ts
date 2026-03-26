import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { MiniMaxProvider } from './providers/minimax.provider';

@Module({
  controllers: [AiController],
  providers: [AiService, MiniMaxProvider],
  exports: [AiService],
})
export class AiModule {}
