import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQueuedOrderStatus1732780400000 implements MigrationInterface {
  name = 'AddQueuedOrderStatus1732780400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add 'queued' status to the orders_status_enum
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TYPE "orders_status_enum" ADD VALUE IF NOT EXISTS 'queued';
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: PostgreSQL doesn't support removing enum values directly
    // This would require recreating the type and migrating data
    // For safety, we leave this as a no-op
    await Promise.resolve();
  }
}
