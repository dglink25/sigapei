/**
 * Machines à états du service Paiement. SOURCE DE VÉRITÉ côté code ; la base applique les mêmes règles
 * (table etat_transition + déclencheurs). Un test vérifie que les deux restent identiques.
 */
export interface DefinitionMachine {
  /** États dans lesquels un objet peut être créé. */
  initiaux: readonly string[];
  /** état -> états atteignables. Un état sans entrée est final. */
  transitions: Readonly<Record<string, readonly string[]>>;
}

export const MACHINES = {
  /** Encaissement (payin). FedaPay : un statut refusé/annulé n'est pas définitif ; 72 h entre approuvé et disponible. */
  encaissement: {
    initiaux: ['initie'],
    transitions: {
      initie: ['en_attente', 'approuve', 'refuse', 'annule', 'expire'],
      en_attente: ['approuve', 'refuse', 'annule', 'expire'],
      refuse: ['approuve'],
      annule: ['approuve'],
      approuve: ['disponible', 'rembourse_partiel', 'rembourse'],
      disponible: ['rembourse_partiel', 'rembourse'],
      rembourse_partiel: ['rembourse'],
    },
  },
  /** Décaissement (payout). « incertain » n'est jamais relancé : on interroge d'abord l'agrégateur. */
  decaissement: {
    initiaux: ['brouillon', 'approuve'],
    transitions: {
      brouillon: ['a_approuver', 'annule'],
      a_approuver: ['approuve', 'rejete', 'annule'],
      approuve: ['fonds_reserves', 'annule'],
      fonds_reserves: ['soumis', 'annule'],
      soumis: ['en_cours', 'envoye', 'echoue', 'incertain'],
      en_cours: ['envoye', 'echoue', 'incertain'],
      incertain: ['en_cours', 'envoye', 'echoue'],
    },
  },
  compte_reception: {
    initiaux: ['a_valider'],
    transitions: {
      a_valider: ['test_encaissement', 'archive'],
      test_encaissement: ['test_decaissement', 'echec'],
      test_decaissement: ['valide', 'echec'],
      echec: ['a_valider', 'archive'],
      valide: ['suspendu', 'archive'],
      suspendu: ['valide', 'archive'],
    },
  },
  remboursement: {
    initiaux: ['demande'],
    transitions: {
      demande: ['a_approuver', 'approuve', 'rejete'],
      a_approuver: ['approuve', 'rejete'],
      approuve: ['en_cours', 'effectue'],
      en_cours: ['effectue', 'echoue'],
      echoue: ['en_cours'],
    },
  },
  test_validation: {
    initiaux: ['en_cours'],
    transitions: { en_cours: ['reussi', 'echoue', 'expire'] },
  },
  accord_etablissement: {
    initiaux: ['demande', 'accorde'],
    transitions: {
      demande: ['accorde', 'refuse'],
      accorde: ['suspendu', 'revoque'],
      suspendu: ['accorde', 'revoque'],
      refuse: ['demande'],
      revoque: ['demande'],
    },
  },
} as const satisfies Record<string, DefinitionMachine>;

export type NomMachine = keyof typeof MACHINES;
