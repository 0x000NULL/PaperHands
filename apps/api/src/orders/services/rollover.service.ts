import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order } from '../entities/order.entity';
import { RolloverOrder } from '../entities/rollover-order.entity';
import { User } from '../../users/entities/user.entity';
import { OptionPosition } from '../../portfolio/entities/option-position.entity';
import {
  OrderSide,
  OrderType,
  OrderStatus,
  TimeInForce,
  OrderCategory,
  OptionType,
  AuditAction,
} from '../enums/order.enums';
import { RolloverType, RolloverStatus } from '../enums/multi-leg.enums';
import { OrderAuditService } from './order-audit.service';
import { OptionTaxService } from '../../portfolio/services/option-tax.service';
import { TradierService } from '../../market-data/tradier.service';

interface RolloverRequest {
  /** ID of the option position to roll */
  optionPositionId: string;
  /** Number of contracts to roll (default: all) */
  contractsToRoll?: number;
  /** New expiration date (YYYY-MM-DD) */
  newExpirationDate: string;
  /** New strike price (optional, defaults to same strike) */
  newStrikePrice?: number;
  /** Net credit/debit limit (optional, for limit orders) */
  netPriceLimit?: number;
}

interface RolloverResult {
  rolloverOrderId: string;
  status: RolloverStatus;
  closingOrder: {
    id: string;
    optionSymbol: string;
    price: number;
    quantity: number;
  };
  openingOrder: {
    id: string;
    optionSymbol: string;
    price: number;
    quantity: number;
  };
  netDebitCredit: number;
}

/**
 * Service for rolling over option positions.
 * Handles atomic close + open transactions for:
 * - Roll forward (same strike, later expiration)
 * - Roll up/down (different strike, same expiration)
 * - Diagonal roll (different strike and expiration)
 */
@Injectable()
export class RolloverService {
  private readonly logger = new Logger(RolloverService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(RolloverOrder)
    private readonly rolloverOrderRepository: Repository<RolloverOrder>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(OptionPosition)
    private readonly optionPositionRepository: Repository<OptionPosition>,
    private readonly dataSource: DataSource,
    private readonly orderAuditService: OrderAuditService,
    private readonly optionTaxService: OptionTaxService,
    private readonly tradierService: TradierService,
  ) {}

