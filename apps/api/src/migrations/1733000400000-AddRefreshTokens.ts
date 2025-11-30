import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefreshTokens1733000400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash" varchar(64) NOT NULL,
        "family" varchar(36) NOT NULL,
        "expires_at" timestamp NOT NULL,
        "revoked" boolean DEFAULT false,
        "revoked_at" timestamp,
        "revoked_reason" varchar(255),
        "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
        "device_info" jsonb
      );

      CREATE INDEX "idx_refresh_tokens_user_family" ON "refresh_tokens"("user_id", "family");
      CREATE INDEX "idx_refresh_tokens_expires" ON "refresh_tokens"("expires_at");
      CREATE INDEX "idx_refresh_tokens_hash" ON "refresh_tokens"("token_hash");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
  }
}
