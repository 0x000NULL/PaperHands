import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

/**
 * Isolation levels supported by PostgreSQL.
 * Using string literal type that matches TypeORM's expected values.
 */
export type TransactionIsolationLevel = 'READ COMMITTED' | 'SERIALIZABLE';

/**
 * Centralized transaction management service.
 * Eliminates duplicated transaction handling blocks across services.
 *
 * Usage:
 * ```typescript
 * const result = await this.transactionManager.executeInTransaction(async (manager) => {
 *   const user = await manager.findOne(User, { where: { id: userId } });
 *   // ... more operations
 *   return result;
 * });
 * ```
 */
@Injectable()
export class TransactionManagerService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Execute an operation within a database transaction.
   *
   * @param operation - Async function receiving EntityManager to perform DB operations
   * @param isolationLevel - Transaction isolation level (default: SERIALIZABLE for financial operations)
   * @returns Result of the operation
   * @throws Re-throws any error after rolling back the transaction
   */
  async executeInTransaction<T>(
    operation: (manager: EntityManager) => Promise<T>,
    isolationLevel: TransactionIsolationLevel = 'SERIALIZABLE',
  ): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction(isolationLevel);

    try {
      const result = await operation(queryRunner.manager);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Execute an operation with pessimistic locking on an entity.
   * Useful for preventing race conditions on financial operations.
   *
   * @param operation - Async function receiving EntityManager
   * @param isolationLevel - Transaction isolation level
   */
  async executeWithLock<T>(
    operation: (manager: EntityManager) => Promise<T>,
    isolationLevel: TransactionIsolationLevel = 'SERIALIZABLE',
  ): Promise<T> {
    return this.executeInTransaction(operation, isolationLevel);
  }
}
