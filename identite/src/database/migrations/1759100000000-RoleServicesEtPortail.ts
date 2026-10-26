import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Permissions par rôle :
 *
 * 1. role_services_etablissement : un rôle → services accessibles dans un établissement.
 *    Tout utilisateur ayant ce rôle hérite automatiquement de ces accès
 *    (priorité : accord individuel > accord par rôle > refus par défaut).
 *    L'administrateur garde toujours accès implicite à tout.
 *
 * 2. Colonne `peut_voir_portail` sur la table `role` :
 *    Si false, les utilisateurs de ce rôle ne voient pas le portail des services
 *    (utile pour les rôles internes : personnel RH, comptable, etc.).
 *    L'administrateur voit toujours le portail.
 */
export class RoleServicesEtPortail1759100000000 implements MigrationInterface {
  name = 'RoleServicesEtPortail1759100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Colonne peut_voir_portail sur role (default true = tous les rôles existants voient le portail)
    await queryRunner.query(`
      ALTER TABLE "identite"."role"
        ADD COLUMN IF NOT EXISTS "peut_voir_portail" boolean NOT NULL DEFAULT true
    `);

    // 2. Table d'accès services par rôle dans un établissement
    await queryRunner.query(`
      CREATE TABLE "identite"."role_services_etablissement" (
        "id" BIGSERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT gen_random_uuid(),
        "role_id" bigint NOT NULL,
        "etablissement_services_id" bigint NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_rse_uuid" UNIQUE ("uuid"),
        CONSTRAINT "UQ_rse_role_es" UNIQUE ("role_id","etablissement_services_id"),
        CONSTRAINT "FK_rse_role" FOREIGN KEY ("role_id")
          REFERENCES "identite"."role"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_rse_es" FOREIGN KEY ("etablissement_services_id")
          REFERENCES "identite"."etablissement_services"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_rse_role" ON "identite"."role_services_etablissement" ("role_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_rse_es" ON "identite"."role_services_etablissement" ("etablissement_services_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "identite"."role_services_etablissement"`);
    await queryRunner.query(`ALTER TABLE "identite"."role" DROP COLUMN IF EXISTS "peut_voir_portail"`);
  }
}
