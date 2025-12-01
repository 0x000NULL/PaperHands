import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserLayoutsTable1733200000000 implements MigrationInterface {
  name = 'CreateUserLayoutsTable1733200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create user_layouts table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_layouts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "name" varchar(100) NOT NULL,
        "widgets" jsonb NOT NULL,
        "isDefault" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_layouts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_layouts_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create unique index on userId and name
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_user_layouts_userId_name" ON "user_layouts" ("userId", "name")
    `);

    // Create index on userId for faster lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_layouts_userId" ON "user_layouts" ("userId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_layouts_userId"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_user_layouts_userId_name"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "user_layouts"`);
  }
}
