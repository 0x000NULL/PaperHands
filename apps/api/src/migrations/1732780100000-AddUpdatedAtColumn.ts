import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUpdatedAtColumn1732780100000 implements MigrationInterface {
  name = 'AddUpdatedAtColumn1732780100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add updatedAt column if it doesn't exist
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT NOW()
    `);

    // Update existing rows to have updatedAt match createdAt
    await queryRunner.query(`
      UPDATE "orders" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "updatedAt"`);
  }
}
