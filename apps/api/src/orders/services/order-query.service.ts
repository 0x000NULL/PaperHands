import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Order } from '../entities/order.entity';
import { OrderStatus, OrderType, OrderCategory } from '../enums/order.enums';
import { QueryOrdersDto } from '../dto/query-orders.dto';

/**
 * Service responsible for order query operations.
 * Handles all read-only order retrieval operations.
 */
@Injectable()
export class OrderQueryService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  /**
   * Get orders with optional filters.
   *
   * @param userId - User ID to filter by
   * @param query - Optional query filters
   * @returns Formatted order array
   */
  async getOrders(userId: string, query?: QueryOrdersDto) {
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .where('order.userId = :userId', { userId });

    if (query?.status && query.status.length > 0) {
      queryBuilder.andWhere('order.status IN (:...statuses)', {
        statuses: query.status,
      });
    }
    if (query?.symbol) {
      queryBuilder.andWhere('order.symbol = :symbol', {
        symbol: query.symbol.toUpperCase(),
      });
    }
    if (query?.side) {
      queryBuilder.andWhere('order.side = :side', { side: query.side });
    }
    if (query?.from) {
      queryBuilder.andWhere('order.createdAt >= :from', { from: query.from });
    }
    if (query?.to) {
      queryBuilder.andWhere('order.createdAt <= :to', { to: query.to });
    }

    queryBuilder
      .orderBy('order.createdAt', 'DESC')
      .skip(query?.offset || 0)
      .take(query?.limit || 50);

    const orders = await queryBuilder.getMany();
    return orders.map((order) => this.formatOrderResponse(order));
  }

  /**
   * Get pending/open orders for a user.
   *
   * @param userId - User ID
   * @returns Formatted pending orders
   */
  async getPendingOrders(userId: string) {
    const orders = await this.orderRepository.find({
      where: {
        userId,
        status: In([
          OrderStatus.PENDING,
          OrderStatus.OPEN,
          OrderStatus.PARTIALLY_FILLED,
        ]),
      },
      order: { createdAt: 'DESC' },
    });

    return orders.map((order) => this.formatOrderResponse(order));
  }

  /**
   * Get a single order by ID with authorization check.
   *
   * @param userId - User ID for authorization
   * @param orderId - Order ID to retrieve
   * @returns Formatted order
   * @throws NotFoundException if order not found
   * @throws ForbiddenException if user not authorized
   */
  async getOrder(userId: string, orderId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('Not authorized to view this order');
    }

    return this.formatOrderResponse(order);
  }

  /**
   * Get raw order by ID (for internal use, no formatting).
   *
   * @param orderId - Order ID
   * @returns Order entity or null
   */
  async getOrderById(orderId: string): Promise<Order | null> {
    return this.orderRepository.findOne({ where: { id: orderId } });
  }

  /**
   * Get raw order by ID with authorization check (for internal use).
   *
   * @param userId - User ID for authorization
   * @param orderId - Order ID
   * @returns Order entity
   * @throws NotFoundException, ForbiddenException
   */
  async getOrderByIdWithAuth(userId: string, orderId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('Not authorized to view this order');
    }

    return order;
  }

  /**
   * Get all pending conditional orders for price monitoring.
   * Used by price monitor service.
   *
   * @param symbols - Optional symbol filter
   * @param extendedHoursOnly - Only return extended hours orders
   * @returns Raw order entities
   */
  async getPendingConditionalOrders(
    symbols?: string[],
    extendedHoursOnly?: boolean,
  ): Promise<Order[]> {
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .where('order.status IN (:...statuses)', {
        statuses: [OrderStatus.PENDING, OrderStatus.OPEN],
      })
      .andWhere('order.orderType != :market', { market: OrderType.MARKET });

    if (symbols && symbols.length > 0) {
      queryBuilder.andWhere('order.symbol IN (:...symbols)', { symbols });
    }

    if (extendedHoursOnly) {
      queryBuilder.andWhere('order.extendedHours = true');
    }

    return queryBuilder.getMany();
  }

  /**
   * Get unique symbols with pending conditional orders.
   *
   * @param extendedHoursOnly - Only return extended hours symbols
   * @returns Array of unique symbols
   */
  async getActiveOrderSymbols(extendedHoursOnly?: boolean): Promise<string[]> {
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .select('DISTINCT order.symbol', 'symbol')
      .where('order.status IN (:...statuses)', {
        statuses: [OrderStatus.PENDING, OrderStatus.OPEN],
      })
      .andWhere('order.orderType != :market', { market: OrderType.MARKET });

    if (extendedHoursOnly) {
      queryBuilder.andWhere('order.extendedHours = true');
    }

    const results = await queryBuilder.getRawMany<{ symbol: string }>();
    return results.map((r) => r.symbol);
  }

  /**
   * Format an order entity for API response.
   * Handles both equity and option orders.
   *
   * @param order - Order entity to format
   * @returns Formatted order response object
   */
  formatOrderResponse(order: Order): Record<string, unknown> {
    const response: Record<string, unknown> = {
      id: order.id,
      symbol: order.symbol,
      side: order.side,
      orderType: order.orderType,
      timeInForce: order.timeInForce,
      extendedHours: order.extendedHours,
      quantity: Number(order.quantity),
      filledQuantity: Number(order.filledQuantity),
      limitPrice: order.limitPrice ? Number(order.limitPrice) : null,
      stopPrice: order.stopPrice ? Number(order.stopPrice) : null,
      trailAmount: order.trailAmount ? Number(order.trailAmount) : null,
      trailPercent: order.trailPercent ? Number(order.trailPercent) : null,
      currentTriggerPrice: order.currentTriggerPrice
        ? Number(order.currentTriggerPrice)
        : null,
      filledPrice: order.filledPrice ? Number(order.filledPrice) : null,
      avgFillPrice: order.avgFillPrice ? Number(order.avgFillPrice) : null,
      status: order.status,
      rejectionReason: order.rejectionReason,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      expiresAt: order.expiresAt,
      triggeredAt: order.triggeredAt,
      filledAt: order.filledAt,
      cancelledAt: order.cancelledAt,
      orderCategory: order.orderCategory,
    };

    // Add option-specific fields if this is an option order
    if (order.orderCategory === OrderCategory.OPTION) {
      response.optionSymbol = order.optionSymbol;
      response.underlyingSymbol = order.underlyingSymbol;
      response.optionType = order.optionType;
      response.strikePrice = order.strikePrice
        ? Number(order.strikePrice)
        : null;
      response.expirationDate = order.expirationDate;
      response.contractMultiplier = order.contractMultiplier;
      response.greeksAtFill = order.greeksAtFill;
    }

    return response;
  }
}
