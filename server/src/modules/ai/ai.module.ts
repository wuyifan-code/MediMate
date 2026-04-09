import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { MiniMaxProvider } from './providers/minimax.provider';

@Module({
  imports: [ConfigModule],
  controllers: [AiController],
  providers: [AiService, MiniMaxProvider],
  exports: [AiService],
})
export class AiModule {}
