/** Libellés du module Finances (mêmes codes que le microservice). */

export const STATUTS_FACTURE = {
  emise: { libelle: 'À régler', badge: 'warning' },
  partiellement_reglee: { libelle: 'Partiellement réglée', badge: 'info' },
  reglee: { libelle: 'Réglée', badge: 'success' },
  annulee: { libelle: 'Annulée', badge: 'neutral' },
}

export const STATUTS_REGLEMENT = {
  a_valider: { libelle: 'À valider', badge: 'warning' },
  valide: { libelle: 'Validé', badge: 'success' },
  rejete: { libelle: 'Rejeté', badge: 'danger' },
}

export const MODES = { en_ligne: 'En ligne', especes: 'Espèces', virement: 'Virement', cheque: 'Chèque' }

/** Agrégateurs à redirection proposés aux familles (le service Paiements exécute l'encaissement). */
export const AGREGATEURS_EN_LIGNE = [
  { code: 'fedapay', libelle: 'FedaPay (mobile money, carte)' },
  { code: 'cinetpay', libelle: 'CinetPay (mobile money, carte)' },
]

export const NATURES = {
  scolarite: 'Scolarité', inscription: 'Inscription', cantine: 'Cantine', transport: 'Transport',
  activite: 'Activité', dossier: 'Frais de dossier', autre: 'Autre',
}

export const STATUTS_PAIEMENT = {
  initie: { libelle: 'Initié', badge: 'info' },
  en_attente: { libelle: 'En attente de confirmation', badge: 'warning' },
  approuve: { libelle: 'Payé', badge: 'success' },
  disponible: { libelle: 'Payé', badge: 'success' },
  rembourse_partiel: { libelle: 'Remboursé en partie', badge: 'info' },
  rembourse: { libelle: 'Remboursé', badge: 'neutral' },
  refuse: { libelle: 'Refusé', badge: 'danger' },
  annule: { libelle: 'Annulé', badge: 'neutral' },
  expire: { libelle: 'Expiré', badge: 'neutral' },
  echec_creation: { libelle: 'Non abouti', badge: 'danger' },
}

export const libelle = (table, code) => table[code] ?? { libelle: code ?? '-', badge: 'neutral' }
