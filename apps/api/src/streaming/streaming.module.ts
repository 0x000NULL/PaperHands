import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { TradierStreamService } from './services/tradier-stream.service';
import { SubscriptionService } from './services/subscription.service';
import { StreamingGateway } from './gateways/streaming.gateway';
import { WsJwtGuard } from './guards/ws-jwt.guard';

@Module({
  imports: [
    CacheModule.register(),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    TradierStreamService,
    SubscriptionService,
    StreamingGateway,
    WsJwtGuard,
  ],
  exports: [TradierStreamService, SubscriptionService],
})
export class StreamingModule {}
