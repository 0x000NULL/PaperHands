import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { Order } from '../../orders/entities/order.entity';
import { OrderAudit } from '../../orders/entities/order-audit.entity';
import { OrderStatus } from '../../orders/enums/order.enums';
import { User } from '../../users/entities/user.entity';
import { AdminAuditService } from './admin-audit.service';
import { AdminAuditAction } from '../enums/admin-audit-action.enum';
import { QueryOrdersDto } from '../dto/query-orders.dto';
import { PaginatedResponse } from '../dto/paginated-response.dto';

export interface OrderStatistics {
  total: number;
  byStatus: Record<string, number>;
  today: number;
  thisWeek: number;
}

@Injectable()
export class AdminOrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderAudit)
    private orderAuditRepository: Repository<OrderAudit>,
    private adminAuditService: AdminAuditService,
  ) {}

  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return request.ip ?? '0.0.0.0';
  }

  async findAllOrders(
    query: QueryOrdersDto,
  ): Promise<PaginatedResponse<Order>> {
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user');

    if (query.userId) {
      queryBuilder.andWhere('order.userId = :userId', { userId: query.userId });
    }

    if (query.status?.length) {
      queryBuilder.andWhere('order.status IN (:...statuses)', {
        statuses: query.status,
      });
    }

    if (query.symbol) {
      queryBuilder.andWhere('order.symbol = :symbol', { symbol: query.symbol });
    }

    if (query.side) {
      queryBuilder.andWhere('order.side = :side', { side: query.side });
    }

    if (query.orderCategory) {
      queryBuilder.andWhere('order.orderCategory = :orderCategory', {
        orderCategory: query.orderCategory,
      });
    }

    if (query.from) {
      queryBuilder.andWhere('order.createdAt >= :from', { from: query.from });
    }

    if (query.to) {
      queryBuilder.andWhere('order.createdAt <= :to', { to: query.to });
    }

    const total = await queryBuilder.getCount();

    queryBuilder
      .orderBy('order.createdAt', 'DESC')
      .skip(query.offset ?? 0)
      .take(query.limit ?? 20);

    const data = await queryBuilder.getMany();

    return {
      data,
      total,
      limit: query.limit ?? 20,
      offset: query.offset ?? 0,
      hasMore: (query.offset ?? 0) + data.length < total,
    };
  }

  async findOrderById(
    orderId: string,
  ): Promise<{ order: Order; audits: OrderAudit[] }> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['user'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const audits = await this.orderAuditRepository.find({
      where: { orderId },
      order: { createdAt: 'ASC' },
    });

    return { order, audits };
  }

  async getOrderStatistics(): Promise<OrderStatistics> {
    const total = await this.orderRepository.count();

    // Count by status
    const statusCounts = await this.orderRepository
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('order.status')
      .getRawMany<{ status: string; count: string }>();

    const byStatus: Record<string, number> = {};
    for (const row of statusCounts) {
      byStatus[row.status] = parseInt(row.count, 10);
    }

    // Today's orders
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const today = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.createdAt >= :todayStart', { todayStart })
      .getCount();

    // This week's orders
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const thisWeek = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.createdAt >= :weekStart', { weekStart })
      .getCount();

    return {
      total,
      byStatus,
      today,
      thisWeek,
    };
  }

  async cancelOrderAsAdmin(
    admin: User,
    orderId: string,
    reason: string,
    request: Request,
  ): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Only allow cancelling pending/open/queued orders
    const cancellableStatuses = [
      OrderStatus.PENDING,
      OrderStatus.OPEN,
      OrderStatus.QUEUED,
    ];

    if (!cancellableStatuses.includes(order.status)) {
      throw new BadRequestException(
        `Cannot cancel order with status ${order.status}`,
      );
    }

    const previousStatus = order.status;
    order.status = OrderStatus.CANCELLED;

    await this.orderRepository.save(order);

    // Log the admin action
    await this.adminAuditService.logAction({
      adminId: admin.id,
      action: AdminAuditAction.ORDER_CANCELLED,
      targetUserId: order.userId,
      previousState: { orderId, status: previousStatus },
      newState: { orderId, status: OrderStatus.CANCELLED },
      reason,
      ipAddress: this.getClientIp(request),
      userAgent: request.headers['user-agent'],
    });

    return order;
  }
}
