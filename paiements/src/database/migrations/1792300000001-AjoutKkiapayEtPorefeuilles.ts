import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration complémentaire :
 *  - Ajoute l'agrégateur Kkiapay dans la table agrégateur
 *  - Ajoute les modes de paiement Kkiapay (encaissement mobile money + carte)
 *  - Ajoute les modes de paiement CinetPay (encaissement + payout)
 *  - Complète les modes FedaPay (payout mobile money)
 *  - Crée la fonction d'initialisation du portefeuille à la création d'un établissement
 */
export class AjoutKkiapayEtPorefeuilles1792300000001 implements MigrationInterface {
  name = 'AjoutKkiapayEtPorefeuilles1792300000001';

  public async up(q: QueryRunner): Promise<void> {
    const run = (sql: string) => q.query(sql);

    // ── Agrégateur Kkiapay ──
    await run(`
      INSERT INTO "paiement"."agregateur" (code, nom, statut)
      VALUES ('kkiapay', 'Kkiapay', 'inactif')
      ON CONFLICT (code) DO NOTHING
    `);

    // ── Modes de paiement FedaPay (encaissement + décaissement) ──
    await run(`
      INSERT INTO "paiement"."mode_paiement"
        (agregateur_id, code, libelle, pays, operateur, type, sens, devise, montant_min, montant_max, frais_taux, frais_fixe, delai_reglement_heures, redirection, statut)
      SELECT a.id, 'fedapay_mtn_bj', 'MTN Mobile Money (Bénin)', 'BJ', 'MTN', 'mobile_money', 'entree', 'XOF', 100, 1000000, 1.5, 0, 0, false, 'inactif'
        FROM "paiement"."agregateur" a WHERE a.code = 'fedapay'
      ON CONFLICT DO NOTHING
    `);
    await run(`
      INSERT INTO "paiement"."mode_paiement"
        (agregateur_id, code, libelle, pays, operateur, type, sens, devise, montant_min, montant_max, frais_taux, frais_fixe, delai_reglement_heures, redirection, statut)
      SELECT a.id, 'fedapay_moov_bj', 'Moov Money (Bénin)', 'BJ', 'Moov', 'mobile_money', 'entree', 'XOF', 100, 1000000, 1.5, 0, 0, false, 'inactif'
        FROM "paiement"."agregateur" a WHERE a.code = 'fedapay'
      ON CONFLICT DO NOTHING
    `);
    await run(`
      INSERT INTO "paiement"."mode_paiement"
        (agregateur_id, code, libelle, pays, operateur, type, sens, devise, montant_min, montant_max, frais_taux, frais_fixe, delai_reglement_heures, redirection, statut)
      SELECT a.id, 'fedapay_payout_mtn_bj', 'Payout MTN Mobile Money (Bénin)', 'BJ', 'MTN', 'mobile_money', 'sortie', 'XOF', 500, 2000000, 1.0, 0, 0, false, 'inactif'
        FROM "paiement"."agregateur" a WHERE a.code = 'fedapay'
      ON CONFLICT DO NOTHING
    `);

    // ── Modes de paiement Kkiapay ──
    await run(`
      INSERT INTO "paiement"."mode_paiement"
        (agregateur_id, code, libelle, pays, operateur, type, sens, devise, montant_min, montant_max, frais_taux, frais_fixe, delai_reglement_heures, redirection, statut)
      SELECT a.id, 'kkiapay_mtn_bj', 'MTN Mobile Money via Kkiapay', 'BJ', 'MTN', 'mobile_money', 'entree', 'XOF', 100, 2000000, 1.0, 0, 0, false, 'inactif'
        FROM "paiement"."agregateur" a WHERE a.code = 'kkiapay'
      ON CONFLICT DO NOTHING
    `);
    await run(`
      INSERT INTO "paiement"."mode_paiement"
        (agregateur_id, code, libelle, pays, operateur, type, sens, devise, montant_min, montant_max, frais_taux, frais_fixe, delai_reglement_heures, redirection, statut)
      SELECT a.id, 'kkiapay_visa', 'Carte Visa via Kkiapay', 'BJ', 'Visa', 'carte', 'entree', 'XOF', 1000, 5000000, 2.5, 0, 72, true, 'inactif'
        FROM "paiement"."agregateur" a WHERE a.code = 'kkiapay'
      ON CONFLICT DO NOTHING
    `);

    // ── Modes de paiement CinetPay ──
    await run(`
      INSERT INTO "paiement"."mode_paiement"
        (agregateur_id, code, libelle, pays, operateur, type, sens, devise, montant_min, montant_max, frais_taux, frais_fixe, delai_reglement_heures, redirection, statut)
      SELECT a.id, 'cinetpay_all_ci', 'Tous opérateurs CinetPay (Côte d''Ivoire)', 'CI', 'All', 'mobile_money', 'entree', 'XOF', 100, 10000000, 1.5, 0, 0, true, 'inactif'
        FROM "paiement"."agregateur" a WHERE a.code = 'cinetpay'
      ON CONFLICT DO NOTHING
    `);
    await run(`
      INSERT INTO "paiement"."mode_paiement"
        (agregateur_id, code, libelle, pays, operateur, type, sens, devise, montant_min, montant_max, frais_taux, frais_fixe, delai_reglement_heures, redirection, statut)
      SELECT a.id, 'cinetpay_all_bj', 'Tous opérateurs CinetPay (Bénin)', 'BJ', 'All', 'mobile_money', 'entree', 'XOF', 100, 5000000, 1.5, 0, 0, true, 'inactif'
        FROM "paiement"."agregateur" a WHERE a.code = 'cinetpay'
      ON CONFLICT DO NOTHING
    `);
    await run(`
      INSERT INTO "paiement"."mode_paiement"
        (agregateur_id, code, libelle, pays, operateur, type, sens, devise, montant_min, montant_max, frais_taux, frais_fixe, delai_reglement_heures, redirection, statut)
      SELECT a.id, 'cinetpay_payout_bj', 'Payout CinetPay Mobile Money (Bénin)', 'BJ', 'All', 'mobile_money', 'sortie', 'XOF', 1000, 5000000, 1.0, 0, 0, false, 'inactif'
        FROM "paiement"."agregateur" a WHERE a.code = 'cinetpay'
      ON CONFLICT DO NOTHING
    `);

    // ── Fonction d'initialisation du portefeuille (appelée quand un accord est accordé) ──
    await run(`
      CREATE OR REPLACE FUNCTION "paiement".initialiser_portefeuille(p_etab uuid, p_devise varchar)
      RETURNS uuid LANGUAGE plpgsql AS $$
      DECLARE v_uuid uuid;
      BEGIN
        INSERT INTO "paiement"."portefeuille" (etablissement_uuid, devise)
        VALUES (p_etab, p_devise)
        ON CONFLICT (etablissement_uuid, devise) DO NOTHING
        RETURNING uuid INTO v_uuid;
        RETURN v_uuid;
      END $$
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DELETE FROM "paiement"."mode_paiement" WHERE agregateur_id IN (SELECT id FROM "paiement"."agregateur" WHERE code IN ('kkiapay', 'cinetpay', 'fedapay'))`);
    await q.query(`DELETE FROM "paiement"."agregateur" WHERE code = 'kkiapay'`);
    await q.query(`DROP FUNCTION IF EXISTS "paiement".initialiser_portefeuille`);
  }
}
