import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order } from '../entities/order.entity';
import { User } from '../../users/entities/user.entity';
import { OptionPosition } from '../../portfolio/entities/option-position.entity';
import { Position } from '../../portfolio/entities/position.entity';
import { TaxLot } from '../../portfolio/entities/tax-lot.entity';
import {
  OrderSide,
  OrderType,
  OrderStatus,
  TimeInForce,
  OrderCategory,
  OptionType,
} from '../enums/order.enums';
import { OptionTaxService } from '../../portfolio/services/option-tax.service';
import { TradierService } from '../../market-data/tradier.service';

interface ExerciseResult {
  success: boolean;
  optionPosition: {
    symbol: string;
    quantity: number;
    exercisedAt: Date;
  };
  stockOrder: {
    id: string;
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    price: number;
  };
  costBasisAdjustment: number;
}

/**
 * Service for manually exercising options before expiration.
 * Handles both calls (buy underlying) and puts (sell underlying).
 */
@Injectable()
export class ManualExerciseService {
  private readonly logger = new Logger(ManualExerciseService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(OptionPosition)
    private readonly optionPositionRepository: Repository<OptionPosition>,
    @InjectRepository(Position)
    private readonly positionRepository: Repository<Position>,
    @InjectRepository(TaxLot)
    private readonly taxLotRepository: Repository<TaxLot>,
    private readonly dataSource: DataSource,
    private readonly optionTaxService: OptionTaxService,
    private readonly tradierService: TradierService,
  ) {}

