import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreationServicesEtablissement1758700000000 implements MigrationInterface {
  name = 'CreationServicesEtablissement1758700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- Type enum ---
    await queryRunner.query(`
      CREATE TYPE "identite"."identite_status_service_enum" AS ENUM ('active', 'inactive')
    `);

    // --- Table services ---
    await queryRunner.query(`
      CREATE TABLE "identite"."services" (
        "id" BIGSERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT gen_random_uuid(),
        "status" "identite"."identite_status_service_enum" NOT NULL DEFAULT 'active',
        "nom" varchar(255) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_services_uuid" UNIQUE ("uuid")
      )
    `);

    // --- Table etablissement_services ---
    // Relation inter-schemas : etablissement (schema "etablissement") <-> services (schema "identite").
    // Si un etablissement est supprime, ses lignes ici sont supprimees automatiquement (ON DELETE CASCADE).
    await queryRunner.query(`
      CREATE TABLE "identite"."etablissement_services" (
        "id" BIGSERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT gen_random_uuid(),
        "service_id" bigint NOT NULL,
        "etablissement_id" bigint NOT NULL,
        "status" "identite"."identite_status_service_enum" NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_etablissement_services_uuid" UNIQUE ("uuid"),
        CONSTRAINT "UQ_etablissement_services_service_etablissement" UNIQUE ("service_id", "etablissement_id"),
        CONSTRAINT "FK_etablissement_services_service" FOREIGN KEY ("service_id")
          REFERENCES "identite"."services"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_etablissement_services_etablissement" FOREIGN KEY ("etablissement_id")
          REFERENCES "etablissements"."etablissements"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_etablissement_services_etablissement" ON "identite"."etablissement_services" ("etablissement_id")
    `);

    // --- Table users_services_etablissement ---
    await queryRunner.query(`
      CREATE TABLE "identite"."users_services_etablissement" (
        "id" BIGSERIAL PRIMARY KEY,
        "user_id" bigint NOT NULL,
        "etablissement_services_id" bigint NOT NULL,
        "autorised" boolean NOT NULL DEFAULT false,
        CONSTRAINT "UQ_users_services_etablissement_user_es" UNIQUE ("user_id", "etablissement_services_id"),
        CONSTRAINT "FK_users_services_etablissement_user" FOREIGN KEY ("user_id")
          REFERENCES "identite"."utilisateur"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_users_services_etablissement_es" FOREIGN KEY ("etablissement_services_id")
          REFERENCES "identite"."etablissement_services"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_users_services_etablissement_es" ON "identite"."users_services_etablissement" ("etablissement_services_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "identite"."users_services_etablissement"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "identite"."etablissement_services"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "identite"."services"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "identite"."identite_status_service_enum"`);
  }
}