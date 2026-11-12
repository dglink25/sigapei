/**
 * SuperAdminService
 * Toutes les opérations réservées au super administrateur :
 *
 *  1. Agrégateurs  : lister, activer/suspendre, configurer l'environnement (test↔live)
 *  2. Modes de paiement : lister, créer, modifier, activer/désactiver par agrégateur
 *     - Type (mobile_money / carte / banque)
 *     - Sens (entree = payin / sortie = payout)
 *     - Pays, opérateur, devise, montants min/max, frais (taux + fixe), délai règlement, redirection
 *  3. Accords établissements : lister, octroyer/suspendre/révoquer l'accès d'un établissement
 *     à un mode de paiement précis (+ plafond d'avance optionnel)
 *  4. Paramètres plateforme (commission avance, seuil approbation remboursement)
 *  5. Interrupteurs de sécurité
 *
 * Sécurité : toutes les méthodes exigent ctx.role === 'super_admin' (vérification en BD par la RLS
 * + vérification applicative dans le guard SuperAdminGuard).
 */
import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AuditService } from '../audit/audit.service';
import { avecContexte, ContexteAcces } from '../database/contexte';

// ─── DTOs internes ───────────────────────────────────────────────────────────

export interface ModifierAgregateurDto {
  statut?: 'actif' | 'inactif' | 'suspendu';
  environnement?: 'test' | 'production';
}

export interface CreerModePaiementDto {
  agregateurCode: string;
  code: string;
  libelle: string;
  pays: string;        // ISO 2 lettres
  operateur: string;
  type: 'mobile_money' | 'carte' | 'banque';
  sens: 'entree' | 'sortie';
  devise: string;      // ISO 3 lettres
  montantMin: bigint;
  montantMax?: bigint | null;
  multiple?: bigint;
  fraisTaux: number;   // ex: 1.5
  fraisFixe?: bigint;
  delaiReglementHeures?: number;
  redirection?: boolean;
}

export interface ModifierModePaiementDto {
  libelle?: string;
  montantMin?: bigint;
  montantMax?: bigint | null;
  multiple?: bigint;
  fraisTaux?: number;
  fraisFixe?: bigint;
  delaiReglementHeures?: number;
  redirection?: boolean;
  statut?: 'actif' | 'inactif';
}

