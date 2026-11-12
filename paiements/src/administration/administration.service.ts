/**
 * Service Administration
 * Gère :
 *  - Paramètres de l'établissement (règlement, frais, source des fonds)
 *  - Délégations du personnel (préparateurs/approbateurs, max 3)
 *  - Accords agrégateurs (activation des modes de paiement pour un établissement)
 *  - Portefeuilles (soldes, historique)
 *  - Paramètres de la plateforme (super admin uniquement)
 *  - Interrupteurs de sécurité
 */
import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AuditService } from '../audit/audit.service';
import { avecContexte, ContexteAcces } from '../database/contexte';

@Injectable()
export class AdministrationService {
  constructor(
    private readonly ds: DataSource,
    private readonly audit: AuditService,
  ) {}

  // ─── Paramètres établissement ───

  async obtenirParametres(etablissementUuid: string, devise: string, ctx: ContexteAcces) {
    return avecContexte(this.ds, ctx, async (m) => {
      const [row] = await m.query(
        `SELECT * FROM "paiement"."parametre_etablissement" WHERE etablissement_uuid = $1 AND devise = $2`,
        [etablissementUuid, devise],
      );
      if (!row) throw new NotFoundException({ code: 'PARAMETRES_ABSENTS' });
      return row;
    });
  }

