import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetInitialSuperAdmin1733000300000 implements MigrationInterface {
  name = 'SetInitialSuperAdmin1733000300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set ethan@ethanaldrich.net as super_admin
    await queryRunner.query(`
      UPDATE "users"
      SET "role" = 'super_admin'
      WHERE "email" = 'ethan@ethanaldrich.net'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to user role
    await queryRunner.query(`
      UPDATE "users"
      SET "role" = 'user'
      WHERE "email" = 'ethan@ethanaldrich.net'
    `);
  }
}
