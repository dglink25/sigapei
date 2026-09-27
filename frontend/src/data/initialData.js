export const initialClasses = [
  { id: 1, nom: '6ème A', cycle: 'secondaire', niveau: '6ème', filiere: 'Générale', capacite: 45, inscrits: 45, programme: 'beninois' },
  { id: 2, nom: '6ème B', cycle: 'secondaire', niveau: '6ème', filiere: 'Générale', capacite: 45, inscrits: 42, programme: 'beninois' },
  { id: 3, nom: '5ème Bilingue', cycle: 'secondaire', niveau: '5ème', filiere: 'Bilingue', capacite: 35, inscrits: 35, programme: 'francais' },
  { id: 4, nom: 'Seconde C', cycle: 'secondaire', niveau: '2nde', filiere: 'Scientifique', capacite: 40, inscrits: 38, programme: 'beninois' },
  { id: 5, nom: 'Terminale D', cycle: 'secondaire', niveau: 'Tle', filiere: 'Biologie-Maths', capacite: 40, inscrits: 37, programme: 'beninois' },
  { id: 6, nom: 'CM2 Excellence', cycle: 'primaire', niveau: 'CM2', filiere: 'Primaire', capacite: 30, inscrits: 28, programme: 'beninois' }
];

export const initialCandidatures = [
  {
    id: 101,
    uuid: 'CAND-2026-8941',
    nom: 'ADANHOUN',
    prenom: 'Sèna Christian',
    sexe: 'M',
    date_naissance: '2013-04-12',
    lieu_naissance: 'Cotonou (Bénin)',
    classe_id: 2,
    statut: 'en_attente',
    parent_nom: 'ADANHOUN Jean-Baptiste',
    parent_tel: '+229 97 00 11 22',
    parent_email: 'jb.adan@gmail.com',
    parent_adresse: 'Haie Vive, Cotonou',
    date_soumission: '2026-09-18',
    pieces: [
      { type: 'Extrait de naissance', file: 's3://inscriptions/dossiers/101/naissance.pdf', status: 'conforme' },
      { type: 'Bulletin N-1', file: 's3://inscriptions/dossiers/101/bulletin_cm2.pdf', status: 'conforme' },
      { type: 'Certificat médical', file: 's3://inscriptions/dossiers/101/medecine.pdf', status: 'en_cours' }
    ],
    test: { matiere: 'Français & Calcul', note: 14.5, avis: 'favorable' }
  },
  {
    id: 102,
    uuid: 'CAND-2026-8942',
    nom: 'HOUNWANOU',
    prenom: 'Pélagie',
    sexe: 'F',
    date_naissance: '2012-08-25',
    lieu_naissance: 'Porto-Novo (Bénin)',
    classe_id: 1,
    statut: 'en_attente',
    parent_nom: 'HOUNWANOU Brice',
    parent_tel: '+229 95 44 33 22',
    parent_email: 'brice.houn@yahoo.fr',
    parent_adresse: 'Akpakpa, Cotonou',
    date_soumission: '2026-09-20',
    pieces: [
      { type: 'Extrait de naissance', file: 's3://inscriptions/dossiers/102/acte.pdf', status: 'conforme' },
      { type: 'Relevé de notes CEP', file: 's3://inscriptions/dossiers/102/cep.pdf', status: 'conforme' }
    ],
    test: { matiere: 'Entretien & Test écrit', note: 16.0, avis: 'favorable' }
  },
  {
    id: 103,
    uuid: 'CAND-2026-8943',
    nom: 'TCHIBOZO',
    prenom: 'Kévin',
    sexe: 'M',
    date_naissance: '2011-11-03',
    lieu_naissance: 'Abomey-Calavi',
    classe_id: 3,
    statut: 'en_attente',
    parent_nom: 'TCHIBOZO Martine',
    parent_tel: '+229 66 12 34 56',
    parent_email: 'martine.tchi@gmail.com',
    parent_adresse: 'Godomey, Abomey-Calavi',
    date_soumission: '2026-09-21',
    pieces: [
      { type: 'Acte d\'état civil', file: 's3://inscriptions/dossiers/103/etat_civil.pdf', status: 'conforme' },
      { type: 'Certificat de scolarité', file: 's3://inscriptions/dossiers/103/scol.pdf', status: 'conforme' }
    ],
    test: { matiere: 'Test Français Programme FR', note: 9.5, avis: 'defavorable' }
  }
];

export const initialApprenants = [
  {
    id: 501,
    matricule: 'MAT-2026-6A-0012',
    nom: 'KOFFI',
    prenom: 'Jean-Luc',
    date_naissance: '2012-05-14',
    classe_id: 1,
    parent_nom: 'Marc Koffi',
    parent_tel: '+229 97 12 34 56',
    mutations: []
  },
  {
    id: 502,
    matricule: 'MAT-2026-5B-0004',
    nom: 'DUBOIS',
    prenom: 'Alexandre',
    date_naissance: '2012-01-20',
    classe_id: 3,
    parent_nom: 'Sophie Dubois',
    parent_tel: '+229 96 78 90 12',
    mutations: []
  },
  {
    id: 503,
    matricule: 'MAT-2026-2C-0033',
    nom: 'MENSAH',
    prenom: 'Arnaud',
    date_naissance: '2010-09-11',
    classe_id: 4,
    parent_nom: 'Ferdinand Mensah',
    parent_tel: '+229 95 11 22 33',
    mutations: [
      { date: '2026-09-10', de: 'Seconde A', vers: 'Seconde C', motif: 'Changement de série (vers scientifique)' }
    ]
  }
];

export const timetableSchedule = [
  { h: '08h - 10h', c1: 'Mathématiques (M. Mensah)', c2: 'Histoire-Géo (Mme Lawson)', c3: '—', c4: 'Mathématiques (M. Mensah)', c5: 'Physique-Chimie (M. Dossou)' },
  { h: '10h - 12h', c1: 'Français (Mme Bio)', c2: 'Anglais (M. Smith)', c3: 'EPS (Stade)', c4: 'Français (Mme Bio)', c5: 'SVT (Labo)' },
  { h: '15h - 17h', c1: 'SVT (Labo)', c2: 'Informatique', c3: '—', c4: 'Histoire-Géo', c5: 'Arts Plastiques' }
];
