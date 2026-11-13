import { Injectable } from '@nestjs/common';
import { DependanceIndisponible } from '../common/erreurs/erreurs';
import { charge, HttpInterneService } from '../common/http/http-interne.service';

export interface Apprenant {
  uuid: string;
  statut: string;
  nom?: string;
  prenom?: string;
  matricule?: string;
  date_naissance?: string;
  classe?: { uuid?: string; nom?: string; cycle?: string; niveau?: string };
  utilisateur_uuid?: string | null;
  parents?: { parent_uuid?: string | null; lien_parente?: string }[];
}

export interface ResumeApprenant {
  uuid: string;
  nom: string | null;
  prenom: string | null;
  matricule: string | null;
  classe: string | null;
}

/**
 * Scolarite : dossier de l'apprenant (GET /v1/interne/apprenants?uuid=).
 * Le lien compte utilisateur <-> apprenant (utilisateur_uuid) et parent <-> enfant (parents[].parent_uuid)
 * fait partie du contrat demande a Scolarite : tant qu'il manque, le controle est impossible => 503.
 */
@Injectable()
export class ScolariteClient {
  constructor(private readonly http: HttpInterneService) {}

  async apprenant(uuid: string, tenantId: number): Promise<Apprenant | null> {
    const a = charge<Apprenant>(await this.http.get('scolarite', '/v1/interne/apprenants', { uuid }, tenantId));
    return a && typeof a === 'object' && a.uuid === uuid ? a : null;
  }

  /**
   * Apprenants rattaches a un compte : l'apprenant lui-meme (utilisateur_uuid) ou les enfants d'un parent
   * (parents[].parent_uuid). Filtres ?utilisateur_uuid= et ?parent_uuid= demandes a Scolarite ; chaque dossier
   * renvoye est re-verifie ici (jamais de confiance aveugle dans le filtre).
   */
  async apprenantsDuCompte(utilisateurUuid: string, parent: boolean, tenantId: number): Promise<Apprenant[]> {
    const filtre = { [parent ? 'parent_uuid' : 'utilisateur_uuid']: utilisateurUuid, statut: 'actif' };
    const d = charge<Apprenant[] | Apprenant>(await this.http.get('scolarite', '/v1/interne/apprenants', filtre, tenantId));
    const liste = Array.isArray(d) ? d : d ? [d] : [];
    return liste.filter(
      (a) => !!a && typeof a === 'object' && typeof a.uuid === 'string' && this.lien(a, utilisateurUuid) === (parent ? 'parent' : 'lui_meme'),
    );
  }

  /** Identite courte de plusieurs apprenants, pour l'affichage. Un dossier illisible n'empeche pas la liste. */
  async resumes(uuids: (string | null | undefined)[], tenantId: number): Promise<Map<string, ResumeApprenant>> {
    const uniques = [...new Set(uuids.filter((u): u is string => typeof u === 'string'))].slice(0, 100);
    const lus = await Promise.all(uniques.map((u) => this.apprenant(u, tenantId).catch(() => null)));
    const m = new Map<string, ResumeApprenant>();
    lus.forEach((a) => {
      if (a) m.set(a.uuid, ScolariteClient.resume(a));
    });
    return m;
  }

  static resume(a: Apprenant): ResumeApprenant {
    return { uuid: a.uuid, nom: a.nom ?? null, prenom: a.prenom ?? null, matricule: a.matricule ?? null, classe: a.classe?.nom ?? null };
  }

  /** L'utilisateur est-il l'apprenant lui-meme, ou un parent rattache ? */
  lien(apprenant: Apprenant, utilisateurUuid: string): 'lui_meme' | 'parent' | null {
    if (!('utilisateur_uuid' in apprenant)) {
      throw new DependanceIndisponible('Scolarite ne fournit pas encore utilisateur_uuid.');
    }
    if (apprenant.utilisateur_uuid && apprenant.utilisateur_uuid === utilisateurUuid) return 'lui_meme';
    for (const p of apprenant.parents ?? []) {
      if (!('parent_uuid' in p)) throw new DependanceIndisponible('Scolarite ne fournit pas encore parents[].parent_uuid.');
      if (p.parent_uuid && p.parent_uuid === utilisateurUuid) return 'parent';
    }
    return null;
  }
}
