import { randomUUID } from 'crypto';
import { Client } from 'pg';

export const uuid = () => randomUUID();

/** Crée un mode de paiement de test pour l'agrégateur donné et renvoie son id. */
export async function creerMode(admin: Client, agregateur = 'fedapay', code = 'mtn_open', sens: 'entree' | 'sortie' = 'entree'): Promise<string> {
  const r = await admin.query(
    `INSERT INTO paiement.mode_paiement (agregateur_id, code, libelle, pays, operateur, type, sens, devise, montant_min)
     VALUES ((SELECT id FROM paiement.agregateur WHERE code = $1), $2, $2, 'BJ', 'mtn', 'mobile_money', $3, 'XOF', 100)
     RETURNING id::text AS id`,
    [agregateur, code, sens],
  );
  return r.rows[0].id;
}

export async function idAgregateur(admin: Client, code = 'fedapay'): Promise<string> {
  return (await admin.query(`SELECT id::text AS id FROM paiement.agregateur WHERE code = $1`, [code])).rows[0].id;
}

export interface OptionsEncaissement {
  etablissementUuid: string;
  portefeuilleId: string;
  agregateurId: string;
  statut?: string;
  montant?: number;
  frais?: number;
  fraisACharge?: 'etablissement' | 'payeur';
  reference?: string;
}

/** Insère un encaissement cohérent (montant_paye / montant_net calculés selon qui supporte les frais). */
export async function creerEncaissement(admin: Client, o: OptionsEncaissement): Promise<{ id: string; uuid: string }> {
  const montant = o.montant ?? 10000;
  const frais = o.frais ?? 100;
  const aCharge = o.fraisACharge ?? 'etablissement';
  const paye = aCharge === 'payeur' ? montant + frais : montant;
  const r = await admin.query(
    `INSERT INTO paiement.encaissement (etablissement_uuid, portefeuille_id, agregateur_id, devise, montant, frais_a_charge, frais_agregateur,
       montant_paye, montant_net, reference_marchande, cle_idempotence, statut)
     VALUES ($1, $2, $3, 'XOF', $4, $5, $6, $7, $8, $9, $9, $10) RETURNING id::text AS id, uuid`,
    [o.etablissementUuid, o.portefeuilleId, o.agregateurId, montant, aCharge, frais, paye, paye - frais, o.reference ?? `ref-${uuid()}`, o.statut ?? 'initie'],
  );
  return r.rows[0];
}
