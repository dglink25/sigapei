# api-rh — Microservice Ressources Humaines — SIGAPEI

Personnel, grades, contrats, affectations (matière ↔ classe ↔ enseignant), congés et
**rôles RH personnalisés**. Source de vérité de la **règle 5** de la plateforme : les
autres microservices (E-learning, Évaluations, Vie scolaire) vérifient ici qu'un
enseignant est bien affecté avant toute écriture.

- **Port interne** : `4009` (non publié, accès via la Gateway sur le réseau `sigapei`)
- **Préfixe API** : `/v1/...` — **Santé** : `GET /health` (et `/sante`)
- **Stack** : Laravel 12, PHP 8.4, PostgreSQL schéma `rh`, Redis DB `7`, RabbitMQ
- **Documentation technique complète** : [`docs/documentation-technique.md`](docs/documentation-technique.md)

---

## 1. Démarrage

1. `cp .env.example .env` puis renseigner `DB_*` et `INTERNAL_API_SECRET` (valeurs du chef de projet) et `php artisan key:generate`.
2. **Migrations : utiliser l'hôte Neon DIRECT** (sans `-pooler` dans `DB_HOST`). Le pooler (PgBouncer) ne conserve pas le `search_path`.
3. Créer le schéma **une seule fois** (une migration ne peut pas le faire : la table `migrations` y est créée avant toute migration) :
   ```bash
   php artisan tinker --execute="DB::statement('CREATE SCHEMA IF NOT EXISTS rh')"
   ```
4. Vérifier, migrer, vérifier :
   ```bash
   php artisan rh:diagnostic-base   # lecture seule : schémas, tables, droits
   php artisan migrate --force
   php artisan db:seed --force      # grades par défaut si RH_SEED_TENANT_ID est défini
   php artisan rh:diagnostic-base
   ```
5. Docker : `docker compose up -d --build` (API, worker, planificateur).

Tests (PostgreSQL requis : contraintes et index partiels sont testés pour de vrai) :

```bash
composer install
DB_HOST=127.0.0.1 DB_PASSWORD=... vendor/bin/phpunit   # base "sigapei_test"
vendor/bin/pint --test
```

## 2. Sécurité

| Couche | Règle |
|---|---|
| Entrée | `auth.tenant` : `X-Tenant-Id`, `X-User-Id`, `X-User-Role` acceptés **uniquement avec `X-Internal-Secret` valide** (32 car. min., temps constant). |
| Rôle | Gestion RH réservée à `administrateur` (lecture partagée avec `personnel`). |
| Rôles RH | `DroitsRh` croise `personnel_roles_rh` et `role_rh_modules` pour exposer les fonctions du module accordées (`GET /v1/rh/mes-fonctions`), **en complément** du rôle de plateforme. |
| Tenant | Filtre global sur chaque modèle : sans contexte, aucune ligne ; écriture impossible chez un autre tenant. |
| Interne | `/v1/interne/*` protégé par `X-Internal-Secret` uniquement, tenant fourni par le paramètre `tenant_id`. |
| Archivage | Aucune suppression physique : statuts (`inactif`, `retraite`, `termine`, `annulee`). |

## 3. Schéma `rh`

| Table | Rôle |
|---|---|
| `personnel` | Membre du personnel (enseignant, administratif, direction…) ; `utilisateur_uuid` = compte Identité (externe) |
| `grades` | Référentiel des grades / corps par établissement |
| `contrats` | Contrats de travail (un seul actif sans date de fin par membre, garanti par index partiel) |
| `affectations` | **Source de vérité règle 5** : personnel ↔ `matiere_uuid` ↔ `classe_uuid` (UUID **externes**) par année scolaire |
| `conges` | Demandes de congé et leur cycle de validation |
| `roles_rh` | **Rôles RH personnalisés** (CDC §7.7) : nom libre, description, `actif`/`archive` |
| `role_rh_modules` | **Fonctions accordées à un rôle** (CDC §7.8) : `dossiers`, `affectations`, `charges_horaires`, `conges`, `evaluations`, `contrats_intervenants` |
| `personnel_roles_rh` | **Rattachement rôle** (CDC §7.9) : personnel ↔ rôle RH, cumul possible, `date_attribution` |

