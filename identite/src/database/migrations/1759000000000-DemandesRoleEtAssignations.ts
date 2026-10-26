import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Deux nouvelles tables :
 *
 * 1. demandes_role : demandes de rôle personnalisé soumises par les administrateurs
 *    d'établissement. Le super_admin les instruit (accepter → crée le rôle + l'assigne
 *    à l'établissement demandeur ; refuser → clôt la demande).
 *
 * 2. role_etablissements : table d'assignation rôle personnalisé ↔ établissement.
 *    Un rôle personnalisé global (tenantId NULL) peut être assigné à plusieurs
 *    établissements. Un rôle spécifique à un tenant (tenantId non-null) est implicitement
 *    disponible pour ce tenant, mais cette table permet de l'ouvrir à d'autres.
 *
 * Statuts demande_role : en_attente | acceptee | refusee
 */
export class DemandesRoleEtAssignations1759000000000 implements MigrationInterface {
  name = 'DemandesRoleEtAssignations1759000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Table demandes_role ──────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "identite"."demandes_role" (
        "id" BIGSERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT gen_random_uuid(),
        "etablissement_id" bigint NOT NULL,
        "nom_souhaite" varchar(128) NOT NULL,
        "description" text NOT NULL DEFAULT '',
        "statut" varchar(20) NOT NULL DEFAULT 'en_attente',
        "note_instruction" text NOT NULL DEFAULT '',
        "instruit_par" uuid NULL,
        "role_cree_uuid" uuid NULL,
        "date_instruction" TIMESTAMP NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_demandes_role_uuid" UNIQUE ("uuid"),
        CONSTRAINT "CHK_demandes_role_statut" CHECK (statut IN ('en_attente','acceptee','refusee')),
        CONSTRAINT "FK_demandes_role_etablissement" FOREIGN KEY ("etablissement_id")
          REFERENCES "etablissements"."etablissements"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_demandes_role_etab_en_attente"
        ON "identite"."demandes_role" ("etablissement_id", "nom_souhaite")
        WHERE statut = 'en_attente'
    `);
    await queryRunner.query(`CREATE INDEX "IDX_demandes_role_statut" ON "identite"."demandes_role" ("statut", "created_at" DESC)`);

    // ── Table role_etablissements ────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "identite"."role_etablissements" (
        "id" BIGSERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT gen_random_uuid(),
        "role_id" bigint NOT NULL,
        "etablissement_id" bigint NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_role_etablissements_uuid" UNIQUE ("uuid"),
        CONSTRAINT "UQ_role_etablissements_role_etab" UNIQUE ("role_id", "etablissement_id"),
        CONSTRAINT "FK_role_etablissements_role" FOREIGN KEY ("role_id")
          REFERENCES "identite"."role"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_role_etablissements_etablissement" FOREIGN KEY ("etablissement_id")
          REFERENCES "etablissements"."etablissements"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_role_etablissements_etab" ON "identite"."role_etablissements" ("etablissement_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "identite"."role_etablissements"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "identite"."demandes_role"`);
  }
}
