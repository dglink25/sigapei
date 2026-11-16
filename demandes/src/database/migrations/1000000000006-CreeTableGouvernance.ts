import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Gouvernance du module (CDC §5) : quelles ACTIONS chaque role de l'etablissement peut exercer.
 * Identite ne gere aujourd'hui que l'acces d'un role a un module entier : en attendant une table
 * role_permissions transversale (a valider avec Identite), la grille fine vit ici (solution de repli du CDC §22).
 *  - aucune combinaison pre-remplie : l'administrateur coche action par action ;
 *  - perimetre : restriction optionnelle (ex. categories de reclamations) ;
 *  - l'administrateur de l'etablissement dispose toujours de toutes les actions (regle du code).
 * journal_audit : derogations, rejets, changements de permissions... en ajout seul.
 * compteurs : numerotation sans trou des references (DA-2026-000001) par etablissement et par annee.
 */
export class CreeTableGouvernance1000000000006 implements MigrationInterface {
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE demandes.permissions_role (
        id bigserial PRIMARY KEY,
        tenant_id bigint NOT NULL,
        role_code varchar(64) NOT NULL,
        action varchar(40) NOT NULL,
        perimetre jsonb,
        accorde_par_uuid uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT permissions_role_unique UNIQUE (tenant_id, role_code, action),
        CONSTRAINT permissions_role_action_chk CHECK (action IN ('consulter_demandes','traiter_demande','configurer_types',
          'valider_permission_absence','accorder_derogation','repondre_reclamation','consulter_statistiques'))
      )`);

    await q.query(`
      CREATE TABLE demandes.journal_audit (
        id bigserial PRIMARY KEY,
        tenant_id bigint NOT NULL,
        action varchar(60) NOT NULL,
        cible_type varchar(40) NOT NULL,
        cible_uuid uuid,
        auteur_uuid uuid NOT NULL,
        auteur_role varchar(64) NOT NULL,
        details jsonb NOT NULL DEFAULT '{}'::jsonb,
        cree_le timestamptz NOT NULL DEFAULT now()
      )`);
    await q.query(`CREATE INDEX journal_audit_tenant_idx ON demandes.journal_audit (tenant_id, cree_le DESC)`);
    await q.query(
      `CREATE TRIGGER journal_audit_immuable BEFORE UPDATE OR DELETE ON demandes.journal_audit FOR EACH ROW EXECUTE FUNCTION demandes.refuser_modification()`,
    );

    await q.query(`
      CREATE TABLE demandes.compteurs (
        tenant_id bigint NOT NULL,
        nature varchar(10) NOT NULL,
        annee smallint NOT NULL,
        valeur integer NOT NULL DEFAULT 0,
        PRIMARY KEY (tenant_id, nature, annee)
      )`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS demandes.compteurs`);
    await q.query(`DROP TABLE IF EXISTS demandes.journal_audit`);
    await q.query(`DROP TABLE IF EXISTS demandes.permissions_role`);
  }
}
