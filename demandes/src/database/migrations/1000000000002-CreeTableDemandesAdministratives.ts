import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Demande de document (CDC §4, §8, §12) : demandeur generique (tout profil), beneficiaire apprenant optionnel.
 * Statuts : recue -> bloquee | en_traitement -> prete | rejetee ; annulee par le demandeur avant "prete".
 *  - document : instantane fige des donnees imprimees (+ empreinte SHA-256) ; le PDF en est produit a la demande ;
 *  - derogation : decision tracee d'un role habilite, jamais implicite.
 * demande_etapes : chronologie (vue "suivi facon colis"), en ajout seul (trigger).
 */
export class CreeTableDemandesAdministratives1000000000002 implements MigrationInterface {
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE demandes.demandes_administratives (
        id bigserial PRIMARY KEY,
        uuid uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
        tenant_id bigint NOT NULL,
        reference varchar(30) NOT NULL,
        type_document_id bigint NOT NULL REFERENCES demandes.types_document(id) ON DELETE RESTRICT,
        demandeur_uuid uuid NOT NULL,
        demandeur_role varchar(64) NOT NULL,
        beneficiaire_apprenant_uuid uuid,
        commentaire varchar(1000),
        statut varchar(20) NOT NULL DEFAULT 'recue',
        motif_blocage varchar(500),
        motif_rejet varchar(1000),
        priorite boolean NOT NULL DEFAULT false,
        derogation_motif varchar(1000),
        derogation_par_uuid uuid,
        document jsonb,
        document_empreinte char(64),
        traite_par_uuid uuid,
        prete_le timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT demandes_reference_unique UNIQUE (tenant_id, reference),
        CONSTRAINT demandes_statut_chk CHECK (statut IN ('recue','bloquee','en_traitement','prete','rejetee','annulee')),
        CONSTRAINT demandes_rejet_motive_chk CHECK (statut <> 'rejetee' OR motif_rejet IS NOT NULL),
        CONSTRAINT demandes_blocage_motive_chk CHECK (statut <> 'bloquee' OR motif_blocage IS NOT NULL),
        CONSTRAINT demandes_prete_document_chk CHECK (statut <> 'prete' OR (document IS NOT NULL AND document_empreinte IS NOT NULL)),
        CONSTRAINT demandes_derogation_chk CHECK ((derogation_motif IS NULL) = (derogation_par_uuid IS NULL))
      )`);
    await q.query(`CREATE INDEX demandes_file_idx ON demandes.demandes_administratives (tenant_id, statut, priorite DESC, created_at)`);
    await q.query(`CREATE INDEX demandes_demandeur_idx ON demandes.demandes_administratives (tenant_id, demandeur_uuid, created_at DESC)`);
    await q.query(`CREATE INDEX demandes_beneficiaire_idx ON demandes.demandes_administratives (tenant_id, beneficiaire_apprenant_uuid)`);
    // Un document pret est fige : son contenu ne change plus jamais.
    await q.query(`
      CREATE OR REPLACE FUNCTION demandes.document_fige() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF OLD.statut = 'prete' AND (NEW.document IS DISTINCT FROM OLD.document OR NEW.document_empreinte IS DISTINCT FROM OLD.document_empreinte OR NEW.statut <> 'prete') THEN
          RAISE EXCEPTION 'Document deja delivre : modification interdite' USING ERRCODE = 'insufficient_privilege';
        END IF;
        RETURN NEW;
      END $$`);
    await q.query(
      `CREATE TRIGGER demandes_document_fige BEFORE UPDATE ON demandes.demandes_administratives FOR EACH ROW EXECUTE FUNCTION demandes.document_fige()`,
    );
    await q.query(
      `CREATE TRIGGER demandes_sans_suppression BEFORE DELETE ON demandes.demandes_administratives FOR EACH ROW EXECUTE FUNCTION demandes.refuser_modification()`,
    );

    await q.query(`
      CREATE TABLE demandes.demande_etapes (
        id bigserial PRIMARY KEY,
        demande_id bigint NOT NULL REFERENCES demandes.demandes_administratives(id) ON DELETE RESTRICT,
        statut varchar(20) NOT NULL,
        libelle varchar(500) NOT NULL,
        auteur_uuid uuid,
        auteur_role varchar(64),
        cree_le timestamptz NOT NULL DEFAULT now()
      )`);
    await q.query(`CREATE INDEX demande_etapes_demande_idx ON demandes.demande_etapes (demande_id, id)`);
    await q.query(
      `CREATE TRIGGER demande_etapes_immuables BEFORE UPDATE OR DELETE ON demandes.demande_etapes FOR EACH ROW EXECUTE FUNCTION demandes.refuser_modification()`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS demandes.demande_etapes`);
    await q.query(`DROP TABLE IF EXISTS demandes.demandes_administratives`);
    await q.query(`DROP FUNCTION IF EXISTS demandes.document_fige()`);
  }
}
