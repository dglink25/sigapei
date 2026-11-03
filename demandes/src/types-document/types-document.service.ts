import { Injectable } from '@nestjs/common';
import { Base } from '../common/base/base.service';
import { UtilisateurCourant } from '../common/contexte/utilisateur-courant';
import { ErreurMetier } from '../common/erreurs/erreurs';
import { GouvernanceService } from '../gouvernance/gouvernance.service';
import { CreerTypeDocumentDto, ModifierTypeDocumentDto } from './dto/type-document.dto';

/** Regles d'eligibilite applicables selon la categorie de demandeur (CDC §7). */
const REGLES_PAR_CATEGORIE: Record<string, string[]> = {
  apprenant: ['dossier_actif', 'bulletins_publies', 'solde_a_jour'],
  personnel: ['contrat_actif'],
  tout_profil: [],
};

const COLONNES = `uuid, code, nom, description, categorie_demandeur, regles_eligibilite, traitement_automatique,
  delai_indicatif_jours, modele, actif, created_at, updated_at`;

/** Types proposes a l'initialisation (CDC Tableau 2). L'etablissement les adapte ensuite librement. */
const TYPES_PAR_DEFAUT: CreerTypeDocumentDto[] = [
  {
    code: 'certificat_scolarite',
    nom: 'Certificat de scolarité',
    categorie_demandeur: 'apprenant',
    regles_eligibilite: { dossier_actif: true },
    delai_indicatif_jours: 2,
    modele: {
      titre: 'CERTIFICAT DE SCOLARITÉ',
      corps:
        "Nous certifions que {{nom_complet}}, né(e) le {{date_naissance}}, matricule {{matricule}}, est régulièrement inscrit(e) en classe de {{classe}} pour l'année scolaire en cours.\n\nEn foi de quoi le présent certificat lui est délivré pour servir et valoir ce que de droit.",
      signataire: 'Le Directeur',
    },
  },
  {
    code: 'attestation_reussite',
    nom: 'Attestation de réussite / passage',
    categorie_demandeur: 'apprenant',
    regles_eligibilite: { dossier_actif: true, bulletins_publies: true },
    delai_indicatif_jours: 3,
    modele: {
      titre: 'ATTESTATION DE RÉUSSITE',
      corps:
        'Nous attestons que {{nom_complet}}, matricule {{matricule}}, de la classe de {{classe}}, a satisfait aux conditions de passage au vu des résultats publiés.',
      signataire: 'Le Directeur',
    },
  },
  {
    code: 'releve_notes',
    nom: 'Relevé de notes',
    categorie_demandeur: 'apprenant',
    regles_eligibilite: { bulletins_publies: true },
    delai_indicatif_jours: 3,
    modele: {
      titre: 'RELEVÉ DE NOTES',
      corps:
        "Relevé de notes de {{nom_complet}}, matricule {{matricule}}, classe de {{classe}}. Les bulletins publiés sont joints au dossier de l'apprenant.",
      signataire: 'Le Directeur des études',
    },
  },
  {
    code: 'attestation_travail',
    nom: 'Attestation de travail',
    categorie_demandeur: 'personnel',
    regles_eligibilite: { contrat_actif: true },
    delai_indicatif_jours: 3,
    modele: {
      titre: 'ATTESTATION DE TRAVAIL',
      corps:
        'Nous attestons que {{nom_complet}}, matricule {{matricule}}, est employé(e) dans notre établissement en qualite de {{fonction}}.\n\nLa présente attestation lui est délivrée pour servir et valoir ce que de droit.',
      signataire: 'Le Directeur',
    },
  },
  {
    code: 'attestation_fonction',
    nom: 'Attestation de fonction',
    categorie_demandeur: 'personnel',
    regles_eligibilite: { contrat_actif: true },
    delai_indicatif_jours: 3,
    modele: {
      titre: 'ATTESTATION DE FONCTION',
      corps:
        'Nous attestons que {{nom_complet}}, matricule {{matricule}}, occupe a ce jour la fonction de {{fonction}} au sein de notre établissement.',
      signataire: 'Le Directeur',
    },
  },
  {
    code: 'autre_demande',
    nom: 'Autre demande',
    categorie_demandeur: 'tout_profil',
    regles_eligibilite: {},
    description: 'Lettre de recommandation, attestation de stage… traitée manuellement.',
    modele: {
      titre: 'ATTESTATION',
      corps: 'Document établi à la demande de {{nom_complet}}.',
      signataire: 'Le Directeur',
    },
  },
];

@Injectable()
export class TypesDocumentService {
  constructor(
    private readonly base: Base,
    private readonly gouvernance: GouvernanceService,
  ) {}

  /** Tout utilisateur voit les types actifs (formulaire de demande) ; les gestionnaires voient aussi les inactifs. */
  async lister(u: UtilisateurCourant, inclureInactifs: boolean) {
    const tous = inclureInactifs && (await this.gouvernance.peut(u, 'configurer_types'));
    return this.base.lignes(
      `SELECT ${COLONNES} FROM demandes.types_document WHERE tenant_id = $1 ${tous ? '' : 'AND actif'} ORDER BY nom`,
      [u.tenantId],
    );
  }

  async parUuid(tenantId: number, uuid: string, actifSeulement = true) {
    const t = await this.base.ligne(
      `SELECT id, ${COLONNES} FROM demandes.types_document WHERE tenant_id = $1 AND uuid = $2 ${actifSeulement ? 'AND actif' : ''}`,
      [tenantId, uuid],
    );
    if (!t) throw ErreurMetier.introuvable('Type de document introuvable ou désactivé.');
    return t;
  }

