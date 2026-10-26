import { MigrationInterface, QueryRunner } from 'typeorm';


export class ContrainteSuperAdminUnique1758900000000 implements MigrationInterface {
  name = 'ContrainteSuperAdminUnique1758900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Contrainte super_admin unique via trigger (PostgreSQL n'accepte pas
    //    de sous-requête dans un prédicat d'index partiel)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION "identite"."verifier_super_admin_unique"()
      RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE
        role_code varchar;
        nb_super_admin int;
      BEGIN
        SELECT code INTO role_code FROM "identite"."role" WHERE id = NEW.role_id;
        IF role_code = 'super_admin' THEN
          SELECT COUNT(*) INTO nb_super_admin
            FROM "identite"."utilisateur"
           WHERE role_id = NEW.role_id
             AND id <> COALESCE(NEW.id, -1);
          IF nb_super_admin > 0 THEN
            RAISE EXCEPTION 'SUPER_ADMIN_UNIQUE: Il ne peut exister qu''un seul super administrateur.';
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$
    `);

    await queryRunner.query(`
      CREATE TRIGGER "trg_super_admin_unique"
        BEFORE INSERT OR UPDATE ON "identite"."utilisateur"
        FOR EACH ROW EXECUTE FUNCTION "identite"."verifier_super_admin_unique"()
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
    await queryRunner.query(`DROP TRIGGER IF EXISTS "trg_super_admin_unique" ON "identite"."utilisateur"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS "identite"."verifier_super_admin_unique"()`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS "trg_tenant_obligatoire" ON "identite"."utilisateur"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS "identite"."verifier_tenant_obligatoire"()`);
  }
}
