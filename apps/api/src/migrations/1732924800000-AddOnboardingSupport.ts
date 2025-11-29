import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOnboardingSupport1732924800000 implements MigrationInterface {
  name = 'AddOnboardingSupport1732924800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add onboarding columns to users table
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "onboardingCompletedAt" TIMESTAMP
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "onboardingStep" INTEGER NOT NULL DEFAULT 0
    `);

    // Create user_preferences table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_preferences" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "userId" UUID NOT NULL,
        "defaultOrderType" VARCHAR NOT NULL DEFAULT 'market',
        "defaultTimeInForce" VARCHAR NOT NULL DEFAULT 'day',
        "defaultCostBasisMethod" VARCHAR NOT NULL DEFAULT 'fifo',
        "tourCompleted" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_preferences" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_preferences_userId" UNIQUE ("userId"),
        CONSTRAINT "FK_user_preferences_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop user_preferences table
    await queryRunner.query(`DROP TABLE IF EXISTS "user_preferences"`);

    // Remove onboarding columns from users table
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "onboardingStep"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "onboardingCompletedAt"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "onboardingCompleted"`);
  }
}
