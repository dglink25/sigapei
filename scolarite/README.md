# scolarite — Microservice Scolarité — SIGAPEI

Microservice de gestion administrative et pédagogique de la plateforme **SIGAPEI** :
cycles, niveaux, filières et classes, calcul de capacité en temps réel, tenue du dossier unique de l'apprenant,
mutations et transferts internes sans duplication de fiches, plannings et emplois du temps,
gestion différenciée du compte selon le programme pédagogique (béninois vs français), et
consultation consolidée en lecture seule pure des paiements de scolarité.

- **Port** : `4004`
- **Documentation interactive (JSON)** : `http://localhost:4004/docs`
- **Documentation technique détaillée** : [docs/api-documentation.md](docs/api-documentation.md)
- **Préfixe API** : toutes les routes métier sont sous `/v1/...` (ex: `GET /v1/classes`)
- **Sonde de santé** : `GET /sante`
- **Stack** : Laravel (PHP 8.2+), PostgreSQL (schéma `scolarite` de la base unique partagée Neon), Redis (partagé), RabbitMQ (partagé).

---

## 1. Démarrage rapide

### 1.1. Avec Docker (Stack intégrée au réseau partagé)

```bash
cp .env.example .env
# -> Complétez .env avec les valeurs fournies par le chef de projet (voir section 3)

# Créer le réseau partagé s'il n'existe pas encore
docker network create sigapei

docker compose up -d --build
```

Puis, une seule fois pour appliquer les tables du schéma `scolarite` :
```bash
docker compose exec api-scolarite php artisan migrate
docker compose exec api-scolarite php artisan db:seed --class=ScolariteSeeder
```

Le microservice démarre sur **http://localhost:4004**.

### 1.2. Sans Docker (Développement local)

```bash
composer install
cp .env.example .env
# -> Ajustez DB_HOST, REDIS_HOST, RABBITMQ_URL vers localhost ou Neon

php artisan key:generate
php artisan migrate
php -S 0.0.0.0:4004 -t public
```

---

## 2. Intégration à l'infrastructure partagée SIGAPEI

Ce microservice constitue le cœur administratif et la source de vérité pédagogique de la plateforme SIGAPEI :
1. **Base de données unique (Neon PostgreSQL)** : Le service utilise la même base `neondb` que les 11 autres microservices, mais opère en tant que propriétaire exclusif du schéma `scolarite`.
2. **Réseau Docker commun (`sigapei`)** : Rejoint le réseau externe partagé où tournent déjà les conteneurs Redis et RabbitMQ (démarrés par `identite`).
3. **Source de vérité unique sans duplication** : Tous les autres microservices (Évaluations, Finances, Vie scolaire, Communication) se réfèrent au dossier unique de l'apprenant géré ici. Aucune recopie d'information pédagogique n'est tolérée sur la plateforme.

---

## 3. Configuration à réaliser vous-même (obligatoire)

Toute la configuration s'effectue via le fichier `.env` (copie de `.env.example`).

### 3.1. Base de données PostgreSQL (Neon)

Le microservice est propriétaire exclusif du schéma `scolarite` dans la base unique managée Neon :
* `DB_HOST=your-neon-project.pooler.region.aws.neon.tech`
* `DB_PORT=5432`
* `DB_DATABASE=neondb`
* `DB_USERNAME` & `DB_PASSWORD` : fournis par le chef de projet.
* `DB_SCHEMA=scolarite` : ne jamais modifier.
* `DB_SSLMODE=require` : **obligatoire** avec Neon.

> [!IMPORTANT]
> Avant la toute première migration sur un environnement vierge, le schéma doit être créé une fois :
> ```sql
> CREATE SCHEMA IF NOT EXISTS scolarite;
> ```
> Ensuite, lancez `php artisan migrate`.

### 3.2. Redis (Partagé)

* `REDIS_HOST=redis` (ou `localhost` en dev local sans Docker).
* `REDIS_PORT=6379`
* `REDIS_PASSWORD=` (laissez vide si pas de mot de passe).
* `REDIS_DB=3` : base Redis dédiée à `scolarite` (0 pour `identite`, 1 pour `etablissements`, 2 pour `inscription`).

### 3.3. RabbitMQ (Bus d'événements partagé)

* `RABBITMQ_HOST=rabbitmq` (ou `localhost`)
* `RABBITMQ_PORT=5672`
* `RABBITMQ_USER=sigapei`
* `RABBITMQ_PASSWORD=change-me`
* `RABBITMQ_EXCHANGE=sigapei.events`
* `RABBITMQ_QUEUE_SCOLARITE=scolarite.events`

### 3.4. Secret interne partagé (`INTERNAL_API_SECRET`)

