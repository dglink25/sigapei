import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Base, page, pagination } from '../common/base/base.service';
import { UtilisateurCourant } from '../common/contexte/utilisateur-courant';
import { ErreurMetier } from '../common/erreurs/erreurs';
import { RabbitMqPublisher } from '../common/evenements/rabbitmq.publisher';
import { EligibiliteService } from '../demandes/eligibilite.service';
import { GouvernanceService } from '../gouvernance/gouvernance.service';
import { FiltresReclamationsDto, OuvrirReclamationDto, OuvrirVersUsagerDto } from './dto/reclamations.dto';

const COLONNES = `r.id, r.uuid, r.reference, r.demandeur_uuid, r.demandeur_role, r.beneficiaire_apprenant_uuid, r.categorie, r.objet,
  r.statut, r.initiee_par, r.dernier_message_le, r.lu_usager_le, r.lu_etablissement_le, r.created_at`;

type Cote = 'usager' | 'etablissement';

/**
 * Reclamations bidirectionnelles (CDC §10) :
 *  - cote usager : celui qui a ouvert (ou a qui l'etablissement ecrit) ;
 *  - cote etablissement : les roles ayant repondre_reclamation, eventuellement limites a certaines categories.
 * Fil en ajout seul, accuses de lecture, statut ouverte -> en_cours -> resolue -> cloturee.
 * Un message de l'usager sur une reclamation resolue la rouvre ; une reclamation cloturee est figee.
 */
@Injectable()
export class ReclamationsService {
  constructor(
    private readonly base: Base,
    private readonly eligibilite: EligibiliteService,
    private readonly gouvernance: GouvernanceService,
    private readonly evenements: RabbitMqPublisher,
  ) {}

  async ouvrir(u: UtilisateurCourant, dto: OuvrirReclamationDto) {
    if (dto.beneficiaire_apprenant_uuid) await this.eligibilite.apprenantDuDemandeur(u, dto.beneficiaire_apprenant_uuid);
    const uuid = await this.creer(u, dto, {
      demandeur: u.uuid,
      role: u.roleCode,
      initiee: 'usager',
      cote: 'usager',
    });
    return this.consulter(u, uuid);
  }

  /** L'etablissement ouvre un echange vers un usager (convocation, signalement) - permission repondre_reclamation. */
  async ouvrirVersUsager(u: UtilisateurCourant, dto: OuvrirVersUsagerDto) {
    await this.exigerCategorie(u, dto.categorie);
    if (dto.destinataire_uuid === u.uuid)
      throw ErreurMetier.invalide('destinataire_uuid', 'Choisissez un autre destinataire que vous-même.');
    const uuid = await this.creer(u, dto, {
      demandeur: dto.destinataire_uuid,
      role: null,
      initiee: 'etablissement',
      cote: 'etablissement',
    });
    return this.consulter(u, uuid);
  }

  async consulter(u: UtilisateurCourant, uuid: string) {
    const r = await this.charger(u.tenantId, uuid);
    const cote = await this.cote(u, r);
    const lu = cote === 'usager' ? 'lu_usager_le' : 'lu_etablissement_le';
    await this.base.lignes(`UPDATE demandes.reclamations SET ${lu} = now() WHERE id = $1`, [r.id]);
    r[lu] = new Date();
    const messages = await this.base.lignes(
      `SELECT uuid, auteur_uuid, cote, contenu, cree_le FROM demandes.message_reclamation WHERE reclamation_id = $1 ORDER BY id`,
      [r.id],
    );
    return {
      ...this.presenter(r, cote),
      messages: messages.map((m) => ({
        ...m,
        est_moi: m.auteur_uuid === u.uuid,
      })),
    };
  }

