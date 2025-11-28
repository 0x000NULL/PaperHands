import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWatchlistsTables1732780300000 implements MigrationInterface {
  name = 'CreateWatchlistsTables1732780300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create watchlists table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "watchlists" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "name" varchar(100) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_watchlists" PRIMARY KEY ("id"),
        CONSTRAINT "FK_watchlists_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_watchlists_user_name" UNIQUE ("user_id", "name")
      )
    `);

    // Create index on user_id
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_watchlists_user_id" ON "watchlists" ("user_id")
    `);

    // Create watchlist_items table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "watchlist_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "watchlist_id" uuid NOT NULL,
        "symbol" varchar(10) NOT NULL,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "addedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_watchlist_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_watchlist_items_watchlist" FOREIGN KEY ("watchlist_id")
          REFERENCES "watchlists"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_watchlist_items_watchlist_symbol" UNIQUE ("watchlist_id", "symbol")
      )
    `);

    // Create index on watchlist_id
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_watchlist_items_watchlist_id" ON "watchlist_items" ("watchlist_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_watchlist_items_watchlist_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "watchlist_items"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_watchlists_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "watchlists"`);
  }
}
