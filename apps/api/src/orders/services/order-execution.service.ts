import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Order } from '../entities/order.entity';
import { User } from '../../users/entities/user.entity';
import { Position } from '../../portfolio/entities/position.entity';
import { OptionPosition } from '../../portfolio/entities/option-position.entity';
import {
  OrderSide,
  OrderStatus,
  AuditAction,
  OrderCategory,
} from '../enums/order.enums';
import { OrderAuditService } from './order-audit.service';
import { EquityPositionService } from './equity-position.service';
import { OptionOrderService } from './option-order.service';
import { FinnhubService } from '../../market-data/finnhub.service';
import { TradierService } from '../../market-data/tradier.service';

/**
 * Service responsible for executing orders.
 * Handles market orders, queued orders, and conditional order execution.
 */
@Injectable()
export class OrderExecutionService {
  private readonly logger = new Logger(OrderExecutionService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Position)
    private readonly positionRepository: Repository<Position>,
    @InjectRepository(OptionPosition)
    private readonly optionPositionRepository: Repository<OptionPosition>,
    private readonly dataSource: DataSource,
    private readonly orderAuditService: OrderAuditService,
    private readonly equityPositionService: EquityPositionService,
    private readonly optionOrderService: OptionOrderService,
    private readonly finnhubService: FinnhubService,
    private readonly tradierService: TradierService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Execute a queued market order (called by queued order processor at market open).
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

    // Route option orders to option-specific execution
    if (order.orderCategory === OrderCategory.OPTION) {
      return this.executeQueuedOptionMarketOrder(order);
    }

