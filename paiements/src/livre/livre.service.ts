import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { DataSource, EntityManager } from 'typeorm';

export type SensEcriture = 'debit' | 'credit';

export interface LigneEcriture {
  compteId: string;
  sens: SensEcriture;
  montant: bigint;
}

export interface DemandeEcriture {
  typeOperation: string;
  devise: string;
  /** Clé d'idempotence : rejouer la même demande ne crée jamais une seconde écriture. */
  cleIdempotence: string;
  lignes: LigneEcriture[];
  objetType?: string;
  objetUuid?: string;
  description?: string;
  creePar?: string;
  correlationId?: string;
}

export interface ResultatEcriture {
  groupeUuid: string;
  dejaPoste: boolean;
}

export interface PortefeuilleOuvert {
  portefeuilleId: string;
  portefeuilleUuid: string;
  comptes: { attente: string; disponible: string; reserve: string; avanceDue: string };
}

export interface SoldesPortefeuille {
  attente: bigint;
  disponible: bigint;
  reserve: bigint;
  avanceDue: bigint;
}

/**
 * GRAND LIVRE à double entrée. Règles garanties par la base (pas seulement par ce code) :
 * écritures immuables, débit = crédit par opération, solde jamais négatif (sauf compte autorisé),
 * solde modifiable uniquement par une écriture. Comptes d'un portefeuille :
 *  - attente (passif)    : encaissé, pas encore utilisable (ex. 72 h chez FedaPay)
 *  - disponible (passif) : utilisable (reversement, retrait, paiements du personnel)
 *  - reserve (passif)    : montants bloqués pour un décaissement en cours
 *  - avance_due (actif)  : avance de trésorerie consentie par la plateforme, à récupérer
 */
@Injectable()
export class LivreService {
  constructor(private readonly ds: DataSource) {}

  async poster(demande: DemandeEcriture, manager?: EntityManager): Promise<ResultatEcriture> {
    this.valider(demande);
    const executer = (m: EntityManager) => this.posterDans(m, demande);
    return manager ? executer(manager) : this.ds.transaction(executer);
  }

  async ouvrirPortefeuille(etablissementUuid: string, devise: string, manager?: EntityManager): Promise<PortefeuilleOuvert> {
    const executer = async (m: EntityManager): Promise<PortefeuilleOuvert> => {
      await m.query(
        `INSERT INTO "paiement"."portefeuille" (etablissement_uuid, devise) VALUES ($1, $2)
         ON CONFLICT (etablissement_uuid, devise) DO NOTHING`,
        [etablissementUuid, devise],
      );
      const [p] = await m.query(
        `SELECT id::text AS id, uuid FROM "paiement"."portefeuille" WHERE etablissement_uuid = $1 AND devise = $2`,
        [etablissementUuid, devise],
      );
      for (const [type, nature] of [['attente', 'passif'], ['disponible', 'passif'], ['reserve', 'passif'], ['avance_due', 'actif']]) {
        await m.query(
          `INSERT INTO "paiement"."compte" (type, nature, devise, portefeuille_id) VALUES ($1, $2, $3, $4)
           ON CONFLICT (type, devise, COALESCE(portefeuille_id, 0), COALESCE(agregateur_id, 0)) DO NOTHING`,
          [type, nature, devise, p.id],
        );
      }
      const lignes: Array<{ id: string; type: string }> = await m.query(
        `SELECT id::text AS id, type FROM "paiement"."compte" WHERE portefeuille_id = $1`, [p.id],
      );
      const id = (t: string) => lignes.find((l) => l.type === t)!.id;
      return {
        portefeuilleId: p.id, portefeuilleUuid: p.uuid,
        comptes: { attente: id('attente'), disponible: id('disponible'), reserve: id('reserve'), avanceDue: id('avance_due') },
      };
    };
    return manager ? executer(manager) : this.ds.transaction(executer);
  }

  /** Comptes de l'agrégateur (trésorerie réelle, créance en attente de règlement, réserve des tests de validation). */
  async ouvrirComptesAgregateur(agregateurId: string, devise: string, manager?: EntityManager): Promise<Record<'tresorerie' | 'creanceAgregateur' | 'reserveTests', string>> {
    const executer = async (m: EntityManager) => {
      for (const type of ['tresorerie', 'creance_agregateur', 'reserve_tests']) {
        await m.query(
          `INSERT INTO "paiement"."compte" (type, nature, devise, agregateur_id) VALUES ($1, 'actif', $2, $3)
           ON CONFLICT (type, devise, COALESCE(portefeuille_id, 0), COALESCE(agregateur_id, 0)) DO NOTHING`,
          [type, devise, agregateurId],
        );
      }
      const l: Array<{ id: string; type: string }> = await m.query(
        `SELECT id::text AS id, type FROM "paiement"."compte" WHERE agregateur_id = $1 AND devise = $2`, [agregateurId, devise],
      );
      const id = (t: string) => l.find((x) => x.type === t)!.id;
      return { tresorerie: id('tresorerie'), creanceAgregateur: id('creance_agregateur'), reserveTests: id('reserve_tests') };
    };
    return manager ? executer(manager) : this.ds.transaction(executer);
  }

  /** Compte des commissions d'avance de trésorerie (revenu de la plateforme, seul revenu prévu). */
  async ouvrirCompteCommission(devise: string, manager?: EntityManager): Promise<string> {
    const executer = async (m: EntityManager) => {
      await m.query(
        `INSERT INTO "paiement"."compte" (type, nature, devise) VALUES ('commission_avance', 'passif', $1)
         ON CONFLICT (type, devise, COALESCE(portefeuille_id, 0), COALESCE(agregateur_id, 0)) DO NOTHING`,
        [devise],
      );
      const [c] = await m.query(`SELECT id::text AS id FROM "paiement"."compte" WHERE type = 'commission_avance' AND devise = $1`, [devise]);
      return c.id as string;
    };
    return manager ? executer(manager) : this.ds.transaction(executer);
  }

