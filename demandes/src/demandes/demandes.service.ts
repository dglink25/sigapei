import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Base, page, pagination } from '../common/base/base.service';
import { UtilisateurCourant } from '../common/contexte/utilisateur-courant';
import { ErreurMetier } from '../common/erreurs/erreurs';
import { RabbitMqPublisher } from '../common/evenements/rabbitmq.publisher';
import { DocumentsService, InstantaneDocument } from '../generation/documents.service';
import { GouvernanceService } from '../gouvernance/gouvernance.service';
import { TypesDocumentService } from '../types-document/types-document.service';
import { FiltresDemandesDto, SoumettreDemandeDto, TraiterDemandeDto } from './dto/demandes.dto';
import { EligibiliteService } from './eligibilite.service';

const EN_COURS = ['recue', 'bloquee', 'en_traitement'];

const SELECT_DEMANDE = `
  SELECT d.id, d.uuid, d.tenant_id, d.reference, d.statut, d.motif_blocage, d.motif_rejet, d.priorite, d.commentaire,
         d.demandeur_uuid, d.demandeur_role, d.beneficiaire_apprenant_uuid, d.derogation_motif, d.derogation_par_uuid,
         d.document, d.document_empreinte, d.traite_par_uuid, d.prete_le, d.created_at, d.updated_at,
         t.id AS type_id, t.uuid AS type_uuid, t.code AS type_code, t.nom AS type_nom, t.categorie_demandeur,
         t.regles_eligibilite, t.traitement_automatique, t.delai_indicatif_jours, t.modele
    FROM demandes.demandes_administratives d
    JOIN demandes.types_document t ON t.id = d.type_document_id`;

/**
 * Cycle de vie d'une demande de document (CDC §8, §12) :
 *   recue -> (verification automatique) -> bloquee [motif] | en_traitement -> prete | rejetee [motif]
 *   bloquee -> resoumise par le demandeur, ou derogation tracee par un role habilite -> en_traitement
 *   annulee par le demandeur tant que le document n'est pas pret.
 * L'eligibilite est reverifiee au moment de la generation (sauf derogation) : la donnee est toujours a jour.
 */
@Injectable()
export class DemandesService {
  constructor(
    private readonly base: Base,
    private readonly types: TypesDocumentService,
    private readonly eligibilite: EligibiliteService,
    private readonly gouvernance: GouvernanceService,
    private readonly documents: DocumentsService,
    private readonly evenements: RabbitMqPublisher,
  ) {}

  async soumettre(u: UtilisateurCourant, dto: SoumettreDemandeDto) {
    const type = await this.types.parUuid(u.tenantId, dto.type_document_uuid);
    const beneficiaire = dto.beneficiaire_apprenant_uuid ?? null;

    if (type.categorie_demandeur === 'apprenant' && !beneficiaire) {
      throw ErreurMetier.invalide('beneficiaire_apprenant_uuid', "Choisissez l'apprenant concerné par ce document.");
    }
    if (type.categorie_demandeur === 'personnel' && beneficiaire) {
      throw ErreurMetier.invalide('beneficiaire_apprenant_uuid', 'Ce document concerne votre propre dossier du personnel.');
    }
    if (beneficiaire) await this.eligibilite.apprenantDuDemandeur(u, beneficiaire);
    if (type.categorie_demandeur === 'personnel') await this.eligibilite.personnelDuDemandeur(u);

    const doublon = await this.base.ligne(
      `SELECT reference FROM demandes.demandes_administratives
        WHERE tenant_id = $1 AND demandeur_uuid = $2 AND type_document_id = $3
          AND beneficiaire_apprenant_uuid IS NOT DISTINCT FROM $4 AND statut = ANY($5)`,
      [u.tenantId, u.uuid, type.id, beneficiaire, EN_COURS],
    );
    if (doublon) {
      throw ErreurMetier.conflit('DEMANDE_DEJA_EN_COURS', `Une demande identique est déjà en cours (${doublon.reference}).`, {
        reference: doublon.reference,
      });
    }

    const verdict = await this.eligibilite.verifier(u, type, beneficiaire, u.uuid);

    const uuid = await this.base.transaction(async (ex) => {
      const reference = await this.base.reference(ex, u.tenantId, 'DA');
      const d = await this.base.ligne(
        `INSERT INTO demandes.demandes_administratives (tenant_id, reference, type_document_id, demandeur_uuid, demandeur_role,
           beneficiaire_apprenant_uuid, commentaire)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, uuid, reference`,
        [u.tenantId, reference, type.id, u.uuid, u.roleCode, beneficiaire, dto.commentaire ?? null],
        ex,
      );
      await this.etape(ex, d.id, 'recue', 'Demande reçue', u);
      await this.appliquerVerdict(ex, d.id, verdict, u);

      if (verdict.eligible && type.traitement_automatique) {
        await this.genererDocument(
          ex,
          {
            id: d.id,
            reference: d.reference,
            type_nom: type.nom,
            modele: type.modele,
          },
          verdict.sujet,
          u,
          {},
        );
      }
      return d.uuid as string;
    });

    const demande = await this.consulterBrut(u.tenantId, uuid);
    await this.publierStatut(demande);
    return this.presenter(demande, true, false);
  }

