/**
 * Données de démonstration SIGAPEI.
 *
 * Ces données servent au rendu initial des espaces dont les microservices
 * associés ne sont pas encore câblés (évaluations, finances, vie scolaire).
 * Elles seront remplacées par de vels appels API lorsque ces services seront prêts.
 *
 * Centralisées ici pour éviter la duplication entre les composants.
 */

// ── Classes ─────────────────────────────────────────────────────
export const initialClasses = [
  { id: 1, nom: '6ème A', cycle: 'secondaire', niveau: '6ème', filiere: 'Générale', capacite: 45, inscrits: 45, programme: 'beninois' },
  { id: 2, nom: '6ème B', cycle: 'secondaire', niveau: '6ème', filiere: 'Générale', capacite: 45, inscrits: 42, programme: 'beninois' },
  { id: 3, nom: '5ème Bilingue', cycle: 'secondaire', niveau: '5ème', filiere: 'Bilingue', capacite: 35, inscrits: 35, programme: 'francais' },
  { id: 4, nom: 'Seconde C', cycle: 'secondaire', niveau: '2nde', filiere: 'Scientifique', capacite: 40, inscrits: 38, programme: 'beninois' },
  { id: 5, nom: 'Terminale D', cycle: 'secondaire', niveau: 'Tle', filiere: 'Biologie-Maths', capacite: 40, inscrits: 37, programme: 'beninois' },
  { id: 6, nom: 'CM2 Excellence', cycle: 'primaire', niveau: 'CM2', filiere: 'Primaire', capacite: 30, inscrits: 28, programme: 'beninois' }
];

// ── Candidatures (démo) ────────────────────────────────────────
export const initialCandidatures = [
  {
    id: 101,
    uuid: 'CAND-2026-8941',
    nom: 'ADANHOUN',
    prenom: 'Sèna Christian',
    sexe: 'M',
    date_naissance: '2013-04-12',
    lieu_naissance: 'Cotonou (Bénin)',
    classe_visee_id: 2,
    statut: 'en_attente',
    parent_nom: 'ADANHOUN Jean-Baptiste',
    parent_telephone: '+229 97 00 11 22',
    parent_email: 'jb.adan@gmail.com',
    date_soumission: '2026-09-18',
  },
  {
    id: 102,
    uuid: 'CAND-2026-8942',
    nom: 'HOUNWANOU',
    prenom: 'Pélagie',
    sexe: 'F',
    date_naissance: '2012-08-25',
    lieu_naissance: 'Porto-Novo (Bénin)',
    classe_visee_id: 1,
    statut: 'en_attente',
    parent_nom: 'HOUNWANOU Brice',
    parent_telephone: '+229 95 44 33 22',
    parent_email: 'brice.houn@yahoo.fr',
    date_soumission: '2026-09-20',
  },
  {
    id: 103,
    uuid: 'CAND-2026-8943',
    nom: 'TCHIBOZO',
    prenom: 'Kévin',
    sexe: 'M',
    date_naissance: '2011-11-03',
    lieu_naissance: 'Abomey-Calavi',
    classe_visee_id: 3,
    statut: 'en_attente',
    parent_nom: 'TCHIBOZO Martine',
    parent_telephone: '+229 66 12 34 56',
    parent_email: 'martine.tchi@gmail.com',
    date_soumission: '2026-09-21',
  }
];

// ── Apprenants (démo) ──────────────────────────────────────────
export const initialApprenants = [
  {
    id: 501,
    uuid: 'APP-2026-501',
    matricule: 'MAT-2026-6A-0012',
    nom: 'KOFFI',
    prenom: 'Jean-Luc',
    date_naissance: '2012-05-14',
    classe_id: 1,
    programme: 'beninois',
  },
  {
    id: 502,
    uuid: 'APP-2026-502',
    matricule: 'MAT-2026-5B-0004',
    nom: 'DUBOIS',
    prenom: 'Alexandre',
    date_naissance: '2012-01-20',
    classe_id: 3,
    programme: 'francais',
  },
  {
    id: 503,
    uuid: 'APP-2026-503',
    matricule: 'MAT-2026-2C-0033',
    nom: 'MENSAH',
    prenom: 'Arnaud',
    date_naissance: '2010-09-11',
    classe_id: 4,
    programme: 'beninois',
  }
];

