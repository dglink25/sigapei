import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Types de documents de chaque etablissement (CDC §7, §9) :
 *  - categorie_demandeur : apprenant | personnel | tout_profil (decide la verification d'eligibilite) ;
 *  - regles_eligibilite  : {dossier_actif, bulletins_publies, contrat_actif} (parametrable, jamais en dur) ;
 *  - modele              : mise en page du PDF (titre, corps avec variables, mentions, signataire).
 */
export class CreeTableTypesDocument1000000000001 implements MigrationInterface {
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE demandes.types_document (
        id bigserial PRIMARY KEY,
        uuid uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
        tenant_id bigint NOT NULL,
        code varchar(60) NOT NULL,
        nom varchar(120) NOT NULL,
        description varchar(500),
        categorie_demandeur varchar(20) NOT NULL,
        regles_eligibilite jsonb NOT NULL DEFAULT '{}'::jsonb,
        traitement_automatique boolean NOT NULL DEFAULT false,
        delai_indicatif_jours smallint,
        modele jsonb NOT NULL DEFAULT '{}'::jsonb,
        actif boolean NOT NULL DEFAULT true,
        modifie_par_uuid uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT types_document_code_unique UNIQUE (tenant_id, code),
        CONSTRAINT types_document_categorie_chk CHECK (categorie_demandeur IN ('apprenant','personnel','tout_profil')),
        CONSTRAINT types_document_delai_chk CHECK (delai_indicatif_jours IS NULL OR delai_indicatif_jours BETWEEN 0 AND 365)
      )`);
    await q.query(`CREATE INDEX types_document_tenant_idx ON demandes.types_document (tenant_id, actif)`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS demandes.types_document`);
  }
}
