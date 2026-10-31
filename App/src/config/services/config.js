import { BookOpen, ClipboardCheck, GraduationCap, Layers, MonitorPlay, School, UserPlus, Users } from 'lucide-react'

export const SERVICE_PATHS = {
  liste: '/admin/services',
  detailRoute: '/admin/services/:uuid',
  detail: (uuid) => `/admin/services/${uuid}`,
  etablissementRoute: '/admin/etablissements/:uuid/services',
  etablissement: (uuid) => `/admin/etablissements/${uuid}/services`,
  demandes: '/admin/demandes-service',
}

/** Meme regle que le backend (code stable et immuable). */
export const REGEX_CODE_SERVICE = /^[a-z0-9][a-z0-9_-]{1,63}$/
export const MAX_SERVICES_PAR_ASSIGNATION = 50
export const MAX_ETABLISSEMENTS_PAR_LOT = 200

/** Le backend n'a pas de colonne d'icone : correspondance code de service -> icone professionnelle. */
const ICONES = {
  inscription: UserPlus,
  scolarite: GraduationCap,
  'vie-scolaire': School,
  evaluations: ClipboardCheck,
  evaluation: ClipboardCheck,
  rh: Users,
  elearning: MonitorPlay,
  bibliotheque: BookOpen,
}
export const iconePourCode = (code = '') => ICONES[code.toLowerCase().replace(/_/g, '-')] ?? Layers

/** "Vie scolaire" -> "vie-scolaire" (suggestion de code a la creation). */
export const codeDepuisNom = (nom = '') =>
  nom
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)

/**
 * http.js affiche la 1re valeur de error.details : pour les erreurs metier d'Identite,
 * details est un objet (ex: { etablissements: 3 }). On remplace donc le message par un texte clair.
 * Valeur = texte, ou fonction (details) => texte.
 */
export const MESSAGES_ERREUR = {
  SERVICE_CODE_EXISTANT: 'Un service avec ce code existe déjà. Choisissez un autre code.',
  SERVICE_INTROUVABLE: "Ce service n'existe plus. Actualisez la page.",
  SERVICE_ASSIGNE: (d) =>
    `Ce service est encore assigné à ${d?.etablissements ?? 'plusieurs'} établissement(s). Retirez-le d'abord ou désactivez-le.`,
  SERVICE_INACTIF: 'Ce service est inactif ou bloqué : opération impossible.',
  SERVICE_DEJA_ASSIGNE: 'Ce service est déjà assigné à cet établissement.',
  ASSIGNATION_INTROUVABLE: "Cette assignation n'existe plus. Actualisez la page.",
  ETABLISSEMENT_INTROUVABLE: 'Cet établissement est introuvable.',
  ETABLISSEMENT_ARCHIVE: 'Cet établissement est archivé : aucune assignation possible.',
  AUCUNE_MODIFICATION: 'Aucune modification à enregistrer.',
  ADMINISTRATEUR_DROITS_IMPLICITES: 'Un administrateur dispose déjà de tous les droits : ils ne sont pas modifiables.',
  UTILISATEUR_INTROUVABLE: "Cet utilisateur n'existe pas dans votre établissement.",
  UTILISATEUR_ARCHIVE: 'Ce compte est archivé : impossible de lui accorder un accès.',
  SERVICE_NON_ASSIGNE: "Ce service n'est pas assigné à votre établissement.",
  ETABLISSEMENT_INACTIF: 'Votre établissement est suspendu : aucune modification possible.',
  ACCES_REFUSE: "Cette action est réservée à l'administrateur de l'établissement.",
}
