import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reclamations bidirectionnelles (CDC §10) : ouvertes par tout usager, ou par l'etablissement vers un usager.
 *  - demandeur_uuid   : l'usager concerne (auteur si initiee_par = usager, destinataire sinon) ;
 *  - lu_usager_le / lu_etablissement_le : accuses de lecture du fil.
 */
export class CreeTableReclamations1000000000004 implements MigrationInterface {
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE demandes.reclamations (
        id bigserial PRIMARY KEY,
        uuid uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
        tenant_id bigint NOT NULL,
        reference varchar(30) NOT NULL,
        demandeur_uuid uuid NOT NULL,
        demandeur_role varchar(64),
        beneficiaire_apprenant_uuid uuid,
        categorie varchar(30) NOT NULL,
        objet varchar(150) NOT NULL,
        statut varchar(20) NOT NULL DEFAULT 'ouverte',
        initiee_par varchar(20) NOT NULL,
        ouverte_par_uuid uuid NOT NULL,
        dernier_message_le timestamptz NOT NULL DEFAULT now(),
        lu_usager_le timestamptz,
        lu_etablissement_le timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT reclamations_reference_unique UNIQUE (tenant_id, reference),
        CONSTRAINT reclamations_categorie_chk CHECK (categorie IN ('pedagogique','discipline','finances','ressources_humaines','autre')),
        CONSTRAINT reclamations_statut_chk CHECK (statut IN ('ouverte','en_cours','resolue','cloturee')),
        CONSTRAINT reclamations_initiee_chk CHECK (initiee_par IN ('usager','etablissement'))
      )`);
    await q.query(`CREATE INDEX reclamations_file_idx ON demandes.reclamations (tenant_id, statut, categorie, dernier_message_le DESC)`);
    await q.query(`CREATE INDEX reclamations_usager_idx ON demandes.reclamations (tenant_id, demandeur_uuid, dernier_message_le DESC)`);
    await q.query(
      `CREATE TRIGGER reclamations_sans_suppression BEFORE DELETE ON demandes.reclamations FOR EACH ROW EXECUTE FUNCTION demandes.refuser_modification()`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS demandes.reclamations`);
  }
}