  /** Apres avoir regle le motif de blocage (ex. dossier reactive), le demandeur relance la verification. */
  async resoumettre(u: UtilisateurCourant, uuid: string) {
    const d = await this.consulterBrut(u.tenantId, uuid);
    if (d.demandeur_uuid !== u.uuid) throw ErreurMetier.accesRefuse();
    if (d.statut !== 'bloquee') throw ErreurMetier.conflit('STATUT_INCOMPATIBLE', 'Seule une demande bloquée peut être resoumise.');

    const verdict = await this.eligibilite.verifier(u, d, d.beneficiaire_apprenant_uuid, d.demandeur_uuid);
    await this.base.transaction(async (ex) => {
      const verrou = await this.verrouiller(ex, u.tenantId, uuid);
      if (verrou.statut !== 'bloquee') throw ErreurMetier.conflit('STATUT_INCOMPATIBLE', 'La demande a changé entre-temps.');
      await this.appliquerVerdict(ex, verrou.id, verdict, u, true);
      if (verdict.eligible && d.traitement_automatique) await this.genererDocument(ex, d, verdict.sujet, u, {});
    });
    return this.publierEtPresenter(u, uuid);
  }

  async annuler(u: UtilisateurCourant, uuid: string) {
    await this.base.transaction(async (ex) => {
      const d = await this.verrouiller(ex, u.tenantId, uuid);
      if (d.demandeur_uuid !== u.uuid) throw ErreurMetier.accesRefuse();
      if (!EN_COURS.includes(d.statut)) throw ErreurMetier.conflit('STATUT_INCOMPATIBLE', 'Cette demande ne peut plus être annulée.');
      await ex.query(`UPDATE demandes.demandes_administratives SET statut = 'annulee', updated_at = now() WHERE id = $1`, [d.id]);
      await this.etape(ex, d.id, 'annulee', 'Demande annulée par le demandeur', u);
    });
    return this.publierEtPresenter(u, uuid);
  }

  /** Genere le document (permission traiter_demande) apres une nouvelle verification d'eligibilite. */
  async traiter(u: UtilisateurCourant, uuid: string, dto: TraiterDemandeDto) {
    await this.gouvernance.exiger(u, 'traiter_demande');
    const d = await this.consulterBrut(u.tenantId, uuid);
    if (d.statut !== 'en_traitement') {
      throw ErreurMetier.conflit(
        'STATUT_INCOMPATIBLE',
        d.statut === 'bloquee'
          ? 'La demande est bloquée : le demandeur doit régler le motif, ou une dérogation doit être accordée.'
          : 'Seule une demande en traitement peut donner lieu à un document.',
      );
    }
    const verdict = await this.eligibilite.verifier(u, d, d.beneficiaire_apprenant_uuid, d.demandeur_uuid);

    await this.base.transaction(async (ex) => {
      const verrou = await this.verrouiller(ex, u.tenantId, uuid);
      if (verrou.statut !== 'en_traitement') throw ErreurMetier.conflit('STATUT_INCOMPATIBLE', 'La demande a changé entre-temps.');
      if (!verdict.eligible && !verrou.derogation_motif) {
        await this.appliquerVerdict(ex, verrou.id, verdict, u);
        return;
      }
      await this.genererDocument(ex, d, verdict.sujet, u, dto);
    });

    const r = await this.publierEtPresenter(u, uuid);
    if (r.statut === 'bloquee') {
      throw ErreurMetier.conflit('DEMANDE_BLOQUEE', `La demande n'est plus éligible : ${r.motif_blocage}`, { demande: r });
    }
    return r;
  }

