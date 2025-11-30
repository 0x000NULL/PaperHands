import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDefaultBenchmarkSymbol1733100000000 implements MigrationInterface {
  name = 'AddDefaultBenchmarkSymbol1733100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_preferences"
      ADD COLUMN IF NOT EXISTS "defaultBenchmarkSymbol" VARCHAR NOT NULL DEFAULT 'SPY'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_preferences"
      DROP COLUMN IF EXISTS "defaultBenchmarkSymbol"
    `);
  }
}
