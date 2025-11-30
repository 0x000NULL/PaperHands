import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../entities/order.entity';
import { User } from '../../users/entities/user.entity';
import { Position } from '../../portfolio/entities/position.entity';
import { OptionPosition } from '../../portfolio/entities/option-position.entity';
import { OrderSide, OrderType, OrderStatus } from '../enums/order.enums';

/**
 * Service responsible for order validation and resource availability checks.
 * Handles validation of prices, funds, and share availability.
 */
@Injectable()
export class OrderValidationService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Position)
    private readonly positionRepository: Repository<Position>,
    @InjectRepository(OptionPosition)
    private readonly optionPositionRepository: Repository<OptionPosition>,
  ) {}

  /**
   * Validate conditional order prices (stop/limit) against current market price.
   * Throws BadRequestException if validation fails.
   *
   * @param orderType - The type of order
   * @param side - Buy or sell
   * @param currentPrice - Current market price
   * @param limitPrice - Limit price for limit orders
   * @param stopPrice - Stop price for stop orders
   */
  validateConditionalOrderPrices(
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

  /**
   * Estimate the cost of an order for fund reservation purposes.
   * Uses the most conservative estimate.
   *
   * @param orderType - Type of order
   * @param quantity - Order quantity
   * @param limitPrice - Limit price if applicable
   * @param stopPrice - Stop price if applicable
   * @param currentPrice - Current market price
   */
  estimateOrderCost(
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

  /**
   * Get available cash for a user (excluding funds reserved for pending buy orders).
   *
   * @param userId - User ID to check
   * @returns Available cash balance
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
   * Get available shares for a symbol (excluding shares reserved for pending sell orders).
   *
   * @param userId - User ID to check
   * @param symbol - Stock symbol
   * @returns Available share quantity
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
   * Get available option contracts for selling (closing long position).
   * Excludes contracts reserved for pending sell orders.
   *
   * @param userId - User ID to check
   * @param optionSymbol - OCC option symbol
   * @returns Available contract quantity
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

  /**
   * Validate that a user has sufficient funds for a buy order.
   *
   * @param userId - User ID
   * @param requiredAmount - Amount required for the order
   * @throws BadRequestException if insufficient funds
   */
  async validateSufficientFunds(
    userId: string,
    requiredAmount: number,
  ): Promise<void> {
    const availableCash = await this.getAvailableCash(userId);
    if (availableCash < requiredAmount) {
      throw new BadRequestException(
        `Insufficient funds. Required: $${requiredAmount.toFixed(2)}, Available: $${availableCash.toFixed(2)}`,
      );
    }
  }

  /**
   * Validate that a user has sufficient shares for a sell order.
   *
   * @param userId - User ID
   * @param symbol - Stock symbol
   * @param requiredQuantity - Number of shares required
   * @throws BadRequestException if insufficient shares
   */
  async validateSufficientShares(
    userId: string,
    symbol: string,
    requiredQuantity: number,
  ): Promise<void> {
    const availableShares = await this.getAvailableShares(userId, symbol);
    if (availableShares < requiredQuantity) {
      throw new BadRequestException(
        `Insufficient shares. Required: ${requiredQuantity}, Available: ${availableShares}`,
      );
    }
  }
}