  async soldes(portefeuilleId: string, manager?: EntityManager): Promise<SoldesPortefeuille> {
    const m = manager ?? this.ds.manager;
    const lignes: Array<{ type: string; solde: string }> = await m.query(
      `SELECT type, solde::text AS solde FROM "paiement"."compte" WHERE portefeuille_id = $1`, [portefeuilleId],
    );
    const v = (t: string) => BigInt(lignes.find((l) => l.type === t)?.solde ?? '0');
    return { attente: v('attente'), disponible: v('disponible'), reserve: v('reserve'), avanceDue: v('avance_due') };
  }

  /* ─────────── interne ─────────── */

  private valider(d: DemandeEcriture): void {
    if (!/^[A-Z]{3}$/.test(d.devise)) throw new BadRequestException({ code: 'ECRITURE_INVALIDE', message: 'Devise invalide.' });
    if (!d.cleIdempotence || d.cleIdempotence.length > 128) {
      throw new BadRequestException({ code: 'ECRITURE_INVALIDE', message: "Cle d'idempotence manquante ou trop longue." });
    }
    if (!Array.isArray(d.lignes) || d.lignes.length < 2) {
      throw new BadRequestException({ code: 'ECRITURE_INVALIDE', message: 'Une operation comptable comporte au moins deux lignes.' });
    }
    let debit = 0n;
    let credit = 0n;
    const comptes = new Set<string>();
    for (const l of d.lignes) {
      if (typeof l.montant !== 'bigint' || l.montant <= 0n) {
        throw new BadRequestException({ code: 'ECRITURE_INVALIDE', message: 'Chaque montant doit etre un entier strictement positif.' });
      }
      if (!/^\d+$/.test(l.compteId)) throw new BadRequestException({ code: 'ECRITURE_INVALIDE', message: 'Compte invalide.' });
      if (comptes.has(l.compteId)) {
        throw new BadRequestException({ code: 'ECRITURE_INVALIDE', message: 'Un compte ne peut apparaitre qu\'une fois par operation.' });
      }
      comptes.add(l.compteId);
      if (l.sens === 'debit') debit += l.montant;
      else if (l.sens === 'credit') credit += l.montant;
      else throw new BadRequestException({ code: 'ECRITURE_INVALIDE', message: 'Sens invalide.' });
    }
    if (debit !== credit) {
      throw new BadRequestException({ code: 'ECRITURE_DESEQUILIBREE', message: `Ecritures desequilibrees (debit ${debit}, credit ${credit}).` });
    }
  }

  private empreinte(d: DemandeEcriture): string {
    const lignes = [...d.lignes].sort((a, b) => Number(BigInt(a.compteId) - BigInt(b.compteId))).map((l) => `${l.compteId}:${l.sens}:${l.montant}`);
    return createHash('sha256')
      .update([d.typeOperation, d.devise, d.objetType ?? '', d.objetUuid ?? '', ...lignes].join('|'))
      .digest('hex');
  }

  private async posterDans(m: EntityManager, d: DemandeEcriture): Promise<ResultatEcriture> {
    const empreinte = this.empreinte(d);
    const inseres: Array<{ id: string; uuid: string }> = await m.query(
      `INSERT INTO "paiement"."ecriture_groupe"
         (type_operation, objet_type, objet_uuid, devise, cle_idempotence, empreinte_demande, description, cree_par, correlation_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (cle_idempotence) DO NOTHING RETURNING id::text AS id, uuid`,
      [d.typeOperation, d.objetType ?? null, d.objetUuid ?? null, d.devise, d.cleIdempotence, empreinte, d.description ?? null, d.creePar ?? null, d.correlationId ?? null],
    );
    if (inseres.length === 0) {
      const [existant] = await m.query(
        `SELECT uuid, empreinte_demande FROM "paiement"."ecriture_groupe" WHERE cle_idempotence = $1`, [d.cleIdempotence],
      );
      if (existant.empreinte_demande !== empreinte) {
        throw new ConflictException({
          code: 'CLE_IDEMPOTENCE_REUTILISEE',
          message: "Cette cle d'idempotence a deja servi pour une operation differente.",
        });
      }
      return { groupeUuid: existant.uuid, dejaPoste: true };
    }
    // Verrouillage des comptes dans un ordre déterministe AVANT toute écriture : sérialise les opérations
    // concurrentes sur les mêmes comptes et exclut les interblocages.
    await m.query(
      `SELECT id FROM "paiement"."compte" WHERE id = ANY($1::bigint[]) ORDER BY id FOR UPDATE`,
      [d.lignes.map((l) => l.compteId)],
    );
    const lignes = [...d.lignes].sort((a, b) => Number(BigInt(a.compteId) - BigInt(b.compteId)));
    const valeurs: unknown[] = [inseres[0].id];
    const tuples = lignes.map((l, i) => {
      valeurs.push(l.compteId, l.sens, l.montant.toString());
      return `($1, $${i * 3 + 2}, $${i * 3 + 3}, $${i * 3 + 4})`;
    });
    await m.query(`INSERT INTO "paiement"."ecriture" (groupe_id, compte_id, sens, montant) VALUES ${tuples.join(', ')}`, valeurs);
    return { groupeUuid: inseres[0].uuid, dejaPoste: false };
  }
}
