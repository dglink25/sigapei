# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Périmètre

Seul le projet **`elearning/`** est actif dans ce dépôt. Les dossiers frères (`identite/`, `inscription/`, `scolarite/`, `vie-scolaire/`) sont d'autres microservices de la plateforme E-Académique, hors du périmètre courant : ne pas les modifier.

## Workflow Git (strict)

Ce dépôt n'utilise PAS le modèle « une branche par fonctionnalité » :

- Une seule branche par développeur pour toute la durée du projet : `feature/prenom` (ex. `feature/roc`). Ne jamais créer d'autre branche.
- Ne jamais pousser sur `main` (réservé au chef de projet) ni sur `develop`.
- Chaque push sur `feature/**` déclenche `.github/workflows/auto-pr.yml`, qui crée puis fusionne automatiquement une PR vers `develop`.
- Récupérer les mises à jour **uniquement depuis `main`** (`git pull origin main`). Ne fusionner `origin/develop` que pour résoudre un conflit.
- Jamais de force-push ; les branches `feature/prenom` ne sont jamais supprimées.

## Commandes

### Stack complète (Docker, depuis `elearning/`)

```bash
docker compose up --build
```

- Backend : http://localhost:8000 - `migrate` + `runserver` lancés automatiquement, hot-reload (code monté en bind mount).
- Frontend : http://localhost:5173 - `npm install` + `vite dev` automatiques, hot-reload (`node_modules` dans un volume dédié).
- SQLite persisté côté hôte : `elearning/elearningback/db.sqlite3`.

### Backend (`elearning/elearningback`)

```bash
pip install -r requirements.txt    # venv local existant : ../elearningenv (auto-ignoré par git)
python manage.py migrate
python manage.py runserver                                  # port 8000
python manage.py test                                        # tous les tests
python manage.py test apps.quiz                              # une seule application
python manage.py test apps.quiz.tests.MaClasse.test_methode # un seul test
```

Aucun linter Python n'est configuré.

### Frontend (`elearning/frontend`)

```bash
npm run dev                # Vite (5173)
npm run build
npm run lint               # ESLint
npx eslint src/App.jsx     # un seul fichier
```

## Architecture

