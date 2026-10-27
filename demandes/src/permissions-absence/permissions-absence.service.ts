import { Injectable } from '@nestjs/common';
import { Base, page, pagination } from '../common/base/base.service';
import { UtilisateurCourant } from '../common/contexte/utilisateur-courant';
import { ErreurMetier } from '../common/erreurs/erreurs';
import { RabbitMqPublisher } from '../common/evenements/rabbitmq.publisher';
import { EligibiliteService } from '../demandes/eligibilite.service';
import { GouvernanceService } from '../gouvernance/gouvernance.service';
import { DeciderPermissionDto, FiltresPermissionsDto, SoumettrePermissionDto } from './dto/permissions.dto';

const COLONNES = `uuid, apprenant_uuid, demandeur_uuid, date_debut::text AS date_debut, date_fin::text AS date_fin, motif, statut,
  motif_decision, decide_le, created_at AS cree_le`;

/** Jours de retard admis pour declarer une absence deja commencee (maladie soudaine). */
const RETARD_MAX_JOURS = 3;

/**
 * Permissions d'absence (CDC §6) : demande d'un parent (ou de l'apprenant), decision d'un role habilite
 * (permission valider_permission_absence). Validee => "permissionnaire" pour Vie scolaire.
 */
@Injectable()
export class PermissionsAbsenceService {
  constructor(
    private readonly base: Base,
    private readonly eligibilite: EligibiliteService,
    private readonly gouvernance: GouvernanceService,
    private readonly evenements: RabbitMqPublisher,
  ) {}

  async soumettre(u: UtilisateurCourant, dto: SoumettrePermissionDto) {
    if (dto.date_fin < dto.date_debut) throw ErreurMetier.invalide('date_fin', 'La date de fin précède la date de début.');
    const limite = new Date(Date.now() - RETARD_MAX_JOURS * 86_400_000).toISOString().slice(0, 10);
    if (dto.date_debut < limite) {
      throw ErreurMetier.invalide('date_debut', `Une absence ne peut être déclarée que ${RETARD_MAX_JOURS} jours après son début au plus.`);
    }
    const duree = (Date.parse(dto.date_fin) - Date.parse(dto.date_debut)) / 86_400_000;
    if (duree > 90) throw ErreurMetier.invalide('date_fin', 'Une permission couvre 90 jours au plus.');

    await this.eligibilite.apprenantDuDemandeur(u, dto.apprenant_uuid);

    const chevauchement = await this.base.ligne(
      `SELECT date_debut::text AS debut, date_fin::text AS fin FROM demandes.permissions_absence
        WHERE tenant_id = $1 AND apprenant_uuid = $2 AND statut IN ('en_attente','validee')
          AND date_debut <= $4::date AND date_fin >= $3::date LIMIT 1`,
      [u.tenantId, dto.apprenant_uuid, dto.date_debut, dto.date_fin],
    );
    if (chevauchement) {
      throw ErreurMetier.conflit(
        'PERIODE_DEJA_COUVERTE',
        `Une permission couvre déjà tout ou partie de cette période (du ${chevauchement.debut} au ${chevauchement.fin}).`,
      );
    }

    const p = await this.base.ligne(
      `INSERT INTO demandes.permissions_absence (tenant_id, apprenant_uuid, demandeur_uuid, demandeur_role, date_debut, date_fin, motif)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${COLONNES}`,
      [u.tenantId, dto.apprenant_uuid, u.uuid, u.roleCode, dto.date_debut, dto.date_fin, dto.motif],
    );
    await this.evenements.publier('demandes.permission.soumise', {
      tenant_id: u.tenantId,
      permission_uuid: p.uuid,
      apprenant_uuid: p.apprenant_uuid,
    });
    return p;
  }

