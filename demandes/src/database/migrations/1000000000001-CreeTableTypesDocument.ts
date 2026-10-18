import { MigrationInterface, QueryRunner, Table } from 'typeorm';

/**
 * Table demandes.types_document
 * CDC section 15.1 : referentiel des types de documents par etablissement,
 * avec categorie de demandeur et regles d'eligibilite parametrables.
 *
 * categorie_demandeur : apprenant | personnel | tout_profil
 */
export class CreeTableTypesDocument1000000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'types_document',
        schema: 'demandes',
        columns: [
          { name: 'id', type: 'bigserial', isPrimary: true },
          { name: 'uuid', type: 'uuid', isUnique: true, default: 'gen_random_uuid()' },
          { name: 'tenant_id', type: 'varchar', isNullable: false },
          { name: 'nom', type: 'varchar', isNullable: false },
          // CDC section 7 : apprenant | personnel | tout_profil
          { name: 'categorie_demandeur', type: 'varchar', isNullable: false },
          // JSON : regles d'eligibilite parametrables par type et etablissement
          { name: 'regles_eligibilite', type: 'jsonb', isNullable: true },
          // UUID du modele PDF configure (schema transverse documents)
          { name: 'modele_pdf_uuid', type: 'varchar', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
        indices: [
          { columnNames: ['tenant_id'] },
          { columnNames: ['tenant_id', 'categorie_demandeur'] },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('demandes.types_document', true);
  }
}
