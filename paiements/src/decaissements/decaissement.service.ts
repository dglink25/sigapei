/**
 * Service Décaissement (Payout / Paiements sortants)
 *
 * Flux de validation :
 *  1. preparerDecaissement()  : un "préparateur" crée le décaissement (statut = brouillon)
 *  2. soumettreApprobation()  : le préparateur soumet (statut = a_approuver)
 *  3. approuverDecaissement() : un "approbateur" différent approuve (statut = approuve)
 *  4. reserverFonds()         : vérification du solde disponible + réservation comptable (statut = fonds_reserves)
 *  5. envoyer()               : appel agrégateur (statut = soumis -> en_cours -> envoye)
 *
 * Règles métier :
 *  - Le préparateur et l'approbateur doivent être des personnes différentes.
 *  - Maximum 3 délégués actifs par établissement.
 *  - Si source_fonds_sortie = 'fonds_disponibles' ET solde insuffisant -> rejet immédiat (sauf si avance autorisée).
 *  - Si avance utilisée : commission prélevée par la plateforme (taux configuré par le super admin).
 *  - Si solde insuffisant avec avance : commission prélevée automatiquement.
 *
 * Règlement automatique : déclenché par DecaissementScheduler (tâche planifiée).
 */
import {
  BadRequestException, ConflictException, ForbiddenException,
  Injectable, Logger, NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AgregateurRegistre } from '../agregateurs/agregateur.registre';
import { AuditService } from '../audit/audit.service';
import { ChiffrementService } from '../common/securite/chiffrement.service';
import { ContexteAcces, avecContexte } from '../database/contexte';

