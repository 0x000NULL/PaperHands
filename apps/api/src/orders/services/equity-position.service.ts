import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Position } from '../../portfolio/entities/position.entity';
import { TaxLotService } from '../../portfolio/services/tax-lot.service';
import { CostBasisMethod } from '../../portfolio/enums/cost-basis.enums';

/**
 * Service responsible for updating equity positions after order fills.
 * Handles tax lot creation/consumption and position averaging.
 */
@Injectable()
export class EquityPositionService {
  private readonly logger = new Logger(EquityPositionService.name);

  constructor(private readonly taxLotService: TaxLotService) {}

  /**
   * Update position after a fill within a transaction.
   *
   * @param manager - Transaction entity manager
   * @param userId - User ID
   * @param symbol - Stock symbol
   * @param quantity - Fill quantity
   * @param price - Fill price
   * @param isBuy - True for buy, false for sell
   * @param orderId - Order ID for tax lot tracking
   * @param costBasisMethod - Cost basis method for sells
   * @param specificLotIds - Specific lot IDs for SPECIFIC method
   */
  async updatePositionInTransaction(
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
      await this.handleBuy(
        manager,
        userId,
        symbol,
        quantity,
        price,
        orderId,
        existingPosition,
      );
    } else {
      await this.handleSell(
        manager,
        userId,
        symbol,
        quantity,
        price,
        orderId,
        costBasisMethod,
        specificLotIds,
        existingPosition,
      );
    }
  }

  /**
   * Handle a buy fill - create tax lot and update position.
   */
  private async handleBuy(
    manager: EntityManager,
    userId: string,
    symbol: string,
    quantity: number,
    price: number,
    orderId: string | undefined,
    existingPosition: Position | null,
  ): Promise<void> {
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
  }

  /**
   * Handle a sell fill - consume tax lots and update position.
   */
  private async handleSell(
    manager: EntityManager,
    userId: string,
    symbol: string,
    quantity: number,
    price: number,
    orderId: string | undefined,
    costBasisMethod: CostBasisMethod | undefined,
    specificLotIds: string[] | undefined,
    existingPosition: Position | null,
  ): Promise<void> {
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

  /**
   * Calculate the new average cost basis when adding to a position.
   */
  calculateNewAvgCost(
    existingQty: number,
    existingCost: number,
    newQty: number,
    newPrice: number,
  ): number {
    const totalQty = existingQty + newQty;
    return (existingQty * existingCost + newQty * newPrice) / totalQty;
  }
}
