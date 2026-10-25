import { MigrationInterface, QueryRunner } from 'typeorm';


export class ContrainteSuperAdminUnique1758900000000 implements MigrationInterface {
  name = 'ContrainteSuperAdminUnique1758900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Index unique partiel : un seul utilisateur peut avoir le rôle super_admin
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_un_seul_super_admin"
        ON "identite"."utilisateur" ("role_id")
        WHERE "role_id" = (SELECT id FROM "identite"."role" WHERE code = 'super_admin' LIMIT 1)
    `);

    // 2. Fonction trigger : tout utilisateur non super_admin doit appartenir à un établissement
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION "identite"."verifier_tenant_obligatoire"()
      RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE
        role_code varchar;
      BEGIN
        SELECT code INTO role_code FROM "identite"."role" WHERE id = NEW.role_id;
        IF role_code <> 'super_admin' AND NEW."tenantId" IS NULL THEN
          RAISE EXCEPTION 'TENANT_OBLIGATOIRE: Un utilisateur avec le role % doit appartenir à un établissement (tenantId non-null).', role_code;
        END IF;
        RETURN NEW;
      END;
      $$
    `);

    await queryRunner.query(`
      CREATE TRIGGER "trg_tenant_obligatoire"
        BEFORE INSERT OR UPDATE ON "identite"."utilisateur"
        FOR EACH ROW EXECUTE FUNCTION "identite"."verifier_tenant_obligatoire"()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS "trg_tenant_obligatoire" ON "identite"."utilisateur"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS "identite"."verifier_tenant_obligatoire"()`);
    await queryRunner.query(`DROP INDEX IF EXISTS "identite"."UQ_un_seul_super_admin"`);
  }
}
