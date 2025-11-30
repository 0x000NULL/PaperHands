import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Order } from '../entities/order.entity';
import { User } from '../../users/entities/user.entity';
import { OptionPosition } from '../../portfolio/entities/option-position.entity';
import {
  OrderSide,
  OrderType,
  OrderStatus,
  TimeInForce,
  AuditAction,
  OrderCategory,
  OptionType,
} from '../enums/order.enums';
import { CreateOrderDto } from '../dto/create-order.dto';
import { OrderAuditService } from './order-audit.service';
import { OrderValidationService } from './order-validation.service';
import { OrderQueryService } from './order-query.service';
import { TradierService } from '../../market-data/tradier.service';
import { FinnhubService } from '../../market-data/finnhub.service';
import { MarketHoursService } from '../../common/services/market-hours.service';
import { OptionTaxService } from '../../portfolio/services/option-tax.service';

/**
 * Service responsible for option order creation and execution.
 * Handles option-specific validation, margin calculations, and position updates.
 */
@Injectable()
export class OptionOrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(OptionPosition)
    private readonly optionPositionRepository: Repository<OptionPosition>,
    private readonly dataSource: DataSource,
    private readonly orderAuditService: OrderAuditService,
    private readonly orderValidationService: OrderValidationService,
    private readonly orderQueryService: OrderQueryService,
    private readonly tradierService: TradierService,
    private readonly finnhubService: FinnhubService,
    private readonly marketHoursService: MarketHoursService,
    private readonly optionTaxService: OptionTaxService,
  ) {}

  /**
   * Create an option order.
   */
  async createOptionOrder(userId: string, dto: CreateOrderDto) {
    const {
      symbol,
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
        return this.orderQueryService.formatOrderResponse(existingOrder);
      }
    }

    // Get option quote from Tradier
    const quote = await this.tradierService.getOptionQuote(optionSymbol);
    if (!quote) {
      throw new NotFoundException(`Quote not found for ${optionSymbol}`);
    }

    // Get existing option position
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

    // Get execution price
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
      const availableCash = await this.orderValidationService.getAvailableCash(
        userId,
      );
      if (availableCash < totalPremium) {
        throw new BadRequestException(
          `Insufficient funds. Required: $${totalPremium.toFixed(2)}, Available: $${availableCash.toFixed(2)}`,
        );
      }
    } else if (isClosingLong) {
      const availableContracts = Number(existingPosition!.quantity);
      if (availableContracts < quantity) {
        throw new BadRequestException(
          `Insufficient contracts. Required: ${quantity}, Available: ${availableContracts}`,
        );
      }
    } else if (isOpeningShort) {
      const marginRequired = await this.calculateOptionMarginRequirement(
        underlyingSymbol,
        optionType,
        strikePrice,
        quantity,
        contractMultiplier,
      );
      const availableCash = await this.orderValidationService.getAvailableCash(
        userId,
      );
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
    await this.orderAuditService.createAuditRecord(
      order,
      AuditAction.CREATED,
      null,
      executionPrice,
    );

    return this.orderQueryService.formatOrderResponse(order);
  }

  /**
   * Execute an option market order immediately.
   */
  async executeOptionMarketOrder(
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
        cashChange = -totalPremium;
        if (Number(user.cashBalance) < totalPremium) {
          throw new BadRequestException(
            `Insufficient funds. Required: $${totalPremium.toFixed(2)}, Available: $${Number(user.cashBalance).toFixed(2)}`,
          );
        }
      } else {
        cashChange = totalPremium;
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

      await this.orderAuditService.createAuditRecord(
        order,
        AuditAction.FILLED,
        null,
        executionPrice,
      );

      return this.orderQueryService.formatOrderResponse(order);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Update option position after a fill.
   */
  async updateOptionPositionInTransaction(
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
        // Adding to or reducing existing position
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
          // Reducing position - record closure
          if (currentQty > 0 && !isBuy) {
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
        if (currentQty > 0) {
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
   * Calculate margin requirement for writing (shorting) options.
   * Uses a simplified model: 20% of underlying price - OTM amount, min 10%.
   */
  async calculateOptionMarginRequirement(
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
   * Get user's option positions.
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
   * Get available option contracts for selling.
   */
  async getAvailableOptionContracts(
    userId: string,
    optionSymbol: string,
  ): Promise<number> {
    return this.orderValidationService.getAvailableOptionContracts(
      userId,
      optionSymbol,
    );
  }
}
