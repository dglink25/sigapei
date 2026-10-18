import { ENV } from '../commun/env'

export const API_BASE = ENV.services.etablissement || ''

export const ADMIN_BASE =
  (import.meta.env.VITE_ETABLISSEMENT_ADMIN_URL || '').trim().replace(/\/+$/, '') ||
  (import.meta.env.DEV ? '/etab-interne' : API_BASE)

export const PATHS = {
  demande: '/demande',
  correction: (token) => `/demande/correction/${token}`,
  correctionRoute: '/demande/correction/:token',
}

export const ADMIN_PATHS = {
  demandes: '/admin/demandes',
  detail: (uuid) => `/admin/demandes/${uuid}`,
  detailRoute: '/admin/demandes/:uuid',
  etablissements: '/admin/etablissements',
}

export const ADMIN_ROLES = ['super_admin']

export const TYPES = [
  { id: 'primaire', label: 'Primaire' },
  { id: 'secondaire', label: 'Secondaire' },
  { id: 'universite', label: 'Université' },
]

export const TITRES = ['Fondateur', 'Directeur', 'Directrice', 'Promoteur', 'Gérant', 'Président']

export const LEVEL_LABELS = {
  pays: 'Pays',
  departement: 'Département / Région',
  commune: 'Commune / Ville',
  arrondissement: 'Arrondissement / Quartier',
}

/** Cycle de vie : brouillon -> soumise -> (correction_demandee -> soumise)* -> validee */
export const STATUTS = {
  brouillon: { label: 'Brouillon', tone: 'neutral' },
  soumise: { label: 'Soumise', tone: 'info' },
  correction_demandee: { label: 'Correction demandée', tone: 'warning' },
  validee: { label: 'Validée', tone: 'success' },
}

export const STEPS = [
  { id: 1, label: 'Établissement' },
  { id: 2, label: 'Localisation' },
  { id: 3, label: 'Dirigeant' },
  { id: 4, label: 'Documents' },
  { id: 5, label: 'Confirmation' },
]

/** Champs controles a chaque etape (validation cote formulaire). */
export const STEP_CHAMPS = {
  1: ['nom', 'types', 'annee_ouverture', 'email', 'telephone_1', 'telephone_2'],
  2: ['localisation', 'adresse_complete'],
  3: ['dirigeant_nom', 'dirigeant_titre', 'dirigeant_email', 'dirigeant_telephone'],
  4: ['doc_autorisation', 'doc_piece_identite', 'doc_logo'], // le logo est obligatoire
  5: ['confirm_authenticite', 'confirm_conditions'],
}

/**
 * Sections de la demande = granularite du circuit de correction (cles de `champsACorriger`).
 * L'API accepte : etablissement, localisation, dirigeant. `documents` est une section
 * supplementaire geree par le front (a retirer de SECTIONS_CORRIGEABLES si le backend la refuse).
 */
export const SECTIONS = [
  { id: 'etablissement', titre: "Informations sur l'établissement", step: 1, champs: ['nom', 'types', 'annee_ouverture', 'email', 'telephone_1', 'telephone_2'] },
  { id: 'localisation', titre: 'Localisation', step: 2, champs: ['localisation', 'adresse_complete'] },
  { id: 'dirigeant', titre: 'Dirigeant', step: 3, champs: ['dirigeant_nom', 'dirigeant_titre', 'dirigeant_email', 'dirigeant_telephone'] },
  { id: 'documents', titre: 'Documents', step: 4, champs: ['doc_autorisation', 'doc_piece_identite', 'doc_logo'] },
]
export const SECTIONS_CORRIGEABLES = SECTIONS.map((s) => s.id)
export const SECTION_OF = Object.fromEntries(SECTIONS.flatMap((s) => s.champs.map((c) => [c, s.id])))
export const SECTION_TITLES = Object.fromEntries(SECTIONS.map((s) => [s.id, s.titre]))

/**
 * Types de documents = valeurs attendues par POST /demandes/{uuid}/documents.
 * Logo : memes regles que le serveur (jpg, png, webp, 2 Mo, SVG refuse car il peut contenir du script).
 */
export const DOC_TYPES = {
  autorisation: {
    label: "Fiche / autorisation d'enseignement",
    help: "Délivrée par l'État",
    champ: 'doc_autorisation',
    required: true,
    maxMo: 10,
    formats: 'PDF, JPG, PNG',
    mimes: ['application/pdf', 'image/jpeg', 'image/png'],
    exts: ['pdf', 'jpg', 'jpeg', 'png'],
  },
  piece_identite: {
    label: "Pièce d'identité du dirigeant",
    help: 'Fondateur ou dirigeant',
    champ: 'doc_piece_identite',
    required: true,
    maxMo: 10,
    formats: 'PDF, JPG, PNG',
    mimes: ['application/pdf', 'image/jpeg', 'image/png'],
    exts: ['pdf', 'jpg', 'jpeg', 'png'],
  },
  logo: {
    label: "Logo de l'établissement",
    help: 'Obligatoire · image PNG, JPG ou WebP, 2 Mo maximum',
    champ: 'doc_logo',
    required: true,
    maxMo: 2,
    formats: 'PNG, JPG, WebP',
    mimes: ['image/png', 'image/jpeg', 'image/webp'],
    exts: ['png', 'jpg', 'jpeg', 'webp'],
  },
}