  async rejeter(u: UtilisateurCourant, uuid: string, motif: string) {
    await this.gouvernance.exiger(u, 'traiter_demande');
    await this.base.transaction(async (ex) => {
      const d = await this.verrouiller(ex, u.tenantId, uuid);
      if (!EN_COURS.includes(d.statut)) throw ErreurMetier.conflit('STATUT_INCOMPATIBLE', 'Cette demande ne peut plus être rejetée.');
      await ex.query(
        `UPDATE demandes.demandes_administratives SET statut = 'rejetee', motif_rejet = $2, traite_par_uuid = $3, updated_at = now() WHERE id = $1`,
        [d.id, motif, u.uuid],
      );
      await this.etape(ex, d.id, 'rejetee', `Demande rejetée : ${motif}`, u);
      await this.base.journaliser(ex, u, 'demande.rejetee', 'demande', uuid, {
        motif,
      });
    });
    return this.publierEtPresenter(u, uuid);
  }

  /** Derogation ponctuelle a une regle d'eligibilite (CDC §12) : permission dediee, motif obligatoire, journalisee. */
  async deroger(u: UtilisateurCourant, uuid: string, motif: string) {
    await this.gouvernance.exiger(u, 'accorder_derogation');
    await this.base.transaction(async (ex) => {
      const d = await this.verrouiller(ex, u.tenantId, uuid);
      if (d.statut !== 'bloquee') throw ErreurMetier.conflit('STATUT_INCOMPATIBLE', "Une dérogation ne concerne qu'une demande bloquée.");
      await ex.query(
        `UPDATE demandes.demandes_administratives SET statut = 'en_traitement', derogation_motif = $2, derogation_par_uuid = $3,
           motif_blocage = NULL, updated_at = now() WHERE id = $1`,
        [d.id, motif, u.uuid],
      );
      await this.etape(ex, d.id, 'en_traitement', 'Dérogation accordée : la demande passe en traitement', u);
      await this.base.journaliser(ex, u, 'demande.derogation', 'demande', uuid, { motif, motif_blocage: d.motif_blocage });
    });
    return this.publierEtPresenter(u, uuid);
  }

  async prioriser(u: UtilisateurCourant, uuid: string, priorite: boolean) {
    await this.gouvernance.exiger(u, 'traiter_demande');
    await this.base.transaction(async (ex) => {
      const d = await this.verrouiller(ex, u.tenantId, uuid);
      if (!EN_COURS.includes(d.statut)) throw ErreurMetier.conflit('STATUT_INCOMPATIBLE', 'Cette demande est déjà terminée.');
      await ex.query(`UPDATE demandes.demandes_administratives SET priorite = $2, updated_at = now() WHERE id = $1`, [d.id, priorite]);
      await this.base.journaliser(ex, u, priorite ? 'demande.prioritaire' : 'demande.priorite_retiree', 'demande', uuid);
    });
    return this.presenter(await this.consulterBrut(u.tenantId, uuid), false, true);
  }

  async consulter(u: UtilisateurCourant, uuid: string) {
    const d = await this.consulterBrut(u.tenantId, uuid);
    const gestionnaire = await this.gouvernance.peut(u, 'consulter_demandes');
    if (d.demandeur_uuid !== u.uuid && !gestionnaire) throw ErreurMetier.introuvable('Demande introuvable.');
    return this.presenter(d, d.demandeur_uuid === u.uuid, gestionnaire);
  }