  async decider(u: UtilisateurCourant, uuid: string, dto: DeciderPermissionDto) {
    await this.gouvernance.exiger(u, 'valider_permission_absence');
    const p = await this.base.transaction(async (ex) => {
      const actuelle = await this.base.ligne(
        `SELECT id, statut FROM demandes.permissions_absence WHERE tenant_id = $1 AND uuid = $2 FOR UPDATE`,
        [u.tenantId, uuid],
        ex,
      );
      if (!actuelle) throw ErreurMetier.introuvable("Permission d'absence introuvable.");
      if (actuelle.statut !== 'en_attente') throw ErreurMetier.conflit('DEJA_DECIDEE', 'Cette demande a déjà été traitée.');
      const r = await this.base.ligne(
        `UPDATE demandes.permissions_absence SET statut = $2, motif_decision = $3, decision_par_uuid = $4, decide_le = now(), updated_at = now()
          WHERE id = $1 RETURNING ${COLONNES}`,
        [actuelle.id, dto.decision, dto.motif ?? null, u.uuid],
        ex,
      );
      await this.base.journaliser(ex, u, `permission_absence.${dto.decision}`, 'permission_absence', uuid, { motif: dto.motif ?? null });
      return r;
    });
    await this.evenements.publier('demandes.permission.decision', {
      tenant_id: u.tenantId,
      permission_uuid: p.uuid,
      apprenant_uuid: p.apprenant_uuid,
      destinataire_uuid: p.demandeur_uuid,
      decision: p.statut,
      motif: p.motif_decision,
      date_debut: p.date_debut,
      date_fin: p.date_fin,
    });
    return p;
  }

  /** Le demandeur annule une demande en attente, ou une permission validee qui n'a pas encore commence. */
  async annuler(u: UtilisateurCourant, uuid: string) {
    const aujourdhui = new Date().toISOString().slice(0, 10);
    const p = await this.base.ligne(
      `UPDATE demandes.permissions_absence SET statut = 'annulee', updated_at = now()
        WHERE tenant_id = $1 AND uuid = $2 AND demandeur_uuid = $3
          AND (statut = 'en_attente' OR (statut = 'validee' AND date_debut > $4::date))
        RETURNING ${COLONNES}`,
      [u.tenantId, uuid, u.uuid, aujourdhui],
    );
    if (!p)
      throw ErreurMetier.conflit(
        'ANNULATION_IMPOSSIBLE',
        "Cette permission ne peut plus être annulée (déjà décidée et commencée, ou ce n'est pas la vôtre).",
      );
    return p;
  }

  async consulter(u: UtilisateurCourant, uuid: string) {
    const p = await this.base.ligne(`SELECT ${COLONNES} FROM demandes.permissions_absence WHERE tenant_id = $1 AND uuid = $2`, [
      u.tenantId,
      uuid,
    ]);
    if (!p || (p.demandeur_uuid !== u.uuid && !(await this.gouvernance.peut(u, 'valider_permission_absence')))) {
      throw ErreurMetier.introuvable("Permission d'absence introuvable.");
    }
    return p;
  }

  async lister(u: UtilisateurCourant, f: FiltresPermissionsDto, siennes: boolean) {
    if (!siennes) await this.gouvernance.exiger(u, 'valider_permission_absence');
    const p = pagination(f.page, f.par_page);
    const params: unknown[] = [u.tenantId];
    const conditions = ['tenant_id = $1'];
    if (siennes) {
      params.push(u.uuid);
      conditions.push(`demandeur_uuid = $${params.length}`);
    }
    if (f.statut) {
      params.push(f.statut);
      conditions.push(`statut = $${params.length}`);
    }
    if (f.apprenant_uuid) {
      params.push(f.apprenant_uuid);
      conditions.push(`apprenant_uuid = $${params.length}`);
    }
    const where = conditions.join(' AND ');
    const total = await this.base.ligne(`SELECT count(*) AS n FROM demandes.permissions_absence WHERE ${where}`, params);
    const ordre = siennes ? 'created_at DESC' : "CASE WHEN statut = 'en_attente' THEN 0 ELSE 1 END, date_debut ASC";
    const lignes = await this.base.lignes(
      `SELECT ${COLONNES} FROM demandes.permissions_absence WHERE ${where} ORDER BY ${ordre}, id LIMIT ${p.parPage} OFFSET ${p.offset}`,
      params,
    );
    return page(lignes, Number(total?.n ?? 0), p);
  }

  /** Vie scolaire (interne) : l'apprenant est-il permissionnaire a cette date ? */
  async active(tenantId: number, apprenantUuid: string, date: string) {
    const p = await this.base.ligne(
      `SELECT uuid, date_debut::text AS date_debut, date_fin::text AS date_fin FROM demandes.permissions_absence
        WHERE tenant_id = $1 AND apprenant_uuid = $2 AND statut = 'validee' AND date_debut <= $3::date AND date_fin >= $3::date
        ORDER BY date_debut DESC LIMIT 1`,
      [tenantId, apprenantUuid, date],
    );
    return {
      apprenant_uuid: apprenantUuid,
      date,
      permissionnaire: !!p,
      permission: p ? { uuid: p.uuid, date_debut: p.date_debut, date_fin: p.date_fin } : null,
    };
  }
}
