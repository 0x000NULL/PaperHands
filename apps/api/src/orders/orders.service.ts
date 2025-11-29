import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager, In } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderAudit } from './entities/order-audit.entity';
import {
  OrderSide,
  OrderType,
  OrderStatus,
  TimeInForce,
  AuditAction,
  OrderCategory,
  OptionType,
} from './enums/order.enums';
import { User } from '../users/entities/user.entity';
import { Position } from '../portfolio/entities/position.entity';
import { OptionPosition } from '../portfolio/entities/option-position.entity';
import { FinnhubService } from '../market-data/finnhub.service';
import { TradierService } from '../market-data/tradier.service';
import { MarketHoursService } from '../common/services/market-hours.service';
import { TaxLotService } from '../portfolio/services/tax-lot.service';
import { OptionTaxService } from '../portfolio/services/option-tax.service';
import { CostBasisMethod } from '../portfolio/enums/cost-basis.enums';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderAudit)
    private orderAuditRepository: Repository<OrderAudit>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Position)
    private positionRepository: Repository<Position>,
    @InjectRepository(OptionPosition)
    private optionPositionRepository: Repository<OptionPosition>,
    private finnhubService: FinnhubService,
    private tradierService: TradierService,
    private marketHoursService: MarketHoursService,
    private taxLotService: TaxLotService,
    private optionTaxService: OptionTaxService,
    private dataSource: DataSource,
  ) {}

  /**
   * Create a new order
   */
  async createOrder(userId: string, createOrderDto: CreateOrderDto) {
    // Route option orders to the dedicated handler
    if (createOrderDto.orderCategory === OrderCategory.OPTION) {
      return this.createOptionOrder(userId, createOrderDto);
    }

    const {
      symbol,
      side,
      quantity,
      orderType,
      timeInForce = TimeInForce.DAY,
      extendedHours = false,
      limitPrice,
      stopPrice,
      trailAmount,
      trailPercent,
      idempotencyKey,
    } = createOrderDto;
    const upperSymbol = symbol.toUpperCase();

    // Check for idempotency
    if (idempotencyKey) {
      const existingOrder = await this.orderRepository.findOne({
        where: { userId, idempotencyKey },
      });

      if (existingOrder) {
        return this.formatOrderResponse(existingOrder);
      }
    }

    // Get current quote for validation and immediate execution
    const quote = await this.finnhubService.getQuote(upperSymbol);
    if (!quote) {
      throw new NotFoundException(`Quote not found for ${upperSymbol}`);
    }

    const currentPrice = quote.last;
    if (!currentPrice || currentPrice <= 0) {
      throw new BadRequestException(
        `Invalid price for ${upperSymbol}. Market may be closed.`,
      );
    }

    // Validate trailing stop has either amount or percent
    if (
      orderType === OrderType.TRAILING_STOP &&
      !trailAmount &&
      !trailPercent
    ) {
      throw new BadRequestException(
        'Trailing stop orders require either trailAmount or trailPercent',
      );
    }

    // For market orders, check if market is open
    if (orderType === OrderType.MARKET) {
      const session = this.marketHoursService.getCurrentSession();

      if (session === 'regular') {
        // Market is open - execute immediately
        return this.executeMarketOrder(
          userId,
          upperSymbol,
          side,
          quantity,
          quote,
          idempotencyKey,
        );
      } else {
        // Market is closed - queue until market opens
        return this.createQueuedMarketOrder(
          userId,
          upperSymbol,
          side,
          quantity,
          quote,
          idempotencyKey,
        );
      }
    }

    // For conditional orders, validate price conditions and create pending order
    this.validateConditionalOrderPrices(
      orderType,
      side,
      currentPrice,
      limitPrice,
      stopPrice,
    );

    // Calculate available funds/shares
    if (side === OrderSide.BUY) {
      const estimatedCost = this.estimateOrderCost(
        orderType,
        quantity,
        limitPrice,
        stopPrice,
        currentPrice,
      );
      const availableCash = await this.getAvailableCash(userId);
      if (availableCash < estimatedCost) {
        throw new BadRequestException(
          `Insufficient funds. Required: $${estimatedCost.toFixed(2)}, Available: $${availableCash.toFixed(2)}`,
        );
      }
    } else {
      const availableShares = await this.getAvailableShares(
        userId,
        upperSymbol,
      );
      if (availableShares < quantity) {
        throw new BadRequestException(
          `Insufficient shares. Required: ${quantity}, Available: ${availableShares}`,
        );
      }
    }

    // Calculate expiration time
    const expiresAt =
      this.marketHoursService.calculateExpirationTime(timeInForce);

    // Calculate initial trailing peak price for trailing stops
    let trailingPeakPrice: number | null = null;
    let currentTriggerPrice: number | null = null;
    if (orderType === OrderType.TRAILING_STOP) {
      trailingPeakPrice = currentPrice;
      const offset = trailAmount || currentPrice * ((trailPercent || 0) / 100);
      currentTriggerPrice =
        side === OrderSide.SELL ? currentPrice - offset : currentPrice + offset;
    }

    // Create the pending order
    const order = this.orderRepository.create({
      userId,
      symbol: upperSymbol,
      side,
      orderType,
      timeInForce,
      extendedHours,
      quantity,
      filledQuantity: 0,
      limitPrice: limitPrice || null,
      stopPrice: stopPrice || null,
      trailAmount: trailAmount || null,
      trailPercent: trailPercent || null,
      trailingPeakPrice,
      currentTriggerPrice,
      status: OrderStatus.PENDING,
      idempotencyKey: idempotencyKey || null,
      expiresAt,
    });

    await this.orderRepository.save(order);

    // Create audit record
    await this.createAuditRecord(
      order,
      AuditAction.CREATED,
      null,
      currentPrice,
    );

    return this.formatOrderResponse(order);
  }

  /**
   * Execute a market order immediately
   */
  private async executeMarketOrder(
    userId: string,
    symbol: string,
    side: OrderSide,
    quantity: number,
    quote: { ask: number; bid: number },
    idempotencyKey?: string,
  ) {
    const executionPrice = side === OrderSide.BUY ? quote.ask : quote.bid;
    if (!executionPrice || executionPrice <= 0) {
      throw new BadRequestException(
        `Invalid price for ${symbol}. Market may be closed.`,
      );
    }

    const totalCost = executionPrice * quantity;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (side === OrderSide.BUY) {
        if (Number(user.cashBalance) < totalCost) {
          throw new BadRequestException(
            `Insufficient funds. Required: $${totalCost.toFixed(2)}, Available: $${Number(user.cashBalance).toFixed(2)}`,
          );
        }
        await queryRunner.manager.update(User, userId, {
          cashBalance: Number(user.cashBalance) - totalCost,
        });
      } else {
        const position = await queryRunner.manager.findOne(Position, {
          where: { userId, symbol },
          lock: { mode: 'pessimistic_write' },
        });

        if (!position || Number(position.quantity) < quantity) {
          const availableQty = position ? Number(position.quantity) : 0;
          throw new BadRequestException(
            `Insufficient shares. Required: ${quantity}, Available: ${availableQty}`,
          );
        }
        await queryRunner.manager.update(User, userId, {
          cashBalance: Number(user.cashBalance) + totalCost,
        });
      }

      const order = queryRunner.manager.create(Order, {
        userId,
        symbol,
        side,
        orderType: OrderType.MARKET,
        timeInForce: TimeInForce.DAY,
        quantity,
        filledQuantity: quantity,
        filledPrice: executionPrice,
        avgFillPrice: executionPrice,
        status: OrderStatus.FILLED,
        idempotencyKey: idempotencyKey || null,
        filledAt: new Date(),
      });

      await queryRunner.manager.save(order);

      await this.updatePositionInTransaction(
        queryRunner.manager,
        userId,
        symbol,
        quantity,
        executionPrice,
        side === OrderSide.BUY,
        order.id,
      );

      await queryRunner.commitTransaction();

      // Create audit record
      await this.createAuditRecord(
        order,
        AuditAction.FILLED,
        null,
        executionPrice,
      );

      return this.formatOrderResponse(order);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Create a queued market order (when market is closed)
   * The order will be executed at next market open
   */
  private async createQueuedMarketOrder(
    userId: string,
    symbol: string,
    side: OrderSide,
    quantity: number,
    quote: { ask: number; bid: number; last: number },
    idempotencyKey?: string,
  ) {
    const estimatedPrice = side === OrderSide.BUY ? quote.ask : quote.bid;
    const estimatedCost = estimatedPrice * quantity;

    // Validate funds/shares before queuing
    if (side === OrderSide.BUY) {
      const availableCash = await this.getAvailableCash(userId);
      if (availableCash < estimatedCost) {
        throw new BadRequestException(
          `Insufficient funds. Required: $${estimatedCost.toFixed(2)}, Available: $${availableCash.toFixed(2)}`,
        );
      }
    } else {
      const availableShares = await this.getAvailableShares(userId, symbol);
      if (availableShares < quantity) {
        throw new BadRequestException(
          `Insufficient shares. Required: ${quantity}, Available: ${availableShares}`,
        );
      }
    }

    // Get next market open time for the order notes
    const marketInfo = this.marketHoursService.getMarketHoursInfo();

    const order = this.orderRepository.create({
      userId,
      symbol,
      side,
      orderType: OrderType.MARKET,
      timeInForce: TimeInForce.DAY,
      quantity,
      filledQuantity: 0,
      status: OrderStatus.QUEUED,
      idempotencyKey: idempotencyKey || null,
      // Store the estimated price for reference (not binding)
      limitPrice: estimatedPrice,
    });

    await this.orderRepository.save(order);

    // Create audit record
    await this.createAuditRecord(
      order,
      AuditAction.CREATED,
      `Queued until market opens${marketInfo.nextOpen ? ` at ${marketInfo.nextOpen.toISOString()}` : ''}`,
      quote.last,
    );

    return this.formatOrderResponse(order);
  }

  /**
   * Execute a queued market order (called by queued order processor at market open)
   */
  async executeQueuedMarketOrder(orderId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (order.status !== OrderStatus.QUEUED) {
      this.logger.warn(
        `Order ${orderId} is not queued (status: ${order.status})`,
      );
      return order;
    }

    // Fetch current quote for execution
    const quote = await this.finnhubService.getQuote(order.symbol);
    if (!quote || !quote.ask || !quote.bid) {
      // Market might still be closed or symbol invalid - keep queued
      this.logger.warn(
        `Cannot execute queued order ${orderId}: no valid quote for ${order.symbol}`,
      );
      return order;
    }

    const executionPrice = order.side === OrderSide.BUY ? quote.ask : quote.bid;
    const totalCost = executionPrice * Number(order.quantity);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: { id: order.userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (order.side === OrderSide.BUY) {
        if (Number(user.cashBalance) < totalCost) {
          // Insufficient funds - cancel order
          await queryRunner.manager.update(Order, orderId, {
            status: OrderStatus.CANCELLED,
            rejectionReason: 'Insufficient funds at market open',
            cancelledAt: new Date(),
          });
          await queryRunner.commitTransaction();
          await this.createAuditRecord(
            { ...order, status: OrderStatus.CANCELLED } as Order,
            AuditAction.CANCELLED,
            'Insufficient funds at market open',
            executionPrice,
          );
          return { ...order, status: OrderStatus.CANCELLED } as Order;
        }
        await queryRunner.manager.update(User, user.id, {
          cashBalance: Number(user.cashBalance) - totalCost,
        });
      } else {
        const position = await queryRunner.manager.findOne(Position, {
          where: { userId: order.userId, symbol: order.symbol },
          lock: { mode: 'pessimistic_write' },
        });

        if (!position || Number(position.quantity) < Number(order.quantity)) {
          await queryRunner.manager.update(Order, orderId, {
            status: OrderStatus.CANCELLED,
            rejectionReason: 'Insufficient shares at market open',
            cancelledAt: new Date(),
          });
          await queryRunner.commitTransaction();
          await this.createAuditRecord(
            { ...order, status: OrderStatus.CANCELLED } as Order,
            AuditAction.CANCELLED,
            'Insufficient shares at market open',
            executionPrice,
          );
          return { ...order, status: OrderStatus.CANCELLED } as Order;
        }
        await queryRunner.manager.update(User, user.id, {
          cashBalance: Number(user.cashBalance) + totalCost,
        });
      }

      // Update order to filled
      await queryRunner.manager.update(Order, orderId, {
        filledQuantity: order.quantity,
        filledPrice: executionPrice,
        avgFillPrice: executionPrice,
        status: OrderStatus.FILLED,
        filledAt: new Date(),
        limitPrice: null, // Clear the estimated price
      });

      // Update position
      await this.updatePositionInTransaction(
        queryRunner.manager,
        order.userId,
        order.symbol,
        Number(order.quantity),
        executionPrice,
        order.side === OrderSide.BUY,
        order.id,
      );

      await queryRunner.commitTransaction();

      const updatedOrder = await this.orderRepository.findOne({
        where: { id: orderId },
      });

      await this.createAuditRecord(
        updatedOrder!,
        AuditAction.FILLED,
        'Executed at market open',
        executionPrice,
      );

      return updatedOrder!;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get all queued orders (for the queued order processor)
   */
  async getQueuedOrders(): Promise<Order[]> {
    return this.orderRepository.find({
      where: { status: OrderStatus.QUEUED },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Execute a conditional order (called by price monitor)
   */
  async executeConditionalOrder(
    orderId: string,
    triggerPrice: number,
    executionPrice: number,
    fillQuantity?: number,
  ): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      const order = await queryRunner.manager.findOne(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new NotFoundException(`Order ${orderId} not found`);
      }

      // Verify order is still executable
      if (
        ![
          OrderStatus.PENDING,
          OrderStatus.OPEN,
          OrderStatus.PARTIALLY_FILLED,
        ].includes(order.status)
      ) {
        this.logger.warn(
          `Order ${orderId} is not executable (status: ${order.status})`,
        );
        await queryRunner.rollbackTransaction();
        return order;
      }

      const quantityToFill =
        fillQuantity || Number(order.quantity) - Number(order.filledQuantity);
      const totalCost = executionPrice * quantityToFill;

      const user = await queryRunner.manager.findOne(User, {
        where: { id: order.userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check funds/shares
      if (order.side === OrderSide.BUY) {
        if (Number(user.cashBalance) < totalCost) {
          // Insufficient funds - cancel order
          await queryRunner.manager.update(Order, orderId, {
            status: OrderStatus.CANCELLED,
            rejectionReason: 'Insufficient funds at execution',
            cancelledAt: new Date(),
          });
          await queryRunner.commitTransaction();
          await this.createAuditRecord(
            { ...order, status: OrderStatus.CANCELLED },
            AuditAction.CANCELLED,
            'Insufficient funds at execution',
            triggerPrice,
          );
          return { ...order, status: OrderStatus.CANCELLED } as Order;
        }
        await queryRunner.manager.update(User, user.id, {
          cashBalance: Number(user.cashBalance) - totalCost,
        });
      } else {
        const position = await queryRunner.manager.findOne(Position, {
          where: { userId: order.userId, symbol: order.symbol },
          lock: { mode: 'pessimistic_write' },
        });

        if (!position || Number(position.quantity) < quantityToFill) {
          await queryRunner.manager.update(Order, orderId, {
            status: OrderStatus.CANCELLED,
            rejectionReason: 'Insufficient shares at execution',
            cancelledAt: new Date(),
          });
          await queryRunner.commitTransaction();
          await this.createAuditRecord(
            { ...order, status: OrderStatus.CANCELLED },
            AuditAction.CANCELLED,
            'Insufficient shares at execution',
            triggerPrice,
          );
          return { ...order, status: OrderStatus.CANCELLED } as Order;
        }
        await queryRunner.manager.update(User, user.id, {
          cashBalance: Number(user.cashBalance) + totalCost,
        });
      }

      // Calculate new fill quantities and average price
      const previousFilledQty = Number(order.filledQuantity);
      const newFilledQty = previousFilledQty + quantityToFill;
      const previousAvgPrice = Number(order.avgFillPrice) || 0;
      const newAvgPrice =
        previousFilledQty > 0
          ? (previousAvgPrice * previousFilledQty +
              executionPrice * quantityToFill) /
            newFilledQty
          : executionPrice;

      const isFilled = newFilledQty >= Number(order.quantity);
      const newStatus = isFilled
        ? OrderStatus.FILLED
        : OrderStatus.PARTIALLY_FILLED;

      await queryRunner.manager.update(Order, orderId, {
        filledQuantity: newFilledQty,
        filledPrice: executionPrice,
        avgFillPrice: newAvgPrice,
        status: newStatus,
        triggeredAt: order.triggeredAt || new Date(),
        filledAt: isFilled ? new Date() : null,
      });

      await this.updatePositionInTransaction(
        queryRunner.manager,
        order.userId,
        order.symbol,
        quantityToFill,
        executionPrice,
        order.side === OrderSide.BUY,
        order.id,
      );

      await queryRunner.commitTransaction();

      const updatedOrder = await this.orderRepository.findOne({
        where: { id: orderId },
      });

      await this.createAuditRecord(
        updatedOrder!,
        isFilled ? AuditAction.FILLED : AuditAction.PARTIALLY_FILLED,
        null,
        triggerPrice,
      );

      return updatedOrder!;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Modify a pending order
   */
  async modifyOrder(
    userId: string,
    orderId: string,
    updateDto: UpdateOrderDto,
  ) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('Not authorized to modify this order');
    }

    if (
      ![
        OrderStatus.PENDING,
        OrderStatus.OPEN,
        OrderStatus.PARTIALLY_FILLED,
      ].includes(order.status)
    ) {
      throw new BadRequestException(
        `Cannot modify order with status: ${order.status}`,
      );
    }

    // Validate quantity can only be reduced
    if (updateDto.quantity !== undefined) {
      const remainingQty =
        Number(order.quantity) - Number(order.filledQuantity);
      if (updateDto.quantity > remainingQty) {
        throw new BadRequestException(
          `Cannot increase quantity. Maximum allowed: ${remainingQty}`,
        );
      }
      if (updateDto.quantity <= 0) {
        throw new BadRequestException('Quantity must be positive');
      }
    }

    const previousState = this.orderToSnapshot(order);

    // Build update object
    const updates: Partial<Order> = {};
    if (updateDto.quantity !== undefined) {
      updates.quantity = Number(order.filledQuantity) + updateDto.quantity;
    }
    if (updateDto.limitPrice !== undefined) {
      if (![OrderType.LIMIT, OrderType.STOP_LIMIT].includes(order.orderType)) {
        throw new BadRequestException(
          'Cannot set limit price on this order type',
        );
      }
      updates.limitPrice = updateDto.limitPrice;
    }
    if (updateDto.stopPrice !== undefined) {
      if (
        ![
          OrderType.STOP,
          OrderType.STOP_LIMIT,
          OrderType.TRAILING_STOP,
        ].includes(order.orderType)
      ) {
        throw new BadRequestException(
          'Cannot set stop price on this order type',
        );
      }
      updates.stopPrice = updateDto.stopPrice;
    }
    if (updateDto.trailAmount !== undefined) {
      if (order.orderType !== OrderType.TRAILING_STOP) {
        throw new BadRequestException(
          'Cannot set trail amount on this order type',
        );
      }
      updates.trailAmount = updateDto.trailAmount;
      updates.trailPercent = null;
    }
    if (updateDto.trailPercent !== undefined) {
      if (order.orderType !== OrderType.TRAILING_STOP) {
        throw new BadRequestException(
          'Cannot set trail percent on this order type',
        );
      }
      updates.trailPercent = updateDto.trailPercent;
      updates.trailAmount = null;
    }

    await this.orderRepository.update(orderId, updates);

    const updatedOrder = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    await this.createAuditRecord(
      updatedOrder!,
      AuditAction.MODIFIED,
      `Previous: ${JSON.stringify(previousState)}`,
      null,
    );

    return this.formatOrderResponse(updatedOrder!);
  }

  /**
   * Cancel a pending order
   */
  async cancelOrder(userId: string, orderId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('Not authorized to cancel this order');
    }

    if (
      ![
        OrderStatus.PENDING,
        OrderStatus.OPEN,
        OrderStatus.PARTIALLY_FILLED,
      ].includes(order.status)
    ) {
      throw new BadRequestException(
        `Cannot cancel order with status: ${order.status}`,
      );
    }

    await this.orderRepository.update(orderId, {
      status: OrderStatus.CANCELLED,
      cancelledAt: new Date(),
    });

    const cancelledOrder = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    await this.createAuditRecord(
      cancelledOrder!,
      AuditAction.CANCELLED,
      'Cancelled by user',
      null,
    );

    return this.formatOrderResponse(cancelledOrder!);
  }

  /**
   * Get orders with optional filters
   */
  async getOrders(userId: string, query?: QueryOrdersDto) {
    const whereClause: Record<string, unknown> = { userId };

    if (query?.status && query.status.length > 0) {
      whereClause.status = In(query.status);
    }
    if (query?.symbol) {
      whereClause.symbol = query.symbol.toUpperCase();
    }
    if (query?.side) {
      whereClause.side = query.side;
    }

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
   * Get pending/open orders for a user
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
   * Get a single order by ID
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
   * Get order audit history
   */
  async getOrderHistory(userId: string, orderId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('Not authorized to view this order');
    }

    const audits = await this.orderAuditRepository.find({
      where: { orderId },
      order: { createdAt: 'ASC' },
    });

    return {
      order: this.formatOrderResponse(order),
      history: audits.map((audit) => ({
        id: audit.id,
        action: audit.action,
        triggerPrice: audit.triggerPrice ? Number(audit.triggerPrice) : null,
        notes: audit.notes,
        createdAt: audit.createdAt,
      })),
    };
  }

  /**
   * Get available cash (excluding reserved for pending buy orders)
   */
  async getAvailableCash(userId: string): Promise<number> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const result = await this.orderRepository
      .createQueryBuilder('order')
      .select(
        'SUM((order.quantity - order.filledQuantity) * COALESCE(order.limitPrice, order.stopPrice, order.currentTriggerPrice, 0))',
        'reserved',
      )
      .where('order.userId = :userId', { userId })
      .andWhere('order.status IN (:...statuses)', {
        statuses: [
          OrderStatus.PENDING,
          OrderStatus.OPEN,
          OrderStatus.PARTIALLY_FILLED,
        ],
      })
      .andWhere('order.side = :side', { side: OrderSide.BUY })
      .andWhere('order.orderType != :market', { market: OrderType.MARKET })
      .getRawOne<{ reserved: string | null }>();

    const reserved = Number(result?.reserved) || 0;
    return Number(user.cashBalance) - reserved;
  }

  /**
   * Get available shares (excluding reserved for pending sell orders)
   */
  async getAvailableShares(userId: string, symbol: string): Promise<number> {
    const position = await this.positionRepository.findOne({
      where: { userId, symbol: symbol.toUpperCase() },
    });

    if (!position) {
      return 0;
    }

    const result = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.quantity - order.filledQuantity)', 'reserved')
      .where('order.userId = :userId', { userId })
      .andWhere('order.symbol = :symbol', { symbol: symbol.toUpperCase() })
      .andWhere('order.status IN (:...statuses)', {
        statuses: [
          OrderStatus.PENDING,
          OrderStatus.OPEN,
          OrderStatus.PARTIALLY_FILLED,
        ],
      })
      .andWhere('order.side = :side', { side: OrderSide.SELL })
      .getRawOne<{ reserved: string | null }>();

    const reserved = Number(result?.reserved) || 0;
    return Number(position.quantity) - reserved;
  }

  /**
   * Get all pending orders for price monitoring (used by price monitor service)
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
   * Get unique symbols with pending conditional orders
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
   * Update trailing stop peak price
   */
  async updateTrailingStopPeak(
    orderId: string,
    newPeakPrice: number,
    newTriggerPrice: number,
  ): Promise<void> {
    await this.orderRepository.update(orderId, {
      trailingPeakPrice: newPeakPrice,
      currentTriggerPrice: newTriggerPrice,
    });
  }

  /**
   * Mark stop-limit order as triggered
   */
  async markStopLimitTriggered(orderId: string): Promise<void> {
    await this.orderRepository.update(orderId, {
      triggeredAt: new Date(),
      status: OrderStatus.OPEN,
    });

    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });
    if (order) {
      await this.createAuditRecord(order, AuditAction.TRIGGERED, null, null);
    }
  }

  // ============ Private Helper Methods ============

  private async updatePositionInTransaction(
    manager: EntityManager,
    userId: string,
    symbol: string,
    quantity: number,
    price: number,
    isBuy: boolean,
    orderId?: string,
    costBasisMethod?: CostBasisMethod,
    specificLotIds?: string[],
  ): Promise<void> {
    const existingPosition = await manager.findOne(Position, {
      where: { userId, symbol },
      lock: { mode: 'pessimistic_write' },
    });

    if (isBuy) {
      // Create tax lot for the purchase
      if (orderId) {
        await this.taxLotService.createTaxLot(
          manager,
          userId,
          symbol,
          quantity,
          price,
          orderId,
          new Date(),
        );
      }

      if (existingPosition) {
        const existingQty = Number(existingPosition.quantity);
        const existingCost = Number(existingPosition.avgCostBasis);
        const newTotalQty = existingQty + quantity;
        const newAvgCost =
          (existingQty * existingCost + quantity * price) / newTotalQty;
        await manager.update(Position, existingPosition.id, {
          quantity: newTotalQty,
          avgCostBasis: newAvgCost,
        });
      } else {
        const position = manager.create(Position, {
          userId,
          symbol,
          quantity,
          avgCostBasis: price,
        });
        await manager.save(position);
      }
    } else {
      // Consume tax lots for the sale
      if (orderId) {
        try {
          await this.taxLotService.sellShares(
            manager,
            userId,
            symbol,
            quantity,
            price,
            orderId,
            new Date(),
            costBasisMethod,
            specificLotIds,
          );
        } catch (error) {
          this.logger.warn(
            `Failed to create lot sales for order ${orderId}: ${error instanceof Error ? error.message : String(error)}`,
          );
          // Continue with position update even if lot sale fails
          // This can happen for legacy positions without tax lots
        }
      }

      if (existingPosition) {
        const existingQty = Number(existingPosition.quantity);
        const newQty = existingQty - quantity;
        if (newQty <= 0) {
          await manager.remove(existingPosition);
        } else {
          await manager.update(Position, existingPosition.id, {
            quantity: newQty,
          });
        }
      }
    }
  }

  private validateConditionalOrderPrices(
    orderType: OrderType,
    side: OrderSide,
    currentPrice: number,
    limitPrice?: number,
    stopPrice?: number,
  ): void {
    // For stop orders: buy stop above market, sell stop below market
    // Note: TRAILING_STOP doesn't use stopPrice, it uses trailAmount/trailPercent
    if (
      [OrderType.STOP, OrderType.STOP_LIMIT].includes(orderType) &&
      stopPrice
    ) {
      if (side === OrderSide.BUY && stopPrice <= currentPrice) {
        throw new BadRequestException(
          `Buy stop price must be above current price ($${currentPrice.toFixed(2)})`,
        );
      }
      if (side === OrderSide.SELL && stopPrice >= currentPrice) {
        throw new BadRequestException(
          `Sell stop price must be below current price ($${currentPrice.toFixed(2)})`,
        );
      }
    }

    // For limit orders: buy limit below market, sell limit above market
    if ([OrderType.LIMIT].includes(orderType) && limitPrice) {
      if (side === OrderSide.BUY && limitPrice >= currentPrice) {
        throw new BadRequestException(
          `Buy limit price must be below current price ($${currentPrice.toFixed(2)})`,
        );
      }
      if (side === OrderSide.SELL && limitPrice <= currentPrice) {
        throw new BadRequestException(
          `Sell limit price must be above current price ($${currentPrice.toFixed(2)})`,
        );
      }
    }
  }

  private estimateOrderCost(
    orderType: OrderType,
    quantity: number,
    limitPrice?: number,
    stopPrice?: number,
    currentPrice?: number,
  ): number {
    // Use the most conservative estimate for fund reservation
    if (limitPrice) return quantity * limitPrice;
    if (stopPrice) return quantity * stopPrice;
    if (currentPrice) return quantity * currentPrice * 1.1; // Add 10% buffer for market orders
    return 0;
  }

  private async createAuditRecord(
    order: Order,
    action: AuditAction,
    notes: string | null,
    triggerPrice: number | null,
  ): Promise<void> {
    const audit = this.orderAuditRepository.create({
      orderId: order.id,
      action,
      newState: this.orderToSnapshot(order),
      triggerPrice,
      notes,
    });
    await this.orderAuditRepository.save(audit);
  }

  private orderToSnapshot(order: Order): Record<string, unknown> {
    return {
      status: order.status,
      quantity: Number(order.quantity),
      filledQuantity: Number(order.filledQuantity),
      limitPrice: order.limitPrice ? Number(order.limitPrice) : null,
      stopPrice: order.stopPrice ? Number(order.stopPrice) : null,
      trailAmount: order.trailAmount ? Number(order.trailAmount) : null,
      trailPercent: order.trailPercent ? Number(order.trailPercent) : null,
    };
  }

  private formatOrderResponse(order: Order) {
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

  // ============ Option Order Methods ============

  /**
   * Create an option order
   */
  private async createOptionOrder(userId: string, dto: CreateOrderDto) {
    const {
      symbol, // Use as display symbol (underlying)
      side,
      quantity,
      orderType,
      timeInForce = TimeInForce.DAY,
      limitPrice,
      idempotencyKey,
      optionSymbol,
      underlyingSymbol,
      optionType,
      strikePrice,
      expirationDate,
    } = dto;

    if (
      !optionSymbol ||
      !underlyingSymbol ||
      !optionType ||
      !strikePrice ||
      !expirationDate
    ) {
      throw new BadRequestException(
        'Option orders require optionSymbol, underlyingSymbol, optionType, strikePrice, and expirationDate',
      );
    }

    // Check for idempotency
    if (idempotencyKey) {
      const existingOrder = await this.orderRepository.findOne({
        where: { userId, idempotencyKey },
      });
      if (existingOrder) {
        return this.formatOrderResponse(existingOrder);
      }
    }

    // Get option quote from Tradier
    const quote = await this.tradierService.getOptionQuote(optionSymbol);
    if (!quote) {
      throw new NotFoundException(`Quote not found for ${optionSymbol}`);
    }

    // For sell-to-open (short), check margin requirements
    const existingPosition = await this.optionPositionRepository.findOne({
      where: { userId, optionSymbol },
    });

    const isOpeningShort =
      side === OrderSide.SELL &&
      (!existingPosition || Number(existingPosition.quantity) <= 0);
    const isClosingLong =
      side === OrderSide.SELL &&
      existingPosition &&
      Number(existingPosition.quantity) > 0;
    const isOpeningLong =
      side === OrderSide.BUY &&
      (!existingPosition || Number(existingPosition.quantity) >= 0);
    const isClosingShort =
      side === OrderSide.BUY &&
      existingPosition &&
      Number(existingPosition.quantity) < 0;

    // Only support market orders for options MVP
    if (orderType !== OrderType.MARKET && orderType !== OrderType.LIMIT) {
      throw new BadRequestException(
        'Options only support market and limit orders currently',
      );
    }

    // Get execution price (use mid-price for estimates)
    const executionPrice = side === OrderSide.BUY ? quote.ask : quote.bid;
    if (!executionPrice || executionPrice <= 0) {
      throw new BadRequestException(
        `Invalid price for ${optionSymbol}. The option may not be trading.`,
      );
    }

    // Total cost = premium * quantity * multiplier (100)
    const contractMultiplier = 100;
    const totalPremium = executionPrice * quantity * contractMultiplier;

    // Validate funds/positions
    if (isOpeningLong || isClosingShort) {
      // Buying options - need cash for premium
      const availableCash = await this.getAvailableCash(userId);
      if (availableCash < totalPremium) {
        throw new BadRequestException(
          `Insufficient funds. Required: $${totalPremium.toFixed(2)}, Available: $${availableCash.toFixed(2)}`,
        );
      }
    } else if (isClosingLong) {
      // Selling to close long position
      const availableContracts = Number(existingPosition.quantity);
      if (availableContracts < quantity) {
        throw new BadRequestException(
          `Insufficient contracts. Required: ${quantity}, Available: ${availableContracts}`,
        );
      }
    } else if (isOpeningShort) {
      // Selling to open (writing options) - need margin
      const marginRequired = await this.calculateOptionMarginRequirement(
        underlyingSymbol,
        optionType,
        strikePrice,
        quantity,
        contractMultiplier,
      );
      const availableCash = await this.getAvailableCash(userId);
      if (availableCash < marginRequired) {
        throw new BadRequestException(
          `Insufficient margin. Required: $${marginRequired.toFixed(2)}, Available: $${availableCash.toFixed(2)}`,
        );
      }
    }

    // For market orders during market hours, execute immediately
    if (orderType === OrderType.MARKET) {
      const session = this.marketHoursService.getCurrentSession();
      if (session === 'regular') {
        return this.executeOptionMarketOrder(
          userId,
          optionSymbol,
          underlyingSymbol,
          symbol,
          side,
          quantity,
          optionType,
          strikePrice,
          expirationDate,
          quote,
          idempotencyKey,
        );
      }
    }

    // Create pending/limit order
    const expiresAt =
      this.marketHoursService.calculateExpirationTime(timeInForce);

    const order = this.orderRepository.create({
      userId,
      symbol,
      side,
      orderType,
      timeInForce,
      quantity,
      filledQuantity: 0,
      limitPrice: limitPrice || null,
      status:
        orderType === OrderType.MARKET
          ? OrderStatus.QUEUED
          : OrderStatus.PENDING,
      idempotencyKey: idempotencyKey || null,
      expiresAt,
      orderCategory: OrderCategory.OPTION,
      optionSymbol,
      underlyingSymbol,
      optionType,
      strikePrice,
      expirationDate: new Date(expirationDate),
      contractMultiplier,
    });

    await this.orderRepository.save(order);
    await this.createAuditRecord(
      order,
      AuditAction.CREATED,
      null,
      executionPrice,
    );

    return this.formatOrderResponse(order);
  }

  /**
   * Execute an option market order immediately
   */
  private async executeOptionMarketOrder(
    userId: string,
    optionSymbol: string,
    underlyingSymbol: string,
    displaySymbol: string,
    side: OrderSide,
    quantity: number,
    optionType: OptionType,
    strikePrice: number,
    expirationDate: string,
    quote: {
      bid: number;
      ask: number;
      greeks: {
        delta: number;
        gamma: number;
        theta: number;
        vega: number;
        rho: number;
        iv: number;
      } | null;
    },
    idempotencyKey?: string,
  ) {
    const executionPrice = side === OrderSide.BUY ? quote.ask : quote.bid;
    const contractMultiplier = 100;
    const totalPremium = executionPrice * quantity * contractMultiplier;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Get existing option position
      const existingPosition = await queryRunner.manager.findOne(
        OptionPosition,
        {
          where: { userId, optionSymbol },
          lock: { mode: 'pessimistic_write' },
        },
      );

      const currentQty = existingPosition
        ? Number(existingPosition.quantity)
        : 0;
      const isBuying = side === OrderSide.BUY;

      // Determine order effect
      let cashChange: number;

      if (isBuying) {
        // Buying: deduct premium from cash, increase position
        cashChange = -totalPremium;

        if (Number(user.cashBalance) < totalPremium) {
          throw new BadRequestException(
            `Insufficient funds. Required: $${totalPremium.toFixed(2)}, Available: $${Number(user.cashBalance).toFixed(2)}`,
          );
        }
      } else {
        // Selling: add premium to cash, decrease position
        cashChange = totalPremium;

        // If closing long position, validate quantity
        if (currentQty > 0 && currentQty < quantity) {
          throw new BadRequestException(
            `Insufficient contracts. Required: ${quantity}, Available: ${currentQty}`,
          );
        }
      }

      // Update user cash
      await queryRunner.manager.update(User, userId, {
        cashBalance: Number(user.cashBalance) + cashChange,
      });

      // Create filled order
      const order = queryRunner.manager.create(Order, {
        userId,
        symbol: displaySymbol,
        side,
        orderType: OrderType.MARKET,
        timeInForce: TimeInForce.DAY,
        quantity,
        filledQuantity: quantity,
        filledPrice: executionPrice,
        avgFillPrice: executionPrice,
        status: OrderStatus.FILLED,
        idempotencyKey: idempotencyKey || null,
        filledAt: new Date(),
        orderCategory: OrderCategory.OPTION,
        optionSymbol,
        underlyingSymbol,
        optionType,
        strikePrice,
        expirationDate: new Date(expirationDate),
        contractMultiplier,
        greeksAtFill: quote.greeks,
      });

      const savedOrder = await queryRunner.manager.save(order);

      // Update option position
      await this.updateOptionPositionInTransaction(
        queryRunner.manager,
        userId,
        optionSymbol,
        underlyingSymbol,
        optionType,
        strikePrice,
        expirationDate,
        quantity,
        executionPrice,
        isBuying,
        quote.greeks,
        savedOrder.id,
        savedOrder.filledAt ?? new Date(),
      );

      await queryRunner.commitTransaction();

      await this.createAuditRecord(
        order,
        AuditAction.FILLED,
        null,
        executionPrice,
      );

      return this.formatOrderResponse(order);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Update option position after a fill
   */
  private async updateOptionPositionInTransaction(
    manager: EntityManager,
    userId: string,
    optionSymbol: string,
    underlyingSymbol: string,
    optionType: OptionType,
    strikePrice: number,
    expirationDate: string,
    quantity: number,
    price: number,
    isBuy: boolean,
    greeks: {
      delta: number;
      gamma: number;
      theta: number;
      vega: number;
      rho: number;
      iv: number;
    } | null,
    orderId: string,
    filledAt: Date,
  ): Promise<void> {
    const existingPosition = await manager.findOne(OptionPosition, {
      where: { userId, optionSymbol },
      lock: { mode: 'pessimistic_write' },
    });

    const quantityChange = isBuy ? quantity : -quantity;

    if (existingPosition) {
      const currentQty = Number(existingPosition.quantity);
      const currentCost = Number(existingPosition.avgCostBasis);
      const newQty = currentQty + quantityChange;

      if (Math.abs(newQty) < 0.0001) {
        // Position fully closed
        if (currentQty > 0 && !isBuy) {
          // Long position being sold (sell-to-close)
          await this.optionTaxService.recordSoldToClose(
            manager,
            userId,
            existingPosition,
            quantity,
            price,
            orderId,
            filledAt,
          );
        } else if (currentQty < 0 && isBuy) {
          // Short position being bought back (buy-to-close)
          await this.optionTaxService.recordBuyToClose(
            manager,
            userId,
            existingPosition,
            quantity,
            price,
            orderId,
            filledAt,
          );
        }
        await manager.remove(existingPosition);
      } else if (
        (currentQty > 0 && newQty > 0) ||
        (currentQty < 0 && newQty < 0)
      ) {
        // Adding to existing position - calculate new average cost
        if ((isBuy && currentQty >= 0) || (!isBuy && currentQty <= 0)) {
          // Adding to position
          const newAvgCost =
            (Math.abs(currentQty) * currentCost + quantity * price) /
            Math.abs(newQty);
          await manager.update(OptionPosition, existingPosition.id, {
            quantity: newQty,
            avgCostBasis: newAvgCost,
            greeksSnapshot: greeks,
          });
        } else {
          // Reducing position - record partial closure
          if (currentQty > 0 && !isBuy) {
            // Reducing long position (sell-to-close)
            await this.optionTaxService.recordSoldToClose(
              manager,
              userId,
              existingPosition,
              quantity,
              price,
              orderId,
              filledAt,
            );
          } else if (currentQty < 0 && isBuy) {
            // Reducing short position (buy-to-close)
            await this.optionTaxService.recordBuyToClose(
              manager,
              userId,
              existingPosition,
              quantity,
              price,
              orderId,
              filledAt,
            );
          }
          await manager.update(OptionPosition, existingPosition.id, {
            quantity: newQty,
            greeksSnapshot: greeks,
          });
        }
      } else {
        // Position flip (long to short or vice versa)
        // First close the existing position fully
        if (currentQty > 0) {
          // Closing a long position - record sell-to-close for the long portion
          await this.optionTaxService.recordSoldToClose(
            manager,
            userId,
            existingPosition,
            Math.abs(currentQty),
            price,
            orderId,
            filledAt,
          );
        } else if (currentQty < 0) {
          // Closing a short position - record buy-to-close for the short portion
          await this.optionTaxService.recordBuyToClose(
            manager,
            userId,
            existingPosition,
            Math.abs(currentQty),
            price,
            orderId,
            filledAt,
          );
        }
        await manager.update(OptionPosition, existingPosition.id, {
          quantity: newQty,
          avgCostBasis: price,
          greeksSnapshot: greeks,
        });
      }
    } else {
      // Create new position
      const position = manager.create(OptionPosition, {
        userId,
        optionSymbol,
        underlyingSymbol,
        optionType,
        strikePrice,
        expirationDate: new Date(expirationDate),
        quantity: quantityChange,
        avgCostBasis: price,
        greeksSnapshot: greeks,
      });
      await manager.save(position);
    }
  }

  /**
   * Calculate margin requirement for writing (shorting) options
   * Uses a simplified model: 20% of underlying price + option premium - out of the money amount
   */
  private async calculateOptionMarginRequirement(
    underlyingSymbol: string,
    optionType: OptionType,
    strikePrice: number,
    quantity: number,
    contractMultiplier: number,
  ): Promise<number> {
    const underlyingQuote =
      await this.finnhubService.getQuote(underlyingSymbol);
    if (!underlyingQuote || !underlyingQuote.last) {
      throw new BadRequestException(
        `Cannot get quote for underlying ${underlyingSymbol}`,
      );
    }

    const underlyingPrice = underlyingQuote.last;

    // Calculate out-of-the-money amount
    let otmAmount = 0;
    if (optionType === OptionType.CALL) {
      otmAmount = Math.max(0, strikePrice - underlyingPrice);
    } else {
      otmAmount = Math.max(0, underlyingPrice - strikePrice);
    }

    // Simplified margin: 20% of underlying value - OTM amount, minimum 10%
    const baseMargin = underlyingPrice * 0.2;
    const adjustedMargin = Math.max(
      baseMargin - otmAmount,
      underlyingPrice * 0.1,
    );

    return adjustedMargin * quantity * contractMultiplier;
  }

  /**
   * Get user's option positions
   */
  async getOptionPositions(userId: string) {
    const positions = await this.optionPositionRepository.find({
      where: { userId },
      order: { expirationDate: 'ASC' },
    });

    return positions.map((pos) => ({
      id: pos.id,
      optionSymbol: pos.optionSymbol,
      underlyingSymbol: pos.underlyingSymbol,
      optionType: pos.optionType,
      strikePrice: Number(pos.strikePrice),
      expirationDate: pos.expirationDate,
      quantity: Number(pos.quantity),
      avgCostBasis: Number(pos.avgCostBasis),
      greeksSnapshot: pos.greeksSnapshot,
      createdAt: pos.createdAt,
      updatedAt: pos.updatedAt,
    }));
  }

  /**
   * Get available option contracts for selling (closing long position)
   */
  async getAvailableOptionContracts(
    userId: string,
    optionSymbol: string,
  ): Promise<number> {
    const position = await this.optionPositionRepository.findOne({
      where: { userId, optionSymbol },
    });

    if (!position || Number(position.quantity) <= 0) {
      return 0;
    }

    // Check for pending sell orders on this option
    const result = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.quantity - order.filledQuantity)', 'reserved')
      .where('order.userId = :userId', { userId })
      .andWhere('order.optionSymbol = :optionSymbol', { optionSymbol })
      .andWhere('order.status IN (:...statuses)', {
        statuses: [
          OrderStatus.PENDING,
          OrderStatus.OPEN,
          OrderStatus.PARTIALLY_FILLED,
        ],
      })
      .andWhere('order.side = :side', { side: OrderSide.SELL })
      .getRawOne<{ reserved: string | null }>();

    const reserved = Number(result?.reserved) || 0;
    return Math.max(0, Number(position.quantity) - reserved);
  }
}