  async lienDocument(u: UtilisateurCourant, uuid: string) {
    const d = await this.consulterBrut(u.tenantId, uuid);
    const gestionnaire = await this.gouvernance.peut(u, 'consulter_demandes');
    if (d.demandeur_uuid !== u.uuid && !gestionnaire) throw ErreurMetier.introuvable('Demande introuvable.');
    if (d.statut !== 'prete') throw ErreurMetier.conflit('DOCUMENT_INDISPONIBLE', "Le document n'est pas encore prêt.");
    return this.documents.lienSigne(uuid, u.tenantId);
  }

  async document(uuid: string, tenantId: number): Promise<{ pdf: Buffer; nom: string }> {
    const d = await this.base.ligne(
      `SELECT document, document_empreinte FROM demandes.demandes_administratives WHERE tenant_id = $1 AND uuid = $2 AND statut = 'prete'`,
      [tenantId, uuid],
    );
    if (!d) throw ErreurMetier.introuvable('Document introuvable.');
    const i = d.document as InstantaneDocument;
    return {
      pdf: await this.documents.pdf(i, d.document_empreinte),
      nom: this.documents.nomFichier(i),
    };
  }

  async mesDemandes(u: UtilisateurCourant, f: FiltresDemandesDto) {
    return this.lister(u, f, true);
  }

  async file(u: UtilisateurCourant, f: FiltresDemandesDto) {
    await this.gouvernance.exiger(u, 'consulter_demandes');
    return this.lister(u, f, false);
  }

  // ------------------------------------------------------------------------------------------

  private async lister(u: UtilisateurCourant, f: FiltresDemandesDto, siennes: boolean) {
    const p = pagination(f.page, f.par_page);
    const conditions = ['d.tenant_id = $1'];
    const params: unknown[] = [u.tenantId];
    const ajouter = (sql: string, v: unknown) => {
      params.push(v);
      conditions.push(sql.replace('?', `$${params.length}`));
    };
    if (siennes) ajouter('d.demandeur_uuid = ?', u.uuid);
    if (f.statut) ajouter('d.statut = ?', f.statut);
    if (f.type_document_uuid) ajouter('t.uuid = ?', f.type_document_uuid);
    if (f.recherche) ajouter('d.reference ILIKE ?', `%${f.recherche.replace(/[%_\\]/g, '\\$&')}%`);

    const ordre = {
      anciennes: 'd.created_at ASC',
      priorite: 'd.priorite DESC, d.created_at ASC',
      recentes: 'd.created_at DESC',
    }[f.tri ?? (siennes ? 'recentes' : 'priorite')];

    const where = conditions.join(' AND ');
    const total = await this.base.ligne<{ n: string }>(
      `SELECT count(*) AS n FROM demandes.demandes_administratives d JOIN demandes.types_document t ON t.id = d.type_document_id WHERE ${where}`,
      params,
    );
    const lignes = await this.base.lignes(
      `${SELECT_DEMANDE} WHERE ${where} ORDER BY ${ordre}, d.id LIMIT ${p.parPage} OFFSET ${p.offset}`,
      params,
    );
    return page(
      lignes.map((d) => this.presenter(d, siennes, !siennes, false)),
      Number(total?.n ?? 0),
      p,
    );
  }

  private async consulterBrut(tenantId: number, uuid: string) {
    const d = await this.base.ligne(`${SELECT_DEMANDE} WHERE d.tenant_id = $1 AND d.uuid = $2`, [tenantId, uuid]);
    if (!d) throw ErreurMetier.introuvable('Demande introuvable.');
    d.etapes = await this.base.lignes(`SELECT statut, libelle, cree_le FROM demandes.demande_etapes WHERE demande_id = $1 ORDER BY id`, [
      d.id,
    ]);
    return d;
  }

  private async verrouiller(ex: EntityManager, tenantId: number, uuid: string) {
    const d = await this.base.ligne(
      `SELECT id, statut, demandeur_uuid, derogation_motif, motif_blocage FROM demandes.demandes_administratives
        WHERE tenant_id = $1 AND uuid = $2 FOR UPDATE`,
      [tenantId, uuid],
      ex,
    );
    if (!d) throw ErreurMetier.introuvable('Demande introuvable.');
    return d;
  }