  async upsertParametres(
    etablissementUuid: string,
    devise: string,
    updates: {
      reglementMode?: string;
      reglementJourSemaine?: number;
      reglementHeure?: number;
      reglementMontantMin?: bigint;
      fraisEntreeACharge?: string;
      fraisSortieACharge?: string;
      sourceFondsSortie?: string;
      encaissementActif?: boolean;
      decaissementActif?: boolean;
    },
    acteurUuid: string,
    ctx: ContexteAcces,
  ) {
    return avecContexte(this.ds, ctx, async (m) => {
      const [existant] = await m.query(
        `SELECT etablissement_uuid FROM "paiement"."parametre_etablissement"
          WHERE etablissement_uuid = $1 AND devise = $2`,
        [etablissementUuid, devise],
      );

      if (!existant) {
        await m.query(
          `INSERT INTO "paiement"."parametre_etablissement"
             (etablissement_uuid, devise, reglement_mode, reglement_jour_semaine, reglement_heure,
              reglement_montant_min, frais_entree_a_charge, frais_sortie_a_charge, source_fonds_sortie,
              encaissement_actif, decaissement_actif, modifie_par)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            etablissementUuid, devise,
            updates.reglementMode ?? 'manuel',
            updates.reglementJourSemaine ?? null,
            updates.reglementHeure ?? null,
            (updates.reglementMontantMin ?? 0n).toString(),
            updates.fraisEntreeACharge ?? 'etablissement',
            updates.fraisSortieACharge ?? 'etablissement',
            updates.sourceFondsSortie ?? 'fonds_disponibles',
            updates.encaissementActif ?? false,
            updates.decaissementActif ?? false,
            acteurUuid,
          ],
        );
      } else {
        const champs: string[] = [];
        const params: unknown[] = [];
        const ajouter = (col: string, val: unknown) => {
          if (val !== undefined) { params.push(val); champs.push(`${col} = $${params.length}`); }
        };
        ajouter('reglement_mode', updates.reglementMode);
        ajouter('reglement_jour_semaine', updates.reglementJourSemaine);
        ajouter('reglement_heure', updates.reglementHeure);
        ajouter('reglement_montant_min', updates.reglementMontantMin?.toString());
        ajouter('frais_entree_a_charge', updates.fraisEntreeACharge);
        ajouter('frais_sortie_a_charge', updates.fraisSortieACharge);
        ajouter('source_fonds_sortie', updates.sourceFondsSortie);
        ajouter('encaissement_actif', updates.encaissementActif);
        ajouter('decaissement_actif', updates.decaissementActif);
        ajouter('modifie_par', acteurUuid);

        if (champs.length > 0) {
          params.push(etablissementUuid, devise);
          await m.query(
            `UPDATE "paiement"."parametre_etablissement" SET ${champs.join(', ')}
              WHERE etablissement_uuid = $${params.length - 1} AND devise = $${params.length}`,
            params,
          );
        }
      }

      await this.audit.enregistrer({
        etablissementUuid, acteurUuid, acteurRole: 'administrateur',
        action: 'parametres.mis_a_jour', objetType: 'parametre_etablissement',
        apres: updates, resultat: 'succes',
      }, m);
    });
  }

  // ─── Délégations personnel ───

  async listerDelegations(etablissementUuid: string, ctx: ContexteAcces) {
    return avecContexte(this.ds, ctx, async (m) => {
      return m.query(
        `SELECT uuid, utilisateur_uuid, peut_preparer, peut_approuver, actif, accorde_par, created_at
           FROM "paiement"."delegation_personnel"
          WHERE etablissement_uuid = $1 ORDER BY created_at DESC`,
        [etablissementUuid],
      );
    });
  }

  async creerDelegation(
    etablissementUuid: string,
    utilisateurUuid: string,
    peutPreparer: boolean,
    peutApprouver: boolean,
    accordePar: string,
    ctx: ContexteAcces,
  ): Promise<{ uuid: string }> {
    return avecContexte(this.ds, ctx, async (m) => {
      if (!peutPreparer && !peutApprouver) {
        throw new BadRequestException({ code: 'DELEGATION_VIDE', message: 'Au moins une permission doit être accordée.' });
      }

      // Vérifier unicité (délégué déjà présent -> mise à jour)
      const [existant] = await m.query(
        `SELECT id, uuid FROM "paiement"."delegation_personnel"
          WHERE etablissement_uuid = $1 AND utilisateur_uuid = $2`,
        [etablissementUuid, utilisateurUuid],
      );

      if (existant) {
        await m.query(
          `UPDATE "paiement"."delegation_personnel"
              SET peut_preparer = $1, peut_approuver = $2, actif = true, accorde_par = $3
            WHERE id = $4`,
          [peutPreparer, peutApprouver, accordePar, existant.id],
        );
        await this.audit.enregistrer({
          etablissementUuid, acteurUuid: accordePar, acteurRole: 'administrateur',
          action: 'delegation.modifiee', objetType: 'delegation_personnel', objetUuid: existant.uuid,
          apres: { peutPreparer, peutApprouver }, resultat: 'succes',
        }, m);
        return { uuid: existant.uuid };
      }

      const uuid = uuidv4();
      await m.query(
        `INSERT INTO "paiement"."delegation_personnel"
           (uuid, etablissement_uuid, utilisateur_uuid, peut_preparer, peut_approuver, actif, accorde_par)
         VALUES ($1,$2,$3,$4,$5,true,$6)`,
        [uuid, etablissementUuid, utilisateurUuid, peutPreparer, peutApprouver, accordePar],
      );
      await this.audit.enregistrer({
        etablissementUuid, acteurUuid: accordePar, acteurRole: 'administrateur',
        action: 'delegation.creee', objetType: 'delegation_personnel', objetUuid: uuid,
        apres: { utilisateurUuid, peutPreparer, peutApprouver }, resultat: 'succes',
      }, m);
      return { uuid };
    });
  }

  async revoquerDelegation(delegationUuid: string, etablissementUuid: string, acteurUuid: string, ctx: ContexteAcces): Promise<void> {
    await avecContexte(this.ds, ctx, async (m) => {
      const [del] = await m.query(
        `SELECT id FROM "paiement"."delegation_personnel"
          WHERE uuid = $1 AND etablissement_uuid = $2`,
        [delegationUuid, etablissementUuid],
      );
      if (!del) throw new NotFoundException({ code: 'DELEGATION_INTROUVABLE' });
      await m.query(
        `UPDATE "paiement"."delegation_personnel" SET actif = false WHERE id = $1`, [del.id],
      );
      await this.audit.enregistrer({
        etablissementUuid, acteurUuid, acteurRole: 'administrateur',
        action: 'delegation.revoquee', objetType: 'delegation_personnel', objetUuid: delegationUuid,
        resultat: 'succes',
      }, m);
    });
  }

  // ─── Portefeuilles ───

  async listerPortefeuilles(etablissementUuid: string, ctx: ContexteAcces) {
    return avecContexte(this.ds, ctx, async (m) => {
      const portefeuilles = await m.query(
        `SELECT p.uuid, p.devise, p.statut, p.created_at,
                COALESCE((SELECT c.solde FROM "paiement"."compte" c
                           WHERE c.type = 'disponible' AND c.devise = p.devise AND c.portefeuille_id = p.id), 0) AS solde_disponible,
                COALESCE((SELECT c.solde FROM "paiement"."compte" c
                           WHERE c.type = 'attente' AND c.devise = p.devise AND c.portefeuille_id = p.id), 0) AS solde_attente,
                COALESCE((SELECT c.solde FROM "paiement"."compte" c
                           WHERE c.type = 'reserve' AND c.devise = p.devise AND c.portefeuille_id = p.id), 0) AS solde_reserve
           FROM "paiement"."portefeuille" p
          WHERE p.etablissement_uuid = $1`,
        [etablissementUuid],
      );
      return portefeuilles;
    });
  }

  async historiqueSoldes(
    etablissementUuid: string, devise: string,
    du: Date, au: Date, ctx: ContexteAcces,
  ) {
    return avecContexte(this.ds, ctx, async (m) => {
      return m.query(
        `SELECT eg.created_at, eg.type_operation, eg.description,
                e.sens, e.montant, c.type AS compte_type
           FROM "paiement"."ecriture" e
           JOIN "paiement"."ecriture_groupe" eg ON eg.id = e.groupe_id
           JOIN "paiement"."compte" c ON c.id = e.compte_id
           JOIN "paiement"."portefeuille" pw ON pw.id = c.portefeuille_id
          WHERE pw.etablissement_uuid = $1 AND eg.devise = $2
            AND eg.created_at BETWEEN $3 AND $4
          ORDER BY eg.created_at DESC LIMIT 500`,
        [etablissementUuid, devise, du, au],
      );
    });
  }

  // ─── Paramètres plateforme (super admin) ───

  async obtenirParametresPlateforme(ctx: ContexteAcces) {
    return avecContexte(this.ds, ctx, async (m) => {
      return m.query(`SELECT * FROM "paiement"."parametre_plateforme" ORDER BY devise`);
    });
  }

  async mettreAJourParametresPlateforme(
    devise: string,
    updates: { commissionAvanceTaux?: number; commissionAvanceMin?: bigint; seuilApprobationRemboursement?: bigint | null },
    acteurUuid: string,
    ctx: ContexteAcces,
  ) {
    if (ctx.role !== 'super_admin') throw new ForbiddenException({ code: 'SUPER_ADMIN_REQUIS' });
    return avecContexte(this.ds, ctx, async (m) => {
      const champs: string[] = [];
      const params: unknown[] = [];
      const ajouter = (col: string, val: unknown) => {
        if (val !== undefined) { params.push(val); champs.push(`${col} = $${params.length}`); }
      };
      ajouter('commission_avance_taux', updates.commissionAvanceTaux);
      ajouter('commission_avance_min', updates.commissionAvanceMin?.toString());
      ajouter('seuil_approbation_remboursement', updates.seuilApprobationRemboursement?.toString() ?? null);

      if (champs.length > 0) {
        params.push(devise);
        await m.query(
          `UPDATE "paiement"."parametre_plateforme" SET ${champs.join(', ')} WHERE devise = $${params.length}`,
          params,
        );
      }
      await this.audit.enregistrer({
        acteurUuid, acteurRole: 'super_admin',
        action: 'parametre_plateforme.mis_a_jour',
        apres: { devise, ...updates }, resultat: 'succes',
      }, m);
    });
  }

  // ─── Interrupteurs de sécurité ───

  async activerInterrupteur(portee: string, cibleUuid: string | null, motif: string, acteurUuid: string, ctx: ContexteAcces) {
    if (ctx.role !== 'super_admin') throw new ForbiddenException({ code: 'SUPER_ADMIN_REQUIS' });
    return avecContexte(this.ds, ctx, async (m) => {
      const uuid = uuidv4();
      await m.query(
        `INSERT INTO "paiement"."interrupteur_securite" (uuid, portee, cible_uuid, motif, active_par)
         VALUES ($1,$2,$3,$4,$5)`,
        [uuid, portee, cibleUuid, motif, acteurUuid],
      );
      await this.audit.enregistrer({
        acteurUuid, acteurRole: 'super_admin',
        action: 'interrupteur.active',
        apres: { portee, cibleUuid, motif }, resultat: 'succes',
      }, m);
      return { uuid };
    });
  }

  async desactiverInterrupteur(interrupteurUuid: string, acteurUuid: string, ctx: ContexteAcces) {
    if (ctx.role !== 'super_admin') throw new ForbiddenException({ code: 'SUPER_ADMIN_REQUIS' });
    return avecContexte(this.ds, ctx, async (m) => {
      await m.query(
        `UPDATE "paiement"."interrupteur_securite" SET actif = false, desactive_par = $1, desactive_le = now()
          WHERE uuid = $2`,
        [acteurUuid, interrupteurUuid],
      );
      await this.audit.enregistrer({
        acteurUuid, acteurRole: 'super_admin',
        action: 'interrupteur.desactive', objetUuid: interrupteurUuid, resultat: 'succes',
      }, m);
    });
  }
}