  async repondre(u: UtilisateurCourant, uuid: string, contenu: string) {
    const r = await this.charger(u.tenantId, uuid);
    const cote = await this.cote(u, r);
    if (r.statut === 'cloturee')
      throw ErreurMetier.conflit('RECLAMATION_CLOTUREE', 'Cette réclamation est clôturée : ouvrez-en une nouvelle si besoin.');

    await this.base.transaction(async (ex) => {
      await this.message(ex, r.id, u, cote, contenu);
      const nouveauStatut =
        cote === 'etablissement' && r.statut === 'ouverte'
          ? 'en_cours'
          : cote === 'usager' && r.statut === 'resolue'
            ? 'en_cours'
            : r.statut;
      const lu = cote === 'usager' ? 'lu_usager_le' : 'lu_etablissement_le';
      await ex.query(
        `UPDATE demandes.reclamations SET statut = $2, dernier_message_le = now(), ${lu} = now(), updated_at = now() WHERE id = $1`,
        [r.id, nouveauStatut],
      );
    });
    await this.evenements.publier('demandes.reclamation.message', {
      tenant_id: u.tenantId,
      reclamation_uuid: uuid,
      reference: r.reference,
      categorie: r.categorie,
      destinataire_uuid: cote === 'etablissement' ? r.demandeur_uuid : null,
      cote_auteur: cote,
    });
    return this.consulter(u, uuid);
  }

  async changerStatut(u: UtilisateurCourant, uuid: string, statut: string) {
    const r = await this.charger(u.tenantId, uuid);
    await this.exigerCategorie(u, r.categorie);
    if (r.statut === 'cloturee') throw ErreurMetier.conflit('RECLAMATION_CLOTUREE', 'Cette réclamation est déjà clôturée.');
    if (statut === r.statut) return this.consulter(u, uuid);
    await this.base.transaction(async (ex) => {
      await ex.query(`UPDATE demandes.reclamations SET statut = $2, updated_at = now() WHERE id = $1`, [r.id, statut]);
      await this.base.journaliser(ex, u, 'reclamation.statut', 'reclamation', uuid, { avant: r.statut, apres: statut });
    });
    await this.evenements.publier('demandes.reclamation.statut', {
      tenant_id: u.tenantId,
      reclamation_uuid: uuid,
      reference: r.reference,
      statut,
      destinataire_uuid: r.demandeur_uuid,
    });
    return this.consulter(u, uuid);
  }

  async lister(u: UtilisateurCourant, f: FiltresReclamationsDto, siennes: boolean) {
    const p = pagination(f.page, f.par_page);
    const params: unknown[] = [u.tenantId];
    const conditions = ['r.tenant_id = $1'];
    const ajouter = (sql: string, v: unknown) => {
      params.push(v);
      conditions.push(sql.replace('?', `$${params.length}`));
    };

    if (siennes) {
      ajouter('r.demandeur_uuid = ?', u.uuid);
    } else {
      await this.gouvernance.exiger(u, 'repondre_reclamation');
      const categories = await this.gouvernance.categoriesReclamation(u);
      if (categories) ajouter('r.categorie = ANY(?)', categories);
    }
    if (f.statut) ajouter('r.statut = ?', f.statut);
    if (f.categorie) ajouter('r.categorie = ?', f.categorie);
    if (f.recherche)
      ajouter('(r.reference ILIKE ? OR r.objet ILIKE $' + (params.length + 1) + ')', `%${f.recherche.replace(/[%_\\]/g, '\\$&')}%`);

    const where = conditions.join(' AND ');
    const total = await this.base.ligne(`SELECT count(*) AS n FROM demandes.reclamations r WHERE ${where}`, params);
    const lignes = await this.base.lignes(
      `SELECT ${COLONNES} FROM demandes.reclamations r WHERE ${where} ORDER BY r.dernier_message_le DESC, r.id DESC LIMIT ${p.parPage} OFFSET ${p.offset}`,
      params,
    );
    return page(
      lignes.map((r) => this.presenter(r, siennes ? 'usager' : 'etablissement')),
      Number(total?.n ?? 0),
      p,
    );
  }

  // ------------------------------------------------------------------------------------------

