import { MigrationInterface, QueryRunner, Table } from 'typeorm';

/**
 * Table demandes.reclamations
 * CDC section 15.1 + section 10 : fil de reclamation ouvert par tout utilisateur
 * ou par l'etablissement (caractere bidirectionnel - CDC section 10.1).
 *
 * Categories (CDC section 10.1) : pedagogique | discipline | finances | ressources_humaines | autre
 * Statuts : ouverte | en_cours | resolue | cloturee
 * initiee_par : utilisateur | etablissement (bidirectionnel)
 */
export class CreeTableReclamations1000000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'reclamations',
        schema: 'demandes',
        columns: [
          { name: 'id', type: 'bigserial', isPrimary: true },
          { name: 'uuid', type: 'uuid', isUnique: true, default: 'gen_random_uuid()' },
          { name: 'tenant_id', type: 'varchar', isNullable: false },
          // demandeur_uuid reference identite.utilisateurs (tout profil)
          { name: 'demandeur_uuid', type: 'varchar', isNullable: false },
          // nullable - concerne un apprenant seulement si pertinent (CDC section 4.1)
          { name: 'beneficiaire_apprenant_uuid', type: 'varchar', isNullable: true },
          { name: 'categorie', type: 'varchar', isNullable: false },
          { name: 'statut', type: 'varchar', default: "'ouverte'" },
          // utilisateur | etablissement
          { name: 'initiee_par', type: 'varchar', isNullable: false },
          { name: 'description', type: 'text', isNullable: false },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
        indices: [
          { columnNames: ['tenant_id'] },
          { columnNames: ['tenant_id', 'statut', 'categorie'] },
          { columnNames: ['demandeur_uuid'] },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('demandes.reclamations', true);
  }
}
