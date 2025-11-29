import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWashSalesTable1732867200000 implements MigrationInterface {
  name = 'CreateWashSalesTable1732867200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create wash_sale_type enum
    await queryRunner.query(`
      CREATE TYPE "wash_sale_type_enum" AS ENUM (
        'stock_to_stock',
        'stock_to_option',
        'option_to_option',
        'option_to_stock'
      )
    `);

    // Create wash_sales table
    await queryRunner.query(`
      CREATE TABLE "wash_sales" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "symbol" character varying NOT NULL,
        "washSaleType" "wash_sale_type_enum" NOT NULL DEFAULT 'stock_to_stock',
        "triggeringSaleId" uuid,
        "triggeringOptionClosureId" uuid,
        "replacementTaxLotId" uuid,
        "replacementOptionSymbol" character varying,
        "disallowedLoss" numeric(12,2) NOT NULL,
        "originalLoss" numeric(12,2) NOT NULL,
        "quantityAffected" numeric(12,4) NOT NULL,
        "costBasisAdjustment" numeric(12,2) NOT NULL,
        "saleDate" TIMESTAMP NOT NULL,
        "replacementDate" TIMESTAMP NOT NULL,
        "daysBetween" integer NOT NULL,
        "taxYear" integer NOT NULL,
        "notes" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_wash_sales" PRIMARY KEY ("id"),
        CONSTRAINT "FK_wash_sales_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_wash_sales_triggering_sale" FOREIGN KEY ("triggeringSaleId")
          REFERENCES "lot_sales"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_wash_sales_triggering_option_closure" FOREIGN KEY ("triggeringOptionClosureId")
          REFERENCES "option_closures"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_wash_sales_replacement_tax_lot" FOREIGN KEY ("replacementTaxLotId")
          REFERENCES "tax_lots"("id") ON DELETE SET NULL
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_wash_sales_userId" ON "wash_sales" ("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_wash_sales_userId_symbol_createdAt" ON "wash_sales" ("userId", "symbol", "createdAt")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_wash_sales_userId_taxYear" ON "wash_sales" ("userId", "taxYear")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "wash_sales"`);
    await queryRunner.query(`DROP TYPE "wash_sale_type_enum"`);
  }
}
