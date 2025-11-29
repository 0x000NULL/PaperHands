import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddThemeColumn1733000000000 implements MigrationInterface {
  name = 'AddThemeColumn1733000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_preferences"
      ADD COLUMN IF NOT EXISTS "theme" VARCHAR NOT NULL DEFAULT 'dark'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_preferences"
      DROP COLUMN IF EXISTS "theme"
    `);
  }
}
