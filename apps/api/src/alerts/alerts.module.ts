import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Alert } from './entities/alert.entity';
import { Notification } from './entities/notification.entity';
import { AlertsController, NotificationsController } from './alerts.controller';
import { AlertsService } from './services/alerts.service';
import { NotificationsService } from './services/notifications.service';
import { AlertMonitorService } from './services/alert-monitor.service';
import { AlertsGateway } from './alerts.gateway';
import { PortfolioModule } from '../portfolio/portfolio.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Alert, Notification]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
    PortfolioModule,
  ],
  controllers: [AlertsController, NotificationsController],
  providers: [
    AlertsService,
    NotificationsService,
    AlertMonitorService,
    AlertsGateway,
  ],
  exports: [AlertsService, NotificationsService, AlertsGateway],
})
export class AlertsModule {}