  async creer(u: UtilisateurCourant, dto: CreerTypeDocumentDto) {
    await this.gouvernance.exiger(u, 'configurer_types');
    this.verifierRegles(dto.categorie_demandeur, dto.regles_eligibilite ?? {});
    const existant = await this.base.ligne(`SELECT 1 FROM demandes.types_document WHERE tenant_id = $1 AND code = $2`, [
      u.tenantId,
      dto.code,
    ]);
    if (existant) throw ErreurMetier.conflit('CODE_DEJA_UTILISE', 'Un type de document utilise déjà ce code.');

    return this.base.transaction(async (ex) => {
      const t = await this.base.ligne(
        `INSERT INTO demandes.types_document (tenant_id, code, nom, description, categorie_demandeur, regles_eligibilite,
           traitement_automatique, delai_indicatif_jours, modele, actif, modifie_par_uuid)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING ${COLONNES}`,
        [
          u.tenantId,
          dto.code,
          dto.nom.trim(),
          dto.description ?? null,
          dto.categorie_demandeur,
          JSON.stringify(this.regles(dto.regles_eligibilite)),
          dto.traitement_automatique ?? false,
          dto.delai_indicatif_jours ?? null,
          JSON.stringify(dto.modele ?? {}),
          dto.actif ?? true,
          u.uuid,
        ],
        ex,
      );
      await this.base.journaliser(ex, u, 'type_document.cree', 'type_document', t.uuid, { code: dto.code });
      return t;
    });
  }

  async modifier(u: UtilisateurCourant, uuid: string, dto: ModifierTypeDocumentDto) {
    await this.gouvernance.exiger(u, 'configurer_types');
    const t = await this.parUuid(u.tenantId, uuid, false);
    if (dto.code !== undefined && dto.code !== t.code) {
      throw ErreurMetier.invalide('code', "Le code d'un type de document ne change pas (il sert de référence stable).");
    }
    const categorie = dto.categorie_demandeur ?? t.categorie_demandeur;
    const regles = dto.regles_eligibilite !== undefined ? this.regles(dto.regles_eligibilite) : t.regles_eligibilite;
    this.verifierRegles(categorie, regles);

    if (dto.categorie_demandeur && dto.categorie_demandeur !== t.categorie_demandeur) {
      const enCours = await this.base.ligne(
        `SELECT 1 FROM demandes.demandes_administratives WHERE type_document_id = $1 AND statut IN ('recue','bloquee','en_traitement') LIMIT 1`,
        [t.id],
      );
      if (enCours)
        throw ErreurMetier.conflit(
          'DEMANDES_EN_COURS',
          'Des demandes de ce type sont en cours : changez la catégorie après leur traitement.',
        );
    }

    return this.base.transaction(async (ex) => {
      const r = await this.base.ligne(
        `UPDATE demandes.types_document SET nom = $3, description = $4, categorie_demandeur = $5, regles_eligibilite = $6,
           traitement_automatique = $7, delai_indicatif_jours = $8, modele = $9, actif = $10, modifie_par_uuid = $11, updated_at = now()
         WHERE tenant_id = $1 AND uuid = $2 RETURNING ${COLONNES}`,
        [
          u.tenantId,
          uuid,
          (dto.nom ?? t.nom).trim(),
          dto.description !== undefined ? dto.description : t.description,
          categorie,
          JSON.stringify(regles),
          dto.traitement_automatique ?? t.traitement_automatique,
          dto.delai_indicatif_jours !== undefined ? dto.delai_indicatif_jours : t.delai_indicatif_jours,
          JSON.stringify(dto.modele !== undefined ? { ...t.modele, ...dto.modele } : t.modele),
          dto.actif ?? t.actif,
          u.uuid,
        ],
        ex,
      );
      await this.base.journaliser(ex, u, 'type_document.modifie', 'type_document', uuid, { modifications: dto });
      return r;
    });
  }

  /** Cree les types standards absents (idempotent : un type deja present n'est jamais ecrase). */
  async initialiser(u: UtilisateurCourant) {
    await this.gouvernance.exiger(u, 'configurer_types');
    let crees = 0;
    await this.base.transaction(async (ex) => {
      for (const t of TYPES_PAR_DEFAUT) {
        const r = await ex.query(
          `INSERT INTO demandes.types_document (tenant_id, code, nom, description, categorie_demandeur, regles_eligibilite,
             delai_indicatif_jours, modele, modifie_par_uuid)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (tenant_id, code) DO NOTHING RETURNING uuid`,
          [
            u.tenantId,
            t.code,
            t.nom,
            t.description ?? null,
            t.categorie_demandeur,
            JSON.stringify(this.regles(t.regles_eligibilite)),
            t.delai_indicatif_jours ?? null,
            JSON.stringify(t.modele ?? {}),
            u.uuid,
          ],
        );
        crees += r.length;
      }
      if (crees > 0) await this.base.journaliser(ex, u, 'type_document.initialises', 'type_document', null, { crees });
    });
    return { crees, types: await this.lister(u, true) };
  }

  private regles(r?: object): Record<string, boolean> {
    const sortie: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(r ?? {})) if (v === true) sortie[k] = true;
    return sortie;
  }

  private verifierRegles(categorie: string, regles: object) {
    const actives = Object.entries(regles ?? {})
      .filter(([, v]) => v === true)
      .map(([k]) => k);
    const permises = REGLES_PAR_CATEGORIE[categorie] ?? [];
    const interdites = actives.filter((k) => !permises.includes(k));
    if (interdites.length) {
      throw ErreurMetier.invalide(
        'regles_eligibilite',
        `Règle(s) non applicable(s) à la catégorie « ${categorie} » : ${interdites.join(', ')}.`,
      );
    }
  }
}
