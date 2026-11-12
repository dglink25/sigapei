import { ENV } from '../commun/env'

export const PAIEMENT_API_BASE = ENV.services.paiement || ''

export const PAIEMENT_PATHS = {
  // Super admin
  superAdmin: '/admin/paiements',
  agregateurs: '/admin/paiements/agregateurs',
  modesPaiement: '/admin/paiements/modes-paiement',
  accords: '/admin/paiements/accords',
  accordsEtablissement: (uuid) => `/admin/paiements/etablissements/${uuid}/accords`,
  audit: '/admin/paiements/audit',
  stats: '/admin/paiements/stats',
  interrupteurs: '/admin/paiements/interrupteurs',
}

/** Icône par type de paiement */
export const TYPE_LABELS = {
  mobile_money: 'Mobile Money',
  carte: 'Carte bancaire',
  banque: 'Virement bancaire',
}

export const SENS_LABELS = {
  entree: 'Encaissement (payin)',
  sortie: 'Décaissement (payout)',
}

export const AGREGATEUR_LOGOS = {
  fedapay: '/images/fedapay.png',
  kkiapay: '/images/kkiapay.png',
  cinetpay: '/images/cinetpay.png',
}

export const STATUT_AGREGATEUR = {
  actif:    { label: 'Actif',    tone: 'success' },
  inactif:  { label: 'Inactif',  tone: 'neutral' },
  suspendu: { label: 'Suspendu', tone: 'danger' },
}

export const STATUT_MODE = {
  actif:   { label: 'Actif',   tone: 'success' },
  inactif: { label: 'Inactif', tone: 'neutral' },
}

export const STATUT_ACCORD = {
  accorde:  { label: 'Accordé',  tone: 'success' },
  suspendu: { label: 'Suspendu', tone: 'warning' },
  revoque:  { label: 'Révoqué',  tone: 'danger' },
  refuse:   { label: 'Refusé',   tone: 'danger' },
  demande:  { label: 'Demande',  tone: 'info' },
}

export const DEVISES = ['XOF', 'XAF', 'GNF', 'CDF']

export const MESSAGES_ERREUR_PAIEMENT = {
  AGREGATEUR_INTROUVABLE:     "Cet agrégateur n'existe pas.",
  MODE_PAIEMENT_INTROUVABLE:  "Ce mode de paiement n'existe plus. Actualisez la page.",
  ACCORD_INTROUVABLE:         "Cet accord n'existe plus. Actualisez la page.",
  DEVISE_INCONNUE:            'Devise non supportée. Utilisez XOF, XAF, GNF ou CDF.',
  MODE_INACTIF:               "Ce mode de paiement est inactif. Activez-le d'abord.",
  SUPER_ADMIN_REQUIS:         "Cette action est réservée au super administrateur.",
  AGREGATEUR_INACTIF:         "Cet agrégateur n'est pas actif.",
  ACCORD_ABSENT:              "Aucun accord actif pour cet agrégateur.",
  INTERRUPTEUR_ACTIF:         'Les paiements sont temporairement suspendus.',
}
