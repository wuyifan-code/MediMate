import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { requireJwtSecret } from '../../common/utils/env.util';

@Module({
  imports: [
    PassportModule,
    // registerAsync 保证密钥校验发生在依赖注入初始化阶段（ConfigModule 已加载 .env 之后），
    // JWT_SECRET 缺失时直接抛错阻止启动，无任何默认回退。
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: requireJwtSecret(),
        signOptions: {
          expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
