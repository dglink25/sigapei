import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Verifie le prerequis : le schema "demandes" doit exister avant la premiere migration
 * (README, section 2). Aucun CREATE SCHEMA ici : sur la base partagee, le role applicatif
 * n'a pas forcement le droit CREATE sur la base, et l'instruction echoue meme si le schema
 * existe deja (le controle de droit passe avant le IF NOT EXISTS).
 */
export class CreeSchemaDemandes1000000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const lignes = await queryRunner.query(`SELECT 1 FROM pg_namespace WHERE nspname = 'demandes'`);
    if (lignes.length === 0) {
      throw new Error('Le schema "demandes" n\'existe pas : creez-le une fois avant de migrer (README).');
    }
  }

  public async down(): Promise<void> {
    // Rien : le schema n'est jamais supprime par une migration.
  }
}
