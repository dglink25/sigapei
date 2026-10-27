import { MigrationInterface, QueryRunner } from 'typeorm';

/** Fil de discussion d'une reclamation (CDC §10) : messages horodates, en ajout seul (trigger). */
export class CreeTableMessageReclamation1000000000005 implements MigrationInterface {
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE demandes.message_reclamation (
        id bigserial PRIMARY KEY,
        uuid uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
        reclamation_id bigint NOT NULL REFERENCES demandes.reclamations(id) ON DELETE RESTRICT,
        auteur_uuid uuid NOT NULL,
        auteur_role varchar(64) NOT NULL,
        cote varchar(20) NOT NULL,
        contenu varchar(4000) NOT NULL,
        cree_le timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT message_cote_chk CHECK (cote IN ('usager','etablissement')),
        CONSTRAINT message_contenu_chk CHECK (length(btrim(contenu)) > 0)
      )`);
    await q.query(`CREATE INDEX message_reclamation_fil_idx ON demandes.message_reclamation (reclamation_id, id)`);
    await q.query(
      `CREATE TRIGGER message_reclamation_immuable BEFORE UPDATE OR DELETE ON demandes.message_reclamation FOR EACH ROW EXECUTE FUNCTION demandes.refuser_modification()`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS demandes.message_reclamation`);
  }
}
