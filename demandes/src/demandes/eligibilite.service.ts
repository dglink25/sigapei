import { Injectable } from '@nestjs/common';
import { UtilisateurCourant } from '../common/contexte/utilisateur-courant';
import { ErreurMetier } from '../common/erreurs/erreurs';
import { EvaluationsClient } from '../integrations/evaluations.client';
import { FinancesClient } from '../integrations/finances.client';
import { RhClient, Personnel } from '../integrations/rh.client';
import { Apprenant, ScolariteClient } from '../integrations/scolarite.client';

export interface Sujet {
  /** Donnees imprimables sur le document (jamais recopiees ailleurs que dans l'instantane du document). */
  nom_complet: string;
  matricule?: string;
  classe?: string;
  date_naissance?: string;
  fonction?: string;
}

export interface Verdict {
  eligible: boolean;
  motif: string | null;
  sujet: Sujet;
}

/**
 * Service Eligibilite (CDC §7, §8, §16) : verdict unique et motif exploitable cote interface,
 * calcule EN DIRECT aupres des microservices proprietaires (jamais de copie du dossier).
 *  - categorie apprenant : Scolarite (dossier actif), Evaluations (bulletins publies) et Finances (solde a jour) ;
 *  - categorie personnel : RH (dossier actif) ;
 *  - tout profil : aucune verification automatique.
 * Le lien du demandeur avec l'apprenant beneficiaire (lui-meme ou parent rattache) est verifie ici.
 */
@Injectable()
export class EligibiliteService {
  constructor(
    private readonly scolarite: ScolariteClient,
    private readonly evaluations: EvaluationsClient,
    private readonly finances: FinancesClient,
    private readonly rh: RhClient,
  ) {}

  /** Charge l'apprenant et verifie que le demandeur a le droit d'agir pour lui. */
  async apprenantDuDemandeur(u: UtilisateurCourant, apprenantUuid: string): Promise<Apprenant> {
    const a = await this.scolarite.apprenant(apprenantUuid, u.tenantId);
    if (!a) throw ErreurMetier.introuvable('Apprenant introuvable dans votre établissement.');
    if (!this.scolarite.lien(a, u.uuid)) {
      throw ErreurMetier.accesRefuse('Vous ne pouvez faire une demande que pour vous-même ou pour un enfant qui vous est rattaché.');
    }
    return a;
  }

  async personnelDuDemandeur(u: UtilisateurCourant): Promise<Personnel> {
    const p = await this.rh.personnelDuCompte(u.uuid, u.tenantId);
    if (!p) throw ErreurMetier.accesRefuse("Ce document est réservé au personnel de l'établissement.");
    return p;
  }

  async verifier(
    u: UtilisateurCourant,
    type: {
      categorie_demandeur: string;
      regles_eligibilite: Record<string, boolean>;
    },
    beneficiaireUuid: string | null,
    demandeurUuid: string,
  ): Promise<Verdict> {
    const r = type.regles_eligibilite ?? {};

    if (type.categorie_demandeur === 'apprenant' || (type.categorie_demandeur === 'tout_profil' && beneficiaireUuid)) {
      const a = await this.scolarite.apprenant(beneficiaireUuid!, u.tenantId);
      if (!a)
        return {
          eligible: false,
          motif: "Le dossier de l'apprenant est introuvable.",
          sujet: { nom_complet: '' },
        };
      const sujet = this.sujetApprenant(a);
      if (r.dossier_actif && a.statut !== 'actif') {
        return {
          eligible: false,
          motif: "Le dossier de l'apprenant n'est pas actif à ce jour.",
          sujet,
        };
      }
      if (r.bulletins_publies) {
        const b = await this.evaluations.bulletins(a.uuid, u.tenantId);
        if (!b.eligible)
          return {
            eligible: false,
            motif: "Aucun bulletin n'a encore été publié pour cet apprenant.",
            sujet,
          };
      }
      if (r.solde_a_jour) {
        const s = await this.finances.solde(a.uuid, u.tenantId);
        if (!s.a_jour)
          return {
            eligible: false,
            motif: "La scolarité de l'apprenant présente des échéances impayées : régularisez la situation auprès de l'établissement.",
            sujet,
          };
      }
      return { eligible: true, motif: null, sujet };
    }

    if (type.categorie_demandeur === 'personnel') {
      const p = await this.rh.personnelDuCompte(demandeurUuid, u.tenantId);
      if (!p)
        return {
          eligible: false,
          motif: 'Aucun dossier du personnel ne correspond à ce compte.',
          sujet: { nom_complet: '' },
        };
      const sujet = this.sujetPersonnel(p);
      if (r.contrat_actif && !(p.actif === true || p.statut === 'actif')) {
        return {
          eligible: false,
          motif: 'Aucun contrat actif à ce jour dans le dossier du personnel.',
          sujet,
        };
      }
      return { eligible: true, motif: null, sujet };
    }

    return { eligible: true, motif: null, sujet: { nom_complet: '' } };
  }

  private sujetApprenant(a: Apprenant): Sujet {
    return {
      nom_complet: [a.nom, a.prenom].filter(Boolean).join(' '),
      matricule: a.matricule,
      classe: a.classe?.nom,
      date_naissance: a.date_naissance,
    };
  }

  private sujetPersonnel(p: Personnel): Sujet {
    return {
      nom_complet: p.nom_complet ?? [p.nom, p.prenom].filter(Boolean).join(' '),
      matricule: p.matricule,
      fonction: p.fonction ?? p.type_personnel,
    };
  }
}
