import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderAudit } from '../entities/order-audit.entity';
import { Order } from '../entities/order.entity';
import { AuditAction } from '../enums/order.enums';

/**
 * Service responsible for order audit trail management.
 * Handles creating audit records and retrieving order history.
 */
@Injectable()
export class OrderAuditService {
  constructor(
    @InjectRepository(OrderAudit)
    private readonly orderAuditRepository: Repository<OrderAudit>,
  ) {}

  /**
   * Create an audit record for an order action.
   *
   * @param order - The order being audited
   * @param action - The action being recorded
   * @param notes - Optional notes about the action
   * @param triggerPrice - Optional trigger price for conditional orders
   * @param previousState - Optional previous state snapshot
   */
  async createAuditRecord(
    order: Order,
    action: AuditAction,
    notes: string | null = null,
    triggerPrice: number | null = null,
    previousState: Record<string, unknown> | null = null,
  ): Promise<OrderAudit> {
    const audit = this.orderAuditRepository.create({
      orderId: order.id,
      action,
      previousState,
      newState: this.orderToSnapshot(order),
      triggerPrice,
      notes,
    });
    return this.orderAuditRepository.save(audit);
  }

  /**
   * Get all audit records for an order.
   *
   * @param orderId - The order ID to get history for
   */
  async getAuditHistory(orderId: string): Promise<OrderAudit[]> {
    return this.orderAuditRepository.find({
      where: { orderId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Format audit records for API response.
   */
  formatAuditHistory(audits: OrderAudit[]): Array<{
    id: string;
    action: AuditAction;
    triggerPrice: number | null;
    notes: string | null;
    createdAt: Date;
  }> {
    return audits.map((audit) => ({
      id: audit.id,
      action: audit.action,
      triggerPrice: audit.triggerPrice ? Number(audit.triggerPrice) : null,
      notes: audit.notes,
      createdAt: audit.createdAt,
    }));
  }

  /**
   * Create a snapshot of the order's current state for audit purposes.
   */
  orderToSnapshot(order: Order): Record<string, unknown> {
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
}
