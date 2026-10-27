import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Le schema "demandes" est un prerequis cree une seule fois (README) : une migration ne peut pas le
 * creer, la table des migrations y etant creee avant. On verifie sa presence et on cree la fonction
 * qui rend certaines tables immuables (historique, messages, journal d'audit).
 */
export class CreeSchemaDemandes1000000000000 implements MigrationInterface {
  public async up(q: QueryRunner): Promise<void> {
    const lignes = await q.query(`SELECT 1 FROM pg_namespace WHERE nspname = 'demandes'`);
    if (lignes.length === 0) {
      throw new Error('Le schema "demandes" n\'existe pas : creez-le une fois avant de migrer (README).');
    }
    await q.query(`
      CREATE OR REPLACE FUNCTION demandes.refuser_modification() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'Table % en ajout seul : modification ou suppression interdite', TG_TABLE_NAME
          USING ERRCODE = 'insufficient_privilege';
      END $$`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP FUNCTION IF EXISTS demandes.refuser_modification()`);
  }
}