* `INTERNAL_API_SECRET` : chaîne partagée avec la Gateway et les autres microservices.
* Doit être identique à la valeur configurée dans `identite` et `etablissements`.
* Envoyée dans le header `X-Internal-Secret` lors des appels entre microservices (notamment pour `/v1/interne/*`).

### 3.5. Stockage Objet (S3 / MinIO)

Pour les pièces et documents rattachés au dossier de l'apprenant :
* `FILESYSTEM_DISK=s3`
* `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_BUCKET=sigapei-documents`, `AWS_DEFAULT_REGION=us-east-1`
* Pour MinIO en local : `AWS_ENDPOINT=http://minio:9000` et `AWS_USE_PATH_STYLE_ENDPOINT=true`.

---

## 4. Règles métier & Algorithmes clés

### 4.1. Règle du programme pédagogique (Béninois vs Français)

Chaque classe est obligatoirement rattachée à un programme pédagogique via la colonne `programme` (`beninois` ou `francais`) :

1. **Programme Béninois** :
   * L'élève n'a **aucun compte utilisateur propre** (`utilisateur_id` est strictly `NULL`), quel que soit son cycle (primaire ou secondaire).
   * L'accès à son espace (notes, devoirs, emploi du temps, demandes) s'effectue exclusivement via le compte de son parent rattaché (`scolarite.parents_apprenants`).
   * *Raison terrain* : interdiction formelle du téléphone aux élèves durant l'année scolaire.
2. **Programme Français** :
   * Compte optionnel au primaire, compte utilisateur propre créé et actif dès le cycle secondaire.
3. **Cycle Universitaire** :
   * L'étudiant reste dans tous les cas titulaire autonome de son compte, quel que soit le programme.
4. **Mutation Béninois $\rightarrow$ Français** :
   * En cas de transfert vers une classe du programme français, le système détecte l'absence de compte et active l'indicateur `compte_apprenant_a_creer: true`, permettant au microservice Identité de provisionner le compte élève sans jamais recréer son dossier scolaire.

### 4.2. Calcul de capacité en temps réel (`GET /v1/classes/{uuid}/disponibilite`)

* La capacité restante est calculée à la volée : `places_disponibles = max(0, capacite - inscrits_actifs)`.
* Ce calcul est consommé de façon synchrone par le microservice `inscription` lors de l'admission : aucune inscription ne peut forcer une classe complète.

### 4.3. Transferts & Mutations internes sans duplication

Lorsqu'un élève change de classe en cours d'année (`POST /v1/apprenants/{uuid}/transfert`) :
* La classe de destination est vérifiée (capacité et appartenance au même établissement).
* **La fiche apprenant n'est jamais dupliquée** : seul `classe_id` est mis à jour sur la ligne existante dans `scolarite.apprenants`.
* Une entrée d'audit et de traçabilité est immédiatement enregistrée dans `scolarite.historique_classes`.
* Les modules Évaluations, Vie scolaire et Finances voient la nouvelle classe
  de l'élève en interrogeant l'API interne de Scolarité (§ 4.6), et non par
  jointure SQL sur le schéma `scolarite` : la donnée n'est ni dupliquée ni
  répliquée, elle reste chez son propriétaire.

### 4.4. Suivi des paiements de scolarité (Lecture seule pure)

* `GET /v1/apprenants/{uuid}/paiements-scolarite` fournit une vue financière consolidée (échéances, total dû, total réglé, solde restant, statut).
* **Règle absolue d'architecture** : cette fonction est **strictement en lecture seule**. Aucune facture, aucun reçu ni aucune transaction ne sont émis ou modifiés depuis ce microservice. Cette responsabilité appartient exclusivement au microservice Finances.
* La vue est obtenue via l'API interne de Finances. Scolarité ne lit plus
  les tables `finances.*` et ne peut en aucun cas les modifier.

### 4.5. Emplois du temps

* Planning complet croisant classe, matière, enseignant et créneau horaire.
* Consultation filtrable par classe, par enseignant ou par jour de la semaine.

### 4.6. API interne — Scolarité est le seul propriétaire du schéma

**Règle n°1 du README racine** : un microservice ne lit ni n'écrit les tables
d'un autre microservice, même si tous partagent la même base PostgreSQL. Les
échanges passent par ces endpoints, protégés par `X-Internal-Secret`
(règle n°3). Aucun de ces appels ne vérifie de JWT (règle n°5) : l'identité
de l'appelant est portée par le secret interne.

