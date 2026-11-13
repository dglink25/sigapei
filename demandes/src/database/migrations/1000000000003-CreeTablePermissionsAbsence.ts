import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Permission d'absence (CDC §6) : soumise par un parent (ou l'apprenant), decidee par un role habilite.
 * Validee => l'apprenant est "permissionnaire" sur la periode ; Vie scolaire l'interroge a chaque absence
 * (GET /v1/interne/permission-active/{apprenant_uuid}?date=). Decision toujours motivee en cas de rejet.
 */
export class CreeTablePermissionsAbsence1000000000003 implements MigrationInterface {
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE demandes.permissions_absence (
        id bigserial PRIMARY KEY,
        uuid uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
        tenant_id bigint NOT NULL,
        apprenant_uuid uuid NOT NULL,
        demandeur_uuid uuid NOT NULL,
        demandeur_role varchar(64) NOT NULL,
        date_debut date NOT NULL,
        date_fin date NOT NULL,
        motif varchar(1000) NOT NULL,
        statut varchar(20) NOT NULL DEFAULT 'en_attente',
        decision_par_uuid uuid,
        motif_decision varchar(1000),
        decide_le timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT permissions_statut_chk CHECK (statut IN ('en_attente','validee','rejetee','annulee')),
        CONSTRAINT permissions_periode_chk CHECK (date_fin >= date_debut AND date_fin - date_debut <= 366),
        CONSTRAINT permissions_rejet_motive_chk CHECK (statut <> 'rejetee' OR motif_decision IS NOT NULL),
        CONSTRAINT permissions_decision_chk CHECK (statut NOT IN ('validee','rejetee') OR (decision_par_uuid IS NOT NULL AND decide_le IS NOT NULL))
      )`);
    await q.query(
      `CREATE INDEX permissions_apprenant_idx ON demandes.permissions_absence (tenant_id, apprenant_uuid, statut, date_debut, date_fin)`,
    );
    await q.query(`CREATE INDEX permissions_file_idx ON demandes.permissions_absence (tenant_id, statut, created_at)`);
    await q.query(
      `CREATE TRIGGER permissions_sans_suppression BEFORE DELETE ON demandes.permissions_absence FOR EACH ROW EXECUTE FUNCTION demandes.refuser_modification()`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS demandes.permissions_absence`);
  }
}
