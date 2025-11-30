import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order } from '../entities/order.entity';
import { MultiLegOrder } from '../entities/multi-leg-order.entity';
import { MultiLegOrderLeg } from '../entities/multi-leg-order-leg.entity';
import { User } from '../../users/entities/user.entity';
import { OptionPosition } from '../../portfolio/entities/option-position.entity';
import {
  OrderSide,
  OrderType,
  OrderStatus,
  TimeInForce,
  OrderCategory,
  OptionType,
} from '../enums/order.enums';
import { MultiLegStrategyType, MultiLegStatus } from '../enums/multi-leg.enums';
import { OrderAuditService } from './order-audit.service';
import { TradierService } from '../../market-data/tradier.service';
import { MarketHoursService } from '../../common/services/market-hours.service';

interface LegDefinition {
  /** OCC option symbol or null for auto-build */
  optionSymbol?: string;
  /** Underlying symbol */
  underlyingSymbol: string;
  /** Option type */
  optionType: OptionType;
  /** Strike price */
  strikePrice: number;
  /** Expiration date (YYYY-MM-DD) */
  expirationDate: string;
  /** Buy or Sell */
  side: OrderSide;
  /** Number of contracts */
  quantity: number;
}

interface MultiLegOrderRequest {
  /** Strategy type */
  strategyType: MultiLegStrategyType;
  /** Underlying symbol */
  underlyingSymbol: string;
  /** Individual legs */
  legs: LegDefinition[];
  /** Net price limit (debit = negative, credit = positive) */
  netPriceLimit?: number;
}

interface MultiLegOrderResult {
  multiLegOrderId: string;
  status: MultiLegStatus;
  strategyType: MultiLegStrategyType;
  underlyingSymbol: string;
  legs: {
    optionSymbol: string;
    side: OrderSide;
    quantity: number;
    fillPrice: number;
  }[];
  netDebitCredit: number;
  maxProfit: number | null;
  maxLoss: number | null;
}

/**
 * Service for creating and executing multi-leg option orders.
 * Handles atomic execution of spreads, condors, and other strategies.
 */
@Injectable()
export class MultiLegOrderService {
  private readonly logger = new Logger(MultiLegOrderService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(MultiLegOrder)
    private readonly multiLegOrderRepository: Repository<MultiLegOrder>,
    @InjectRepository(MultiLegOrderLeg)
    private readonly multiLegOrderLegRepository: Repository<MultiLegOrderLeg>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(OptionPosition)
    private readonly optionPositionRepository: Repository<OptionPosition>,
    private readonly dataSource: DataSource,
    private readonly orderAuditService: OrderAuditService,
    private readonly tradierService: TradierService,
    private readonly marketHoursService: MarketHoursService,
  ) {}

