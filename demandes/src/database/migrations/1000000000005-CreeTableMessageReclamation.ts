import { MigrationInterface, QueryRunner, Table } from 'typeorm';

/**
 * Table demandes.message_reclamation
 * CDC section 15.1 : messages successifs d'un fil de reclamation.
 * Fil de discussion horodate (CDC section 10.1).
 */
export class CreeTableMessageReclamation1000000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'message_reclamation',
        schema: 'demandes',
        columns: [
          { name: 'id', type: 'bigserial', isPrimary: true },
          { name: 'uuid', type: 'uuid', isUnique: true, default: 'gen_random_uuid()' },
          { name: 'reclamation_id', type: 'bigint', isNullable: false },
          // auteur_uuid reference identite.utilisateurs
          { name: 'auteur_uuid', type: 'varchar', isNullable: false },
          { name: 'contenu', type: 'text', isNullable: false },
          { name: 'date', type: 'timestamptz', default: 'now()' },
        ],
        foreignKeys: [
          {
            columnNames: ['reclamation_id'],
            referencedTableName: 'demandes.reclamations',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        indices: [{ columnNames: ['reclamation_id'] }],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('demandes.message_reclamation', true);
  }
}
