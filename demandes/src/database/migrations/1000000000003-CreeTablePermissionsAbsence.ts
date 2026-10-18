import { MigrationInterface, QueryRunner, Table } from 'typeorm';

/**
 * Table demandes.permissions_absence
 * CDC section 15.1 + section 6 : demande de permission d'absence et sa decision.
 * Toujours liee a un apprenant (CDC section 6.1).
 *
 * Statuts : en_attente | validee | rejetee
 *
 * Interaction avec Vie scolaire (CDC section 6.2) : Vie scolaire interroge
 * cette table via l'endpoint interne /interne/permission-active pour qualifier
 * automatiquement les absences enregistrees.
 */
export class CreeTablePermissionsAbsence1000000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'permissions_absence',
        schema: 'demandes',
        columns: [
          { name: 'id', type: 'bigserial', isPrimary: true },
          { name: 'uuid', type: 'uuid', isUnique: true, default: 'gen_random_uuid()' },
          { name: 'tenant_id', type: 'varchar', isNullable: false },
          // apprenant_uuid reference scolarite.apprenants
          { name: 'apprenant_uuid', type: 'varchar', isNullable: false },
          { name: 'periode_debut', type: 'date', isNullable: false },
          { name: 'periode_fin', type: 'date', isNullable: false },
          { name: 'motif', type: 'text', isNullable: false },
          { name: 'statut', type: 'varchar', default: "'en_attente'" },
          // valide_par_uuid reference identite.utilisateurs
          { name: 'valide_par_uuid', type: 'varchar', isNullable: true },
          { name: 'motif_rejet', type: 'text', isNullable: true },
          // piece_justificative_uuid : UUID du document joint (schema transverse documents)
          { name: 'piece_justificative_uuid', type: 'varchar', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
        indices: [
          { columnNames: ['tenant_id'] },
          { columnNames: ['apprenant_uuid', 'statut'] },
          { columnNames: ['apprenant_uuid', 'periode_debut', 'periode_fin'] },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('demandes.permissions_absence', true);
  }
}
