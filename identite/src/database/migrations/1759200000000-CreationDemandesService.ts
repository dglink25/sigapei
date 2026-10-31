import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreationDemandesService1759200000000 implements MigrationInterface {
  name = 'CreationDemandesService1759200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "identite"."demandes_service" (
        "id" BIGSERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT gen_random_uuid(),
        "etablissement_id" bigint NOT NULL,
        "service_id" bigint NOT NULL,
        "motif" text NOT NULL DEFAULT '',
        "statut" varchar(20) NOT NULL DEFAULT 'en_attente',
        "note_instruction" text NOT NULL DEFAULT '',
        "instruit_par" uuid NULL,
        "date_instruction" TIMESTAMP NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_demandes_service_uuid" UNIQUE ("uuid"),
        CONSTRAINT "CHK_demandes_service_statut" CHECK (statut IN ('en_attente','acceptee','refusee')),
        CONSTRAINT "FK_demandes_service_etablissement" FOREIGN KEY ("etablissement_id")
          REFERENCES "etablissements"."etablissements"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_demandes_service_service" FOREIGN KEY ("service_id")
          REFERENCES "identite"."services"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_demandes_service_etab_en_attente"
        ON "identite"."demandes_service" ("etablissement_id", "service_id")
        WHERE statut = 'en_attente'
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_demandes_service_statut"
        ON "identite"."demandes_service" ("statut", "created_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "identite"."demandes_service"`);
  }
}