export interface PreparerDecaissementDto {
  etablissementUuid: string;
  agregateurCode: string;
  montant: bigint;
  devise: string;
  description: string;
  beneficiaire: {
    nom: string;
    telephone: string;
    pays?: string;
  };
  type: 'personnel' | 'reversement' | 'retrait';
  preparePar: string;    // UUID utilisateur
  acteurRole: string;
  correlationId?: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class DecaissementService {
  private readonly log = new Logger(DecaissementService.name);

  constructor(
    private readonly ds: DataSource,
    private readonly agregateurs: AgregateurRegistre,
    private readonly audit: AuditService,
    private readonly chiffrement: ChiffrementService,
  ) {}

  async preparerDecaissement(dto: PreparerDecaissementDto, ctx: ContexteAcces): Promise<{ uuid: string }> {
    return avecContexte(this.ds, ctx, async (m) => {
      // Vérifier que le préparateur est délégué
      await this.verifierDelegue(m, dto.etablissementUuid, dto.preparePar, 'peut_preparer');

      // Paramètres établissement
      const [params] = await m.query(
        `SELECT decaissement_actif, frais_sortie_a_charge, source_fonds_sortie
           FROM "paiement"."parametre_etablissement"
          WHERE etablissement_uuid = $1 AND devise = $2`,
        [dto.etablissementUuid, dto.devise],
      );
      if (!params?.decaissement_actif) {
        throw new ForbiddenException({ code: 'DECAISSEMENT_INACTIF', message: 'Les décaissements ne sont pas activés.' });
      }

      // Agrégateur
      const [agregRow] = await m.query(
        `SELECT id FROM "paiement"."agregateur" WHERE code = $1 AND statut = 'actif'`,
        [dto.agregateurCode],
      );
      if (!agregRow) throw new ForbiddenException({ code: 'AGREGATEUR_INACTIF' });

      // Mode de paiement sortant
      const [accord] = await m.query(
        `SELECT mp.id AS mode_id, mp.frais_taux, mp.frais_fixe
           FROM "paiement"."accord_etablissement" ae
           JOIN "paiement"."mode_paiement" mp ON mp.id = ae.mode_paiement_id
          WHERE ae.etablissement_uuid = $1 AND ae.statut = 'accorde'
            AND mp.agregateur_id = $2 AND mp.sens = 'sortie' AND mp.devise = $3 AND mp.statut = 'actif'
          LIMIT 1`,
        [dto.etablissementUuid, agregRow.id, dto.devise],
      );
      if (!accord) throw new ForbiddenException({ code: 'ACCORD_ABSENT' });

      // Frais
      const fraisACharge: 'etablissement' | 'beneficiaire' = params.frais_sortie_a_charge;
      const frais = this.calculerFrais(dto.montant, parseFloat(accord.frais_taux), BigInt(accord.frais_fixe));
      const montantDebite = fraisACharge === 'etablissement' ? dto.montant + frais : dto.montant;
      const montantRecu = fraisACharge === 'beneficiaire' ? dto.montant - frais : dto.montant;

      // Chiffrement téléphone
      const contexte = `decaissement:${dto.etablissementUuid}`;
      const telephoneChiffre = this.chiffrement.chiffrer(dto.beneficiaire.telephone, contexte);
      const telephoneMasque = ChiffrementService.masquerNumero(dto.beneficiaire.telephone);
      const telephoneEmpreinte = this.chiffrement.empreinte(dto.beneficiaire.telephone, contexte);

      const uuid = uuidv4();
      const referenceMarchande = `DEC-${Date.now()}-${uuid.slice(0, 8).toUpperCase()}`;

      // Portefeuille
      const [portefeuille] = await m.query(
        `SELECT id FROM "paiement"."portefeuille" WHERE etablissement_uuid = $1 AND devise = $2 AND statut = 'actif'`,
        [dto.etablissementUuid, dto.devise],
      );
      if (!portefeuille) throw new NotFoundException({ code: 'PORTEFEUILLE_ABSENT' });

      await m.query(
        `INSERT INTO "paiement"."decaissement"
           (uuid, etablissement_uuid, portefeuille_id, agregateur_id, mode_paiement_id, type, devise,
            montant, frais_a_charge, frais_agregateur, montant_debite, montant_recu, source_fonds,
            beneficiaire_nom, beneficiaire_telephone_chiffre, beneficiaire_telephone_masque,
            beneficiaire_telephone_empreinte,
            reference_marchande, statut, prepare_par, cle_idempotence, metadonnees)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'brouillon',$19,$20,$21::jsonb)`,
        [
          uuid, dto.etablissementUuid, portefeuille.id, agregRow.id, accord.mode_id, dto.type, dto.devise,
          dto.montant.toString(), fraisACharge, frais.toString(), montantDebite.toString(), montantRecu.toString(),
          params.source_fonds_sortie === 'fonds_disponibles' ? 'disponibles' : 'avance',
          dto.beneficiaire.nom, telephoneChiffre, telephoneMasque, telephoneEmpreinte,
          referenceMarchande, dto.preparePar, referenceMarchande,
          JSON.stringify({ correlation_id: dto.correlationId, description: dto.description }),
        ],
      );

      await this.audit.enregistrer({
        etablissementUuid: dto.etablissementUuid,
        acteurUuid: dto.preparePar,
        acteurRole: dto.acteurRole,
        action: 'decaissement.prepare',
        objetType: 'decaissement',
        objetUuid: uuid,
        apres: { referenceMarchande, montant: dto.montant.toString(), devise: dto.devise, type: dto.type },
        resultat: 'succes',
        ip: dto.ip,
        userAgent: dto.userAgent,
        correlationId: dto.correlationId,
      }, m);

      return { uuid };
    });
  }

  async soumettreApprobation(
    decaissementUuid: string, etablissementUuid: string,
    preparePar: string, acteurRole: string, ctx: ContexteAcces,
  ): Promise<void> {
    await avecContexte(this.ds, ctx, async (m) => {
      const [dec] = await m.query(
        `SELECT id, uuid, statut, prepare_par FROM "paiement"."decaissement"
          WHERE uuid = $1 AND etablissement_uuid = $2`,
        [decaissementUuid, etablissementUuid],
      );
      if (!dec) throw new NotFoundException({ code: 'DECAISSEMENT_INTROUVABLE' });
      if (dec.statut !== 'brouillon') throw new BadRequestException({ code: 'TRANSITION_INVALIDE' });
      if (dec.prepare_par !== preparePar) throw new ForbiddenException({ code: 'ACCES_REFUSE' });

      await m.query(
        `UPDATE "paiement"."decaissement" SET statut = 'a_approuver' WHERE id = $1`,
        [dec.id],
      );
      await this.audit.enregistrer({
        etablissementUuid, acteurUuid: preparePar, acteurRole,
        action: 'decaissement.soumis_approbation', objetType: 'decaissement', objetUuid: decaissementUuid,
        resultat: 'succes',
      }, m);
    });
  }

  async approuverDecaissement(
    decaissementUuid: string, etablissementUuid: string,
    approuvePar: string, acteurRole: string, motif: string | undefined, ctx: ContexteAcces,
  ): Promise<void> {
    await avecContexte(this.ds, ctx, async (m) => {
      await this.verifierDelegue(m, etablissementUuid, approuvePar, 'peut_approuver');

      const [dec] = await m.query(
        `SELECT id, uuid, statut, prepare_par, montant, montant_debite, devise, source_fonds, portefeuille_id
           FROM "paiement"."decaissement"
          WHERE uuid = $1 AND etablissement_uuid = $2`,
        [decaissementUuid, etablissementUuid],
      );
      if (!dec) throw new NotFoundException({ code: 'DECAISSEMENT_INTROUVABLE' });
      if (dec.statut !== 'a_approuver') throw new BadRequestException({ code: 'TRANSITION_INVALIDE' });
      // Une même personne ne peut pas préparer ET approuver
      if (dec.prepare_par === approuvePar) {
        throw new ForbiddenException({ code: 'MEME_PERSONNE', message: 'Le préparateur et l\'approbateur doivent être des personnes différentes.' });
      }

      await m.query(
        `UPDATE "paiement"."decaissement" SET statut = 'approuve', approuve_par = $1, approuve_le = now() WHERE id = $2`,
        [approuvePar, dec.id],
      );

      // Réservation des fonds immédiatement après approbation
      await this.reserverFonds(dec, etablissementUuid, m);

      await this.audit.enregistrer({
        etablissementUuid, acteurUuid: approuvePar, acteurRole,
        action: 'decaissement.approuve', objetType: 'decaissement', objetUuid: decaissementUuid,
        apres: { motif }, resultat: 'succes',
      }, m);
    });
  }

  async rejeterDecaissement(
    decaissementUuid: string, etablissementUuid: string,
    rejectePar: string, acteurRole: string, motif: string, ctx: ContexteAcces,
  ): Promise<void> {
    await avecContexte(this.ds, ctx, async (m) => {
      await this.verifierDelegue(m, etablissementUuid, rejectePar, 'peut_approuver');
      const [dec] = await m.query(
        `SELECT id, statut, prepare_par FROM "paiement"."decaissement" WHERE uuid = $1 AND etablissement_uuid = $2`,
        [decaissementUuid, etablissementUuid],
      );
      if (!dec) throw new NotFoundException({ code: 'DECAISSEMENT_INTROUVABLE' });
      if (!['a_approuver'].includes(dec.statut)) throw new BadRequestException({ code: 'TRANSITION_INVALIDE' });
      if (dec.prepare_par === rejectePar) throw new ForbiddenException({ code: 'MEME_PERSONNE' });

      await m.query(
        `UPDATE "paiement"."decaissement" SET statut = 'rejete', motif = $1 WHERE id = $2`,
        [motif, dec.id],
      );
      await this.audit.enregistrer({
        etablissementUuid, acteurUuid: rejectePar, acteurRole,
        action: 'decaissement.rejete', objetType: 'decaissement', objetUuid: decaissementUuid,
        apres: { motif }, resultat: 'succes',
      }, m);
    });
  }

  /** Envoi effectif vers l'agrégateur (appelé par le scheduler ou manuellement) */
  async envoyerDecaissement(decaissementUuid: string, ctx: ContexteAcces): Promise<void> {
    await avecContexte(this.ds, ctx, async (m) => {
      const [dec] = await m.query(
        `SELECT d.*, a.code AS agregateur_code
           FROM "paiement"."decaissement" d
           JOIN "paiement"."agregateur" a ON a.id = d.agregateur_id
          WHERE d.uuid = $1`,
        [decaissementUuid],
      );
      if (!dec) throw new NotFoundException({ code: 'DECAISSEMENT_INTROUVABLE' });
      if (dec.statut !== 'fonds_reserves') throw new BadRequestException({ code: 'TRANSITION_INVALIDE' });

      await m.query(
        `UPDATE "paiement"."decaissement" SET statut = 'soumis' WHERE id = $1`,
        [dec.id],
      );

      const ag = this.agregateurs.obtenir(dec.agregateur_code);
      const telephone = this.chiffrement.dechiffrer(
        dec.beneficiaire_telephone_chiffre,
        `decaissement:${dec.etablissement_uuid}`,
      );

      try {
        const response = await ag.initierDecaissement({
          referenceMarchande: dec.reference_marchande,
          montant: BigInt(dec.montant),
          devise: dec.devise,
          description: dec.metadonnees?.description ?? 'Paiement',
          beneficiaire: {
            nom: dec.beneficiaire_nom,
            telephone,
            pays: 'BJ',
          },
          metadonnees: { decaissement_uuid: decaissementUuid },
        });

        await m.query(
          `UPDATE "paiement"."decaissement"
              SET statut = 'en_cours', reference_agregateur = $1, envoye_le = now()
            WHERE id = $2`,
          [response.referenceAgregateur, dec.id],
        );
      } catch (err: unknown) {
        await m.query(
          `UPDATE "paiement"."decaissement" SET statut = 'echoue', motif_echec = $1 WHERE id = $2`,
          [(err as Error).message, dec.id],
        );
        // Libérer la réservation en cas d'échec
        await this.libererReservation(dec, m);
        throw err;
      }
    });
  }

  /** Vérification périodique des décaissements en cours */
  async verifierDecaissementsEnCours(): Promise<void> {
    const rows: Array<Record<string, unknown>> = await this.ds.query(
      `SELECT d.uuid, d.reference_agregateur, a.code AS agregateur_code
         FROM "paiement"."decaissement" d
         JOIN "paiement"."agregateur" a ON a.id = d.agregateur_id
        WHERE d.statut IN ('soumis','en_cours','incertain')
          AND d.prochaine_verification <= now()
        LIMIT 50 FOR UPDATE SKIP LOCKED`,
    );

    for (const dec of rows) {
      if (!dec.reference_agregateur) continue;
      try {
        const ag = this.agregateurs.obtenir(String(dec.agregateur_code));
        const status = await ag.verifierDecaissement(String(dec.reference_agregateur));

        let nouveauStatut: string | null = null;
        if (status.statut === 'envoye') nouveauStatut = 'envoye';
        else if (status.statut === 'echoue') nouveauStatut = 'echoue';
        else if (status.statut === 'incertain') nouveauStatut = 'incertain';

        if (nouveauStatut) {
          await this.ds.transaction(async (m) => {
            await m.query(
              `UPDATE "paiement"."decaissement"
                  SET statut = $1, verifications = verifications + 1,
                      prochaine_verification = CASE WHEN $1 IN ('envoye','echoue') THEN NULL ELSE now() + interval '5 minutes' END,
                      termine_le = CASE WHEN $1 = 'envoye' THEN now() ELSE NULL END
                WHERE uuid = $2`,
              [nouveauStatut, dec.uuid],
            );
            if (nouveauStatut === 'envoye') {
              // Finaliser la réservation (passer de réservé à dépensé)
              await this.finaliserReservation(dec as Record<string, unknown>, m);
            }
          });
        }
      } catch (err: unknown) {
        this.log.error(`Erreur vérification décaissement ${dec.uuid}: ${(err as Error).message}`);
        await this.ds.query(
          `UPDATE "paiement"."decaissement"
              SET verifications = verifications + 1, prochaine_verification = now() + interval '15 minutes'
            WHERE uuid = $1`,
          [dec.uuid],
        );
      }
    }
  }

  private async reserverFonds(dec: Record<string, unknown>, etablissementUuid: string, m: EntityManager): Promise<void> {
    const portefeuilleId = Number(dec.portefeuille_id);
    const devise = String(dec.devise);
    const montantDebite = BigInt(String(dec.montant_debite));

    // Vérifier solde disponible
    const [compteDisponible] = await m.query(
      `SELECT id, solde FROM "paiement"."compte"
        WHERE type = 'disponible' AND devise = $1 AND portefeuille_id = $2`,
      [devise, portefeuilleId],
    );

    const solde = compteDisponible ? BigInt(compteDisponible.solde) : 0n;

    if (solde < montantDebite) {
      // Vérifier si l'avance est autorisée pour cet établissement
      const sourceFonds = String(dec.source_fonds);
      if (sourceFonds !== 'avance') {
        await m.query(
          `UPDATE "paiement"."decaissement" SET statut = 'annule', motif = 'Solde insuffisant' WHERE id = $1`,
          [dec.id],
        );
        throw new BadRequestException({ code: 'SOLDE_INSUFFISANT', message: 'Solde disponible insuffisant.' });
      }

      // Avance : calculer la commission
      const manquant = montantDebite - solde;
      const [params] = await m.query(
        `SELECT commission_avance_taux, commission_avance_min, commission_avance_max, plafond_avance_defaut
           FROM "paiement"."parametre_plateforme" WHERE devise = $1`,
        [devise],
      );
      const commissionTaux = parseFloat(params?.commission_avance_taux ?? '0');
      const commissionMin = BigInt(params?.commission_avance_min ?? '0');
      const commission = this.calculerFrais(manquant, commissionTaux, commissionMin);

      await m.query(
        `UPDATE "paiement"."decaissement"
            SET source_fonds = 'avance', avance_montant = $1, commission_avance = $2
          WHERE id = $3`,
        [manquant.toString(), commission.toString(), dec.id],
      );

      // Écriture : débiter le compte avance
      const compteAvance = await this.obtenirOuCreerCompte(m, 'avance_due', devise, portefeuilleId, null);
      await this.insererEcritures(m, `reservation_avance:${dec.uuid}`, devise, [
        { compteId: compteAvance.id, sens: 'debit', montant: manquant + commission },
      ]);
    }

    // Réserver les fonds disponibles
    const compteDisponibleId = compteDisponible?.id;
    const compteReserve = await this.obtenirOuCreerCompte(m, 'reserve', devise, portefeuilleId, null);

    if (compteDisponibleId && solde > 0n) {
      const aReserver = solde < montantDebite ? solde : montantDebite;
      await this.insererEcritures(m, `reservation:${dec.uuid}`, devise, [
        { compteId: compteDisponibleId, sens: 'credit', montant: aReserver },
        { compteId: compteReserve.id, sens: 'debit', montant: aReserver },
      ]);
    }

    await m.query(
      `UPDATE "paiement"."decaissement" SET statut = 'fonds_reserves' WHERE id = $1`,
      [dec.id],
    );
  }

  private async libererReservation(dec: Record<string, unknown>, m: EntityManager): Promise<void> {
    // Écriture inverse pour libérer la réservation en cas d'échec
    const portefeuilleId = Number(dec.portefeuille_id);
    const devise = String(dec.devise);
    const montant = BigInt(String(dec.montant_debite));

    const [compteReserve] = await m.query(
      `SELECT id FROM "paiement"."compte" WHERE type = 'reserve' AND devise = $1 AND portefeuille_id = $2`,
      [devise, portefeuilleId],
    );
    const [compteDisponible] = await m.query(
      `SELECT id FROM "paiement"."compte" WHERE type = 'disponible' AND devise = $1 AND portefeuille_id = $2`,
      [devise, portefeuilleId],
    );

    if (compteReserve && compteDisponible) {
      await this.insererEcritures(m, `liberation:${dec.uuid}`, devise, [
        { compteId: compteReserve.id, sens: 'credit', montant },
        { compteId: compteDisponible.id, sens: 'debit', montant },
      ]);
    }
  }

  private async finaliserReservation(dec: Record<string, unknown>, m: EntityManager): Promise<void> {
    // Vider la réserve (fonds envoyés avec succès)
    const portefeuilleId = Number(dec.portefeuille_id);
    const devise = String(dec.devise);
    const montant = BigInt(String(dec.montant_debite));

    const [compteReserve] = await m.query(
      `SELECT id, solde FROM "paiement"."compte" WHERE type = 'reserve' AND devise = $1 AND portefeuille_id = $2`,
      [devise, portefeuilleId],
    );
    if (!compteReserve) return;
    const soldeReserve = BigInt(compteReserve.solde);
    if (soldeReserve <= 0n) return;

    const aDebiter = soldeReserve < montant ? soldeReserve : montant;
    // Compte de trésorerie plateforme (sorti du système)
    const [agregateurRow] = await m.query(
      `SELECT agregateur_id FROM "paiement"."decaissement" WHERE uuid = $1`, [dec.uuid],
    );
    const compteTresorerie = await this.obtenirOuCreerCompte(m, 'tresorerie', devise, null, Number(agregateurRow?.agregateur_id));
    await this.insererEcritures(m, `finalisation:${dec.uuid}`, devise, [
      { compteId: compteReserve.id, sens: 'credit', montant: aDebiter },
      { compteId: compteTresorerie.id, sens: 'debit', montant: aDebiter },
    ]);
  }

  private async insererEcritures(
    m: EntityManager,
    cleIdempotence: string,
    devise: string,
    lignes: Array<{ compteId: number; sens: 'debit' | 'credit'; montant: bigint }>,
  ): Promise<void> {
    const [existant] = await m.query(
      `SELECT 1 FROM "paiement"."ecriture_groupe" WHERE cle_idempotence = $1`, [cleIdempotence],
    );
    if (existant) return;
    const [groupe] = await m.query(
      `INSERT INTO "paiement"."ecriture_groupe"
         (type_operation, devise, cle_idempotence, empreinte_demande)
       VALUES ('decaissement', $1, $2, $2) RETURNING id`,
      [devise, cleIdempotence],
    );
    for (const l of lignes) {
      await m.query(
        `INSERT INTO "paiement"."ecriture" (groupe_id, compte_id, sens, montant) VALUES ($1,$2,$3,$4)`,
        [groupe.id, l.compteId, l.sens, l.montant.toString()],
      );
    }
  }

  private async obtenirOuCreerCompte(
    m: EntityManager, type: string, devise: string,
    portefeuilleId: number | null, agregateurId: number | null,
  ): Promise<{ id: number }> {
    const [existing] = await m.query(
      `SELECT id FROM "paiement"."compte"
        WHERE type = $1 AND devise = $2
          AND COALESCE(portefeuille_id, 0) = $3 AND COALESCE(agregateur_id, 0) = $4`,
      [type, devise, portefeuilleId ?? 0, agregateurId ?? 0],
    );
    if (existing) return existing;
    const nature = ['attente', 'disponible', 'reserve', 'avance_due'].includes(type) ? 'actif' : 'passif';
    const [created] = await m.query(
      `INSERT INTO "paiement"."compte" (type, nature, devise, portefeuille_id, agregateur_id)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [type, nature, devise, portefeuilleId, agregateurId],
    );
    return created;
  }

  private calculerFrais(montant: bigint, tauxPourcent: number, fixe: bigint): bigint {
    if (tauxPourcent === 0 && fixe === 0n) return 0n;
    const taux = BigInt(Math.round(tauxPourcent * 10_000));
    const proportionnel = (montant * taux + 999_999n) / 1_000_000n;
    return proportionnel + fixe;
  }

  private async verifierDelegue(m: EntityManager, etablissementUuid: string, utilisateurUuid: string, permission: 'peut_preparer' | 'peut_approuver'): Promise<void> {
    const [delegue] = await m.query(
      `SELECT 1 FROM "paiement"."delegation_personnel"
        WHERE etablissement_uuid = $1 AND utilisateur_uuid = $2 AND ${permission} = true AND actif = true`,
      [etablissementUuid, utilisateurUuid],
    );
    if (!delegue) {
      throw new ForbiddenException({
        code: 'DELEGATION_ABSENTE',
        message: `Vous n'êtes pas autorisé à ${permission === 'peut_preparer' ? 'préparer' : 'approuver'} les décaissements.`,
      });
    }
  }

  async listerDecaissements(etablissementUuid: string, filtres: { statut?: string; page?: number; limite?: number }, ctx: ContexteAcces) {
    return avecContexte(this.ds, ctx, async (m) => {
      const where: string[] = ['d.etablissement_uuid = $1'];
      const params: unknown[] = [etablissementUuid];
      if (filtres.statut) { params.push(filtres.statut); where.push(`d.statut = $${params.length}`); }

      const page = Math.max(1, filtres.page ?? 1);
      const limite = Math.min(100, Math.max(1, filtres.limite ?? 20));
      const clause = `WHERE ${where.join(' AND ')}`;

      const rows = await m.query(
        `SELECT d.uuid, d.statut, d.montant, d.montant_debite, d.montant_recu, d.devise,
                d.type, d.beneficiaire_nom, d.beneficiaire_telephone_masque,
                d.reference_marchande, d.approuve_le, d.envoye_le, d.created_at,
                a.code AS agregateur_code
           FROM "paiement"."decaissement" d
           JOIN "paiement"."agregateur" a ON a.id = d.agregateur_id
          ${clause} ORDER BY d.created_at DESC
          LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limite, (page - 1) * limite],
      );
      const [{ total }] = await m.query(
        `SELECT COUNT(*)::int AS total FROM "paiement"."decaissement" d ${clause}`, params,
      );
      return { decaissements: rows, pagination: { page, limite, total, pages: Math.ceil(total / limite) } };
    });
  }
}
