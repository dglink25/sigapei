import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Complete 1758600000000 : historique de modification des roles.
 * Aligne la table "role" sur "services" et "role_permissions" qui portent
 * deja created_at/updated_at — necessaire pour afficher la date de derniere
 * modification dans l'administration des roles.
 */
export class RoleDateModification1758910000000 implements MigrationInterface {
  name = 'RoleDateModification1758910000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "identite"."role"
        ADD COLUMN "date_modification" TIMESTAMP NOT NULL DEFAULT now()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "identite"."role" DROP COLUMN "date_modification"
    `);
  }
}
