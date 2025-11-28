import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThanOrEqual } from 'typeorm';
import { Order } from '../entities/order.entity';
import { OrderAudit } from '../entities/order-audit.entity';
import { OrderStatus, TimeInForce, AuditAction } from '../enums/order.enums';

@Injectable()
export class OrderExpirationService {
  private readonly logger = new Logger(OrderExpirationService.name);

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderAudit)
    private orderAuditRepository: Repository<OrderAudit>,
  ) {}

  /**
   * Check for expired orders every minute
   * This handles orders with explicit expiresAt timestamps
   */
  @Cron('0 * * * * *') // Every minute at :00
  async expireOrders(): Promise<void> {
    const now = new Date();

    try {
      const expiredOrders = await this.orderRepository.find({
        where: {
          status: In([
            OrderStatus.PENDING,
            OrderStatus.OPEN,
            OrderStatus.PARTIALLY_FILLED,
          ]),
          expiresAt: LessThanOrEqual(now),
        },
      });

      if (expiredOrders.length === 0) {
        return;
      }

      this.logger.log(`Found ${expiredOrders.length} orders to expire`);

      for (const order of expiredOrders) {
        await this.expireOrder(order, 'Order expired');
      }
    } catch (error) {
      this.logger.error('Error expiring orders:', error);
    }
  }

  /**
   * Expire all DAY orders at market close (4 PM ET, Mon-Fri)
   */
  @Cron('0 0 16 * * 1-5', { timeZone: 'America/New_York' })
  async expireDayOrders(): Promise<void> {
    try {
      const dayOrders = await this.orderRepository.find({
        where: {
          status: In([
            OrderStatus.PENDING,
            OrderStatus.OPEN,
            OrderStatus.PARTIALLY_FILLED,
          ]),
          timeInForce: TimeInForce.DAY,
        },
      });

      if (dayOrders.length === 0) {
        return;
      }

      this.logger.log(
        `Expiring ${dayOrders.length} DAY orders at market close`,
      );

      for (const order of dayOrders) {
        await this.expireOrder(order, 'Day order expired at market close');
      }
    } catch (error) {
      this.logger.error('Error expiring day orders:', error);
    }
  }

  /**
   * Expire a single order
   */
  private async expireOrder(order: Order, reason: string): Promise<void> {
    const now = new Date();

    await this.orderRepository.update(order.id, {
      status: OrderStatus.EXPIRED,
      cancelledAt: now,
      rejectionReason: reason,
    });

    // Create audit record
    await this.orderAuditRepository.save({
      orderId: order.id,
      action: AuditAction.EXPIRED,
      newState: {
        status: OrderStatus.EXPIRED,
        cancelledAt: now,
      },
      notes: reason,
    });

    this.logger.log(`Expired order ${order.id}: ${reason}`);
  }
}