`elearning` est le module E-learning de la plateforme E-Académique : un backend Django 6.1 + Django REST Framework (`elearningback/`) et un frontend React 19 + Vite (`frontend/`, encore au stade du scaffold Vite - pas de routeur, client API ni gestion d'état). Le backend est conçu comme un microservice : il ne duplique aucune donnée des autres services.

### Isolation multi-tenant (socle `apps/core`)

- `TenantMiddleware` (`apps/core/middleware.py`) exige sur toute route `/v1/` l'en-tête `X-Tenant-ID` (UUID valide, exposé en `request.tenant_id`) **et** l'en-tête `X-Role` (`enseignant`, `apprenant`, `parent` ou `administrateur`, exposé en `request.role`) ; l'en-tête facultatif `X-Apprenant-ID` (UUID, `request.apprenant_id`) restreint les rôles apprenant/parent à leurs propres soumissions, tentatives et réponses. Ces en-têtes sont des stand-ins des claims JWT qui seront fournis plus tard par la gateway.
- Tout modèle métier hérite de `BaseModel` (`apps/core/models.py`) : clé primaire `id` interne **jamais exposée** (tous les viewsets utilisent `lookup_field = 'uuid'`), `uuid` public unique, `tenant_id` indexé, `created_at`.
- `TenantSerializerMixin` (refuse un `tenant_id` fourni par le client, injecte celui de la requête à la création) doit être sur tout sérialiseur d'un modèle `BaseModel` ; `TenantViewSetMixin` (filtre chaque queryset par `tenant_id`) doit être sur tout viewset.

### Frontières microservices (règle 4 du cahier des charges)

`matiere_id`, `classe_id`, `enseignant_id`, `apprenant_id`… sont des **UUID externes** (schémas `evaluations.matieres`, `scolarite.classes`/`apprenants`, `rh.personnel`) : jamais de FK locale ni de table copiée. Les intégrations passent par des services :

- `DroitsService` (`apps/core/services.py`) : vérifie `rh.affectations` - permissif et journalisé tant que `DROITS_STRICTS` est absent/`False`.
- `EvaluationsClient` (`apps/core/services.py`) : report des notes vers `evaluations.notes` via `EVALUATIONS_API_URL` ; seul l'UUID `evaluation_note_id` renvoyé est conservé.
- `apps/medias/services.py` : le fichier **ne transite jamais par le backend** - signature d'upload direct Cloudinary calculée localement (sha1, sans SDK) ou URL pré-signée S3/MinIO via boto3 (import paresseux).
- Config lue via `getattr(settings, ...)` ; service absent ⇒ exception `ServiceExterneNonConfigure` ⇒ HTTP 503.

### Applications (`apps/`)

Chaque application suit le même découpage : `models.py` → `serializers.py` → `views.py` (ViewSet DRF) → `urls.py` (DefaultRouter) ; `admin.py` peuplé avec `uuid`/`tenant_id` en readonly.

- `core` - socle commun : BaseModel, mixins, middleware, permissions, énumérations (`choices.py`), services passerelles. `ParametresModule` : singleton de paramétrage par tenant.
- `cours` - cours, leçons imbriquées, affectations cours-classes.
- `devoirs` - devoirs, soumissions avec politique de retard, report de notes.
- `quiz` - quiz, questions, options, tentatives numérotées, réponses, correction/notation.
- `medias` - références de médias hébergés à l'extérieur.
- `bibliotheque` - ressources pédagogiques partagées.
- `reports` - vues agrégées **en lecture seule** transverses aux apps (activité d'un apprenant, statistiques du tenant) ; pas de modèles, seulement `views.py` + `services.py`.

### Règles métier transverses (à respecter dans tout nouveau code)

- **Aucune suppression physique** : `DELETE` est refusé (405) ; l'archivage passe par l'action `POST /v1/<resource>/{uuid}/archiver/` (statut `brouillon`/`publie`/`archive`).
- **Règle 5** : un enseignant ne crée/modifie que pour ses couples matière/classe affectés — appliquée par `EnseignantAffectePermission` sur `create`/`update` quand le triplet (enseignant_id, matiere_id, classe_id) est complet.
- **Rôles (bilan RBAC)** : lecture des contenus pour tous ; écriture pédagogique (y compris actions `archiver`, `leçons`, `questions`, `étapes`), notation, validation de tentative et report de note → enseignant/administrateur ; dépôt de copie → apprenant/parent ; tentatives de quiz → apprenant seul ; `PUT /v1/parametres/` → administrateur ; statistiques du tenant → enseignant/administrateur. Appliqué par `apps/core/permissions.py` à partir de `request.role`.

- Quiz : questions QCM/vrai-faux notées en tout-ou-rien dès la soumission (`note_finale`) ; questions ouvertes en correction IA asynchrone (stub à intégrer, Celery prévu) ; note totale recalculée par `recalculer_note_totale`.
- Devoirs : `politique_retard` = `blocage` (tout dépôt après `date_limite` refusé) ou `penalite` (dépôt accepté, marqué `en_retard`).

### Conventions

- Tout est en français : docstrings, `verbose_name`, messages d'erreur, payloads API.
- Énumérations partagées centralisées dans `apps/core/choices.py` (`TextChoices`).
- `db_table` explicite en snake_case français sur chaque modèle.

## État du câblage (à vérifier avant de conclure à un bug)

Les applications sont écrites mais **pas encore branchées** dans `elearningback/settings.py` / `elearningback/urls.py` :

- `rest_framework` et les apps `apps.*` ne figurent pas dans `INSTALLED_APPS` ; `TenantMiddleware` n'est pas dans `MIDDLEWARE` ; l'URLconf racine ne monte que `/admin/`. Aucune migration n'a encore été générée.
- `requirements.txt` ne liste que Django : `djangorestframework` (importé par tout le code) et `boto3` (S3) manquent.

Conséquence : `runserver` démarre mais ne sert aucune route `/v1/`. Le câblage attendu consiste à enregistrer les apps et à inclure chaque routeur d'app sous le préfixe `v1/` (les chemins `/v1/...` sont documentés dans les docstrings des vues). Tester ensuite avec l'en-tête requis, ex. :

```bash
curl -H "X-Tenant-ID: <uuid>" -H "X-Role: enseignant" http://localhost:8000/v1/cours/
```
Les commandes a grande sortie comme build ou migrate ou autre(npm.cmd --prefix E:\Projets\chabelPortfolio\frontend run lint) de ce genre ne doivent pas etre lancé. Evoie les et je les lancerer.
les temps de raisonnement ne doivent pas depasser 1min
