import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Matrice role x service x action (CDC section 5.3) : permissions fines par fonction,
 * distinctes du role de plateforme (identite.role) et de l'acces au module
 * (etablissement_services / users_services_etablissement).
 *
 * Consommee par les microservices via GET /v1/interne/permissions-role/{roleUuid}.
 * Une ligne = une action autorisee (ou explicitement refusee avec autorise = false).
 */
export class CreationRolePermissions1758900000000 implements MigrationInterface {
  name = 'CreationRolePermissions1758900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "identite"."role_permissions" (
        "id" BIGSERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT gen_random_uuid(),
        "role_id" bigint NOT NULL,
        "service_id" bigint NOT NULL,
        "action" varchar(64) NOT NULL,
        "autorise" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_role_permissions_uuid" UNIQUE ("uuid"),
        CONSTRAINT "UQ_role_permissions_role_service_action" UNIQUE ("role_id", "service_id", "action"),
        CONSTRAINT "FK_role_permissions_role" FOREIGN KEY ("role_id")
          REFERENCES "identite"."role"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_role_permissions_service" FOREIGN KEY ("service_id")
          REFERENCES "identite"."services"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_role_permissions_role" ON "identite"."role_permissions" ("role_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_role_permissions_service" ON "identite"."role_permissions" ("service_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "identite"."role_permissions"`);
  }
}
