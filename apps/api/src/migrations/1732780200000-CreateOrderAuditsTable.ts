import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrderAuditsTable1732780200000 implements MigrationInterface {
  name = 'CreateOrderAuditsTable1732780200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create audit action enum type
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "audit_action_enum" AS ENUM (
          'created', 'modified', 'triggered', 'partially_filled',
          'filled', 'cancelled', 'expired', 'rejected'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create order_audits table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "order_audits" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "order_id" uuid NOT NULL,
        "action" "audit_action_enum" NOT NULL,
        "previousState" jsonb,
        "newState" jsonb,
        "triggerPrice" decimal(12,2),
        "notes" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_order_audits" PRIMARY KEY ("id"),
        CONSTRAINT "FK_order_audits_order" FOREIGN KEY ("order_id")
          REFERENCES "orders"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_order_audits_order_id" ON "order_audits" ("order_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_order_audits_order_createdAt" ON "order_audits" ("order_id", "createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_order_audits_order_createdAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_order_audits_order_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "order_audits"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "audit_action_enum"`);
  }
}
