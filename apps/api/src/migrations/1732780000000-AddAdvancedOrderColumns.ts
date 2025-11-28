import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdvancedOrderColumns1732780000000 implements MigrationInterface {
  name = 'AddAdvancedOrderColumns1732780000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create new enum types
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "order_ordertype_enum" AS ENUM ('market', 'limit', 'stop', 'stop_limit', 'trailing_stop');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "order_timeinforce_enum" AS ENUM ('day', 'gtc');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add new status values to existing enum if they don't exist
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TYPE "orders_status_enum" ADD VALUE IF NOT EXISTS 'open';
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TYPE "orders_status_enum" ADD VALUE IF NOT EXISTS 'partially_filled';
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TYPE "orders_status_enum" ADD VALUE IF NOT EXISTS 'expired';
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TYPE "orders_status_enum" ADD VALUE IF NOT EXISTS 'rejected';
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add new columns to orders table
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "orderType" "order_ordertype_enum" DEFAULT 'market'
    `);

    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "timeInForce" "order_timeinforce_enum" DEFAULT 'day'
    `);

    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "extendedHours" boolean DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "filledQuantity" decimal(12,4) DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "limitPrice" decimal(12,2) DEFAULT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "stopPrice" decimal(12,2) DEFAULT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "trailAmount" decimal(12,2) DEFAULT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "trailPercent" decimal(5,2) DEFAULT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "trailingPeakPrice" decimal(12,2) DEFAULT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "currentTriggerPrice" decimal(12,2) DEFAULT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "avgFillPrice" decimal(12,2) DEFAULT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "rejectionReason" text DEFAULT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "idempotencyKey" varchar UNIQUE DEFAULT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "expiresAt" timestamp DEFAULT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "triggeredAt" timestamp DEFAULT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "filledAt" timestamp DEFAULT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "cancelledAt" timestamp DEFAULT NULL
    `);

    // Create indexes for performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_orders_status_symbol" ON "orders" ("status", "symbol")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_orders_userId_status" ON "orders" ("userId", "status")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_orders_idempotencyKey" ON "orders" ("idempotencyKey")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_orders_expiresAt" ON "orders" ("expiresAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_expiresAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_idempotencyKey"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_userId_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_status_symbol"`);

    // Drop columns
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "cancelledAt"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "filledAt"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "triggeredAt"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "expiresAt"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "idempotencyKey"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "rejectionReason"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "avgFillPrice"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "currentTriggerPrice"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "trailingPeakPrice"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "trailPercent"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "trailAmount"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "stopPrice"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "limitPrice"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "filledQuantity"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "extendedHours"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "timeInForce"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "orderType"`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "order_timeinforce_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "order_ordertype_enum"`);
  }
}
