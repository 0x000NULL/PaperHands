import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOptionsSupport1732780600000 implements MigrationInterface {
  name = 'AddOptionsSupport1732780600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add option fields to orders table
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "orderCategory" varchar NOT NULL DEFAULT 'equity'
    `);
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "optionSymbol" varchar(30)
    `);
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "underlyingSymbol" varchar(10)
    `);
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "optionType" varchar(4)
    `);
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "strikePrice" decimal(12,4)
    `);
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "expirationDate" date
    `);
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "contractMultiplier" integer DEFAULT 100
    `);
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "greeksAtFill" jsonb
    `);

    // Create index for option orders
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_orders_optionSymbol" ON "orders" ("optionSymbol")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_orders_orderCategory" ON "orders" ("orderCategory")
    `);

    // Create option_positions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "option_positions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "optionSymbol" varchar(30) NOT NULL,
        "underlyingSymbol" varchar(10) NOT NULL,
        "optionType" varchar(4) NOT NULL,
        "strikePrice" decimal(12,4) NOT NULL,
        "expirationDate" date NOT NULL,
        "quantity" decimal(12,4) NOT NULL,
        "avgCostBasis" decimal(12,4) NOT NULL,
        "greeksSnapshot" jsonb,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_option_positions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_option_positions_userId_optionSymbol" UNIQUE ("userId", "optionSymbol")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_option_positions_userId" ON "option_positions" ("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_option_positions_underlyingSymbol" ON "option_positions" ("underlyingSymbol")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_option_positions_expirationDate" ON "option_positions" ("expirationDate")
    `);

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "option_positions"
      ADD CONSTRAINT "FK_option_positions_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "option_positions" DROP CONSTRAINT IF EXISTS "FK_option_positions_userId"
    `);

    // Drop option_positions table
    await queryRunner.query(`DROP TABLE IF EXISTS "option_positions"`);

    // Drop indexes from orders
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_optionSymbol"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_orderCategory"`);

    // Remove option columns from orders table
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN IF EXISTS "greeksAtFill"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN IF EXISTS "contractMultiplier"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN IF EXISTS "expirationDate"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN IF EXISTS "strikePrice"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN IF EXISTS "optionType"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN IF EXISTS "underlyingSymbol"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN IF EXISTS "optionSymbol"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN IF EXISTS "orderCategory"`,
    );
  }
}
