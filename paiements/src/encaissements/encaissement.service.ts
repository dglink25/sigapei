/**
 * Service Encaissement (Payin)
 *
 * Flux :
 *  1. initierEncaissement() : crée la ligne en BD + appelle l'agrégateur + retourne l'URL de paiement
 *  2. webhook reçu (FedaPay) ou notification IPN (CinetPay) ou verify post-widget (Kkiapay) ->
 *     traiterWebhookEncaissement() : met à jour le statut + passe en disponible si delai=0
 *  3. reglement automatique (tâche planifiée) : passe les encaissements approuvés en disponible
 *     après le délai de règlement de l'agrégateur (ex : 72h pour carte via Kkiapay)
 *
 * Modèle de fonds :
 *  - Encaissement approuvé -> écriture débit "attente" / crédit "compte_agregateur"
 *  - Disponible             -> écriture débit "attente" / crédit "disponible" (portefeuille établissement)
 *
 * Réserve de trésorerie (test_validation) :
 *  - Pour valider un compte de réception, on fait un petit encaissement test puis un décaissement test.
 *  - Géré dans TestValidationService, qui appelle ce service pour l'encaissement.
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
import { PayinInitRequest } from '../agregateurs/agregateur.interface';

export interface InitierEncaissementDto {
  etablissementUuid: string;
  agregateurCode: string;         // 'fedapay' | 'kkiapay' | 'cinetpay'
  montant: bigint;
  devise: string;
  libelle: string;
  objetType?: string;             // ex: 'inscription', 'scolarite'
  objetUuid?: string;
  urlRetour?: string;             // page du front où revenir après paiement (origine autorisée uniquement)
  payeur?: {
    utilisateurUuid?: string;
    nom?: string;
    prenom?: string;
    email?: string;
    telephone?: string;
    pays?: string;
  };
  acteurUuid: string;
  acteurRole: string;
  correlationId?: string;
  ip?: string;
  userAgent?: string;
}

export interface EncaissementInitie {
  uuid: string;
  referenceMarchande: string;
  urlPaiement?: string;
  token?: string;
  statut: string;
}

@Injectable()
export class EncaissementService {
  private readonly log = new Logger(EncaissementService.name);

  constructor(
    private readonly ds: DataSource,
    private readonly agregateurs: AgregateurRegistre,
    private readonly audit: AuditService,
    private readonly chiffrement: ChiffrementService,
  ) {}

  /** Pas de redirection ouverte : l'adresse de retour doit appartenir à une origine déclarée (CORS_ORIGINS). */
  private urlRetourAutorisee(url: string): string {
    const origines = (process.env.CORS_ORIGINS ?? '').split(',').map((o) => o.trim().replace(/\/+$/, '')).filter(Boolean);
    let origine: string;
    try {
      origine = new URL(url).origin;
    } catch {
      throw new BadRequestException({ code: 'URL_RETOUR_INVALIDE', message: "L'adresse de retour est invalide." });
    }
    if (!origines.includes(origine)) {
      throw new BadRequestException({ code: 'URL_RETOUR_NON_AUTORISEE', message: "L'adresse de retour n'appartient pas à la plateforme." });
    }
    return url;
  }

  async initierEncaissement(dto: InitierEncaissementDto, ctx: ContexteAcces): Promise<EncaissementInitie> {
    const ag = this.agregateurs.obtenir(dto.agregateurCode);

    return avecContexte(this.ds, ctx, async (m) => {
      // Récupérer l'agrégateur en BD
      const [agregRow] = await m.query(
        `SELECT id FROM "paiement"."agregateur" WHERE code = $1 AND statut = 'actif'`,
        [dto.agregateurCode],
      );
      if (!agregRow) throw new ForbiddenException({ code: 'AGREGATEUR_INACTIF', message: `L'agrégateur ${dto.agregateurCode} n'est pas actif.` });

      // Vérifier l'accord établissement + récupérer le mode de paiement
      const [accord] = await m.query(
        `SELECT mp.id AS mode_id, mp.frais_taux, mp.frais_fixe, mp.delai_reglement_heures, mp.devise, mp.montant_min, mp.montant_max, mp.multiple
           FROM "paiement"."accord_etablissement" ae
           JOIN "paiement"."mode_paiement" mp ON mp.id = ae.mode_paiement_id
          WHERE ae.etablissement_uuid = $1 AND ae.statut = 'accorde'
            AND mp.agregateur_id = $2 AND mp.statut = 'actif' AND mp.sens = 'entree' AND mp.devise = $3
          LIMIT 1`,
        [dto.etablissementUuid, agregRow.id, dto.devise],
      );
      if (!accord) throw new ForbiddenException({ code: 'ACCORD_ABSENT', message: `Aucun accord actif pour ${dto.agregateurCode} en ${dto.devise}.` });

      // Vérifier interrupteur de sécurité
      const [interrupteur] = await m.query(
        `SELECT 1 FROM "paiement"."interrupteur_securite"
          WHERE actif AND (portee = 'global' OR (portee = 'agregateur' AND cible_uuid = $1::uuid))`,
        [agregRow.id],
      );
      if (interrupteur) throw new ForbiddenException({ code: 'INTERRUPTEUR_ACTIF', message: 'Les paiements sont temporairement suspendus.' });

      // Paramètres établissement
      const [params] = await m.query(
        `SELECT encaissement_actif, frais_entree_a_charge FROM "paiement"."parametre_etablissement"
          WHERE etablissement_uuid = $1 AND devise = $2`,
        [dto.etablissementUuid, dto.devise],
      );
      if (!params?.encaissement_actif) {
        throw new ForbiddenException({ code: 'ENCAISSEMENT_INACTIF', message: 'Les encaissements ne sont pas activés pour cet établissement.' });
      }

      // Portefeuille
      const [portefeuille] = await m.query(
        `SELECT id FROM "paiement"."portefeuille" WHERE etablissement_uuid = $1 AND devise = $2 AND statut = 'actif'`,
        [dto.etablissementUuid, dto.devise],
      );
      if (!portefeuille) throw new NotFoundException({ code: 'PORTEFEUILLE_ABSENT', message: 'Portefeuille introuvable.' });

      // Frais
      const fraisACharge: 'etablissement' | 'payeur' = params.frais_entree_a_charge;
      const tauxFrais = parseFloat(accord.frais_taux);
      const fixeFrais = BigInt(accord.frais_fixe);
      const fraisEstimes = this.calculerFrais(dto.montant, tauxFrais, fixeFrais);
      const montantPaye = fraisACharge === 'payeur' ? dto.montant + fraisEstimes : dto.montant;
      const montantNet = dto.montant - (fraisACharge === 'etablissement' ? fraisEstimes : 0n);

      // Chiffrement téléphone si présent
      let telephoneChiffre: string | null = null;
      let telephoneMasque: string | null = null;
      let telephoneEmpreinte: string | null = null;
      if (dto.payeur?.telephone) {
        const contexte = `encaissement:${dto.etablissementUuid}`;
        telephoneChiffre = this.chiffrement.chiffrer(dto.payeur.telephone, contexte);
        telephoneMasque = ChiffrementService.masquerNumero(dto.payeur.telephone);
        telephoneEmpreinte = this.chiffrement.empreinte(dto.payeur.telephone, contexte);
      }

      // Référence marchande unique
      const referenceMarchande = `ENC-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;
      const cleIdempotence = referenceMarchande;
      const encaissementUuid = uuidv4();

      // URLs de callback
      const baseUrl = process.env.APP_BASE_URL ?? 'http://localhost:4010';
      const callbackUrl = dto.urlRetour
        ? this.urlRetourAutorisee(dto.urlRetour)
        : `${baseUrl}/v1/paiement/retour/${referenceMarchande}`;
      const notifyUrl = `${baseUrl}/v1/webhooks/${dto.agregateurCode}`;

      // Appel agrégateur
      const payinReq: PayinInitRequest = {
        referenceMarchande,
        montant: montantPaye,
        devise: dto.devise,
        libelle: dto.libelle,
        callbackUrl,
        notifyUrl,
        payeur: dto.payeur ? {
          nom: dto.payeur.nom,
          prenom: dto.payeur.prenom,
          email: dto.payeur.email,
          telephone: dto.payeur.telephone,
          pays: dto.payeur.pays ?? 'BJ',
        } : undefined,
        metadonnees: {
          etablissement_uuid: dto.etablissementUuid,
          objet_type: dto.objetType ?? '',
          objet_uuid: dto.objetUuid ?? '',
        },
      };

      const initResponse = await ag.initierEncaissement(payinReq);

      // Enregistrement appel agrégateur
      await m.query(
        `INSERT INTO "paiement"."appel_agregateur"
           (agregateur_id, operation, reference_marchande, methode, chemin, requete, reponse, http_status, duree_ms, correlation_id)
         VALUES ($1, 'initier_encaissement', $2, 'POST', '/transactions', $3::jsonb, $4::jsonb, 200, NULL, $5::uuid)`,
        [agregRow.id, referenceMarchande, JSON.stringify(payinReq), JSON.stringify(initResponse.donneesRaw), dto.correlationId ?? null],
      );

      // Insertion encaissement
      await m.query(
        `INSERT INTO "paiement"."encaissement"
           (uuid, etablissement_uuid, portefeuille_id, agregateur_id, mode_paiement_id, devise,
            montant, frais_a_charge, frais_agregateur, montant_paye, montant_net,
            reference_marchande, reference_agregateur, statut, objet_type, objet_uuid, libelle,
            payeur_utilisateur_uuid, payeur_nom, payeur_telephone_chiffre, payeur_telephone_masque,
            payeur_telephone_empreinte, payeur_email,
            cle_idempotence, url_paiement, expire_le, metadonnees)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,now()+interval'24 hours',$26::jsonb)`,
        [
          encaissementUuid, dto.etablissementUuid, portefeuille.id, agregRow.id, accord.mode_id, dto.devise,
          dto.montant.toString(), fraisACharge, fraisEstimes.toString(), montantPaye.toString(), montantNet.toString(),
          referenceMarchande, initResponse.referenceAgregateur, 'initie',
          dto.objetType ?? null, dto.objetUuid ?? null, dto.libelle,
          dto.payeur?.utilisateurUuid ?? null,
          dto.payeur ? `${dto.payeur.prenom ?? ''} ${dto.payeur.nom ?? ''}`.trim() || null : null,
          telephoneChiffre, telephoneMasque, telephoneEmpreinte,
          dto.payeur?.email ?? null,
          cleIdempotence, initResponse.urlPaiement ?? null,
          JSON.stringify({ correlation_id: dto.correlationId }),
        ],
      );

      // Audit
      await this.audit.enregistrer({
        etablissementUuid: dto.etablissementUuid,
        acteurUuid: dto.acteurUuid,
        acteurRole: dto.acteurRole,
        action: 'encaissement.initie',
        objetType: 'encaissement',
        objetUuid: encaissementUuid,
        apres: { referenceMarchande, agregateurCode: dto.agregateurCode, montant: dto.montant.toString(), devise: dto.devise },
        resultat: 'succes',
        ip: dto.ip,
        userAgent: dto.userAgent,
        correlationId: dto.correlationId,
      }, m);

      return {
        uuid: encaissementUuid,
        referenceMarchande,
        urlPaiement: initResponse.urlPaiement,
        token: initResponse.token,
        statut: 'initie',
      };
    });
  }

  /**
   * Traitement du webhook / IPN agrégateur.
   * Appelé par le controller webhook après vérification de la signature.
   * Met à jour le statut de l'encaissement et déclenche les écritures comptables.
   */
  async traiterWebhookEncaissement(
    agregateurCode: string,
    referenceAgregateurOuMarchande: string,
    statutAgregateur: string,
    donneesRaw: Record<string, unknown>,
    m: EntityManager,
  ): Promise<void> {
    // Chercher l'encaissement par référence agrégateur ou marchande
    const rows: Array<Record<string, unknown>> = await m.query(
      `SELECT e.id, e.uuid, e.statut, e.montant, e.montant_net, e.etablissement_uuid,
              e.portefeuille_id, e.agregateur_id, e.devise, e.reference_marchande,
              mp.delai_reglement_heures
         FROM "paiement"."encaissement" e
         LEFT JOIN "paiement"."mode_paiement" mp ON mp.id = e.mode_paiement_id
        WHERE (e.reference_agregateur = $1 OR e.reference_marchande = $1)
          AND e.agregateur_id = (SELECT id FROM "paiement"."agregateur" WHERE code = $2)`,
      [referenceAgregateurOuMarchande, agregateurCode],
    );
    if (!rows.length) {
      this.log.warn(`Webhook ${agregateurCode}: encaissement introuvable pour ref ${referenceAgregateurOuMarchande}`);
      return;
    }
    const enc = rows[0];

    // Éviter le double-traitement
    if (enc.statut === 'approuve' || enc.statut === 'disponible') return;

    // Mettre à jour le statut agrégateur brut
    await m.query(
      `UPDATE "paiement"."encaissement" SET statut_agregateur = $1 WHERE id = $2`,
      [statutAgregateur, enc.id],
    );

    // Mapper le statut agrégateur vers notre statut interne
    const agAdapter = this.agregateurs.obtenir(agregateurCode);
    const verified = await agAdapter.verifierEncaissement(String(enc.reference_marchande));

    let nouveauStatut: string | null = null;
    if (verified.statut === 'approuve') nouveauStatut = 'approuve';
    else if (verified.statut === 'refuse') nouveauStatut = 'refuse';
    else if (verified.statut === 'annule') nouveauStatut = 'annule';
    else if (verified.statut === 'expire') nouveauStatut = 'expire';

    if (!nouveauStatut) return;

    await m.query(
      `UPDATE "paiement"."encaissement"
          SET statut = $1, reference_agregateur = $2, approuve_le = CASE WHEN $1 = 'approuve' THEN now() ELSE NULL END,
              frais_agregateur = $3, montant_paye = $4, montant_net = $5, version = version + 1
        WHERE id = $6`,
      [
        nouveauStatut,
        verified.referenceAgregateur,
        verified.frais.toString(),
        verified.montant.toString(),
        verified.montantNet.toString(),
        enc.id,
      ],
    );

    if (nouveauStatut === 'approuve') {
      const delaiH = Number(enc.delai_reglement_heures ?? 0);
      const disponibleLe = new Date(Date.now() + delaiH * 3_600_000);

      await m.query(
        `UPDATE "paiement"."encaissement" SET disponible_le = $1 WHERE id = $2`,
        [disponibleLe, enc.id],
      );

      // Écriture comptable : débiter "attente" et créditer "disponible" si disponible immédiatement
      if (delaiH === 0) {
        await this.crediterDisponible(enc, verified.montantNet, m);
      } else {
        // Sera traité par le job planifié quand disponible_le est passé
        this.log.log(`Encaissement ${enc.uuid} approuvé, disponible dans ${delaiH}h`);
      }

      // Émettre une notification
      await this.emettrNotificationEncaissementReussi(enc, verified.montantNet, m);
    }

    // Journal audit (contexte système)
    await m.query(
      `INSERT INTO "paiement"."audit_evenement"
         (etablissement_uuid, acteur_uuid, acteur_role, action, objet_type, objet_uuid, apres, resultat, correlation_id)
       VALUES ($1, NULL, 'systeme', 'encaissement.webhook_traite', 'encaissement', $2, $3::jsonb, 'succes', NULL)`,
      [enc.etablissement_uuid, enc.uuid, JSON.stringify({ statut: nouveauStatut, agregateurCode })],
    );
  }

  /** Passe les encaissements approuvés dont le délai de règlement est écoulé en "disponible". */
  async regler(m: EntityManager): Promise<number> {
    const rows: Array<Record<string, unknown>> = await m.query(
      `SELECT e.id, e.uuid, e.etablissement_uuid, e.portefeuille_id, e.montant_net, e.devise
         FROM "paiement"."encaissement" e
        WHERE e.statut = 'approuve' AND e.disponible_le <= now()
        LIMIT 100 FOR UPDATE SKIP LOCKED`,
    );
    for (const enc of rows) {
      await this.crediterDisponible(enc, BigInt(String(enc.montant_net)), m);
    }
    return rows.length;
  }

  private async crediterDisponible(enc: Record<string, unknown>, montantNet: bigint, m: EntityManager): Promise<void> {
    // Compte "attente" et compte "disponible" du portefeuille
    const compteAttente = await this.obtenirOuCreerCompte(m, 'attente', String(enc.devise), Number(enc.portefeuille_id), null);
    const compteDisponible = await this.obtenirOuCreerCompte(m, 'disponible', String(enc.devise), Number(enc.portefeuille_id), null);

    const cleIdempotence = `reglement:${enc.uuid}`;
    const [existant] = await m.query(`SELECT 1 FROM "paiement"."ecriture_groupe" WHERE cle_idempotence = $1`, [cleIdempotence]);
    if (existant) return;

    // Groupe d'écritures
    const [groupe] = await m.query(
      `INSERT INTO "paiement"."ecriture_groupe"
         (type_operation, objet_type, objet_uuid, devise, cle_idempotence, empreinte_demande, description)
       VALUES ('reglement_encaissement','encaissement',$1,$2,$3,$4,'Règlement encaissement')
       RETURNING id`,
      [enc.uuid, enc.devise, cleIdempotence, cleIdempotence],
    );

    // Debit "attente" (actif) + Credit "disponible" (actif) : transfert interne
    await m.query(
      `INSERT INTO "paiement"."ecriture" (groupe_id, compte_id, sens, montant) VALUES ($1,$2,'credit',$3)`,
      [groupe.id, compteAttente.id, montantNet.toString()],
    );
    await m.query(
      `INSERT INTO "paiement"."ecriture" (groupe_id, compte_id, sens, montant) VALUES ($1,$2,'debit',$3)`,
      [groupe.id, compteDisponible.id, montantNet.toString()],
    );

    await m.query(
      `UPDATE "paiement"."encaissement" SET statut = 'disponible' WHERE id = $1`,
      [enc.id],
    );
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

  private async emettrNotificationEncaissementReussi(enc: Record<string, unknown>, montantNet: bigint, m: EntityManager): Promise<void> {
    // Insertion dans la table outbox_evenement pour traitement asynchrone
    await m.query(
      `INSERT INTO "paiement"."outbox_evenement" (topic, cle_partition, payload)
       VALUES ('paiement.encaissement.reussi', $1, $2::jsonb)`,
      [
        enc.etablissement_uuid,
        JSON.stringify({
          encaissementUuid: enc.uuid,
          etablissementUuid: enc.etablissement_uuid,
          montantNet: montantNet.toString(),
          devise: enc.devise,
        }),
      ],
    );
  }

  async listerEncaissements(
    etablissementUuid: string,
    filtres: { statut?: string; du?: Date; au?: Date; page?: number; limite?: number },
    ctx: ContexteAcces,
  ) {
    return avecContexte(this.ds, ctx, async (m) => {
      const where: string[] = ['e.etablissement_uuid = $1'];
      const params: unknown[] = [etablissementUuid];

      if (filtres.statut) { params.push(filtres.statut); where.push(`e.statut = $${params.length}`); }
      if (filtres.du) { params.push(filtres.du); where.push(`e.created_at >= $${params.length}`); }
      if (filtres.au) { params.push(filtres.au); where.push(`e.created_at <= $${params.length}`); }

      const page = Math.max(1, filtres.page ?? 1);
      const limite = Math.min(100, Math.max(1, filtres.limite ?? 20));
      const clause = `WHERE ${where.join(' AND ')}`;

      const rows = await m.query(
        `SELECT e.uuid, e.statut, e.montant, e.montant_net, e.devise, e.reference_marchande,
                e.libelle, e.payeur_nom, e.payeur_telephone_masque, e.payeur_email,
                e.approuve_le, e.disponible_le, e.created_at,
                a.code AS agregateur_code, a.nom AS agregateur_nom
           FROM "paiement"."encaissement" e
           JOIN "paiement"."agregateur" a ON a.id = e.agregateur_id
          ${clause}
          ORDER BY e.created_at DESC
          LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limite, (page - 1) * limite],
      );
      const [{ total }] = await m.query(`SELECT COUNT(*)::int AS total FROM "paiement"."encaissement" e ${clause}`, params);
      return { encaissements: rows, pagination: { page, limite, total, pages: Math.ceil(total / limite) } };
    });
  }

  async obtenirEncaissement(encaissementUuid: string, etablissementUuid: string, ctx: ContexteAcces) {
    return avecContexte(this.ds, ctx, async (m) => {
      const [row] = await m.query(
        `SELECT e.*, a.code AS agregateur_code, a.nom AS agregateur_nom
           FROM "paiement"."encaissement" e
           JOIN "paiement"."agregateur" a ON a.id = e.agregateur_id
          WHERE e.uuid = $1 AND e.etablissement_uuid = $2`,
        [encaissementUuid, etablissementUuid],
      );
      if (!row) throw new NotFoundException({ code: 'ENCAISSEMENT_INTROUVABLE' });
      // Masquer les données chiffrées
      delete row.payeur_telephone_chiffre;
      return row;
    });
  }
}