  /**
   * Exercise a long option position manually.
   * - For calls: Buy shares at strike price
   * - For puts: Sell shares at strike price
   */
  async exerciseOption(
    userId: string,
    optionPositionId: string,
    contractsToExercise?: number,
  ): Promise<ExerciseResult> {
    // Get the option position
    const optionPosition = await this.optionPositionRepository.findOne({
      where: { id: optionPositionId, userId },
    });

    if (!optionPosition) {
      throw new NotFoundException('Option position not found');
    }

    const positionQuantity = Number(optionPosition.quantity);

    // Can only exercise long positions
    if (positionQuantity <= 0) {
      throw new BadRequestException(
        'Can only exercise long option positions. Short positions may be assigned.',
      );
    }

    // Determine how many contracts to exercise
    const contractsToClose = contractsToExercise ?? positionQuantity;
    if (contractsToClose > positionQuantity) {
      throw new BadRequestException(
        `Cannot exercise ${contractsToClose} contracts. Only ${positionQuantity} available.`,
      );
    }

    if (contractsToClose <= 0) {
      throw new BadRequestException('Must exercise at least 1 contract');
    }

    // Verify option hasn't expired
    const now = new Date();
    const expirationDate = new Date(optionPosition.expirationDate);
    expirationDate.setHours(23, 59, 59, 999); // End of expiration day

    if (now > expirationDate) {
      throw new BadRequestException('Cannot exercise expired options');
    }

    // Get current underlying price to verify ITM status
    const underlyingQuote = await this.tradierService.getQuote(
      optionPosition.underlyingSymbol,
    );

    if (!underlyingQuote || !underlyingQuote.last) {
      throw new BadRequestException(
        `Cannot get quote for underlying ${optionPosition.underlyingSymbol}`,
      );
    }

    const strikePrice = Number(optionPosition.strikePrice);
    const underlyingPrice = underlyingQuote.last;
    const isCall = optionPosition.optionType === OptionType.CALL;

    // Check if ITM (warn if OTM but still allow exercise)
    const isITM = isCall
      ? underlyingPrice > strikePrice
      : underlyingPrice < strikePrice;

    if (!isITM) {
      this.logger.warn(
        `User ${userId} exercising OTM ${optionPosition.optionType} option: ` +
          `underlying=${underlyingPrice}, strike=${strikePrice}`,
      );
    }

    // Calculate shares and cost
    const sharesPerContract = 100;
    const totalShares = contractsToClose * sharesPerContract;
    const stockValue = strikePrice * totalShares;
    const premiumPaid =
      Number(optionPosition.avgCostBasis) *
      contractsToClose *
      sharesPerContract;

    // Execute in transaction
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

      // For calls: need cash to buy shares at strike
      // For puts: need shares to sell at strike
      if (isCall) {
        if (Number(user.cashBalance) < stockValue) {
          throw new BadRequestException(
            `Insufficient funds to exercise. Need $${stockValue.toFixed(2)} to buy ${totalShares} shares at $${strikePrice}`,
          );
        }
      } else {
        // For puts, check if user has enough shares
        const stockPosition = await queryRunner.manager.findOne(Position, {
          where: { userId, symbol: optionPosition.underlyingSymbol },
          lock: { mode: 'pessimistic_write' },
        });

        const availableShares = stockPosition
          ? Number(stockPosition.quantity)
          : 0;
        if (availableShares < totalShares) {
          throw new BadRequestException(
            `Insufficient shares to exercise put. Need ${totalShares} shares, have ${availableShares}`,
          );
        }
      }

      const exerciseTime = new Date();

      // Lock the option position
      const lockedPosition = await queryRunner.manager.findOne(OptionPosition, {
        where: { id: optionPositionId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lockedPosition) {
        throw new NotFoundException('Option position not found');
      }

      // Create stock order based on option type
      const stockSide = isCall ? OrderSide.BUY : OrderSide.SELL;
      const stockOrder = queryRunner.manager.create(Order, {
        userId,
        symbol: optionPosition.underlyingSymbol,
        side: stockSide,
        orderType: OrderType.MARKET,
        timeInForce: TimeInForce.DAY,
        quantity: totalShares,
        filledQuantity: totalShares,
        filledPrice: strikePrice,
        avgFillPrice: strikePrice,
        status: OrderStatus.FILLED,
        filledAt: exerciseTime,
        orderCategory: OrderCategory.EQUITY,
      });

      const savedStockOrder = await queryRunner.manager.save(stockOrder);

      // Update cash balance
      const cashChange = isCall ? -stockValue : stockValue;
      await queryRunner.manager.update(User, userId, {
        cashBalance: Number(user.cashBalance) + cashChange,
      });

      // Update stock position with adjusted cost basis
      if (isCall) {
        // Buying shares: cost basis = strike + premium paid
        const adjustedCostPerShare = strikePrice + premiumPaid / totalShares;
        await this.updateStockPositionForExercise(
          queryRunner.manager,
          userId,
          optionPosition.underlyingSymbol,
          totalShares,
          adjustedCostPerShare,
          savedStockOrder.id,
          exerciseTime,
        );
      } else {
        // Selling shares: reduce position
        await this.reduceStockPositionForExercise(
          queryRunner.manager,
          userId,
          optionPosition.underlyingSymbol,
          totalShares,
          strikePrice,
          savedStockOrder.id,
          exerciseTime,
        );
      }

      // Record option closure
      await this.optionTaxService.recordExercised(
        queryRunner.manager,
        userId,
        lockedPosition,
        exerciseTime,
        savedStockOrder.id,
      );

      // Remove or reduce option position
      const remainingContracts = positionQuantity - contractsToClose;
      if (remainingContracts <= 0) {
        await queryRunner.manager.remove(lockedPosition);
      } else {
        await queryRunner.manager.update(OptionPosition, optionPositionId, {
          quantity: remainingContracts,
        });
      }

      await queryRunner.commitTransaction();

      this.logger.log(
        `User ${userId} exercised ${contractsToClose} ${optionPosition.optionType} contracts of ${optionPosition.optionSymbol}`,
      );

      return {
        success: true,
        optionPosition: {
          symbol: optionPosition.optionSymbol,
          quantity: contractsToClose,
          exercisedAt: exerciseTime,
        },
        stockOrder: {
          id: savedStockOrder.id,
          symbol: optionPosition.underlyingSymbol,
          side: isCall ? 'buy' : 'sell',
          quantity: totalShares,
          price: strikePrice,
        },
        costBasisAdjustment: premiumPaid,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Update stock position when exercising a call option.
   * Cost basis includes the option premium paid.
   */
  private async updateStockPositionForExercise(
    manager: typeof this.dataSource.manager,
    userId: string,
    symbol: string,
    shares: number,
    adjustedCostPerShare: number,
    orderId: string,
    exerciseTime: Date,
  ): Promise<void> {
    const existingPosition = await manager.findOne(Position, {
      where: { userId, symbol },
      lock: { mode: 'pessimistic_write' },
    });

    if (existingPosition) {
      const currentQty = Number(existingPosition.quantity);
      const currentCost = Number(existingPosition.avgCostBasis);
      const newQty = currentQty + shares;
      const newAvgCost =
        (currentQty * currentCost + shares * adjustedCostPerShare) / newQty;

      await manager.update(Position, existingPosition.id, {
        quantity: newQty,
        avgCostBasis: newAvgCost,
      });
    } else {
      const position = manager.create(Position, {
        userId,
        symbol,
        quantity: shares,
        avgCostBasis: adjustedCostPerShare,
      });
      await manager.save(position);
    }

    // Create tax lot with adjusted cost basis
    const taxLot = manager.create(TaxLot, {
      userId,
      symbol,
      quantity: shares,
      remainingQuantity: shares,
      costBasisPerShare: adjustedCostPerShare,
      acquiredAt: exerciseTime,
      orderId,
    });
    await manager.save(taxLot);
  }

  /**
   * Reduce stock position when exercising a put option.
   */
  private async reduceStockPositionForExercise(
    manager: typeof this.dataSource.manager,
    userId: string,
    symbol: string,
    shares: number,
    _strikePrice: number,
    _orderId: string,
    _exerciseTime: Date,
  ): Promise<void> {
    const existingPosition = await manager.findOne(Position, {
      where: { userId, symbol },
      lock: { mode: 'pessimistic_write' },
    });

    if (!existingPosition) {
      throw new BadRequestException(
        `No stock position found for ${symbol} to sell`,
      );
    }

    const currentQty = Number(existingPosition.quantity);
    const newQty = currentQty - shares;

    if (newQty < 0) {
      throw new BadRequestException(
        `Insufficient shares. Need ${shares}, have ${currentQty}`,
      );
    }

    if (newQty === 0) {
      await manager.remove(existingPosition);
    } else {
      await manager.update(Position, existingPosition.id, {
        quantity: newQty,
      });
    }

    // Reduce tax lots (FIFO)
    let sharesToSell = shares;
    const taxLots = await manager.find(TaxLot, {
      where: { userId, symbol },
      order: { acquiredAt: 'ASC' },
    });

    for (const lot of taxLots) {
      if (sharesToSell <= 0) break;

      const lotQty = Number(lot.remainingQuantity);
      const sellFromLot = Math.min(lotQty, sharesToSell);

      if (sellFromLot >= lotQty) {
        await manager.remove(lot);
      } else {
        await manager.update(TaxLot, lot.id, {
          remainingQuantity: lotQty - sellFromLot,
        });
      }

      sharesToSell -= sellFromLot;
    }
  }

  /**
   * Get exercisable options for a user.
   * Returns long positions that haven't expired.
   */
  async getExercisableOptions(userId: string) {
    const now = new Date();

    const positions = await this.optionPositionRepository
      .createQueryBuilder('pos')
      .where('pos.userId = :userId', { userId })
      .andWhere('pos.quantity > 0') // Long positions only
      .andWhere('pos.expirationDate >= :now', { now })
      .orderBy('pos.expirationDate', 'ASC')
      .getMany();

    return positions.map((pos) => ({
      id: pos.id,
      optionSymbol: pos.optionSymbol,
      underlyingSymbol: pos.underlyingSymbol,
      optionType: pos.optionType,
      strikePrice: Number(pos.strikePrice),
      expirationDate: pos.expirationDate,
      quantity: Number(pos.quantity),
      avgCostBasis: Number(pos.avgCostBasis),
    }));
  }
}
