import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Complete la migration 1758700000000 :
 *  - services : code stable (unique) + description
 *  - etablissement_services : motif de blocage
 *  - audit_acces_service : journal des changements d'assignation et de droits
 */
export class ServicesCodeAuditAcces1758800000000 implements MigrationInterface {
  name = 'ServicesCodeAuditAcces1758800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "identite"."services"
        ADD COLUMN "code" varchar(64) NULL,
        ADD COLUMN "description" text NULL
    `);
    // Lignes eventuellement deja presentes : code provisoire unique, a renommer ensuite.
    await queryRunner.query(`UPDATE "identite"."services" SET "code" = 'service-' || "id" WHERE "code" IS NULL`);
    await queryRunner.query(`ALTER TABLE "identite"."services" ALTER COLUMN "code" SET NOT NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_services_code" ON "identite"."services" ("code")`);

    await queryRunner.query(`ALTER TABLE "identite"."etablissement_services" ADD COLUMN "motif" varchar(255) NULL`);

    await queryRunner.query(`
      CREATE TABLE "identite"."audit_acces_service" (
        "id" BIGSERIAL PRIMARY KEY,
        "tenant_id" uuid NULL,
        "acteur_id" bigint NULL,
        "cible_type" varchar(32) NOT NULL,
        "cible_uuid" uuid NULL,
        "action" varchar(64) NOT NULL,
        "details" jsonb NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_audit_acces_service_acteur" FOREIGN KEY ("acteur_id")
          REFERENCES "identite"."utilisateur"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_audit_acces_service_tenant" ON "identite"."audit_acces_service" ("tenant_id", "created_at" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_audit_acces_service_cible" ON "identite"."audit_acces_service" ("cible_uuid")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "identite"."audit_acces_service"`);
    await queryRunner.query(`ALTER TABLE "identite"."etablissement_services" DROP COLUMN IF EXISTS "motif"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "identite"."UQ_services_code"`);
    await queryRunner.query(`ALTER TABLE "identite"."services" DROP COLUMN IF EXISTS "description", DROP COLUMN IF EXISTS "code"`);
  }
}