export interface AccorderAccesDto {
  etablissementUuid: string;
  modePaiementId: number;
  plafondAvance?: bigint | null;
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class SuperAdminService {
  constructor(
    private readonly ds: DataSource,
    private readonly audit: AuditService,
  ) {}

  private verifierSuperAdmin(ctx: ContexteAcces): void {
    if (ctx.role !== 'super_admin') {
      throw new ForbiddenException({ code: 'SUPER_ADMIN_REQUIS' });
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // AGRÉGATEURS
  // ══════════════════════════════════════════════════════════════════

  async listerAgregateurs(ctx: ContexteAcces) {
    this.verifierSuperAdmin(ctx);
    return avecContexte(this.ds, ctx, async (m) => {
      return m.query(
        `SELECT a.id, a.uuid, a.code, a.nom, a.statut, a.environnement,
                a.activation_par, a.activation_le, a.created_at, a.updated_at,
                COUNT(mp.id)::int AS nb_modes,
                COUNT(mp.id) FILTER (WHERE mp.statut = 'actif')::int AS nb_modes_actifs
           FROM "paiement"."agregateur" a
           LEFT JOIN "paiement"."mode_paiement" mp ON mp.agregateur_id = a.id
          GROUP BY a.id ORDER BY a.nom`,
      );
    });
  }

  async modifierAgregateur(
    agregUuid: string,
    dto: ModifierAgregateurDto,
    acteurUuid: string,
    ctx: ContexteAcces,
  ) {
    this.verifierSuperAdmin(ctx);
    return avecContexte(this.ds, ctx, async (m) => {
      const [ag] = await m.query(
        `SELECT id, code, nom, statut, environnement FROM "paiement"."agregateur" WHERE uuid = $1`,
        [agregUuid],
      );
      if (!ag) throw new NotFoundException({ code: 'AGREGATEUR_INTROUVABLE' });

      const champs: string[] = [];
      const params: unknown[] = [];
      const ajouter = (col: string, val: unknown) => {
        if (val !== undefined) { params.push(val); champs.push(`${col} = $${params.length}`); }
      };
      ajouter('statut', dto.statut);
      ajouter('environnement', dto.environnement);
      if (dto.statut === 'actif') {
        params.push(acteurUuid); champs.push(`activation_par = $${params.length}`);
        champs.push(`activation_le = now()`);
      }

      if (champs.length > 0) {
        params.push(ag.id);
        await m.query(
          `UPDATE "paiement"."agregateur" SET ${champs.join(', ')} WHERE id = $${params.length}`,
          params,
        );
      }

      await this.audit.enregistrer({
        acteurUuid, acteurRole: 'super_admin',
        action: 'agregateur.modifie', objetType: 'agregateur', objetUuid: agregUuid,
        avant: { statut: ag.statut, environnement: ag.environnement },
        apres: dto, resultat: 'succes',
      }, m);

      return { message: 'Agrégateur mis à jour.' };
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // MODES DE PAIEMENT
  // ══════════════════════════════════════════════════════════════════

  async listerModesPaiement(filtres: { agregateurCode?: string; sens?: string; type?: string }, ctx: ContexteAcces) {
    this.verifierSuperAdmin(ctx);
    return avecContexte(this.ds, ctx, async (m) => {
      const where: string[] = [];
      const params: unknown[] = [];
      if (filtres.agregateurCode) { params.push(filtres.agregateurCode); where.push(`a.code = $${params.length}`); }
      if (filtres.sens) { params.push(filtres.sens); where.push(`mp.sens = $${params.length}`); }
      if (filtres.type) { params.push(filtres.type); where.push(`mp.type = $${params.length}`); }

      const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
      return m.query(
        `SELECT mp.id, mp.uuid, mp.code, mp.libelle, mp.pays, mp.operateur, mp.type, mp.sens, mp.devise,
                mp.montant_min, mp.montant_max, mp.multiple, mp.frais_taux, mp.frais_fixe,
                mp.delai_reglement_heures, mp.redirection, mp.statut,
                mp.activation_par, mp.activation_le, mp.created_at,
                a.code AS agregateur_code, a.nom AS agregateur_nom, a.statut AS agregateur_statut,
                COUNT(ae.id)::int AS nb_accords,
                COUNT(ae.id) FILTER (WHERE ae.statut = 'accorde')::int AS nb_accords_actifs
           FROM "paiement"."mode_paiement" mp
           JOIN "paiement"."agregateur" a ON a.id = mp.agregateur_id
           LEFT JOIN "paiement"."accord_etablissement" ae ON ae.mode_paiement_id = mp.id
          ${clause}
          GROUP BY mp.id, a.code, a.nom, a.statut
          ORDER BY a.nom, mp.sens, mp.libelle`,
        params,
      );
    });
  }

  async creerModePaiement(dto: CreerModePaiementDto, acteurUuid: string, ctx: ContexteAcces): Promise<{ uuid: string }> {
    this.verifierSuperAdmin(ctx);
    return avecContexte(this.ds, ctx, async (m) => {
      const [ag] = await m.query(
        `SELECT id FROM "paiement"."agregateur" WHERE code = $1`, [dto.agregateurCode],
      );
      if (!ag) throw new NotFoundException({ code: 'AGREGATEUR_INTROUVABLE' });

      // Vérifier que la devise existe
      const [devise] = await m.query(
        `SELECT code FROM "paiement"."devise" WHERE code = $1`, [dto.devise],
      );
      if (!devise) throw new BadRequestException({ code: 'DEVISE_INCONNUE', message: `Devise ${dto.devise} non supportée.` });

      const uuid = uuidv4();
      await m.query(
        `INSERT INTO "paiement"."mode_paiement"
           (agregateur_id, code, libelle, pays, operateur, type, sens, devise,
            montant_min, montant_max, multiple, frais_taux, frais_fixe,
            delai_reglement_heures, redirection, statut)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'inactif')`,
        [
          ag.id, dto.code, dto.libelle, dto.pays.toUpperCase(), dto.operateur,
          dto.type, dto.sens, dto.devise.toUpperCase(),
          dto.montantMin.toString(),
          dto.montantMax?.toString() ?? null,
          (dto.multiple ?? 1n).toString(),
          dto.fraisTaux.toFixed(4),
          (dto.fraisFixe ?? 0n).toString(),
          dto.delaiReglementHeures ?? 0,
          dto.redirection ?? false,
        ],
      );

      await this.audit.enregistrer({
        acteurUuid, acteurRole: 'super_admin',
        action: 'mode_paiement.cree', objetType: 'mode_paiement', objetUuid: uuid,
        apres: { ...dto, montantMin: dto.montantMin.toString() }, resultat: 'succes',
      }, m);

      // Récupérer l'UUID généré par la BD
      const [row] = await m.query(
        `SELECT uuid FROM "paiement"."mode_paiement" WHERE agregateur_id = $1 AND code = $2 AND sens = $3 AND pays = $4 AND devise = $5`,
        [ag.id, dto.code, dto.sens, dto.pays.toUpperCase(), dto.devise.toUpperCase()],
      );
      return { uuid: row?.uuid ?? uuid };
    });
  }

  async modifierModePaiement(
    modeUuid: string,
    dto: ModifierModePaiementDto,
    acteurUuid: string,
    ctx: ContexteAcces,
  ) {
    this.verifierSuperAdmin(ctx);
    return avecContexte(this.ds, ctx, async (m) => {
      const [mode] = await m.query(
        `SELECT id, uuid, statut, libelle FROM "paiement"."mode_paiement" WHERE uuid = $1`, [modeUuid],
      );
      if (!mode) throw new NotFoundException({ code: 'MODE_PAIEMENT_INTROUVABLE' });

      const champs: string[] = [];
      const params: unknown[] = [];
      const ajouter = (col: string, val: unknown) => {
        if (val !== undefined) { params.push(val); champs.push(`${col} = $${params.length}`); }
      };
      ajouter('libelle', dto.libelle);
      ajouter('montant_min', dto.montantMin?.toString());
      ajouter('montant_max', dto.montantMax?.toString() ?? null);
      ajouter('multiple', dto.multiple?.toString());
      ajouter('frais_taux', dto.fraisTaux?.toFixed(4));
      ajouter('frais_fixe', dto.fraisFixe?.toString());
      ajouter('delai_reglement_heures', dto.delaiReglementHeures);
      ajouter('redirection', dto.redirection);
      ajouter('statut', dto.statut);
      if (dto.statut === 'actif') {
        params.push(acteurUuid); champs.push(`activation_par = $${params.length}`);
        champs.push(`activation_le = now()`);
      }

      if (champs.length > 0) {
        params.push(mode.id);
        await m.query(
          `UPDATE "paiement"."mode_paiement" SET ${champs.join(', ')} WHERE id = $${params.length}`,
          params,
        );
      }

      await this.audit.enregistrer({
        acteurUuid, acteurRole: 'super_admin',
        action: 'mode_paiement.modifie', objetType: 'mode_paiement', objetUuid: modeUuid,
        avant: { statut: mode.statut }, apres: dto, resultat: 'succes',
      }, m);

      return { message: 'Mode de paiement mis à jour.' };
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // ACCORDS ÉTABLISSEMENTS
  // ══════════════════════════════════════════════════════════════════

  async listerAccords(filtres: { etablissementUuid?: string; agregateurCode?: string; statut?: string }, ctx: ContexteAcces) {
    this.verifierSuperAdmin(ctx);
    return avecContexte(this.ds, ctx, async (m) => {
      const where: string[] = [];
      const params: unknown[] = [];
      if (filtres.etablissementUuid) { params.push(filtres.etablissementUuid); where.push(`ae.etablissement_uuid = $${params.length}`); }
      if (filtres.agregateurCode) { params.push(filtres.agregateurCode); where.push(`a.code = $${params.length}`); }
      if (filtres.statut) { params.push(filtres.statut); where.push(`ae.statut = $${params.length}`); }

      const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
      return m.query(
        `SELECT ae.uuid, ae.etablissement_uuid, ae.statut, ae.plafond_avance,
                ae.demande_par, ae.demande_le, ae.decide_par, ae.decide_le, ae.motif, ae.created_at,
                mp.id AS mode_id, mp.uuid AS mode_uuid, mp.code AS mode_code,
                mp.libelle AS mode_libelle, mp.pays, mp.operateur, mp.type, mp.sens, mp.devise,
                mp.montant_min, mp.montant_max, mp.frais_taux, mp.frais_fixe,
                a.code AS agregateur_code, a.nom AS agregateur_nom
           FROM "paiement"."accord_etablissement" ae
           JOIN "paiement"."mode_paiement" mp ON mp.id = ae.mode_paiement_id
           JOIN "paiement"."agregateur" a ON a.id = mp.agregateur_id
          ${clause}
          ORDER BY ae.created_at DESC`,
        params,
      );
    });
  }

  async accorderAcces(dto: AccorderAccesDto, acteurUuid: string, ctx: ContexteAcces): Promise<{ uuid: string }> {
    this.verifierSuperAdmin(ctx);
    return avecContexte(this.ds, ctx, async (m) => {
      // Vérifier que le mode de paiement est actif
      const [mode] = await m.query(
        `SELECT id, uuid, libelle, statut, devise FROM "paiement"."mode_paiement" WHERE id = $1`,
        [dto.modePaiementId],
      );
      if (!mode) throw new NotFoundException({ code: 'MODE_PAIEMENT_INTROUVABLE' });
      if (mode.statut !== 'actif') {
        throw new BadRequestException({ code: 'MODE_INACTIF', message: 'Ce mode de paiement est inactif.' });
      }

      const uuid = uuidv4();
      await m.query(
        `INSERT INTO "paiement"."accord_etablissement"
           (uuid, etablissement_uuid, mode_paiement_id, statut, plafond_avance, decide_par, decide_le)
         VALUES ($1,$2,$3,'accorde',$4,$5,now())
         ON CONFLICT (etablissement_uuid, mode_paiement_id)
         DO UPDATE SET statut = 'accorde', plafond_avance = EXCLUDED.plafond_avance,
           decide_par = EXCLUDED.decide_par, decide_le = now()`,
        [
          uuid, dto.etablissementUuid, dto.modePaiementId,
          dto.plafondAvance?.toString() ?? null,
          acteurUuid,
        ],
      );

      // Créer le portefeuille si inexistant
      await m.query(
        `INSERT INTO "paiement"."portefeuille" (etablissement_uuid, devise)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [dto.etablissementUuid, mode.devise],
      );

      await this.audit.enregistrer({
        acteurUuid, acteurRole: 'super_admin',
        action: 'accord.octroye', objetType: 'accord_etablissement',
        apres: { etablissementUuid: dto.etablissementUuid, modeLibelle: mode.libelle },
        resultat: 'succes',
      }, m);

      // Récupérer l'UUID réel (en cas de ON CONFLICT)
      const [row] = await m.query(
        `SELECT uuid FROM "paiement"."accord_etablissement"
          WHERE etablissement_uuid = $1 AND mode_paiement_id = $2`,
        [dto.etablissementUuid, dto.modePaiementId],
      );
      return { uuid: row?.uuid ?? uuid };
    });
  }

  async modifierStatutAccord(
    accordUuid: string,
    statut: 'accorde' | 'suspendu' | 'revoque' | 'refuse',
    motif: string | undefined,
    acteurUuid: string,
    ctx: ContexteAcces,
  ) {
    this.verifierSuperAdmin(ctx);
    return avecContexte(this.ds, ctx, async (m) => {
      const [accord] = await m.query(
        `SELECT id, statut, etablissement_uuid FROM "paiement"."accord_etablissement" WHERE uuid = $1`,
        [accordUuid],
      );
      if (!accord) throw new NotFoundException({ code: 'ACCORD_INTROUVABLE' });

      await m.query(
        `UPDATE "paiement"."accord_etablissement"
            SET statut = $1, motif = $2, decide_par = $3, decide_le = now()
          WHERE id = $4`,
        [statut, motif ?? null, acteurUuid, accord.id],
      );

      await this.audit.enregistrer({
        etablissementUuid: accord.etablissement_uuid,
        acteurUuid, acteurRole: 'super_admin',
        action: `accord.${statut}`, objetType: 'accord_etablissement', objetUuid: accordUuid,
        avant: { statut: accord.statut }, apres: { statut, motif }, resultat: 'succes',
      }, m);

      return { message: `Accord ${statut}.` };
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // DEVISES
  // ══════════════════════════════════════════════════════════════════

  async listerDevises(ctx: ContexteAcces) {
    this.verifierSuperAdmin(ctx);
    return avecContexte(this.ds, ctx, async (m) => {
      return m.query(`SELECT code, nom, exposant, active FROM "paiement"."devise" ORDER BY code`);
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // JOURNAL D'AUDIT PLATEFORME
  // ══════════════════════════════════════════════════════════════════

  async journalAudit(
    filtres: {
      etablissementUuid?: string;
      action?: string;
      resultat?: string;
      du?: string;
      au?: string;
      page?: number;
      limite?: number;
    },
    ctx: ContexteAcces,
  ) {
    this.verifierSuperAdmin(ctx);
    return avecContexte(this.ds, ctx, async (m) => {
      const where: string[] = [];
      const params: unknown[] = [];
      const ajouter = (sql: string, val: unknown) => {
        params.push(val); where.push(sql.replace('?', `$${params.length}`));
      };
      if (filtres.etablissementUuid) ajouter('etablissement_uuid = ?', filtres.etablissementUuid);
      if (filtres.action) ajouter(`action LIKE ? ESCAPE '\\'`, `${filtres.action}%`);
      if (filtres.resultat) ajouter('resultat = ?', filtres.resultat);
      if (filtres.du) ajouter('created_at >= ?', new Date(filtres.du));
      if (filtres.au) ajouter('created_at <= ?', new Date(filtres.au));

      const page = Math.max(1, filtres.page ?? 1);
      const limite = Math.min(100, Math.max(1, filtres.limite ?? 20));
      const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const rows = await m.query(
        `SELECT uuid, rang::text, etablissement_uuid, acteur_uuid, acteur_role, action,
                objet_type, objet_uuid, resultat, motif, correlation_id, created_at,
                hash, host(ip) AS ip, user_agent
           FROM "paiement"."audit_evenement"
          ${clause}
          ORDER BY created_at DESC, id DESC
          LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limite, (page - 1) * limite],
      );
      const [{ total }] = await m.query(
        `SELECT COUNT(*)::int AS total FROM "paiement"."audit_evenement" ${clause}`, params,
      );
      return { evenements: rows, pagination: { page, limite, total, pages: Math.ceil(total / limite) } };
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // RÉCONCILIATION & STATISTIQUES
  // ══════════════════════════════════════════════════════════════════

  async statistiquesGlobales(ctx: ContexteAcces) {
    this.verifierSuperAdmin(ctx);
    return avecContexte(this.ds, ctx, async (m) => {
      const [encaissements] = await m.query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE statut = 'disponible')::int AS disponibles,
                COUNT(*) FILTER (WHERE statut = 'approuve')::int AS en_attente_reglement,
                COUNT(*) FILTER (WHERE created_at >= now() - interval '24 hours')::int AS derniere_24h
           FROM "paiement"."encaissement"`,
      );
      const [decaissements] = await m.query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE statut = 'envoye')::int AS envoyes,
                COUNT(*) FILTER (WHERE statut IN ('soumis','en_cours','incertain'))::int AS en_cours,
                COUNT(*) FILTER (WHERE statut = 'echoue')::int AS echoues
           FROM "paiement"."decaissement"`,
      );
      const agregateurRows = await m.query(
        `SELECT a.code, a.nom, a.statut,
                COUNT(e.id)::int AS nb_encaissements
           FROM "paiement"."agregateur" a
           LEFT JOIN "paiement"."encaissement" e ON e.agregateur_id = a.id
          GROUP BY a.id ORDER BY a.nom`,
      );
      return { encaissements, decaissements, agregateurs: agregateurRows };
    });
  }

  async interrupteursActifs(ctx: ContexteAcces) {
    this.verifierSuperAdmin(ctx);
    return avecContexte(this.ds, ctx, async (m) => {
      return m.query(
        `SELECT uuid, portee, cible_uuid, motif, active_par, active_le
           FROM "paiement"."interrupteur_securite"
          WHERE actif = true ORDER BY active_le DESC`,
      );
    });
  }
}
