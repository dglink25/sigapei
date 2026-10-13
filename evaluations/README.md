# api-evaluations — Microservice Évaluations — SIGAPEI

Notes, barèmes, coefficients, moyennes, classements, bulletins (calcul à la volée, instantané figé à la clôture), contestations.
Compositions en ligne surveillées : phase 2, bloquée par le contrat d'interface E-learning (routes non exposées).

- **Port interne** : `4006` (non publié, accès via la Gateway sur le réseau `sigapei`)
- **Préfixe API** : `/v1/...` — **Santé** : `GET /health` (et `/sante`)
- **Stack** : Laravel 12, PHP 8.4, PostgreSQL schéma `evaluations`, Redis DB `4`, RabbitMQ
- **Processus** (même image) : API (nginx + php-fpm), worker de file (clôtures), planificateur (escalades)

---

## 1. Démarrage

```bash
cp .env.example .env            # DB_*, INTERNAL_API_SECRET : valeurs du chef de projet
# Une seule fois sur Neon, avant la première migration :
#   CREATE SCHEMA IF NOT EXISTS evaluations;
docker compose up -d --build
docker compose exec api-evaluations php artisan migrate --force
docker compose exec api-evaluations php artisan db:seed --force     # barèmes plateforme (idempotent)
```

Tests (PostgreSQL requis : contraintes et triggers sont testés pour de vrai) :

```bash
composer install
DB_HOST=127.0.0.1 DB_PASSWORD=... vendor/bin/phpunit   # base "sigapei_test"
vendor/bin/pint --test
```

## 2. Sécurité

| Couche | Règle |
|---|---|
| Entrée | `auth.tenant` : `X-Tenant-Id`, `X-User-Id` (uuid), `X-User-Role` (liste fermée) acceptés **uniquement avec `X-Internal-Secret` valide** (32 car. min., temps constant). Sinon 401 : n'importe quel conteneur du réseau pourrait se déclarer administrateur. |
| Rôle | `role:...` sur chaque route (CDC Tableau 1). `super_admin` et `personnel` : aucun accès aux notes individuelles. |
| Relation | `ControleAcces` : enseignant = classes/matières affectées ; apprenant = son dossier ; parent = enfants rattachés. |
| Tenant | Filtre global sur chaque modèle : sans contexte, aucune ligne ; écriture impossible chez un autre tenant. Le contexte est posé **avant** la résolution des paramètres de route. |
| Base | `audit_note`, `surveillance_incident` immuables, `notes` jamais supprimées, `bulletins` archivés non modifiables : **triggers PostgreSQL**, pas seulement du code. |
| Dépendances | Scolarité muette ou contrat incomplet ⇒ **503**, jamais un accès accordé par défaut. |
| Divers | Débit limité (120/min/utilisateur, 10/min sur clôture et contestation), aucun `id` interne exposé, aucune trace d'erreur en réponse, pas de fichier servi par l'API. |

## 3. Règles de calcul (`CalculService`, fonctions pures, arithmétique entière exacte)

Paramétrables par établissement **et** par cycle (`PUT /v1/parametres-notation/{cycle}`) :

| Paramètre | Valeurs (défaut en gras) |
|---|---|
| `methode_moyenne` | **`par_matiere`** : moyenne par matière Σ(note×coef éval)/Σcoef éval, puis Σ(moy. matière×coef matière)/Σcoef matière · `globale` : formule littérale CDC §5 Σ(note×coef éval×coef matière)/Σ(coef éval×coef matière) |
| `decimales` | **2** (0 à 3), arrondi au plus proche, demi vers le haut |
| `note_non_saisie` | **`exclure`** · `zero` (affiché sur le bulletin) |
| `absence_non_justifiee` | **`zero`** · `exclure` (absence justifiée et dispense : toujours exclues) |
| `regle_rattrapage` | **`meilleure`** · `remplacer` · `moyenne` |
| `classement_actif` | **oui** · non |
| `echelle_appreciation` | tranches `[min, max[` contiguës couvrant exactement le barème (la dernière inclut max) — validé à l'enregistrement |

- Une épreuve notée sur 10 ou 40 (`note_sur`) est ramenée sur le barème de la grille.
- **Rang** : calculé sur la moyenne affichée ; ex æquo = même rang, le suivant est décalé (1, 2, 2, 4).
- Grille `competences` : niveaux d'acquisition, ni moyenne ni rang.

## 4. Schéma `evaluations`

