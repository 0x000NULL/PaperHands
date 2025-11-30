import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixAdminRBACColumns1733000200000 implements MigrationInterface {
  name = 'FixAdminRBACColumns1733000200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Fix disabledAt column - rename if exists with wrong name, or create if missing
    const disabledAtExists = (await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'disabledAt'
    `)) as unknown[];

    const disabledAtSnakeExists = (await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'disabled_at'
    `)) as unknown[];

    if (disabledAtSnakeExists.length > 0 && disabledAtExists.length === 0) {
      // Rename from snake_case to camelCase
      await queryRunner.query(
        `ALTER TABLE "users" RENAME COLUMN "disabled_at" TO "disabledAt"`,
      );
    } else if (disabledAtExists.length === 0) {
      // Create the column if it doesn't exist
      await queryRunner.query(
        `ALTER TABLE "users" ADD COLUMN "disabledAt" TIMESTAMP`,
      );
    }

    // Ensure role column exists with correct type
    const roleExists = (await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'role'
    `)) as unknown[];

    if (roleExists.length === 0) {
      // Create enum type if not exists
      await queryRunner.query(`
        DO $$ BEGIN
          CREATE TYPE "public"."user_role_enum" AS ENUM('user', 'admin', 'super_admin');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
      await queryRunner.query(
        `ALTER TABLE "users" ADD COLUMN "role" "public"."user_role_enum" NOT NULL DEFAULT 'user'`,
      );
    }

    // Ensure disabled column exists
    const disabledExists = (await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'disabled'
    `)) as unknown[];

    if (disabledExists.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD COLUMN "disabled" boolean NOT NULL DEFAULT false`,
      );
    }

    // Fix admin_audits table columns if they exist with wrong names
    const tableExists = (await queryRunner.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_name = 'admin_audits'
    `)) as unknown[];

    if (tableExists.length > 0) {
      // Check and rename columns
      const columnsToFix = [
        { snake: 'admin_id', camel: 'adminId' },
        { snake: 'target_user_id', camel: 'targetUserId' },
        { snake: 'previous_state', camel: 'previousState' },
        { snake: 'new_state', camel: 'newState' },
        { snake: 'ip_address', camel: 'ipAddress' },
        { snake: 'user_agent', camel: 'userAgent' },
        { snake: 'created_at', camel: 'createdAt' },
      ];

      for (const col of columnsToFix) {
        const snakeExists = (await queryRunner.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'admin_audits' AND column_name = '${col.snake}'
        `)) as unknown[];
        const camelExists = (await queryRunner.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'admin_audits' AND column_name = '${col.camel}'
        `)) as unknown[];

        if (snakeExists.length > 0 && camelExists.length === 0) {
          await queryRunner.query(
            `ALTER TABLE "admin_audits" RENAME COLUMN "${col.snake}" TO "${col.camel}"`,
          );
        }
      }
    } else {
      // Create the table with correct column names
      await queryRunner.query(`
        CREATE TABLE "admin_audits" (
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

      // Add foreign keys
      await queryRunner.query(`
        ALTER TABLE "admin_audits"
        ADD CONSTRAINT "FK_admin_audits_admin"
        FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE CASCADE
      `);

      await queryRunner.query(`
        ALTER TABLE "admin_audits"
        ADD CONSTRAINT "FK_admin_audits_target_user"
        FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE SET NULL
      `);

      // Add indexes
      await queryRunner.query(
        `CREATE INDEX "IDX_admin_audits_adminId" ON "admin_audits" ("adminId")`,
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_admin_audits_targetUserId" ON "admin_audits" ("targetUserId")`,
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_admin_audits_createdAt" ON "admin_audits" ("createdAt")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // This migration is a fix, so down just reverses column names
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "disabledAt"`,
    );
  }
}
