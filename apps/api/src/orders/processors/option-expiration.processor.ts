import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThanOrEqual, Not, Equal } from 'typeorm';
import { OptionPosition } from '../../portfolio/entities/option-position.entity';
import { Order } from '../entities/order.entity';
import { User } from '../../users/entities/user.entity';
import { Position } from '../../portfolio/entities/position.entity';
import { TaxLot } from '../../portfolio/entities/tax-lot.entity';
import { TradierService } from '../../market-data/tradier.service';
import { OptionTaxService } from '../../portfolio/services/option-tax.service';
import { TaxLotService } from '../../portfolio/services/tax-lot.service';
import { MarketHoursService } from '../../common/services/market-hours.service';
import { OptionType } from '../enums/order.enums';
import {
  OrderStatus,
  OrderSide,
  OrderType,
  OrderCategory,
} from '../enums/order.enums';

@Injectable()
export class OptionExpirationProcessor {
  private readonly logger = new Logger(OptionExpirationProcessor.name);
  private isProcessing = false;

  constructor(
    @InjectRepository(OptionPosition)
    private optionPositionRepository: Repository<OptionPosition>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Position)
    private positionRepository: Repository<Position>,
    @InjectRepository(TaxLot)
    private taxLotRepository: Repository<TaxLot>,
    private dataSource: DataSource,
    private tradierService: TradierService,
    private optionTaxService: OptionTaxService,
    private taxLotService: TaxLotService,
    private marketHoursService: MarketHoursService,
  ) {}

  /**
   * Process option expirations at 4:15 PM ET (15 minutes after market close)
   * This gives users until market close to sell their options
   */
  @Cron('15 16 * * 1-5', {
    name: 'option-expiration-processor',
    timeZone: 'America/New_York',
  })
  async processExpirations(): Promise<void> {
    // Prevent overlapping executions
    if (this.isProcessing) {
      this.logger.warn('Option expiration processing already in progress');
      return;
    }

    const session = this.marketHoursService.getCurrentSession();

    // Only run after market close
    if (session === 'regular') {
      this.logger.debug('Market still open, skipping expiration processing');
      return;
    }

    this.isProcessing = true;

    try {
      this.logger.log('Starting option expiration processing...');

      // Find positions expiring today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Find all positions (long and short) expiring today or earlier
      const expiringPositions = await this.optionPositionRepository.find({
        where: {
          expirationDate: LessThanOrEqual(today),
          quantity: Not(Equal(0)),
        },
      });

      if (expiringPositions.length === 0) {
        this.logger.log('No expiring positions found');
        return;
      }

      this.logger.log(
        `Found ${expiringPositions.length} expiring option positions`,
      );

      // Get underlying prices for ITM/OTM determination
      const underlyingSymbols = [
        ...new Set(expiringPositions.map((p) => p.underlyingSymbol)),
      ];
      const underlyingPrices =
        await this.fetchUnderlyingPrices(underlyingSymbols);

      // Process each expiring position
      for (const position of expiringPositions) {
        try {
          await this.processExpiringPosition(position, underlyingPrices);
        } catch (error) {
          this.logger.error(
            `Error processing expiration for position ${position.id}:`,
            error,
          );
        }
      }

      this.logger.log('Option expiration processing complete');
    } catch (error) {
      this.logger.error('Error in option expiration processing:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Fetch underlying stock prices for ITM/OTM determination
   */
  private async fetchUnderlyingPrices(
    symbols: string[],
  ): Promise<Map<string, number>> {
    const prices = new Map<string, number>();

    for (const symbol of symbols) {
      try {
        const quote = await this.tradierService.getQuote(symbol);
        if (quote) {
          prices.set(symbol, quote.last);
        }
      } catch (error) {
        this.logger.warn(`Could not fetch price for ${symbol}:`, error);
      }
    }

    return prices;
  }

  /**
   * Process a single expiring position
   */
  private async processExpiringPosition(
    position: OptionPosition,
    underlyingPrices: Map<string, number>,
  ): Promise<void> {
    const underlyingPrice = underlyingPrices.get(position.underlyingSymbol);
    const isLong = Number(position.quantity) > 0;

    if (!underlyingPrice) {
      this.logger.warn(
        `No underlying price for ${position.underlyingSymbol}, expiring worthless`,
      );
      if (isLong) {
        await this.expireLongWorthless(position);
      } else {
        await this.expireShortWorthless(position);
      }
      return;
    }

    const isITM = this.isInTheMoney(position, underlyingPrice);

    this.logger.log(
      `Processing ${position.optionSymbol}: ITM=${isITM}, Long=${isLong}, ` +
        `Strike=${position.strikePrice}, Underlying=${underlyingPrice}`,
    );

    if (isLong) {
      // Long position
      if (isITM) {
        await this.exerciseOption(position, underlyingPrice);
      } else {
        await this.expireLongWorthless(position);
      }
    } else {
      // Short position
      if (isITM) {
        await this.assignOption(position, underlyingPrice);
      } else {
        await this.expireShortWorthless(position);
      }
    }
  }

  /**
   * Determine if an option is in the money
   */
  private isInTheMoney(
    position: OptionPosition,
    underlyingPrice: number,
  ): boolean {
    const strike = Number(position.strikePrice);

    if (position.optionType === OptionType.CALL) {
      // Call is ITM if underlying > strike
      return underlyingPrice > strike;
    } else {
      // Put is ITM if underlying < strike
      return underlyingPrice < strike;
    }
  }

  /**
   * Expire a long option worthless (OTM) - results in a loss
   */
  private async expireLongWorthless(position: OptionPosition): Promise<void> {
    const now = new Date();

    await this.dataSource.transaction(async (manager) => {
      // Record the closure (loss = premium paid)
      await this.optionTaxService.recordExpiredWorthless(
        manager,
        position.userId,
        position,
        now,
      );

      // Delete the option position
      await manager.remove(OptionPosition, position);
    });

    this.logger.log(
      `Expired worthless (long): ${Math.abs(Number(position.quantity))} contracts of ${position.optionSymbol}`,
    );
  }

  /**
   * Expire a short option worthless (OTM) - results in a profit (keep premium)
   */
  private async expireShortWorthless(position: OptionPosition): Promise<void> {
    const now = new Date();

    await this.dataSource.transaction(async (manager) => {
      // Record the closure (profit = premium received)
      await this.optionTaxService.recordShortExpiredWorthless(
        manager,
        position.userId,
        position,
        now,
      );

      // Delete the option position
      await manager.remove(OptionPosition, position);
    });

    this.logger.log(
      `Expired worthless (short): ${Math.abs(Number(position.quantity))} contracts of ${position.optionSymbol} - premium kept`,
    );
  }

  /**
   * Assign an ITM short option
   * - Short call assignment: Must sell shares at strike price (or cash settle)
   * - Short put assignment: Must buy shares at strike price (or cash settle)
   */
  private async assignOption(
    position: OptionPosition,
    underlyingPrice: number,
  ): Promise<void> {
    const now = new Date();
    const contracts = Math.abs(Number(position.quantity));
    const shares = contracts * 100;
    const strike = Number(position.strikePrice);

    if (position.optionType === OptionType.CALL) {
      await this.assignShortCall(
        position,
        shares,
        strike,
        underlyingPrice,
        now,
      );
    } else {
      await this.assignShortPut(position, shares, strike, underlyingPrice, now);
    }
  }

  /**
   * Assign a short call: must sell shares at strike price
   */
  private async assignShortCall(
    position: OptionPosition,
    shares: number,
    strike: number,
    underlyingPrice: number,
    assignedAt: Date,
  ): Promise<void> {
    const stockPosition = await this.positionRepository.findOne({
      where: { userId: position.userId, symbol: position.underlyingSymbol },
    });

    if (!stockPosition || Number(stockPosition.quantity) < shares) {
      // Insufficient shares - cash settle instead
      this.logger.warn(
        `User ${position.userId} has insufficient shares for short call assignment. Cash settling.`,
      );
      await this.cashSettleShortOption(position, underlyingPrice, assignedAt);
      return;
    }

    await this.dataSource.transaction(async (manager) => {
      // Create an order record for the assignment
      const stockOrder = manager.create(Order, {
        userId: position.userId,
        symbol: position.underlyingSymbol,
        side: OrderSide.SELL,
        quantity: shares,
        orderType: OrderType.MARKET,
        orderCategory: OrderCategory.EQUITY,
        status: OrderStatus.FILLED,
        filledPrice: strike,
        avgFillPrice: strike,
        filledQuantity: shares,
        filledAt: assignedAt,
      });
      const savedOrder = await manager.save(stockOrder);

      // Record the option closure
      await this.optionTaxService.recordAssigned(
        manager,
        position.userId,
        position,
        assignedAt,
        savedOrder.id,
      );

      // Sell shares via tax lot system
      await this.taxLotService.sellShares(
        manager,
        position.userId,
        position.underlyingSymbol,
        shares,
        strike,
        savedOrder.id,
        assignedAt,
      );

      // Update stock position
      const newQuantity = Number(stockPosition.quantity) - shares;
      if (newQuantity <= 0) {
        await manager.remove(Position, stockPosition);
      } else {
        stockPosition.quantity = newQuantity;
        await manager.save(stockPosition);
      }

      // Credit cash for the sale
      const user = await manager.findOneOrFail(User, {
        where: { id: position.userId },
      });
      user.cashBalance = Number(user.cashBalance) + strike * shares;
      await manager.save(user);

      // Delete option position
      await manager.remove(OptionPosition, position);
    });

    this.logger.log(
      `Short call assigned: Sold ${shares} shares of ${position.underlyingSymbol} at $${strike}`,
    );
  }

  /**
   * Assign a short put: must buy shares at strike price
   */
  private async assignShortPut(
    position: OptionPosition,
    shares: number,
    strike: number,
    underlyingPrice: number,
    assignedAt: Date,
  ): Promise<void> {
    const user = await this.userRepository.findOneOrFail({
      where: { id: position.userId },
    });

    const totalCost = strike * shares;
    const premiumReceived =
      Number(position.avgCostBasis) * Math.abs(Number(position.quantity)) * 100;
    const effectiveCostBasis = (totalCost - premiumReceived) / shares;

    if (Number(user.cashBalance) < totalCost) {
      // Insufficient funds - cash settle instead
      this.logger.warn(
        `User ${user.id} has insufficient funds for short put assignment. Cash settling.`,
      );
      await this.cashSettleShortOption(position, underlyingPrice, assignedAt);
      return;
    }

    await this.dataSource.transaction(async (manager) => {
      // Create an order record for the assignment
      const stockOrder = manager.create(Order, {
        userId: position.userId,
        symbol: position.underlyingSymbol,
        side: OrderSide.BUY,
        quantity: shares,
        orderType: OrderType.MARKET,
        orderCategory: OrderCategory.EQUITY,
        status: OrderStatus.FILLED,
        filledPrice: strike,
        avgFillPrice: strike,
        filledQuantity: shares,
        filledAt: assignedAt,
      });
      const savedOrder = await manager.save(stockOrder);

      // Record the option closure
      await this.optionTaxService.recordAssigned(
        manager,
        position.userId,
        position,
        assignedAt,
        savedOrder.id,
      );

      // Update or create stock position
      let stockPosition = await manager.findOne(Position, {
        where: { userId: position.userId, symbol: position.underlyingSymbol },
      });

      if (stockPosition) {
        // Average into existing position
        const existingValue =
          Number(stockPosition.quantity) * Number(stockPosition.avgCostBasis);
        const newValue = shares * effectiveCostBasis;
        const newQuantity = Number(stockPosition.quantity) + shares;
        stockPosition.avgCostBasis = (existingValue + newValue) / newQuantity;
        stockPosition.quantity = newQuantity;
      } else {
        stockPosition = manager.create(Position, {
          userId: position.userId,
          symbol: position.underlyingSymbol,
          quantity: shares,
          avgCostBasis: effectiveCostBasis,
        });
      }
      await manager.save(stockPosition);

      // Create tax lot for the new shares
      await this.taxLotService.createTaxLot(
        manager,
        position.userId,
        position.underlyingSymbol,
        shares,
        effectiveCostBasis,
        savedOrder.id,
        assignedAt,
      );

      // Deduct cash
      user.cashBalance = Number(user.cashBalance) - totalCost;
      await manager.save(user);

      // Delete option position
      await manager.remove(OptionPosition, position);
    });

    this.logger.log(
      `Short put assigned: Bought ${shares} shares of ${position.underlyingSymbol} at $${strike}`,
    );
  }

  /**
   * Cash settle a short option when shares/funds are insufficient
   * Short option writer pays the intrinsic value to the option holder
   */
  private async cashSettleShortOption(
    position: OptionPosition,
    underlyingPrice: number,
    settledAt: Date,
  ): Promise<void> {
    const contracts = Math.abs(Number(position.quantity));
    const shares = contracts * 100;
    const strike = Number(position.strikePrice);
    const premiumReceived = Number(position.avgCostBasis) * contracts * 100;

    let intrinsicValue: number;
    if (position.optionType === OptionType.CALL) {
      // Short call: must pay difference if underlying > strike
      intrinsicValue = Math.max(0, (underlyingPrice - strike) * shares);
    } else {
      // Short put: must pay difference if strike > underlying
      intrinsicValue = Math.max(0, (strike - underlyingPrice) * shares);
    }

    const netGainLoss = premiumReceived - intrinsicValue;

    await this.dataSource.transaction(async (manager) => {
      // Record as assigned (cash settled)
      await this.optionTaxService.recordAssigned(
        manager,
        position.userId,
        position,
        settledAt,
        null, // No stock order
      );

      // Deduct intrinsic value from cash (option writer pays)
      const user = await manager.findOneOrFail(User, {
        where: { id: position.userId },
      });
      user.cashBalance = Number(user.cashBalance) - intrinsicValue;
      await manager.save(user);

      // Delete option position
      await manager.remove(OptionPosition, position);
    });

    this.logger.log(
      `Cash settled short ${position.optionSymbol}: paid $${intrinsicValue.toFixed(2)} intrinsic value, net P&L: $${netGainLoss.toFixed(2)}`,
    );
  }

  /**
   * Exercise an ITM option
   * - Call exercise: Buy shares at strike price
   * - Put exercise: Sell shares at strike price
   */
  private async exerciseOption(
    position: OptionPosition,
    underlyingPrice: number,
  ): Promise<void> {
    const now = new Date();
    const contracts = Math.abs(Number(position.quantity));
    const shares = contracts * 100;
    const strike = Number(position.strikePrice);

    if (position.optionType === OptionType.CALL) {
      await this.exerciseCall(position, shares, strike, underlyingPrice, now);
    } else {
      await this.exercisePut(position, shares, strike, underlyingPrice, now);
    }
  }

  /**
   * Exercise a call option: buy shares at strike price
   * Cost basis of new shares = strike price + premium paid
   */
  private async exerciseCall(
    position: OptionPosition,
    shares: number,
    strike: number,
    underlyingPrice: number,
    exercisedAt: Date,
  ): Promise<void> {
    const user = await this.userRepository.findOneOrFail({
      where: { id: position.userId },
    });

    const totalCost = strike * shares;
    const premiumPaid =
      Number(position.avgCostBasis) * Math.abs(Number(position.quantity)) * 100;
    const effectiveCostBasis = (totalCost + premiumPaid) / shares;

    if (Number(user.cashBalance) < totalCost) {
      // Insufficient funds - cash settle instead
      this.logger.warn(
        `User ${user.id} has insufficient funds to exercise call. Cash settling.`,
      );
      await this.cashSettleOption(position, underlyingPrice, exercisedAt);
      return;
    }

    await this.dataSource.transaction(async (manager) => {
      // Create an order record for the exercise
      const stockOrder = manager.create(Order, {
        userId: position.userId,
        symbol: position.underlyingSymbol,
        side: OrderSide.BUY,
        quantity: shares,
        orderType: OrderType.MARKET,
        orderCategory: OrderCategory.EQUITY,
        status: OrderStatus.FILLED,
        filledPrice: strike,
        avgFillPrice: strike,
        filledQuantity: shares,
        filledAt: exercisedAt,
      });
      const savedOrder = await manager.save(stockOrder);

      // Record the option closure
      await this.optionTaxService.recordExercised(
        manager,
        position.userId,
        position,
        exercisedAt,
        savedOrder.id,
      );

      // Update or create stock position
      let stockPosition = await manager.findOne(Position, {
        where: { userId: position.userId, symbol: position.underlyingSymbol },
      });

      if (stockPosition) {
        // Average into existing position
        const existingValue =
          Number(stockPosition.quantity) * Number(stockPosition.avgCostBasis);
        const newValue = shares * effectiveCostBasis;
        const newQuantity = Number(stockPosition.quantity) + shares;
        stockPosition.avgCostBasis = (existingValue + newValue) / newQuantity;
        stockPosition.quantity = newQuantity;
      } else {
        stockPosition = manager.create(Position, {
          userId: position.userId,
          symbol: position.underlyingSymbol,
          quantity: shares,
          avgCostBasis: effectiveCostBasis,
        });
      }
      await manager.save(stockPosition);

      // Create tax lot for the new shares
      await this.taxLotService.createTaxLot(
        manager,
        position.userId,
        position.underlyingSymbol,
        shares,
        effectiveCostBasis,
        savedOrder.id,
        exercisedAt,
      );

      // Deduct cash
      user.cashBalance = Number(user.cashBalance) - totalCost;
      await manager.save(user);

      // Delete option position
      await manager.remove(OptionPosition, position);
    });

    this.logger.log(
      `Exercised call: Bought ${shares} shares of ${position.underlyingSymbol} at $${strike}`,
    );
  }

  /**
   * Exercise a put option: sell shares at strike price
   */
  private async exercisePut(
    position: OptionPosition,
    shares: number,
    strike: number,
    underlyingPrice: number,
    exercisedAt: Date,
  ): Promise<void> {
    const stockPosition = await this.positionRepository.findOne({
      where: { userId: position.userId, symbol: position.underlyingSymbol },
    });

    if (!stockPosition || Number(stockPosition.quantity) < shares) {
      // Insufficient shares - cash settle instead
      this.logger.warn(
        `User ${position.userId} has insufficient shares to exercise put. Cash settling.`,
      );
      await this.cashSettleOption(position, underlyingPrice, exercisedAt);
      return;
    }

    await this.dataSource.transaction(async (manager) => {
      // Create an order record for the exercise
      const stockOrder = manager.create(Order, {
        userId: position.userId,
        symbol: position.underlyingSymbol,
        side: OrderSide.SELL,
        quantity: shares,
        orderType: OrderType.MARKET,
        orderCategory: OrderCategory.EQUITY,
        status: OrderStatus.FILLED,
        filledPrice: strike,
        avgFillPrice: strike,
        filledQuantity: shares,
        filledAt: exercisedAt,
      });
      const savedOrder = await manager.save(stockOrder);

      // Record the option closure
      await this.optionTaxService.recordExercised(
        manager,
        position.userId,
        position,
        exercisedAt,
        savedOrder.id,
      );

      // Sell shares via tax lot system
      await this.taxLotService.sellShares(
        manager,
        position.userId,
        position.underlyingSymbol,
        shares,
        strike,
        savedOrder.id,
        exercisedAt,
      );

      // Update stock position
      const newQuantity = Number(stockPosition.quantity) - shares;
      if (newQuantity <= 0) {
        await manager.remove(Position, stockPosition);
      } else {
        stockPosition.quantity = newQuantity;
        await manager.save(stockPosition);
      }

      // Credit cash
      const user = await manager.findOneOrFail(User, {
        where: { id: position.userId },
      });
      user.cashBalance = Number(user.cashBalance) + strike * shares;
      await manager.save(user);

      // Delete option position
      await manager.remove(OptionPosition, position);
    });

    this.logger.log(
      `Exercised put: Sold ${shares} shares of ${position.underlyingSymbol} at $${strike}`,
    );
  }

  /**
   * Cash settle an option when shares/funds are insufficient
   * This pays out the intrinsic value instead of physical delivery
   */
  private async cashSettleOption(
    position: OptionPosition,
    underlyingPrice: number,
    settledAt: Date,
  ): Promise<void> {
    const contracts = Math.abs(Number(position.quantity));
    const shares = contracts * 100;
    const strike = Number(position.strikePrice);

    let intrinsicValue: number;
    if (position.optionType === OptionType.CALL) {
      intrinsicValue = Math.max(0, (underlyingPrice - strike) * shares);
    } else {
      intrinsicValue = Math.max(0, (strike - underlyingPrice) * shares);
    }

    await this.dataSource.transaction(async (manager) => {
      // Record as exercised (cash settled)
      await this.optionTaxService.recordExercised(
        manager,
        position.userId,
        position,
        settledAt,
        null, // No stock order
      );

      // Credit intrinsic value to cash
      if (intrinsicValue > 0) {
        const user = await manager.findOneOrFail(User, {
          where: { id: position.userId },
        });
        user.cashBalance = Number(user.cashBalance) + intrinsicValue;
        await manager.save(user);
      }

      // Delete option position
      await manager.remove(OptionPosition, position);
    });

    this.logger.log(
      `Cash settled ${position.optionSymbol}: $${intrinsicValue.toFixed(2)} intrinsic value`,
    );
  }
}
