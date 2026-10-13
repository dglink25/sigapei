# Design — Compositions en ligne surveillées (phase 2)

Prérequis bloquant : correctif du CDC E-learning validé avec Roc (report de note par API + RabbitMQ, jamais par écriture directe dans `evaluations.notes`).

## 1. Composants
- `CompositionsController` : expose `POST /compositions`, `GET /compositions/{uuid}/supervision`, `POST /compositions/{uuid}/incidents`.
- `CompositionService` : orchestre la création du quiz E-learning, relaie le chronomètre serveur, collecte les incidents de surveillance, déclenche le report automatique de note à la validation.
- `ElearningClient` : **seul client HTTP** du module ; appels `POST /quiz` et `POST /quiz/{uuid}/tentatives` authentifiés par **jeton de service**.
- `RabbitMqPublisher` : publie `evaluations.composition.anomalie` (et l'événement de notification préalable — nom : DECISION-19) ; un consommateur reçoit l'événement E-learning « validation finale d'une tentative ».
- Tables : `evaluations` (colonnes `est_composition_en_ligne`, `quiz_elearning_uuid`, `niveau_surveillance`), `notes`, `surveillance_incident`.
- Stockage des captures niveau 2 : **non défini dans la source** (DECISION-14) ; chiffrement au repos et purge automatique obligatoires.

## 2. Séquence nominale (CDC §10.3)
1. Enseignant/admin → `POST /compositions` (matière, classe, date, heure, durée, niveau de surveillance).
2. `CompositionService` → vérifie affectation (RH) → crée `evaluations` (`est_composition_en_ligne=true`, `niveau_surveillance`) → appelle E-learning `POST /quiz` (`type=composition_officielle`, jeton de service) → enregistre `quiz_elearning_uuid`.
3. Événement RabbitMQ → Communication : notification préalable aux familles/apprenants.
4. À l'heure H : accès ouvert aux apprenants de la classe ; `POST /quiz/{uuid}/tentatives` ; écran d'information (règles, durée, niveau de surveillance actif, mécanisme de contestation) puis démarrage ; chrono serveur d'E-learning.
5. Pendant l'examen : auto-save par question ; client signale les anomalies → `POST /compositions/{uuid}/incidents` → `surveillance_incident` + événement RabbitMQ `evaluations.composition.anomalie`.
6. Fin du temps : soumission automatique. Correction automatique des QCM ; IA E-learning pour questions ouvertes (note IA jamais définitive).
7. Validation enseignant dans E-learning → événement RabbitMQ vers Évaluations → Évaluations écrit dans `notes` via le canal normal (mêmes règles de calcul/coefficient).
8. Report **automatique** dès validation (évaluation officielle).

## 3. Niveaux de surveillance (Tableau 4)
| Niveau | Mécanisme | Cadre |
|---|---|---|
| 1 — Activité (par défaut) | Plein écran obligatoire ; détection de perte de focus/changement d'onglet ; blocage du copier-coller ; chronomètre serveur ; chaque anomalie horodatée et journalisée | Aucune donnée biométrique, aucun consentement spécifique au-delà du règlement intérieur |
| 2 — Capture périodique (optionnel) | Photo fixe de la webcam à intervalles espacés (pas de flux vidéo continu), consultable uniquement par le personnel habilité en cas d'anomalie signalée, purgée automatiquement après délai configurable (30 jours par défaut) | Activable par établissement ; accord du représentant légal recueilli à l'inscription, jamais un simple clic en cours d'examen |
| 3 — Supervision humaine (optionnel) | Tableau de bord temps réel pour un surveillant humain : candidats connectés, statut, nombre d'anomalies — jamais d'analyse automatique IA du comportement ou du visage | Supervision humaine uniquement ; aucune décision automatisée de sanction |

## 4. Contrats E-learning
- `POST /quiz` : crée le quiz ; attribut `type = composition_officielle`.
- `POST /quiz/{uuid}/tentatives` : crée/pilote la tentative de l'apprenant.
- Authentification : jeton de service.
- Retour : événement RabbitMQ de E-learning vers Évaluations à la validation finale d'une tentative.
- Corps exacts des requêtes/réponses : à documenter dans « le contrat d'interface avec E-learning » (livrable §21), une fois le correctif validé avec Roc.

## 5. Contrainte de lecture / isolation
Pas de jointure SQL ni d'écriture croisée avec le schéma E-learning (isolation totale actée en réunion du 11/09). Évaluations n'écrit que dans son schéma.

## 6. Anomalies
`surveillance_incident` : `evaluation_id`, `apprenant_id`, `type_anomalie`, `horodatage`, `niveau_preuve`. Types d'anomalie mentionnés par la source : perte de focus, changement d'onglet, copier-coller bloqué, sortie du plein écran (liste d'énumération exacte : DECISION-11). Un apprenant doit pouvoir contester une anomalie signalée à tort (mécanisme affiché à l'écran d'information).

## 7. NFR spécifiques
Disponibilité ≥ 99,9 % sur la fenêtre de l'examen ; dérive chrono < 1 s ; 100 % des incidents journalisés ; chiffrement au repos des captures ; mineurs : accès aux données de surveillance restreint aux parents rattachés et au personnel autorisé.
