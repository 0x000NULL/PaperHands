import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOptionClosuresTable1732780700000 implements MigrationInterface {
  name = 'CreateOptionClosuresTable1732780700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create option_closure_type enum
    await queryRunner.query(`
      CREATE TYPE "option_closure_type_enum" AS ENUM (
        'sold_to_close',
        'expired_worthless',
        'exercised',
        'assigned'
      )
    `);

    // Create option_closures table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "option_closures" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "optionPositionId" uuid,
        "closingOrderId" uuid,
        "optionSymbol" varchar(30) NOT NULL,
        "underlyingSymbol" varchar(10) NOT NULL,
        "optionType" varchar(4) NOT NULL,
        "strikePrice" decimal(12,4) NOT NULL,
        "expirationDate" date NOT NULL,
        "closureType" option_closure_type_enum NOT NULL,
        "quantityClosed" decimal(12,4) NOT NULL,
        "openingPremium" decimal(12,4) NOT NULL,
        "closingPremium" decimal(12,4),
        "realizedGain" decimal(12,2) NOT NULL,
        "proceeds" decimal(12,2) NOT NULL,
        "costBasis" decimal(12,2) NOT NULL,
        "gainType" varchar NOT NULL DEFAULT 'short_term',
        "holdingDays" integer NOT NULL,
        "resultingStockOrderId" uuid,
        "closedAt" timestamp NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_option_closures" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_option_closures_userId" ON "option_closures" ("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_option_closures_underlyingSymbol" ON "option_closures" ("underlyingSymbol")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_option_closures_closedAt" ON "option_closures" ("closedAt")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_option_closures_userId_underlyingSymbol_closedAt"
      ON "option_closures" ("userId", "underlyingSymbol", "closedAt")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_option_closures_userId_gainType_closedAt"
      ON "option_closures" ("userId", "gainType", "closedAt")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_option_closures_closureType" ON "option_closures" ("closureType")
    `);

    // Add foreign key constraint for userId
    await queryRunner.query(`
      ALTER TABLE "option_closures"
      ADD CONSTRAINT "FK_option_closures_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "option_closures" DROP CONSTRAINT IF EXISTS "FK_option_closures_userId"
    `);

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS "option_closures"`);

    // Drop enum type
    await queryRunner.query(`DROP TYPE IF EXISTS "option_closure_type_enum"`);
  }
}