  private async creer(
    u: UtilisateurCourant,
    dto: OuvrirReclamationDto,
    o: {
      demandeur: string;
      role: string | null;
      initiee: 'usager' | 'etablissement';
      cote: Cote;
    },
  ): Promise<string> {
    const r = await this.base.transaction(async (ex) => {
      const reference = await this.base.reference(ex, u.tenantId, 'RC');
      const lu = o.cote === 'usager' ? 'lu_usager_le' : 'lu_etablissement_le';
      const ligne = await this.base.ligne(
        `INSERT INTO demandes.reclamations (tenant_id, reference, demandeur_uuid, demandeur_role, beneficiaire_apprenant_uuid, categorie,
           objet, initiee_par, ouverte_par_uuid, ${lu})
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now()) RETURNING id, uuid, reference`,
        [u.tenantId, reference, o.demandeur, o.role, dto.beneficiaire_apprenant_uuid ?? null, dto.categorie, dto.objet, o.initiee, u.uuid],
        ex,
      );
      await this.message(ex, ligne.id, u, o.cote, dto.message);
      return ligne;
    });
    await this.evenements.publier('demandes.reclamation.ouverte', {
      tenant_id: u.tenantId,
      reclamation_uuid: r.uuid,
      reference: r.reference,
      categorie: dto.categorie,
      initiee_par: o.initiee,
      destinataire_uuid: o.initiee === 'etablissement' ? o.demandeur : null,
    });
    return r.uuid;
  }

  private async message(ex: EntityManager, reclamationId: number, u: UtilisateurCourant, cote: Cote, contenu: string) {
    await ex.query(
      `INSERT INTO demandes.message_reclamation (reclamation_id, auteur_uuid, auteur_role, cote, contenu) VALUES ($1, $2, $3, $4, $5)`,
      [reclamationId, u.uuid, u.roleCode, cote, contenu],
    );
  }

  private async charger(tenantId: number, uuid: string) {
    const r = await this.base.ligne(`SELECT ${COLONNES} FROM demandes.reclamations r WHERE r.tenant_id = $1 AND r.uuid = $2`, [
      tenantId,
      uuid,
    ]);
    if (!r) throw ErreurMetier.introuvable('Réclamation introuvable.');
    return r;
  }

  /** Cote de l'utilisateur dans ce fil ; un tiers non habilite ne voit rien (404, pas de fuite d'existence). */
  private async cote(u: UtilisateurCourant, r: any): Promise<Cote> {
    if (r.demandeur_uuid === u.uuid) return 'usager';
    if (await this.peutTraiter(u, r.categorie)) return 'etablissement';
    throw ErreurMetier.introuvable('Réclamation introuvable.');
  }

  private async peutTraiter(u: UtilisateurCourant, categorie: string): Promise<boolean> {
    if (!(await this.gouvernance.peut(u, 'repondre_reclamation'))) return false;
    const categories = await this.gouvernance.categoriesReclamation(u);
    return categories === null || categories.includes(categorie);
  }

  private async exigerCategorie(u: UtilisateurCourant, categorie: string) {
    await this.gouvernance.exiger(u, 'repondre_reclamation');
    if (!(await this.peutTraiter(u, categorie))) {
      throw ErreurMetier.accesRefuse('Votre rôle ne traite pas cette catégorie de réclamations.', 'ACTION_NON_AUTORISEE');
    }
  }

  private presenter(r: any, cote: Cote) {
    const luParAutre = cote === 'usager' ? r.lu_etablissement_le : r.lu_usager_le;
    const luParMoi = cote === 'usager' ? r.lu_usager_le : r.lu_etablissement_le;
    return {
      uuid: r.uuid,
      reference: r.reference,
      categorie: r.categorie,
      objet: r.objet,
      statut: r.statut,
      initiee_par: r.initiee_par,
      beneficiaire_apprenant_uuid: r.beneficiaire_apprenant_uuid,
      cree_le: r.created_at,
      dernier_message_le: r.dernier_message_le,
      non_lu: !luParMoi || new Date(r.dernier_message_le) > new Date(luParMoi),
      lu_par_interlocuteur_le: luParAutre,
      mon_cote: cote,
      ...(cote === 'etablissement' ? { usager_uuid: r.demandeur_uuid, usager_role: r.demandeur_role } : {}),
    };
  }
}