    // Fetch current quote for execution (equity orders)
    const quote = await this.finnhubService.getQuote(order.symbol);
    if (!quote || !quote.ask || !quote.bid) {
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
          await queryRunner.manager.update(Order, orderId, {
            status: OrderStatus.CANCELLED,
            rejectionReason: 'Insufficient funds at market open',
            cancelledAt: new Date(),
          });
          await queryRunner.commitTransaction();
          await this.orderAuditService.createAuditRecord(
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
          await this.orderAuditService.createAuditRecord(
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
        limitPrice: null,
      });

      // Update position
      await this.equityPositionService.updatePositionInTransaction(
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

      await this.orderAuditService.createAuditRecord(
        updatedOrder!,
        AuditAction.FILLED,
        'Executed at market open',
        executionPrice,
      );

      // Emit order filled event for notifications
      this.eventEmitter.emit('order.filled', {
        userId: order.userId,
        orderId: order.id,
        symbol: order.symbol,
        side: order.side,
        quantity: Number(order.quantity),
        filledPrice: executionPrice,
        orderCategory: order.orderCategory || OrderCategory.EQUITY,
      });

      return updatedOrder!;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get all queued orders (for the queued order processor).
   */
  async getQueuedOrders(): Promise<Order[]> {
    return this.orderRepository.find({
      where: { status: OrderStatus.QUEUED },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Execute a queued option market order.
   */
  private async executeQueuedOptionMarketOrder(order: Order): Promise<Order> {
    if (!order.optionSymbol) {
      throw new BadRequestException(
        `Option order ${order.id} missing optionSymbol`,
      );
    }

    // Fetch current option quote from Tradier
    const quote = await this.tradierService.getOptionQuote(order.optionSymbol);
    if (!quote || !quote.ask || !quote.bid) {
      this.logger.warn(
        `Cannot execute queued option order ${order.id}: no valid quote for ${order.optionSymbol}`,
      );
      return order;
    }

    const executionPrice = order.side === OrderSide.BUY ? quote.ask : quote.bid;
    const contractMultiplier = order.contractMultiplier || 100;
    const totalPremium =
      executionPrice * Number(order.quantity) * contractMultiplier;

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

      // Get existing option position
      const existingPosition = await queryRunner.manager.findOne(
        OptionPosition,
        {
          where: { userId: order.userId, optionSymbol: order.optionSymbol },
          lock: { mode: 'pessimistic_write' },
        },
      );

      const currentQty = existingPosition
        ? Number(existingPosition.quantity)
        : 0;
      const isBuying = order.side === OrderSide.BUY;

      // Determine cash change and validate
      let cashChange: number;

      if (isBuying) {
        cashChange = -totalPremium;
        if (Number(user.cashBalance) < totalPremium) {
          await queryRunner.manager.update(Order, order.id, {
            status: OrderStatus.CANCELLED,
            rejectionReason: 'Insufficient funds at market open',
            cancelledAt: new Date(),
          });
          await queryRunner.commitTransaction();
          await this.orderAuditService.createAuditRecord(
            { ...order, status: OrderStatus.CANCELLED } as Order,
            AuditAction.CANCELLED,
            'Insufficient funds at market open',
            executionPrice,
          );
          return { ...order, status: OrderStatus.CANCELLED } as Order;
        }
      } else {
        cashChange = totalPremium;
        // Check if selling existing long position
        if (currentQty > 0 && currentQty < Number(order.quantity)) {
          await queryRunner.manager.update(Order, order.id, {
            status: OrderStatus.CANCELLED,
            rejectionReason: 'Insufficient contracts at market open',
            cancelledAt: new Date(),
          });
          await queryRunner.commitTransaction();
          await this.orderAuditService.createAuditRecord(
            { ...order, status: OrderStatus.CANCELLED } as Order,
            AuditAction.CANCELLED,
            'Insufficient contracts at market open',
            executionPrice,
          );
          return { ...order, status: OrderStatus.CANCELLED } as Order;
        }
      }

      // Update user cash
      await queryRunner.manager.update(User, user.id, {
        cashBalance: Number(user.cashBalance) + cashChange,
      });

      // Update order to filled
      const filledAt = new Date();
      await queryRunner.manager.update(Order, order.id, {
        filledQuantity: order.quantity,
        filledPrice: executionPrice,
        avgFillPrice: executionPrice,
        status: OrderStatus.FILLED,
        filledAt,
        greeksAtFill: quote.greeks || null,
      });

      // Update option position using the shared method
      await this.optionOrderService.updateOptionPositionInTransaction(
        queryRunner.manager,
        order.userId,
        order.optionSymbol,
        order.underlyingSymbol || order.symbol,
        order.optionType!,
        Number(order.strikePrice),
        order.expirationDate!.toISOString().split('T')[0],
        Number(order.quantity),
        executionPrice,
        isBuying,
        quote.greeks || null,
        order.id,
        filledAt,
      );

      await queryRunner.commitTransaction();

      const updatedOrder = await this.orderRepository.findOne({
        where: { id: order.id },
      });

      await this.orderAuditService.createAuditRecord(
        updatedOrder!,
        AuditAction.FILLED,
        'Executed at market open',
        executionPrice,
      );

      // Emit order filled event for notifications
      this.eventEmitter.emit('order.filled', {
        userId: order.userId,
        orderId: order.id,
        symbol: order.optionSymbol,
        side: order.side,
        quantity: Number(order.quantity),
        filledPrice: executionPrice,
        orderCategory: OrderCategory.OPTION,
      });

      return updatedOrder!;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Execute a conditional order (called by price monitor).
   */
  async executeConditionalOrder(
    orderId: string,
    triggerPrice: number,
    executionPrice: number,
    fillQuantity?: number,
  ): Promise<Order> {
    // First, check if this is an option order
    const orderCheck = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!orderCheck) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // Route option orders to option-specific execution
    if (orderCheck.orderCategory === OrderCategory.OPTION) {
      return this.executeConditionalOptionOrder(
        orderCheck,
        triggerPrice,
        executionPrice,
        fillQuantity,
      );
    }

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
          await queryRunner.manager.update(Order, orderId, {
            status: OrderStatus.CANCELLED,
            rejectionReason: 'Insufficient funds at execution',
            cancelledAt: new Date(),
          });
          await queryRunner.commitTransaction();
          await this.orderAuditService.createAuditRecord(
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
          await this.orderAuditService.createAuditRecord(
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

      await this.equityPositionService.updatePositionInTransaction(
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

      await this.orderAuditService.createAuditRecord(
        updatedOrder!,
        isFilled ? AuditAction.FILLED : AuditAction.PARTIALLY_FILLED,
        null,
        triggerPrice,
      );

      // Emit order filled event for notifications (only on full or partial fills)
      this.eventEmitter.emit('order.filled', {
        userId: order.userId,
        orderId: order.id,
        symbol: order.symbol,
        side: order.side,
        quantity: quantityToFill,
        filledPrice: executionPrice,
        orderCategory: order.orderCategory || OrderCategory.EQUITY,
      });

      return updatedOrder!;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Execute a conditional option order (stop, stop-limit, trailing stop).
   */
  private async executeConditionalOptionOrder(
    order: Order,
    triggerPrice: number,
    executionPrice: number,
    fillQuantity?: number,
  ): Promise<Order> {
    if (!order.optionSymbol) {
      throw new BadRequestException(
        `Option order ${order.id} missing optionSymbol`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      const lockedOrder = await queryRunner.manager.findOne(Order, {
        where: { id: order.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lockedOrder) {
        throw new NotFoundException(`Order ${order.id} not found`);
      }

      // Verify order is still executable
      if (
        ![
          OrderStatus.PENDING,
          OrderStatus.OPEN,
          OrderStatus.PARTIALLY_FILLED,
        ].includes(lockedOrder.status)
      ) {
        this.logger.warn(
          `Option order ${order.id} is not executable (status: ${lockedOrder.status})`,
        );
        await queryRunner.rollbackTransaction();
        return lockedOrder;
      }

      const quantityToFill =
        fillQuantity ||
        Number(lockedOrder.quantity) - Number(lockedOrder.filledQuantity);
      const contractMultiplier = lockedOrder.contractMultiplier || 100;
      const totalPremium = executionPrice * quantityToFill * contractMultiplier;

      const user = await queryRunner.manager.findOne(User, {
        where: { id: lockedOrder.userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Get existing option position
      const existingPosition = await queryRunner.manager.findOne(
        OptionPosition,
        {
          where: {
            userId: lockedOrder.userId,
            optionSymbol: lockedOrder.optionSymbol!,
          },
          lock: { mode: 'pessimistic_write' },
        },
      );

      const currentQty = existingPosition
        ? Number(existingPosition.quantity)
        : 0;
      const isBuying = lockedOrder.side === OrderSide.BUY;

      // Determine cash change and validate
      let cashChange: number;

      if (isBuying) {
        cashChange = -totalPremium;
        if (Number(user.cashBalance) < totalPremium) {
          await queryRunner.manager.update(Order, lockedOrder.id, {
            status: OrderStatus.CANCELLED,
            rejectionReason: 'Insufficient funds at execution',
            cancelledAt: new Date(),
          });
          await queryRunner.commitTransaction();
          await this.orderAuditService.createAuditRecord(
            { ...lockedOrder, status: OrderStatus.CANCELLED },
            AuditAction.CANCELLED,
            'Insufficient funds at execution',
            triggerPrice,
          );
          return { ...lockedOrder, status: OrderStatus.CANCELLED } as Order;
        }
      } else {
        cashChange = totalPremium;
        // Check if selling existing long position
        if (currentQty > 0 && currentQty < quantityToFill) {
          await queryRunner.manager.update(Order, lockedOrder.id, {
            status: OrderStatus.CANCELLED,
            rejectionReason: 'Insufficient contracts at execution',
            cancelledAt: new Date(),
          });
          await queryRunner.commitTransaction();
          await this.orderAuditService.createAuditRecord(
            { ...lockedOrder, status: OrderStatus.CANCELLED },
            AuditAction.CANCELLED,
            'Insufficient contracts at execution',
            triggerPrice,
          );
          return { ...lockedOrder, status: OrderStatus.CANCELLED } as Order;
        }
      }

      // Update user cash
      await queryRunner.manager.update(User, user.id, {
        cashBalance: Number(user.cashBalance) + cashChange,
      });

      // Calculate new fill quantities and average price
      const previousFilledQty = Number(lockedOrder.filledQuantity);
      const newFilledQty = previousFilledQty + quantityToFill;
      const previousAvgPrice = Number(lockedOrder.avgFillPrice) || 0;
      const newAvgPrice =
        previousFilledQty > 0
          ? (previousAvgPrice * previousFilledQty +
              executionPrice * quantityToFill) /
            newFilledQty
          : executionPrice;

      const isFilled = newFilledQty >= Number(lockedOrder.quantity);
      const newStatus = isFilled
        ? OrderStatus.FILLED
        : OrderStatus.PARTIALLY_FILLED;
      const filledAt = isFilled ? new Date() : null;

      // Get current greeks if available
      let greeksAtFill = null;
      try {
        const quote = await this.tradierService.getOptionQuote(
          lockedOrder.optionSymbol!,
        );
        greeksAtFill = quote?.greeks || null;
      } catch {
        // Ignore errors getting greeks
      }

      await queryRunner.manager.update(Order, lockedOrder.id, {
        filledQuantity: newFilledQty,
        filledPrice: executionPrice,
        avgFillPrice: newAvgPrice,
        status: newStatus,
        triggeredAt: lockedOrder.triggeredAt || new Date(),
        filledAt,
        greeksAtFill,
      });

      // Update option position using the shared method
      await this.optionOrderService.updateOptionPositionInTransaction(
        queryRunner.manager,
        lockedOrder.userId,
        lockedOrder.optionSymbol!,
        lockedOrder.underlyingSymbol || lockedOrder.symbol,
        lockedOrder.optionType!,
        Number(lockedOrder.strikePrice),
        lockedOrder.expirationDate!.toISOString().split('T')[0],
        quantityToFill,
        executionPrice,
        isBuying,
        greeksAtFill,
        lockedOrder.id,
        filledAt || new Date(),
      );

      await queryRunner.commitTransaction();

      const updatedOrder = await this.orderRepository.findOne({
        where: { id: lockedOrder.id },
      });

      await this.orderAuditService.createAuditRecord(
        updatedOrder!,
        isFilled ? AuditAction.FILLED : AuditAction.PARTIALLY_FILLED,
        null,
        triggerPrice,
      );

      // Emit order filled event for notifications
      this.eventEmitter.emit('order.filled', {
        userId: lockedOrder.userId,
        orderId: lockedOrder.id,
        symbol: lockedOrder.optionSymbol,
        side: lockedOrder.side,
        quantity: quantityToFill,
        filledPrice: executionPrice,
        orderCategory: OrderCategory.OPTION,
      });

      return updatedOrder!;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Update trailing stop peak price.
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
   * Mark stop-limit order as triggered.
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
      await this.orderAuditService.createAuditRecord(
        order,
        AuditAction.TRIGGERED,
        null,
        null,
      );
    }
  }
}