// ── Emploi du temps (démo) ─────────────────────────────────────
export const initialEmploisDuTemps = [
  { uuid: 'EDT-001', classe_id: 1, jour: 'Lundi', heure_debut: '08:00', heure_fin: '10:00', matiere: 'Mathématiques', enseignant: 'Prof. Mensah', salle: 'Salle 01 (RDC)' },
  { uuid: 'EDT-002', classe_id: 1, jour: 'Lundi', heure_debut: '10:00', heure_fin: '12:00', matiere: 'Français', enseignant: 'Mme Bio', salle: 'Salle 01 (RDC)' },
  { uuid: 'EDT-003', classe_id: 1, jour: 'Mardi', heure_debut: '08:00', heure_fin: '10:00', matiere: 'Histoire-Géo', enseignant: 'Mme Lawson', salle: 'Salle 01 (RDC)' },
  { uuid: 'EDT-004', classe_id: 1, jour: 'Mardi', heure_debut: '10:00', heure_fin: '12:00', matiere: 'Anglais', enseignant: 'M. Smith', salle: 'Salle 01 (RDC)' },
  { uuid: 'EDT-005', classe_id: 1, jour: 'Mercredi', heure_debut: '08:00', heure_fin: '10:00', matiere: 'EPS', enseignant: 'M. Gomez', salle: 'Terrain de sport' },
  { uuid: 'EDT-006', classe_id: 1, jour: 'Jeudi', heure_debut: '08:00', heure_fin: '10:00', matiere: 'SVT', enseignant: 'Mme Agossa', salle: 'Labo SVT / Biologie' },
  { uuid: 'EDT-007', classe_id: 1, jour: 'Vendredi', heure_debut: '08:00', heure_fin: '10:00', matiere: 'Physique-Chimie', enseignant: 'M. Dossou', salle: 'Salle 01 (RDC)' },
  { uuid: 'EDT-008', classe_id: 1, jour: 'Vendredi', heure_debut: '10:00', heure_fin: '12:00', matiere: 'Informatique', enseignant: 'Prof. Hounsou', salle: 'Salle Informatique' },
];

// ── Paiements (démo) ───────────────────────────────────────────
export const initialPaiements = [
  {
    id: 1,
    matricule: 'MAT-2026-6A-0012',
    nom: 'KOFFI Jean-Luc',
    classe: '6ème A',
    parent_nom: 'Marc Koffi',
    parent_telephone: '+229 97 12 34 56',
    montant: 180000,
    paye: 180000,
    reste: 0,
    statut: 'solde',
  },
  {
    id: 2,
    matricule: 'MAT-2026-5B-0004',
    nom: 'DUBOIS Alexandre',
    classe: '5ème Bilingue',
    parent_nom: 'Sophie Dubois',
    parent_telephone: '+229 96 78 90 12',
    montant: 200000,
    paye: 100000,
    reste: 100000,
    statut: 'partiel',
  },
  {
    id: 3,
    matricule: 'MAT-2026-2C-0033',
    nom: 'MENSAH Arnaud',
    classe: 'Seconde C',
    parent_nom: 'Ferdinand Mensah',
    parent_telephone: '+229 95 11 22 33',
    montant: 175000,
    paye: 0,
    reste: 175000,
    statut: 'retard',
  },
];

// ── Matières (démo) ────────────────────────────────────────────
export const initialMatieres = [
  { id: 1, code: 'MATH', nom: 'Mathématiques', groupe: 'Scientifique', prof: 'Prof. Mensah', coefs: { 1: 3, 2: 3, 3: 3, 4: 5, 5: 4, 6: 2 } },
  { id: 2, code: 'FRAN', nom: 'Français & Littérature', groupe: 'Lettres & Langues', prof: 'Mme Bio', coefs: { 1: 3, 2: 3, 3: 4, 4: 3, 5: 2, 6: 2 } },
  { id: 3, code: 'PC', nom: 'Physique - Chimie', groupe: 'Scientifique', prof: 'M. Dossou', coefs: { 1: 2, 2: 2, 3: 2, 4: 4, 5: 4, 6: 1 } },
  { id: 4, code: 'SVT', nom: 'Sciences de la Vie et de la Terre', groupe: 'Scientifique', prof: 'Mme Agossa', coefs: { 1: 2, 2: 2, 3: 2, 4: 3, 5: 5, 6: 1 } },
  { id: 5, code: 'HG', nom: 'Histoire - Géographie', groupe: 'Sciences Humaines', prof: 'Mme Lawson', coefs: { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 1 } },
  { id: 6, code: 'ANG', nom: 'Anglais LV1', groupe: 'Lettres & Langues', prof: 'M. Smith', coefs: { 1: 2, 2: 2, 3: 3, 4: 2, 5: 2, 6: 1 } },
  { id: 7, code: 'PHIL', nom: 'Philosophie', groupe: 'Sciences Humaines', prof: 'Dr. Quenum', coefs: { 1: 1, 2: 1, 3: 1, 4: 2, 5: 3, 6: 1 } },
  { id: 8, code: 'INFO', nom: 'Informatique & Algorithmique', groupe: 'Technologique', prof: 'Prof. Hounsou', coefs: { 1: 1, 2: 1, 3: 2, 4: 2, 5: 2, 6: 1 } },
  { id: 9, code: 'EPS', nom: 'Éducation Physique & Sportive', groupe: 'Sport & Arts', prof: 'M. Gomez', coefs: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 } },
];

// ── Années scolaires (démo) ────────────────────────────────────
export const initialAnneesScolaires = [
  { id: '2026-2027', libelle: 'Année 2026-2027', statut: 'active', debut: '2026-09-15', fin: '2027-06-30', estCourante: true },
  { id: '2025-2026', libelle: 'Année 2025-2026', statut: 'cloturee', debut: '2025-09-15', fin: '2026-06-30', estCourante: false },
  { id: '2027-2028', libelle: 'Année 2027-2028', statut: 'preparation', debut: '2027-09-15', fin: '2028-06-30', estCourante: false },
];
