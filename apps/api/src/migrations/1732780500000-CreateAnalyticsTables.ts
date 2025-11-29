import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAnalyticsTables1732780500000 implements MigrationInterface {
  name = 'CreateAnalyticsTables1732780500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create tax_lots table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tax_lots" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "symbol" varchar NOT NULL,
        "originalQuantity" decimal(18,8) NOT NULL,
        "remainingQuantity" decimal(18,8) NOT NULL,
        "costBasisPerShare" decimal(18,8) NOT NULL,
        "sourceOrderId" uuid,
        "acquiredAt" timestamp NOT NULL,
        "status" varchar NOT NULL DEFAULT 'open',
        "closedAt" timestamp,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tax_lots" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_tax_lots_userId" ON "tax_lots" ("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_tax_lots_symbol" ON "tax_lots" ("symbol")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_tax_lots_status" ON "tax_lots" ("status")
    `);

    // Create lot_sales table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "lot_sales" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "taxLotId" uuid NOT NULL,
        "sellOrderId" uuid,
        "symbol" varchar NOT NULL,
        "quantitySold" decimal(18,8) NOT NULL,
        "costBasisPerShare" decimal(18,8) NOT NULL,
        "salePrice" decimal(18,8) NOT NULL,
        "proceeds" decimal(18,8) NOT NULL,
        "costBasis" decimal(18,8) NOT NULL,
        "realizedGain" decimal(18,8) NOT NULL,
        "gainType" varchar NOT NULL,
        "holdingDays" integer NOT NULL,
        "soldAt" timestamp NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_lot_sales" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_lot_sales_userId" ON "lot_sales" ("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_lot_sales_symbol" ON "lot_sales" ("symbol")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_lot_sales_soldAt" ON "lot_sales" ("soldAt")
    `);

    // Create portfolio_snapshots table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "portfolio_snapshots" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "date" date NOT NULL,
        "totalValue" decimal(18,2) NOT NULL,
        "cashBalance" decimal(18,2) NOT NULL,
        "positionsValue" decimal(18,2) NOT NULL,
        "positionDetails" jsonb NOT NULL DEFAULT '[]',
        "isReconstructed" boolean NOT NULL DEFAULT false,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_portfolio_snapshots" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_portfolio_snapshots_userId_date" UNIQUE ("userId", "date")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_portfolio_snapshots_userId" ON "portfolio_snapshots" ("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_portfolio_snapshots_date" ON "portfolio_snapshots" ("date")
    `);

    // Create dividends table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dividends" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "symbol" varchar NOT NULL,
        "exDate" date NOT NULL,
        "payDate" date,
        "amount" decimal(18,8) NOT NULL,
        "quantity" decimal(18,8) NOT NULL,
        "totalAmount" decimal(18,8) NOT NULL,
        "status" varchar NOT NULL DEFAULT 'pending',
        "reinvested" boolean NOT NULL DEFAULT false,
        "reinvestOrderId" uuid,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_dividends" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_dividends_userId" ON "dividends" ("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_dividends_symbol" ON "dividends" ("symbol")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_dividends_exDate" ON "dividends" ("exDate")
    `);

    // Create user_cost_basis_preferences table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_cost_basis_preferences" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "defaultMethod" varchar NOT NULL DEFAULT 'fifo',
        "symbolOverrides" jsonb NOT NULL DEFAULT '{}',
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_cost_basis_preferences" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_cost_basis_preferences_userId" UNIQUE ("userId")
      )
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "tax_lots"
      ADD CONSTRAINT "FK_tax_lots_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "lot_sales"
      ADD CONSTRAINT "FK_lot_sales_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "lot_sales"
      ADD CONSTRAINT "FK_lot_sales_taxLotId"
      FOREIGN KEY ("taxLotId") REFERENCES "tax_lots"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "portfolio_snapshots"
      ADD CONSTRAINT "FK_portfolio_snapshots_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "dividends"
      ADD CONSTRAINT "FK_dividends_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "user_cost_basis_preferences"
      ADD CONSTRAINT "FK_user_cost_basis_preferences_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    await queryRunner.query(`
      ALTER TABLE "user_cost_basis_preferences" DROP CONSTRAINT IF EXISTS "FK_user_cost_basis_preferences_userId"
    `);
    await queryRunner.query(`
      ALTER TABLE "dividends" DROP CONSTRAINT IF EXISTS "FK_dividends_userId"
    `);
    await queryRunner.query(`
      ALTER TABLE "portfolio_snapshots" DROP CONSTRAINT IF EXISTS "FK_portfolio_snapshots_userId"
    `);
    await queryRunner.query(`
      ALTER TABLE "lot_sales" DROP CONSTRAINT IF EXISTS "FK_lot_sales_taxLotId"
    `);
    await queryRunner.query(`
      ALTER TABLE "lot_sales" DROP CONSTRAINT IF EXISTS "FK_lot_sales_userId"
    `);
    await queryRunner.query(`
      ALTER TABLE "tax_lots" DROP CONSTRAINT IF EXISTS "FK_tax_lots_userId"
    `);

    // Drop tables
    await queryRunner.query(
      `DROP TABLE IF EXISTS "user_cost_basis_preferences"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "dividends"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "portfolio_snapshots"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "lot_sales"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tax_lots"`);
  }
}
