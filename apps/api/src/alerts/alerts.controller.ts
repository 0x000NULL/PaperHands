import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { AlertsService } from './services/alerts.service';
import { NotificationsService } from './services/notifications.service';
import { AlertMonitorService } from './services/alert-monitor.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';
import { QueryAlertsDto } from './dto/query-alerts.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';

@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(
    private readonly alertsService: AlertsService,
    private readonly alertMonitorService: AlertMonitorService,
  ) {}

  @Get()
  async getAlerts(@CurrentUser() user: User, @Query() query: QueryAlertsDto) {
    return this.alertsService.findAll(user.id, query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createAlert(@CurrentUser() user: User, @Body() dto: CreateAlertDto) {
    const alert = await this.alertsService.create(user.id, dto);
    // Add to monitoring cache
    this.alertMonitorService.addAlertToCache(alert);
    return alert;
  }

  @Get(':id')
  async getAlert(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.alertsService.findOne(user.id, id);
  }

  @Patch(':id')
  async updateAlert(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAlertDto,
  ) {
    const alert = await this.alertsService.update(user.id, id, dto);
    // Refresh cache if alert was reactivated
    if (dto.isActive) {
      this.alertMonitorService.addAlertToCache(alert);
    }
    return alert;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAlert(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.alertsService.delete(user.id, id);
  }

  @Post(':id/reactivate')
  async reactivateAlert(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const alert = await this.alertsService.reactivate(user.id, id);
    this.alertMonitorService.addAlertToCache(alert);
    return alert;
  }
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(
    @CurrentUser() user: User,
    @Query() query: QueryNotificationsDto,
  ) {
    return this.notificationsService.findAll(user.id, query);
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: User) {
    const count = await this.notificationsService.getUnreadCount(user.id);
    return { count };
  }

  @Patch(':id/read')
  async markAsRead(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationsService.markAsRead(user.id, id);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllAsRead(@CurrentUser() user: User) {
    await this.notificationsService.markAllAsRead(user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNotification(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.notificationsService.delete(user.id, id);
  }
}
