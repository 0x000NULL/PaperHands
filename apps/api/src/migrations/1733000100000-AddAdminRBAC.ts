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
      ADD COLUMN IF NOT EXISTS "disabledAt" TIMESTAMP
    `);

    // Create admin_audits table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "admin_audits" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "adminId" uuid NOT NULL,
        "action" character varying NOT NULL,
        "targetUserId" uuid,
        "previousState" jsonb,
        "newState" jsonb,
        "reason" character varying,
        "ipAddress" character varying,
        "userAgent" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_audits" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key for adminId
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "admin_audits"
        ADD CONSTRAINT "FK_admin_audits_admin"
        FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add foreign key for targetUserId
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "admin_audits"
        ADD CONSTRAINT "FK_admin_audits_target_user"
        FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE SET NULL;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create index on adminId for faster lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_admin_audits_adminId" ON "admin_audits" ("adminId")
    `);

    // Create index on targetUserId
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_admin_audits_targetUserId" ON "admin_audits" ("targetUserId")
    `);

    // Create index on createdAt for time-based queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_admin_audits_createdAt" ON "admin_audits" ("createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop admin_audits table
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_audits"`);

    // Remove columns from users table
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "disabledAt"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "disabled"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "role"`);

    // Drop enum type
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."user_role_enum"`);
  }
}
