import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Order, OrderSide, OrderStatus } from './entities/order.entity';
import { User } from '../users/entities/user.entity';
import { Position } from '../portfolio/entities/position.entity';
import { TradierService } from '../market-data/tradier.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private tradierService: TradierService,
    private dataSource: DataSource,
  ) {}

  async createOrder(userId: string, createOrderDto: CreateOrderDto) {
    const { symbol, side, quantity } = createOrderDto;
    const upperSymbol = symbol.toUpperCase();

    // Get current quote
    const quote = await this.tradierService.getQuote(upperSymbol);
    if (!quote) {
      throw new NotFoundException(`Quote not found for ${upperSymbol}`);
    }

    // Use ask price for buy, bid price for sell
    const executionPrice = side === OrderSide.BUY ? quote.ask : quote.bid;
    if (!executionPrice || executionPrice <= 0) {
      throw new BadRequestException(
        `Invalid price for ${upperSymbol}. Market may be closed.`,
      );
    }

    const totalCost = executionPrice * quantity;

    // Run in transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get user with lock
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (side === OrderSide.BUY) {
        // Check if user has enough cash
        if (Number(user.cashBalance) < totalCost) {
          throw new BadRequestException(
            `Insufficient funds. Required: $${totalCost.toFixed(2)}, Available: $${Number(user.cashBalance).toFixed(2)}`,
          );
        }

        // Deduct cash
        await queryRunner.manager.update(User, userId, {
          cashBalance: Number(user.cashBalance) - totalCost,
        });
      } else {
        // Check if user has enough shares - WITH LOCK inside transaction
        const position = await queryRunner.manager.findOne(Position, {
          where: { userId, symbol: upperSymbol },
          lock: { mode: 'pessimistic_write' },
        });

        if (!position || Number(position.quantity) < quantity) {
          const availableQty = position ? Number(position.quantity) : 0;
          throw new BadRequestException(
            `Insufficient shares. Required: ${quantity}, Available: ${availableQty}`,
          );
        }

        // Add cash from sale
        await queryRunner.manager.update(User, userId, {
          cashBalance: Number(user.cashBalance) + totalCost,
        });
      }

      // Create order record
      const order = queryRunner.manager.create(Order, {
        userId,
        symbol: upperSymbol,
        side,
        quantity,
        filledPrice: executionPrice,
        status: OrderStatus.FILLED,
      });

      await queryRunner.manager.save(order);

      // Update position INSIDE the transaction
      await this.updatePositionInTransaction(
        queryRunner.manager,
        userId,
        upperSymbol,
        quantity,
        executionPrice,
        side === OrderSide.BUY,
      );

      await queryRunner.commitTransaction();

      return {
        id: order.id,
        symbol: order.symbol,
        side: order.side,
        quantity: order.quantity,
        filledPrice: order.filledPrice,
        status: order.status,
        totalValue: totalCost,
        createdAt: order.createdAt,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async updatePositionInTransaction(
    manager: EntityManager,
    userId: string,
    symbol: string,
    quantity: number,
    price: number,
    isBuy: boolean,
  ): Promise<void> {
    const existingPosition = await manager.findOne(Position, {
      where: { userId, symbol },
      lock: { mode: 'pessimistic_write' },
    });

    if (isBuy) {
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
      if (existingPosition) {
        const existingQty = Number(existingPosition.quantity);
        const newQty = existingQty - quantity;
        if (newQty <= 0) {
          await manager.remove(existingPosition);
        } else {
          await manager.update(Position, existingPosition.id, { quantity: newQty });
        }
      }
    }
  }

  async getOrders(userId: string) {
    const orders = await this.orderRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return orders.map((order) => ({
      id: order.id,
      symbol: order.symbol,
      side: order.side,
      quantity: Number(order.quantity),
      filledPrice: order.filledPrice ? Number(order.filledPrice) : null,
      status: order.status,
      createdAt: order.createdAt,
    }));
  }
}
