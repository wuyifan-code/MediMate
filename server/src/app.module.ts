import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrdersModule } from './modules/orders/orders.module';
import { MessagesModule } from './modules/messages/messages.module';
import { HospitalsModule } from './modules/hospitals/hospitals.module';
import { EscortsModule } from './modules/escorts/escorts.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AdminModule } from './modules/admin/admin.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { HealthModule } from './modules/health/health.module';
import { AiModule } from './modules/ai/ai.module';
import { FavoritesModule } from './modules/favorites/favorites.module';

// 算法架构引擎与核心服务
import { KnowledgeGraphModule } from './modules/knowledge-graph/knowledge-graph.module';
import { DigitalEvidenceModule } from './modules/digital-evidence/digital-evidence.module';
import { NarrativeMedicineModule } from './modules/narrative-medicine/narrative-medicine.module';
import { TrustModule } from './modules/trust/trust.module';
import { MatchingModule } from './modules/matching/matching.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Rate limiting - 100 requests per minute
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    OrdersModule,
    MessagesModule,
    HospitalsModule,
    EscortsModule,
    PaymentsModule,
    AdminModule,
    ReviewsModule,
    NotificationsModule,
    UploadsModule,
    AiModule,
    FavoritesModule,
    KnowledgeGraphModule,
    DigitalEvidenceModule,
    NarrativeMedicineModule,
    TrustModule,
    MatchingModule,
  ],
})
export class AppModule {}