| Table | Rôle |
|---|---|
| `grilles_evaluation` | Barèmes : plateforme (`tenant_id` NULL) ou propres à l'établissement |
| `parametres_notation` | Règles de calcul par établissement/cycle |
| `matieres`, `coefficients_matiere` | Référentiel et coefficient par cycle/niveau |
| `periodes` | Trimestres/semestres : `ouverte` → `en_cloture` → `cloturee` |
| `evaluations` | Épreuves (type, coefficient, `note_sur`, rattrapage, verrouillage de saisie) |
| `notes` | **Source unique de tout calcul**, statut (saisie / absences / dispense), verrou optimiste `version` |
| `audit_note` | Journal immuable de toute modification de note (motif, avant/après, après clôture ou non) |
| `bulletins` | Instantanés versionnés à la clôture (contenu + empreinte SHA-256) |
| `modele_bulletin` | Mise en page par cycle (présentation uniquement) |
| `contestation_note` | Contestations apprenant/parent, escalade automatique |
| `surveillance_incident` | Phase 2 |

## 5. Endpoints `/v1`

| Méthode | Endpoint | Rôles |
|---|---|---|
| `GET` | `/grilles?cycle=` | administrateur, enseignant |
| `POST` | `/grilles` | administrateur |
| `GET` / `PUT` | `/parametres-notation/{cycle}` | lecture : admin, enseignant · écriture : admin |
| `POST` | `/modeles-bulletin` | administrateur |
| `GET` / `POST` | `/matieres` · `PUT /matieres/{uuid}` · `PUT /matieres/{uuid}/coefficients` | lecture : admin, enseignant · écriture : admin |
| `GET` / `POST` | `/periodes` | lecture : tous · création : admin |
| `POST` | `/periodes/{uuid}/cloturer` | administrateur — **202**, archivage en tâche de fond |
| `GET` / `POST` | `/evaluations` | admin, enseignant affecté |
| `POST` | `/evaluations/{uuid}/verrouiller` | enseignant de l'évaluation |
| `POST` | `/notes` | enseignant affecté — lot de 1 à 200 notes, `version` obligatoire pour modifier |
| `GET` | `/notes/classe/{uuid}?periode_uuid=&matiere_uuid=` | admin, enseignant affecté |
| `PUT` | `/notes/{uuid}/corriger` | administrateur — motif ≥ 10 car. ; après clôture : nouvelle version des bulletins concernés |
| `GET` | `/bulletins/apprenant/{uuid}?periode_uuid=` | admin, enseignant de la classe, l'apprenant, ses parents |
| `GET` | `/bulletins/apprenant/{uuid}/pdf?periode_uuid=` | idem — voir §7 |
| `GET` | `/classements/classe/{uuid}?periode_uuid=` | admin, enseignant de la classe |
| `GET` / `POST` | `/contestations` · `PUT /contestations/{uuid}/traiter` | ouverture : apprenant, parent · traitement : enseignant de l'évaluation, admin |
| `GET` | `/interne/eligibilite-document/{apprenant_uuid}` | `X-Internal-Secret` + `X-Tenant-Id` (Demandes administratives) |

Erreurs : `{"success": false, "message": "...", "error": {"code": "...", "details": {...}}}` — 409 pour les conflits métier (période clôturée, note modifiée entre-temps...), 422 pour les données invalides, 503 si un service amont ne répond pas.

## 6. Événements RabbitMQ publiés (échange `sigapei.events`, après validation de la transaction)

| Routing key | Quand |
|---|---|
| `evaluations.bulletin.publie` | Clôture : une fois par classe (`periode_uuid`, `classe_uuid`, `apprenants_uuids`) |
| `evaluations.periode.cloturee` | Fin de clôture |
| `evaluations.bulletin.corrige` | Nouvelle version de bulletins après correction |
| `evaluations.note.corrigee` | Correction administrative d'une note |
| `evaluations.contestation.ouverte` / `.traitee` / `.escaladee` | Cycle de vie d'une contestation |

## 7. Contrats demandés aux autres microservices (bloquants pour la mise en service)

Tant qu'ils ne sont pas livrés, les actions concernées répondent **503** (fail closed) :

| Service | Besoin |
|---|---|
| **Scolarité** — `GET /v1/interne/apprenants` | ajouter `utilisateur_uuid` (compte de l'apprenant) et `parents[].parent_uuid` (uuid Identité du parent) |
| **Scolarité** — `GET /v1/interne/emplois-du-temps` | exposer `enseignant_uuid` et `matiere_uuid` (uuid de la matière d'Évaluations) au lieu de `enseignant_id`/`matiere_id`, accepter le filtre `enseignant_uuid` — source des affectations tant que RH n'existe pas |
| **Documents** (transverse) | stockage des PDF et URL signées : la génération PDF des bulletins sera branchée dessus |
| **E-learning** (Roc) | contrat des compositions en ligne (phase 2) |
