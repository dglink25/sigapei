import { MigrationInterface, QueryRunner, Table } from 'typeorm';

/**
 * Table demandes.demandes_administratives
 * CDC section 15.1 : demande individuelle, statut et reference au document genere.
 * demandeur generique (tout profil), beneficiaire apprenant optionnel.
 *
 * Statuts (CDC section 8) : recue | en_traitement | bloquee | prete | rejetee | annulee
 */
export class CreeTableDemandesAdministratives1000000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'demandes_administratives',
        schema: 'demandes',
        columns: [
          { name: 'id', type: 'bigserial', isPrimary: true },
          { name: 'uuid', type: 'uuid', isUnique: true, default: 'gen_random_uuid()' },
          { name: 'tenant_id', type: 'varchar', isNullable: false },
          // demandeur_uuid reference identite.utilisateurs (tout profil)
          { name: 'demandeur_uuid', type: 'varchar', isNullable: false },
          // beneficiaire_apprenant_uuid : nullable, rempli uniquement si le document
          // concerne un apprenant (CDC section 4.1)
          { name: 'beneficiaire_apprenant_uuid', type: 'varchar', isNullable: true },
          { name: 'type_document_id', type: 'bigint', isNullable: false },
          { name: 'statut', type: 'varchar', default: "'recue'" },
          // UUID du document genere (schema transverse documents)
          { name: 'document_uuid', type: 'varchar', isNullable: true },
          { name: 'motif_rejet', type: 'text', isNullable: true },
          { name: 'priorite', type: 'boolean', default: false },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
        foreignKeys: [
          {
            columnNames: ['type_document_id'],
            referencedTableName: 'demandes.types_document',
            referencedColumnNames: ['id'],
          },
        ],
        indices: [
          { columnNames: ['tenant_id'] },
          { columnNames: ['demandeur_uuid', 'statut'] },
          { columnNames: ['tenant_id', 'statut'] },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('demandes.demandes_administratives', true);
  }
}
