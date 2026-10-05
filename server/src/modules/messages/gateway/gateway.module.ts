import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChatGateway } from './chat.gateway';
import { MessagesService } from '../messages.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { requireJwtSecret } from '../../../common/utils/env.util';

@Module({
  imports: [
    // fail-fast：JWT_SECRET 缺失时抛错阻止启动，无默认回退
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: requireJwtSecret(),
      }),
    }),
  ],
  providers: [ChatGateway, MessagesService, PrismaService],
  exports: [ChatGateway],
})
export class GatewayModule {}