  private async appliquerVerdict(
    ex: EntityManager,
    id: number,
    v: { eligible: boolean; motif: string | null },
    u: UtilisateurCourant,
    resoumission = false,
  ) {
    if (v.eligible) {
      await ex.query(
        `UPDATE demandes.demandes_administratives SET statut = 'en_traitement', motif_blocage = NULL, updated_at = now() WHERE id = $1`,
        [id],
      );
      await this.etape(
        ex,
        id,
        'en_traitement',
        resoumission ? 'Nouvelle vérification réussie : demande en traitement' : 'Éligibilité vérifiée : demande en traitement',
        u,
      );
    } else {
      await ex.query(
        `UPDATE demandes.demandes_administratives SET statut = 'bloquee', motif_blocage = $2, updated_at = now() WHERE id = $1`,
        [id, v.motif],
      );
      await this.etape(ex, id, 'bloquee', `Demande bloquée : ${v.motif}`, u);
    }
  }

  private async genererDocument(ex: EntityManager, d: any, sujet: any, u: UtilisateurCourant, surcharge: TraiterDemandeDto) {
    const { instantane, empreinte } = this.documents.construire(
      { nom: d.type_nom ?? d.nom, modele: d.modele },
      d.reference,
      sujet,
      surcharge,
    );
    await ex.query(
      `UPDATE demandes.demandes_administratives SET statut = 'prete', document = $2, document_empreinte = $3, traite_par_uuid = $4,
         prete_le = now(), updated_at = now() WHERE id = $1`,
      [d.id, JSON.stringify(instantane), empreinte, u.uuid],
    );
    await this.etape(ex, d.id, 'prete', 'Document prêt : téléchargement disponible', u);
  }

  private async etape(ex: EntityManager, demandeId: number, statut: string, libelle: string, u: UtilisateurCourant) {
    await ex.query(
      `INSERT INTO demandes.demande_etapes (demande_id, statut, libelle, auteur_uuid, auteur_role) VALUES ($1, $2, $3, $4, $5)`,
      [demandeId, statut, libelle.slice(0, 500), u.uuid, u.roleCode],
    );
  }

  private async publierEtPresenter(u: UtilisateurCourant, uuid: string) {
    const d = await this.consulterBrut(u.tenantId, uuid);
    await this.publierStatut(d);
    return this.presenter(d, d.demandeur_uuid === u.uuid, await this.gouvernance.peut(u, 'consulter_demandes'));
  }

  private async publierStatut(d: any) {
    await this.evenements.publier('demandes.statut.change', {
      tenant_id: Number(d.tenant_id ?? 0) || undefined,
      demande_uuid: d.uuid,
      reference: d.reference,
      statut: d.statut,
      type_document: d.type_nom,
      destinataire_uuid: d.demandeur_uuid,
      motif: d.motif_rejet ?? d.motif_blocage ?? null,
    });
  }

  /** Jamais d'identifiant interne ; les informations de gestion ne sont montrees qu'aux gestionnaires. */
  private presenter(d: any, demandeur: boolean, gestionnaire: boolean, avecEtapes = true) {
    return {
      uuid: d.uuid,
      reference: d.reference,
      type_document: {
        uuid: d.type_uuid,
        code: d.type_code,
        nom: d.type_nom,
        categorie_demandeur: d.categorie_demandeur,
      },
      statut: d.statut,
      motif_blocage: d.motif_blocage,
      motif_rejet: d.motif_rejet,
      priorite: d.priorite,
      commentaire: d.commentaire,
      beneficiaire_apprenant_uuid: d.beneficiaire_apprenant_uuid,
      delai_indicatif_jours: d.delai_indicatif_jours,
      document_disponible: d.statut === 'prete',
      cree_le: d.created_at,
      mis_a_jour_le: d.updated_at,
      prete_le: d.prete_le,
      est_demandeur: demandeur,
      ...(gestionnaire
        ? {
            demandeur_uuid: d.demandeur_uuid,
            demandeur_role: d.demandeur_role,
            derogation: d.derogation_motif ? { motif: d.derogation_motif, par_uuid: d.derogation_par_uuid } : null,
          }
        : {}),
      ...(avecEtapes && d.etapes ? { etapes: d.etapes } : {}),
    };
  }
}
