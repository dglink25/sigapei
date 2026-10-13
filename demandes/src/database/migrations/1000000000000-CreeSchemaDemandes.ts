import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cree le schema PostgreSQL "demandes" s'il n'existe pas encore.
 * Doit etre executee EN PREMIER (CDC Regle n°1 — un schema par microservice).
 *
 * IMPORTANT : avant la toute premiere migration, le schema n'existe pas.
 * TypeORM ne le cree pas automatiquement. Voir README.md section 2.
 */
export class CreeSchemaDemandes1000000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS demandes`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Ne pas supprimer en production.
  }
}