Aucune FK vers les autres schémas : `matiere_uuid` (schéma `evaluations`) et
`classe_uuid` (schéma `scolarite`) sont des références externes (règle 4).
Les tables `roles_rh`, `role_rh_modules` et `personnel_roles_rh` sont **internes** au
schéma `rh` : leurs clés étrangères sont locales.

## 4. Endpoints `/v1`

| Méthode | Endpoint | Rôles |
|---|---|---|
| `GET` / `POST` | `/personnel` | lecture : administrateur, personnel · écriture : administrateur |
| `GET` / `PUT` | `/personnel/{uuid}` | lecture : administrateur, personnel · écriture : administrateur |
| `POST` | `/personnel/{uuid}/statut` | administrateur |
| `GET` | `/personnel/{uuid}/affectations` | administrateur, personnel |
| `GET` / `POST` | `/personnel/{uuid}/roles-rh` | administrateur |
| `POST` | `/personnel/{uuid}/roles-rh/{roleUuid}/retirer` | administrateur |
| `GET` / `POST` | `/grades` · `PUT /grades/{uuid}` | lecture : admin, personnel · écriture : admin |
| `GET` / `POST` | `/contrats` · `PUT /contrats/{uuid}` · `POST /contrats/{uuid}/cloturer` | lecture : admin, personnel · écriture : admin |
| `GET` / `POST` | `/affectations` · `GET`/`PUT /affectations/{uuid}` · `POST /affectations/{uuid}/cloturer` | lecture : admin, personnel · écriture : admin |
| `GET` / `POST` | `/conges` · `GET /conges/{uuid}` · `PUT /conges/{uuid}/traiter` | demande : admin, personnel, enseignant · traitement : admin |
| **`GET` / `POST`** | **`/roles-rh`** | **administrateur** |
| **`GET` / `PUT`** | **`/roles-rh/{uuid}`** | **administrateur** |
| **`PATCH`** | **`/roles-rh/{uuid}/modules`** (sélection des fonctions) | **administrateur** |
| **`POST`** | **`/roles-rh/{uuid}/archiver`** | **administrateur** |
| **`GET`** | **`/rh/mes-fonctions`** (moteur de rôles RH) | **admin, personnel, enseignant** |
| `GET` | `/interne/personnel`, `/interne/personnel/utilisateur/{uuid}`, `/interne/affectations`, `/interne/affectations/verifier` | `X-Internal-Secret` |

## 5. Contrats internes consommés par les autres microservices

| Consommateur | Endpoint | Usage |
|---|---|---|
| E-learning (`DroitsService`) | `GET /v1/interne/affectations/verifier?tenant_id=&enseignant_uuid=&matiere_uuid=&classe_uuid=` | autorisation de création/modification sur un couple (matière, classe) |
| Évaluations (`RhClient`) | `GET /v1/interne/affectations/verifier` | contrôle d'affectation de l'enseignant |
| Vie scolaire (`RhClient`) | `GET /v1/interne/personnel?tenant_id=&uuid=` (ou `&id=`) | résolution du personnel (auteur d'incident, correcteur) |

## 6. Événements RabbitMQ publiés (échange `sigapei.events`)

| Routing key | Quand |
|---|---|
| `rh.personnel.cree` · `rh.personnel.statut.change` | création / changement de statut |
| `rh.contrat.cree` · `rh.contrat.cloture` | cycle de vie d'un contrat |
| `rh.affectation.cree` · `rh.affectation.cloture` | cycle de vie d'une affectation |
| `rh.conge.demande` · `rh.conge.traite` | demande et décision de congé |
| `rh.role.cree` · `rh.role.modules.definis` · `rh.role.archive` | cycle de vie d'un rôle RH |
| `rh.role.attribue` · `rh.role.retire` | rattachement / retrait d'un rôle RH à un membre |
