import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminRBAC1733000100000 implements MigrationInterface {
  name = 'AddAdminRBAC1733000100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create user_role enum
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."user_role_enum" AS ENUM('user', 'admin', 'super_admin');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add role column to users table
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "role" "public"."user_role_enum" NOT NULL DEFAULT 'user'
    `);

    // Add disabled column to users table
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "disabled" boolean NOT NULL DEFAULT false
    `);

    // Add disabledAt column to users table
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "disabled_at" TIMESTAMP
    `);

    // Create admin_audits table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "admin_audits" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "admin_id" uuid NOT NULL,
        "action" character varying NOT NULL,
        "target_user_id" uuid,
        "previous_state" jsonb,
        "new_state" jsonb,
        "reason" character varying,
        "ip_address" character varying,
        "user_agent" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_audits" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key for admin_id
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "admin_audits"
        ADD CONSTRAINT "FK_admin_audits_admin"
        FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add foreign key for target_user_id
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "admin_audits"
        ADD CONSTRAINT "FK_admin_audits_target_user"
        FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create index on admin_id for faster lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_admin_audits_admin_id" ON "admin_audits" ("admin_id")
    `);

    // Create index on target_user_id
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_admin_audits_target_user_id" ON "admin_audits" ("target_user_id")
    `);

    // Create index on created_at for time-based queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_admin_audits_created_at" ON "admin_audits" ("created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop admin_audits table
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_audits"`);

    // Remove columns from users table
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "disabled_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "disabled"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "role"`);

    // Drop enum type
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."user_role_enum"`);
  }
}
