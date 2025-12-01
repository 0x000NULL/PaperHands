import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, LessThan } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { Notification } from '../entities/notification.entity';
import { NotificationType } from '../enums/notification-type.enum';
import { QueryNotificationsDto } from '../dto/query-notifications.dto';
import { AlertsGateway } from '../alerts.gateway';

export interface CreateNotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface OrderFilledEvent {
  userId: string;
  orderId: string;
  symbol: string;
  side: string;
  quantity: number;
  filledPrice: number;
  orderCategory?: string;
}

export interface OptionExpiredEvent {
  userId: string;
  optionSymbol: string;
  closureType: string;
  quantity: number;
  realizedGain?: number;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    private alertsGateway: AlertsGateway,
  ) {}

  async findAll(userId: string, query: QueryNotificationsDto): Promise<{
    notifications: Notification[];
    total: number;
    unreadCount: number;
  }> {
    const where: FindOptionsWhere<Notification> = { userId };

    if (query.type) {
      where.type = query.type;
    }
    if (query.isRead !== undefined) {
      where.isRead = query.isRead;
    }

    const [notifications, total] = await this.notificationRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: query.limit,
      skip: query.offset,
    });

    const unreadCount = await this.notificationRepository.count({
      where: { userId, isRead: false },
    });

    return { notifications, total, unreadCount };
  }

  async create(payload: CreateNotificationPayload): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      metadata: payload.metadata,
      isRead: false,
    });

    const saved = await this.notificationRepository.save(notification);

    // Send real-time notification via WebSocket
    this.alertsGateway.sendToUser(payload.userId, 'notification', saved);

    return saved;
  }

  async markAsRead(userId: string, id: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    notification.isRead = true;
    return this.notificationRepository.save(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
  }

  async delete(userId: string, id: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    await this.notificationRepository.remove(notification);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, isRead: false },
    });
  }

  // Clean up old notifications (older than 30 days)
  async cleanupOldNotifications(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await this.notificationRepository.delete({
      createdAt: LessThan(thirtyDaysAgo),
      isRead: true,
    });
  }

  // Event listeners for order fills and option expirations
  @OnEvent('order.filled')
  async handleOrderFilled(payload: OrderFilledEvent): Promise<void> {
    const sideText = payload.side === 'buy' ? 'Bought' : 'Sold';
    const priceFormatted = payload.filledPrice.toFixed(2);
    const isOption = payload.orderCategory === 'OPTION';

    await this.create({
      userId: payload.userId,
      type: NotificationType.ORDER_FILLED,
      title: `Order Filled: ${payload.symbol}`,
      message: `${sideText} ${payload.quantity} ${isOption ? 'contract(s)' : 'share(s)'} @ $${priceFormatted}`,
      metadata: {
        orderId: payload.orderId,
        symbol: payload.symbol,
        side: payload.side,
        quantity: payload.quantity,
        filledPrice: payload.filledPrice,
      },
    });
  }

  @OnEvent('option.expired')
  async handleOptionExpired(payload: OptionExpiredEvent): Promise<void> {
    const closureText = this.getClosureTypeText(payload.closureType);
    const gainText = payload.realizedGain !== undefined
      ? ` (${payload.realizedGain >= 0 ? '+' : ''}$${payload.realizedGain.toFixed(2)})`
      : '';

    await this.create({
      userId: payload.userId,
      type: NotificationType.OPTION_EXPIRED,
      title: `Option ${closureText}: ${payload.optionSymbol}`,
      message: `${payload.quantity} contract(s)${gainText}`,
      metadata: {
        optionSymbol: payload.optionSymbol,
        closureType: payload.closureType,
        quantity: payload.quantity,
        realizedGain: payload.realizedGain,
      },
    });
  }

  private getClosureTypeText(closureType: string): string {
    const texts: Record<string, string> = {
      SOLD_TO_CLOSE: 'Sold',
      BOUGHT_TO_CLOSE: 'Bought',
      EXPIRED_WORTHLESS: 'Expired',
      EXERCISED: 'Exercised',
      ASSIGNED: 'Assigned',
    };
    return texts[closureType] || closureType;
  }
}