  /**
   * Execute an option rollover.
   * Atomically closes existing position and opens new one.
   */
  async executeRollover(
    userId: string,
    request: RolloverRequest,
  ): Promise<RolloverResult> {
    const {
      optionPositionId,
      contractsToRoll,
      newExpirationDate,
      newStrikePrice,
      netPriceLimit,
    } = request;

    // Get existing option position
    const existingPosition = await this.optionPositionRepository.findOne({
      where: { id: optionPositionId, userId },
    });

    if (!existingPosition) {
      throw new NotFoundException('Option position not found');
    }

    const positionQuantity = Number(existingPosition.quantity);
    const contractsToClose = contractsToRoll ?? Math.abs(positionQuantity);

    if (contractsToClose > Math.abs(positionQuantity)) {
      throw new BadRequestException(
        `Cannot roll ${contractsToClose} contracts. Only ${Math.abs(positionQuantity)} available.`,
      );
    }

    // Determine roll type
    const isLong = positionQuantity > 0;
    const currentStrike = Number(existingPosition.strikePrice);
    const targetStrike = newStrikePrice ?? currentStrike;
    const currentExpiration = existingPosition.expirationDate
      .toISOString()
      .split('T')[0];

    let rollType: RolloverType;
    if (
      currentStrike === targetStrike &&
      currentExpiration !== newExpirationDate
    ) {
      rollType = RolloverType.ROLL_FORWARD;
    } else if (
      currentExpiration === newExpirationDate &&
      currentStrike !== targetStrike
    ) {
      rollType =
        existingPosition.optionType === OptionType.CALL
          ? targetStrike > currentStrike
            ? RolloverType.ROLL_UP
            : RolloverType.ROLL_DOWN
          : targetStrike < currentStrike
            ? RolloverType.ROLL_UP
            : RolloverType.ROLL_DOWN;
    } else {
      rollType = RolloverType.DIAGONAL;
    }

    // Build new option symbol
    const newOptionSymbol = this.buildOptionSymbol(
      existingPosition.underlyingSymbol,
      newExpirationDate,
      existingPosition.optionType,
      targetStrike,
    );

    // Get quotes for both options
    const [closingQuote, openingQuote] = await Promise.all([
      this.tradierService.getOptionQuote(existingPosition.optionSymbol),
      this.tradierService.getOptionQuote(newOptionSymbol),
    ]);

    if (!closingQuote) {
      throw new BadRequestException(
        `Cannot get quote for closing option ${existingPosition.optionSymbol}`,
      );
    }

    if (!openingQuote) {
      throw new BadRequestException(
        `Cannot get quote for opening option ${newOptionSymbol}`,
      );
    }

    // Calculate prices
    // Closing: we're selling if long, buying if short
    const closingPrice = isLong ? closingQuote.bid : closingQuote.ask;
    // Opening: we're buying if going long, selling if going short
    const openingPrice = isLong ? openingQuote.ask : openingQuote.bid;

    if (!closingPrice || closingPrice <= 0) {
      throw new BadRequestException(
        `Invalid closing price for ${existingPosition.optionSymbol}`,
      );
    }

    if (!openingPrice || openingPrice <= 0) {
      throw new BadRequestException(
        `Invalid opening price for ${newOptionSymbol}`,
      );
    }

    const contractMultiplier = 100;
    const closingTotal = closingPrice * contractsToClose * contractMultiplier;
    const openingTotal = openingPrice * contractsToClose * contractMultiplier;

    // Net debit/credit (positive = credit, negative = debit)
    const netDebitCredit = isLong
      ? closingTotal - openingTotal // Long: sell old, buy new
      : openingTotal - closingTotal; // Short: buy old, sell new

    // Check price limit if specified
    if (netPriceLimit !== undefined) {
      if (netDebitCredit < netPriceLimit) {
        throw new BadRequestException(
          `Net debit/credit of $${netDebitCredit.toFixed(2)} does not meet limit of $${netPriceLimit.toFixed(2)}`,
        );
      }
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

      const lockedPosition = await queryRunner.manager.findOne(OptionPosition, {
        where: { id: optionPositionId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lockedPosition) {
        throw new NotFoundException('Option position not found');
      }

      // Check cash for net debit
      if (
        netDebitCredit < 0 &&
        Number(user.cashBalance) < Math.abs(netDebitCredit)
      ) {
        throw new BadRequestException(
          `Insufficient funds for roll. Net debit: $${Math.abs(netDebitCredit).toFixed(2)}, Available: $${Number(user.cashBalance).toFixed(2)}`,
        );
      }

      const rollTime = new Date();

      // Create rollover order record
      const rolloverOrder = queryRunner.manager.create(RolloverOrder, {
        userId,
        rollType,
        closingOptionSymbol: existingPosition.optionSymbol,
        openingOptionSymbol: newOptionSymbol,
        underlyingSymbol: existingPosition.underlyingSymbol,
        quantity: contractsToClose,
        closingPrice,
        openingPrice,
        netDebitCredit,
        status: RolloverStatus.PENDING,
      });

      const savedRollover = await queryRunner.manager.save(rolloverOrder);

      // Create closing order
      const closingSide = isLong ? OrderSide.SELL : OrderSide.BUY;
      const closingOrder = queryRunner.manager.create(Order, {
        userId,
        symbol: existingPosition.underlyingSymbol,
        side: closingSide,
        orderType: OrderType.MARKET,
        timeInForce: TimeInForce.DAY,
        quantity: contractsToClose,
        filledQuantity: contractsToClose,
        filledPrice: closingPrice,
        avgFillPrice: closingPrice,
        status: OrderStatus.FILLED,
        filledAt: rollTime,
        orderCategory: OrderCategory.OPTION,
        optionSymbol: existingPosition.optionSymbol,
        underlyingSymbol: existingPosition.underlyingSymbol,
        optionType: existingPosition.optionType,
        strikePrice: existingPosition.strikePrice,
        expirationDate: existingPosition.expirationDate,
        contractMultiplier,
        rolloverOrderId: savedRollover.id,
      });

      const savedClosingOrder = await queryRunner.manager.save(closingOrder);

      // Record closing tax event
      if (isLong) {
        await this.optionTaxService.recordSoldToClose(
          queryRunner.manager,
          userId,
          lockedPosition,
          contractsToClose,
          closingPrice,
          savedClosingOrder.id,
          rollTime,
        );
      } else {
        await this.optionTaxService.recordBuyToClose(
          queryRunner.manager,
          userId,
          lockedPosition,
          contractsToClose,
          closingPrice,
          savedClosingOrder.id,
          rollTime,
        );
      }

      // Create opening order
      const openingSide = isLong ? OrderSide.BUY : OrderSide.SELL;
      const openingOrder = queryRunner.manager.create(Order, {
        userId,
        symbol: existingPosition.underlyingSymbol,
        side: openingSide,
        orderType: OrderType.MARKET,
        timeInForce: TimeInForce.DAY,
        quantity: contractsToClose,
        filledQuantity: contractsToClose,
        filledPrice: openingPrice,
        avgFillPrice: openingPrice,
        status: OrderStatus.FILLED,
        filledAt: rollTime,
        orderCategory: OrderCategory.OPTION,
        optionSymbol: newOptionSymbol,
        underlyingSymbol: existingPosition.underlyingSymbol,
        optionType: existingPosition.optionType,
        strikePrice: targetStrike,
        expirationDate: new Date(newExpirationDate),
        contractMultiplier,
        rolloverOrderId: savedRollover.id,
        greeksAtFill: openingQuote.greeks,
      });

      const savedOpeningOrder = await queryRunner.manager.save(openingOrder);

      // Update or remove old position
      const remainingContracts = Math.abs(positionQuantity) - contractsToClose;
      if (remainingContracts <= 0) {
        await queryRunner.manager.remove(lockedPosition);
      } else {
        await queryRunner.manager.update(OptionPosition, optionPositionId, {
          quantity: isLong ? remainingContracts : -remainingContracts,
        });
      }

      // Create new position
      const existingNewPosition = await queryRunner.manager.findOne(
        OptionPosition,
        {
          where: { userId, optionSymbol: newOptionSymbol },
        },
      );

      if (existingNewPosition) {
        // Add to existing position
        const newQty =
          Number(existingNewPosition.quantity) +
          (isLong ? contractsToClose : -contractsToClose);
        const existingCost = Number(existingNewPosition.avgCostBasis);
        const existingQty = Math.abs(Number(existingNewPosition.quantity));
        const newAvgCost =
          (existingQty * existingCost + contractsToClose * openingPrice) /
          Math.abs(newQty);

        await queryRunner.manager.update(
          OptionPosition,
          existingNewPosition.id,
          {
            quantity: newQty,
            avgCostBasis: newAvgCost,
            greeksSnapshot: openingQuote.greeks,
          },
        );
      } else {
        // Create new position
        const newPosition = queryRunner.manager.create(OptionPosition, {
          userId,
          optionSymbol: newOptionSymbol,
          underlyingSymbol: existingPosition.underlyingSymbol,
          optionType: existingPosition.optionType,
          strikePrice: targetStrike,
          expirationDate: new Date(newExpirationDate),
          quantity: isLong ? contractsToClose : -contractsToClose,
          avgCostBasis: openingPrice,
          greeksSnapshot: openingQuote.greeks,
        });
        await queryRunner.manager.save(newPosition);
      }

      // Update cash balance
      await queryRunner.manager.update(User, userId, {
        cashBalance: Number(user.cashBalance) + netDebitCredit,
      });

      // Update rollover status
      await queryRunner.manager.update(RolloverOrder, savedRollover.id, {
        status: RolloverStatus.FILLED,
        closingOrderId: savedClosingOrder.id,
        openingOrderId: savedOpeningOrder.id,
        filledAt: rollTime,
      });

      await queryRunner.commitTransaction();

      // Create audit records
      await this.orderAuditService.createAuditRecord(
        savedClosingOrder,
        AuditAction.FILLED,
        null,
        closingPrice,
      );
      await this.orderAuditService.createAuditRecord(
        savedOpeningOrder,
        AuditAction.FILLED,
        null,
        openingPrice,
      );

      this.logger.log(
        `Rolled ${contractsToClose} contracts from ${existingPosition.optionSymbol} to ${newOptionSymbol}: ` +
          `net ${netDebitCredit >= 0 ? 'credit' : 'debit'} $${Math.abs(netDebitCredit).toFixed(2)}`,
      );

      return {
        rolloverOrderId: savedRollover.id,
        status: RolloverStatus.FILLED,
        closingOrder: {
          id: savedClosingOrder.id,
          optionSymbol: existingPosition.optionSymbol,
          price: closingPrice,
          quantity: contractsToClose,
        },
        openingOrder: {
          id: savedOpeningOrder.id,
          optionSymbol: newOptionSymbol,
          price: openingPrice,
          quantity: contractsToClose,
        },
        netDebitCredit,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get rollover history for a user.
   */
  async getRolloverHistory(userId: string, limit = 50) {
    return this.rolloverOrderRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Build OCC option symbol.
   * Format: SYMBOL + YYMMDD + C/P + 8-digit strike (strike * 1000)
   * Example: AAPL240119C00190000
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
}
