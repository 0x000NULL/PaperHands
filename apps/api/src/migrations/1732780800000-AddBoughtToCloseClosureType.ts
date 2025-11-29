import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBoughtToCloseClosureType1732780800000 implements MigrationInterface {
  name = 'AddBoughtToCloseClosureType1732780800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add bought_to_close to the option_closure_type_enum
    await queryRunner.query(`
      ALTER TYPE "option_closure_type_enum" ADD VALUE IF NOT EXISTS 'bought_to_close'
    `);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL doesn't support removing enum values directly
    // This would require recreating the enum type
    // For now, we'll leave the enum value in place on rollback
    // as it doesn't cause any issues with existing data
  }
}