  /**
   * Execute a multi-leg option order atomically.
   */
  async executeMultiLegOrder(
    userId: string,
    request: MultiLegOrderRequest,
  ): Promise<MultiLegOrderResult> {
    const { strategyType, underlyingSymbol, legs, netPriceLimit } = request;

    if (!legs || legs.length < 2) {
      throw new BadRequestException('Multi-leg orders require at least 2 legs');
    }

    // Validate strategy structure
    this.validateStrategyLegs(strategyType, legs);

    // Build option symbols and get quotes for all legs
    const legData = await Promise.all(
      legs.map(async (leg) => {
        const optionSymbol =
          leg.optionSymbol ||
          this.buildOptionSymbol(
            leg.underlyingSymbol,
            leg.expirationDate,
            leg.optionType,
            leg.strikePrice,
          );

        const quote = await this.tradierService.getOptionQuote(optionSymbol);
        if (!quote) {
          throw new BadRequestException(
            `Cannot get quote for option ${optionSymbol}`,
          );
        }

        // Get execution price based on side
        const fillPrice = leg.side === OrderSide.BUY ? quote.ask : quote.bid;
        if (!fillPrice || fillPrice <= 0) {
          throw new BadRequestException(
            `Invalid price for ${optionSymbol}. The option may not be trading.`,
          );
        }

        return {
          ...leg,
          optionSymbol,
          fillPrice,
          greeks: quote.greeks,
        };
      }),
    );

    // Calculate net debit/credit
    const contractMultiplier = 100;
    let netDebitCredit = 0;
    for (const leg of legData) {
      const legValue = leg.fillPrice * leg.quantity * contractMultiplier;
      if (leg.side === OrderSide.BUY) {
        netDebitCredit -= legValue; // Buying costs money
      } else {
        netDebitCredit += legValue; // Selling receives money
      }
    }

    // Check price limit if specified
    if (netPriceLimit !== undefined) {
      // For credits: netDebitCredit should be >= netPriceLimit
      // For debits: netDebitCredit should be >= netPriceLimit (less negative)
      if (netDebitCredit < netPriceLimit) {
        throw new BadRequestException(
          `Net price of $${netDebitCredit.toFixed(2)} does not meet limit of $${netPriceLimit.toFixed(2)}`,
        );
      }
    }

    // Calculate strategy metrics
    const { maxProfit, maxLoss } = this.calculateStrategyMetrics(
      strategyType,
      legData,
      contractMultiplier,
    );

    // Check market hours
    const session = this.marketHoursService.getCurrentSession();
    if (session !== 'regular') {
      throw new BadRequestException(
        'Multi-leg orders can only be executed during regular market hours',
      );
    }

    // Execute atomically
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

      // Check cash for net debit
      if (
        netDebitCredit < 0 &&
        Number(user.cashBalance) < Math.abs(netDebitCredit)
      ) {
        throw new BadRequestException(
          `Insufficient funds. Net debit: $${Math.abs(netDebitCredit).toFixed(2)}, Available: $${Number(user.cashBalance).toFixed(2)}`,
        );
      }

      const fillTime = new Date();

      // Create multi-leg order record
      const multiLegOrder = queryRunner.manager.create(MultiLegOrder, {
        userId,
        strategyType,
        underlyingSymbol,
        status: MultiLegStatus.PENDING,
        totalLegs: legs.length,
        netDebitCredit,
        maxProfit,
        maxLoss,
      });

      const savedMultiLeg = await queryRunner.manager.save(multiLegOrder);

      // Create individual leg orders
      const savedLegs: MultiLegOrderLeg[] = [];
      for (let i = 0; i < legData.length; i++) {
        const leg = legData[i];

        // Create the order
        const order = queryRunner.manager.create(Order, {
          userId,
          symbol: underlyingSymbol,
          side: leg.side,
          orderType: OrderType.MARKET,
          timeInForce: TimeInForce.DAY,
          quantity: leg.quantity,
          filledQuantity: leg.quantity,
          filledPrice: leg.fillPrice,
          avgFillPrice: leg.fillPrice,
          status: OrderStatus.FILLED,
          filledAt: fillTime,
          orderCategory: OrderCategory.OPTION,
          optionSymbol: leg.optionSymbol,
          underlyingSymbol: leg.underlyingSymbol,
          optionType: leg.optionType,
          strikePrice: leg.strikePrice,
          expirationDate: new Date(leg.expirationDate),
          contractMultiplier,
          multiLegOrderId: savedMultiLeg.id,
          greeksAtFill: leg.greeks,
        });

        const savedOrder = await queryRunner.manager.save(order);

        // Create leg record
        const orderLeg = queryRunner.manager.create(MultiLegOrderLeg, {
          multiLegOrderId: savedMultiLeg.id,
          orderId: savedOrder.id,
          legIndex: i,
          optionSymbol: leg.optionSymbol,
          optionType: leg.optionType,
          strikePrice: leg.strikePrice,
          expirationDate: new Date(leg.expirationDate),
          side: leg.side,
          quantity: leg.quantity,
          fillPrice: leg.fillPrice,
          greeksAtFill: leg.greeks,
        });

        const savedLeg = await queryRunner.manager.save(orderLeg);
        savedLegs.push(savedLeg);

        // Update option position
        await this.updateOptionPosition(
          queryRunner.manager,
          userId,
          leg.optionSymbol,
          leg.underlyingSymbol,
          leg.optionType,
          leg.strikePrice,
          leg.expirationDate,
          leg.quantity,
          leg.fillPrice,
          leg.side === OrderSide.BUY,
          leg.greeks,
          savedMultiLeg.id,
        );
      }

      // Update cash balance
      await queryRunner.manager.update(User, userId, {
        cashBalance: Number(user.cashBalance) + netDebitCredit,
      });

      // Update multi-leg order status
      await queryRunner.manager.update(MultiLegOrder, savedMultiLeg.id, {
        status: MultiLegStatus.FILLED,
        filledAt: fillTime,
      });

      await queryRunner.commitTransaction();

      this.logger.log(
        `Executed ${strategyType} on ${underlyingSymbol} for user ${userId}: ` +
          `${legs.length} legs, net ${netDebitCredit >= 0 ? 'credit' : 'debit'} $${Math.abs(netDebitCredit).toFixed(2)}`,
      );

      return {
        multiLegOrderId: savedMultiLeg.id,
        status: MultiLegStatus.FILLED,
        strategyType,
        underlyingSymbol,
        legs: savedLegs.map((l) => ({
          optionSymbol: l.optionSymbol,
          side: l.side,
          quantity: l.quantity,
          fillPrice: Number(l.fillPrice),
        })),
        netDebitCredit,
        maxProfit,
        maxLoss,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Validate strategy legs match expected structure.
   */
  private validateStrategyLegs(
    strategyType: MultiLegStrategyType,
    legs: LegDefinition[],
  ): void {
    switch (strategyType) {
      case MultiLegStrategyType.BULL_CALL_SPREAD:
      case MultiLegStrategyType.BEAR_CALL_SPREAD:
        if (legs.length !== 2) {
          throw new BadRequestException('Call spreads require exactly 2 legs');
        }
        if (legs.some((l) => l.optionType !== OptionType.CALL)) {
          throw new BadRequestException(
            'Call spreads must use call options only',
          );
        }
        break;

      case MultiLegStrategyType.BULL_PUT_SPREAD:
      case MultiLegStrategyType.BEAR_PUT_SPREAD:
        if (legs.length !== 2) {
          throw new BadRequestException('Put spreads require exactly 2 legs');
        }
        if (legs.some((l) => l.optionType !== OptionType.PUT)) {
          throw new BadRequestException(
            'Put spreads must use put options only',
          );
        }
        break;

      case MultiLegStrategyType.LONG_STRADDLE:
      case MultiLegStrategyType.SHORT_STRADDLE:
        if (legs.length !== 2) {
          throw new BadRequestException('Straddles require exactly 2 legs');
        }
        if (
          !legs.some((l) => l.optionType === OptionType.CALL) ||
          !legs.some((l) => l.optionType === OptionType.PUT)
        ) {
          throw new BadRequestException(
            'Straddles require one call and one put',
          );
        }
        break;

      case MultiLegStrategyType.LONG_STRANGLE:
      case MultiLegStrategyType.SHORT_STRANGLE:
        if (legs.length !== 2) {
          throw new BadRequestException('Strangles require exactly 2 legs');
        }
        if (
          !legs.some((l) => l.optionType === OptionType.CALL) ||
          !legs.some((l) => l.optionType === OptionType.PUT)
        ) {
          throw new BadRequestException(
            'Strangles require one call and one put',
          );
        }
        break;

      case MultiLegStrategyType.IRON_CONDOR: {
        if (legs.length !== 4) {
          throw new BadRequestException('Iron condors require exactly 4 legs');
        }
        const calls = legs.filter((l) => l.optionType === OptionType.CALL);
        const puts = legs.filter((l) => l.optionType === OptionType.PUT);
        if (calls.length !== 2 || puts.length !== 2) {
          throw new BadRequestException(
            'Iron condors require 2 calls and 2 puts',
          );
        }
        break;
      }

      case MultiLegStrategyType.IRON_BUTTERFLY:
        if (legs.length !== 4) {
          throw new BadRequestException(
            'Iron butterflies require exactly 4 legs',
          );
        }
        break;

      case MultiLegStrategyType.CUSTOM:
        // No specific validation for custom strategies
        break;

      default:
        // Allow other strategy types without strict validation
        break;
    }
  }

  /**
   * Calculate max profit and max loss for strategy.
   */
  private calculateStrategyMetrics(
    strategyType: MultiLegStrategyType,
    legs: Array<LegDefinition & { fillPrice: number }>,
    multiplier: number,
  ): { maxProfit: number | null; maxLoss: number | null } {
    // Calculate net debit/credit
    let netDebitCredit = 0;
    for (const leg of legs) {
      const legValue = leg.fillPrice * leg.quantity * multiplier;
      if (leg.side === OrderSide.BUY) {
        netDebitCredit -= legValue;
      } else {
        netDebitCredit += legValue;
      }
    }

    // Get strikes sorted
    const strikes = [...new Set(legs.map((l) => l.strikePrice))].sort(
      (a, b) => a - b,
    );
    const quantity = legs[0]?.quantity ?? 1;

    switch (strategyType) {
      case MultiLegStrategyType.BULL_CALL_SPREAD:
      case MultiLegStrategyType.BEAR_PUT_SPREAD: {
        // Debit spreads
        const maxLoss = Math.abs(netDebitCredit);
        const width = (strikes[1] - strikes[0]) * quantity * multiplier;
        const maxProfit = width - maxLoss;
        return { maxProfit, maxLoss };
      }

      case MultiLegStrategyType.BEAR_CALL_SPREAD:
      case MultiLegStrategyType.BULL_PUT_SPREAD: {
        // Credit spreads
        const maxProfit = netDebitCredit;
        const width = (strikes[1] - strikes[0]) * quantity * multiplier;
        const maxLoss = width - maxProfit;
        return { maxProfit, maxLoss };
      }

      case MultiLegStrategyType.IRON_CONDOR:
      case MultiLegStrategyType.IRON_BUTTERFLY: {
        // Iron strategies (credit)
        const maxProfit = netDebitCredit;
        // Max loss is the wider wing minus credit received
        const wingWidth = Math.max(
          strikes[1] - strikes[0],
          strikes[3] - strikes[2],
        );
        const maxLoss = wingWidth * quantity * multiplier - maxProfit;
        return { maxProfit, maxLoss };
      }

      case MultiLegStrategyType.LONG_STRADDLE:
      case MultiLegStrategyType.LONG_STRANGLE: {
        // Long volatility strategies
        const maxLoss = Math.abs(netDebitCredit);
        return { maxProfit: null, maxLoss }; // Unlimited profit potential
      }

      case MultiLegStrategyType.SHORT_STRADDLE:
      case MultiLegStrategyType.SHORT_STRANGLE: {
        // Short volatility strategies
        const maxProfit = netDebitCredit;
        return { maxProfit, maxLoss: null }; // Unlimited loss potential
      }

      default:
        return { maxProfit: null, maxLoss: null };
    }
  }

  /**
   * Update option position after a fill.
   */
  private async updateOptionPosition(
    manager: typeof this.dataSource.manager,
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
    multiLegOrderId: string,
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
        await manager.remove(existingPosition);
      } else if (
        (currentQty > 0 && newQty > 0) ||
        (currentQty < 0 && newQty < 0)
      ) {
        // Adding to existing position
        if ((isBuy && currentQty >= 0) || (!isBuy && currentQty <= 0)) {
          const newAvgCost =
            (Math.abs(currentQty) * currentCost + quantity * price) /
            Math.abs(newQty);
          await manager.update(OptionPosition, existingPosition.id, {
            quantity: newQty,
            avgCostBasis: newAvgCost,
            greeksSnapshot: greeks,
            multiLegOrderId,
          });
        } else {
          // Reducing position
          await manager.update(OptionPosition, existingPosition.id, {
            quantity: newQty,
            greeksSnapshot: greeks,
          });
        }
      } else {
        // Position flip
        await manager.update(OptionPosition, existingPosition.id, {
          quantity: newQty,
          avgCostBasis: price,
          greeksSnapshot: greeks,
          multiLegOrderId,
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
        multiLegOrderId,
      });
      await manager.save(position);
    }
  }

  /**
   * Build OCC option symbol.
   */
  private buildOptionSymbol(
    underlyingSymbol: string,
    expirationDate: string,
    optionType: OptionType,
    strikePrice: number,
  ): string {
    const date = new Date(expirationDate);
    const yy = date.getFullYear().toString().slice(2);
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const dd = date.getDate().toString().padStart(2, '0');
    const type = optionType === OptionType.CALL ? 'C' : 'P';
    const strike = Math.round(strikePrice * 1000)
      .toString()
      .padStart(8, '0');

    return `${underlyingSymbol}${yy}${mm}${dd}${type}${strike}`;
  }

  /**
   * Get multi-leg order history for a user.
   */
  async getMultiLegOrderHistory(userId: string, limit = 50) {
    return this.multiLegOrderRepository.find({
      where: { userId },
      relations: ['legs'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get multi-leg order by ID.
   */
  async getMultiLegOrder(userId: string, multiLegOrderId: string) {
    const order = await this.multiLegOrderRepository.findOne({
      where: { id: multiLegOrderId, userId },
      relations: ['legs'],
    });

    if (!order) {
      throw new NotFoundException('Multi-leg order not found');
    }

    return order;
  }
}