| Méthode | Route | Consommée par |
|---|---|---|
| `GET` | `/v1/interne/apprenants` | Vie scolaire, Inscription, Évaluations |
| `POST` | `/v1/interne/apprenants` | Inscription (validation d'admission) |
| `POST` | `/v1/interne/apprenants/transfert` | Inscription (réinscription) |
| `GET` | `/v1/interne/emplois-du-temps` | Vie scolaire, Évaluations |
| `GET` | `/v1/interne/classes/disponibilite` | Inscription (contrôle de capacité) |
| `GET` | `/v1/interne/apprenants/{uuid}/classe` | Évaluations, Finances |

`GET /v1/interne/apprenants` accepte les filtres `uuid`, `id`, `uuids`, `ids`,
`classe_uuid` et `statut` (séparés par des virgules pour les listes).

`POST /v1/interne/apprenants` applique la **règle pédagogique** (section 4.1) :
c'est Scolarité, propriétaire du schéma, qui décide qu'un élève du programme
béninois n'a pas de compte, et qui refuse lui-même une classe à capacité
maximale plutôt que de faire confiance à l'appelant.

`POST /v1/interne/apprenants/transfert` est déclarée **avant** la route
`/interne/apprenants/{uuid}` afin que le segment paramétré n'absorbe pas le
mot `transfert`.

### 4.7. Convention `tenant_id` : deux usages à connaître

Le claim `tenantId` du JWT Identité est un **uuid**, alors que les colonnes
`tenant_id` des schémas `scolarite` et `inscription` sont des **bigint**.
`TenantResolver` fait la conversion via l'API interne d'Établissements.

Deux conventions coexistent aujourd'hui sur la plateforme :

| Contexte | Format | Origine |
|---|---|---|
| Requête utilisateur | uuid | claim `tenantId` du JWT |
| Appel interne Gateway | entier | header `X-Tenant-Id` |

`TWO_TENANT_CONVENTIONS_ENABLED=true` (défaut `false`) accepte un tenant
déjà numérique sans appel réseau, ce qui rend Scolarité compatible avec
`vie-scolaire` qui impose un `X-Tenant-Id` numérique. **À retirer dès que la
plateforme tranche une convention unique.**

---

## 5. Ce qui vit dans Redis (et pourquoi)

| Donnée | Clé Redis | TTL | Rôle |
|---|---|---|---|
| Cache disponibilité classe | `scolarite:classe:dispo:<uuid>` | 30 secondes | Réduit la charge SQL lors des vagues de consultations d'admission |
| Cache emploi du temps classe | `scolarite:edt:classe:<uuid>` | 1 heure | Accélère le chargement quotidien des emplois du temps pour les élèves et parents |
| Cache emploi du temps enseignant | `scolarite:edt:prof:<id>` | 1 heure | Planning individuel de l'enseignant |
| Cache info interne apprenant | `scolarite:interne:apprenant:<uuid>` | 15 minutes | Réduit la latence lors des appels inter-services répétés (Évaluations/Finances) |

---

## 6. RabbitMQ — Bus d'événements inter-microservices

Événements publiés sur l'exchange `sigapei.events` au format standard `@nestjs/microservices` :

### 6.1. Événements publiés

| Événement publié | Déclenché quand | Consommateurs prévus |
|---|---|---|
| `apprenant.transfere` | Mutation de classe réussie | **Vie scolaire** (mise à jour des listes d'appel), **Évaluations** (bulletins), **Communication** (notification aux parents et enseignants concernés) |
| `classe.creee` | Nouvelle classe configurée | **Vie scolaire**, **Évaluations** |
| `creneau.modifie` | Modification d'un créneau d'emploi du temps | **Communication** (alerte changement de planning aux élèves et parents) |

### 6.2. Événements consommés

| Événement consommé | Source | Action effectuée |
|---|---|---|
| `candidature.validee` | `inscription` | Confirmation d'enregistrement et actualisation du cache de disponibilité |
| `etablissement.suspendu` | `etablissements` | Invalidation des caches et blocage des opérations administratives pour ce tenant |

---

## 7. Toutes les routes de l'API

Toutes les routes métier sont sous le préfixe `/v1` :

| Méthode | Route | Accès | Rôle |
|---|---|---|---|
| `GET` | `/docs` | Public | **Catalogue interactif JSON** de tous les endpoints et formats |
| `GET` | `/sante` | Public | Sonde de santé du microservice |
| `GET` | `/v1/classes` | Authentifié (`JWT`) | Liste des classes avec programme et capacité |
| `POST` | `/v1/classes` | Authentifié (Admin) | Création d'une classe, d'un niveau ou d'une filière |
| `GET` | `/v1/classes/{uuid}/disponibilite` | Authentifié (`JWT`) | Capacité restante en temps réel (consommé par Inscription) |
| `GET` | `/v1/apprenants/{uuid}` | Authentifié (`JWT`) | Dossier complet (état civil, classe, historique, parents) |
| `POST` | `/v1/apprenants/{uuid}/transfert` | Authentifié (Admin/Personnel) | Transfert de classe sans duplication de dossier |
| `GET` | `/v1/apprenants/{uuid}/paiements-scolarite` | Authentifié | Vue consolidée des paiements (lecture seule pure) |
| `GET` | `/v1/emplois-du-temps` | Authentifié | Consultation planning (par classe, prof ou jour) |
| `POST` | `/v1/emplois-du-temps` | Authentifié (Admin/Censeur) | Création ou modification d'un créneau de cours |
| `GET` | `/v1/interne/apprenants/{uuid}/classe` | Secret partagé (`X-Internal-Secret`) | Endpoint interne pour Évaluations, Finances, Vie scolaire |
| `GET` | `/v1/interne/apprenants` | Secret partagé | Liste/filtre des apprenants |
| `POST` | `/v1/interne/apprenants` | Secret partagé | Création d'un apprenant (validation d'admission) |
| `POST` | `/v1/interne/apprenants/transfert` | Secret partagé | Mutation de classe demandée par un autre microservice |
| `GET` | `/v1/interne/emplois-du-temps` | Secret partagé | Emplois du temps (filtres classe, enseignant, jour) |
| `GET` | `/v1/interne/classes/disponibilite` | Secret partagé | Capacité temps réel, contrôle bloquant d'admission |

> [!TIP]
> Pour consulter les schémas JSON complets de requêtes, réponses réussies et codes d'erreur détaillés, consultez [docs/api-documentation.md](docs/api-documentation.md) ou exécutez `GET http://localhost:4004/docs`.

---

## 8. Structure du projet

```
scolarite/
├── bootstrap/
│   └── app.php                  Initialisation du framework
├── config/
│   ├── app.php, cors.php        Configuration générale & CORS
│   └── database.php             Connexion PostgreSQL Neon (schéma scolarite)
├── docker/
│   └── init-db.sql              Création du schéma scolarite & extensions
├── docs/
│   └── api-documentation.md     Documentation exhaustive de l'API
├── public/
│   └── index.php                Point d'entrée HTTP (avec /docs et /sante directs)
├── routes/
│   └── api.php                  Définition des routes /v1
├── src/
│   ├── classes/                 Gestion des cycles, niveaux, filières et classes
│   │   ├── Classe.php
│   │   ├── classe.controller.php
│   │   ├── classe.service.php
│   │   └── classe.repository.php
│   ├── apprenants/              Dossiers élèves, mutations & historique
│   │   ├── Apprenant.php
│   │   ├── HistoriqueClasse.php
│   │   ├── ParentApprenant.php
│   │   ├── apprenant.controller.php
│   │   ├── apprenant.service.php
│   │   ├── apprenant.repository.php
│   │   └── transfert.service.php
│   ├── emplois-du-temps/        Gestion des plannings de cours
│   │   ├── EmploiDuTemps.php
│   │   ├── emploi-du-temps.controller.php
│   │   ├── emploi-du-temps.service.php
│   │   └── emploi-du-temps.repository.php
│   ├── integrations/            Clients API internes (Identité, Établissements, Finances)
│   │   └── FinancesClient.php   Lecture seule pure via l'API interne de Finances
│   ├── interne/                 API interne consommée par les autres microservices
│   │   └── InterneController.php Apprenants, EDT, capacité, création, mutation
│   ├── docs/                    Contrôleur et données du catalogue /docs
│   │   ├── DocsController.php
│   │   └── DocsData.php
│   ├── common/                  Socle transverse multi-tenant
│   │   ├── Middleware/VerifyTenantAndJwt.php  JWT + résolution du tenant
│   │   ├── Middleware/VerifyRole.php          Contrôle RBAC par rôle
│   │   ├── Scopes/TenantScope.php             Cloisonnement ORM (échec fermé)
│   │   ├── Traits/HasTenant.php & HasUuid.php
│   │   ├── Services/InterneClient.php         Client HTTP des API internes
│   │   ├── Services/TenantResolver.php        Résolution uuid ↔ bigint
│   │   ├── Services/AuditService.php
│   │   └── Responses/ApiResponse.php
│   └── database/
│       ├── migrations/          Création des tables du schéma scolarite
│       └── seeders/             Données de test (classes béninoises et françaises)
├── tests/
│   └── Unit/                    Tests unitaires capacité & programmes
├── .env.example
├── composer.json
├── docker-compose.yml
├── Dockerfile
└── README.md
```

---

## 9. Sécurité (Garanties techniques appliquées)

* **Cloisonnement multi-tenant strict** : isolation garantie au niveau de l'ORM par `TenantScope` (`tenant_id`).
* **Protection des identifiants** : seuls les `uuid` sont exposés aux clients. Les identifiants `id` bigint sont réservés aux jointures internes.
* **Strict need-to-know pour les mineurs** : accès aux coordonnées des parents et dossiers élèves strictement restreint aux profils habilités.
* **Intégrité financière** : isolation stricte interdisant toute écriture sur les tables financières depuis Scolarité.
* **Auditabilité** : traçabilité horodatée de chaque transfert, modification de structure ou changement de créneau dans `audit_log`.
