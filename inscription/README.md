# inscription — Microservice Inscription (Admissions) — SIGAPEI

Microservice de gestion du parcours d'admission et de réinscription de la plateforme **SIGAPEI** :
constitution des dossiers de candidature, gestion des pièces justificatives (stockage objet S3/MinIO),
évaluation des tests d'admission, validation d'affectation avec contrôle bloquant de capacité,
règle de compte selon le programme pédagogique (béninois vs français), et reconduction
d'une année scolaire sur l'autre sans duplication de dossiers.

- **Port** : `4003`
- **Documentation interactive (JSON)** : `http://localhost:4003/docs`
- **Documentation technique détaillée** : [docs/api-documentation.md](docs/api-documentation.md)
- **Préfixe API** : toutes les routes métier sont sous `/v1/...` (ex: `POST /v1/candidatures`)
- **Sonde de santé** : `GET /sante`
- **Stack** : Laravel (PHP 8.2+), PostgreSQL (schéma `inscription` de la base unique partagée Neon), Redis (partagé), RabbitMQ (partagé).

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

Puis, une seule fois pour appliquer les tables du schéma `inscription` :
```bash
docker compose exec api-inscription php artisan migrate
docker compose exec api-inscription php artisan db:seed --class=InscriptionSeeder
```

Le microservice démarre sur **http://localhost:4003**.

### 1.2. Sans Docker (Développement local)

```bash
composer install
cp .env.example .env
# -> Ajustez DB_HOST, REDIS_HOST, RABBITMQ_URL vers localhost ou Neon

php artisan key:generate
php artisan migrate
php -S 0.0.0.0:4003 -t public
```

---

## 2. Intégration à l'infrastructure partagée SIGAPEI

Ce microservice fait partie de la plateforme SIGAPEI (12 microservices). Conformément aux règles d'architecture transversales :
1. **Base de données unique (Neon PostgreSQL)** : Le service utilise la même base `neondb` que les autres microservices, mais opère en tant que propriétaire exclusif du schéma `inscription`.
2. **Réseau Docker commun (`sigapei`)** : Rejoint le réseau externe partagé où tournent déjà les conteneurs Redis et RabbitMQ (lancés par `identite`).
3. **Zéro duplication de données** : Les informations appartenant à d'autres services (statut du tenant, capacité de classe, identité) ne sont jamais copiées en dur ; les interactions s'opèrent par API interne (`/interne/*` + secret partagé) ou via les événements RabbitMQ.

---

## 3. Configuration à réaliser vous-même (obligatoire)

Toute la configuration s'effectue via le fichier `.env` (copie de `.env.example`).

### 3.1. Base de données PostgreSQL (Neon)

Le microservice est propriétaire exclusif du schéma `inscription` dans la base unique managée Neon :
* `DB_HOST=your-neon-project.pooler.region.aws.neon.tech`
* `DB_PORT=5432`
* `DB_DATABASE=neondb`
* `DB_USERNAME` & `DB_PASSWORD` : fournis par le chef de projet.
* `DB_SCHEMA=inscription` : ne jamais modifier.
* `DB_SSLMODE=require` : **obligatoire** avec Neon (refuse toute connexion en clair).

> [!IMPORTANT]
> Avant la toute première migration sur un environnement vierge, le schéma doit être créé une fois :
> ```sql
> CREATE SCHEMA IF NOT EXISTS inscription;
> ```
> Ensuite, lancez `php artisan migrate`.

### 3.2. Redis (Partagé)

* `REDIS_HOST=redis` (ou `localhost` en dev local sans Docker).
* `REDIS_PORT=6379`
* `REDIS_PASSWORD=` (laissez vide si pas de mot de passe).
* `REDIS_DB=2` : base Redis dédiée à `inscription` (0 pour `identite`, 1 pour `etablissements`).

### 3.3. RabbitMQ (Bus d'événements partagé)

* `RABBITMQ_HOST=rabbitmq` (ou `localhost`)
* `RABBITMQ_PORT=5672`
* `RABBITMQ_USER=sigapei`
* `RABBITMQ_PASSWORD=change-me`
* `RABBITMQ_EXCHANGE=sigapei.events`
* `RABBITMQ_QUEUE_INSCRIPTION=inscription.events`

### 3.4. Secret interne partagé (`INTERNAL_API_SECRET`)

* `INTERNAL_API_SECRET` : chaîne partagée avec la Gateway et les autres microservices.
* Doit être identique à la valeur configurée dans `identite` et `etablissements`.
* Envoyée dans le header `X-Internal-Secret` lors des appels entre microservices.

### 3.5. CAPTCHA partagé (reCAPTCHA v3 / hCaptcha)

* `CAPTCHA_PROVIDER=recaptcha`
* `CAPTCHA_SECRET_KEY=change-me` (clé secrète serveur uniquement, fournie par le chef de projet).
* `CAPTCHA_MIN_SCORE=0.5`
* Vérifié systématiquement lors de la soumission publique d'un dossier de candidature (`POST /v1/candidatures`).

### 3.6. Stockage Objet (S3 / MinIO)

Les pièces justificatives (actes de naissance, bulletins scolaires antérieurs, photos) sont stockées dans l'espace objet partagé, jamais dans la base de données :
* `FILESYSTEM_DISK=s3`
* `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_BUCKET=sigapei-documents`, `AWS_DEFAULT_REGION=us-east-1`
* Pour MinIO en local : `AWS_ENDPOINT=http://minio:9000` et `AWS_USE_PATH_STYLE_ENDPOINT=true`.

---

## 4. Règles métier & Parcours clés

### 4.1. Parcours complet d'une admission

```
[Parent / Secrétaire]
        │
        ▼ (POST /v1/candidatures - avec captchaToken)
┌────────────────────────────────────────────────────────┐
│ 1. Création Candidature (statut: 'soumise')           │
└────────────────────────────────────────────────────────┘
        │
        ├─► Dépôt des pièces justificatives (POST .../pieces-justificatives)
        ├─► Saisie des résultats de tests (POST .../tests-admission)
        │
        ▼ (POST /v1/candidatures/{uuid}/valider)
┌────────────────────────────────────────────────────────┐
│ 2. Contrôle d'activation du module (Établissements)    │
└────────────────────────────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────────────────────┐
│ 3. Vérification bloquante de capacité (Scolarité)      │
│    (capacite - inscrits <= 0 ==> ERREUR_CLASSE_PLEINE)  │
└────────────────────────────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────────────────────┐
│ 4. Insertion directe dans scolarite.apprenants         │
│    - Règle programme pédagogique appliquée             │
│    - Rattachement parent dans scolarite.parents        │
│    - Statut candidature -> 'validee'                   │
└────────────────────────────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────────────────────┐
│ 5. Publication événement RabbitMQ 'candidature.validee'│
│    -> Communication notifie le parent (SMS / WhatsApp) │
└────────────────────────────────────────────────────────┘
```

### 4.2. Règle du programme pédagogique (Béninois vs Français)

Conformément à la décision d'équipe validée dans le cahier des charges :
* **Programme Béninois** : les élèves n'ayant pas le droit de disposer d'un smartphone durant l'année scolaire, **aucun compte utilisateur de connexion n'est créé** pour l'élève (`utilisateur_id` est strictly `NULL`), que ce soit au primaire ou au secondaire. L'accès à son espace (notes, devoirs, emploi du temps) s'effectue exclusivement via le compte de son parent rattaché (`scolarite.parents_apprenants`).
* **Programme Français** : compte optionnel au primaire, compte utilisateur propre créé et actif dès le cycle secondaire.
* **Cycle Universitaire** : étudiant autonome avec compte propre systématique.

### 4.3. Vérification de capacité bloquante et en temps réel

Aucune admission ne peut contourner la capacité maximale d'une classe :
* La vérification s'opère en direct sur `scolarite.classes` au moment de la transaction de validation.
* Si le nombre d'inscrits actifs atteint la capacité, la validation échoue immédiatement avec le code `ERREUR_VALIDATION_CANDIDATURE` et le message explicite `La classe a atteint sa capacité maximale`.

### 4.4. Création directe sans duplication

* La validation de la candidature insère immédiatement l'élève dans `scolarite.apprenants`.
* La ligne de candidature conserve le lien de traçabilité et sert d'archive immuable de l'admission d'origine.
* Aucune resynchronisation, aucun import/export : la donnée est immédiatement visible par Évaluations, Finances et Vie Scolaire.

### 4.5. Rejet obligatoirement motivé

* Le rejet d'une candidature (`POST /v1/candidatures/{uuid}/rejeter`) exige un champ `motif` (minimum 5 caractères).
* Le statut passe à `rejetee` et le motif est conservé pour que le parent ou candidat puisse le consulter en toute transparence.
* Une candidature déjà validée ne peut pas être rejetée (opération irréversible côté admission).

### 4.6. Réinscriptions sans duplication

* Le endpoint `POST /v1/reinscriptions` permet de reconduire un apprenant existant sur une nouvelle année scolaire.
* Met à jour `classe_id` sur la fiche apprenant existante et consigne le changement dans `scolarite.historique_classes`.
* **Aucun doublon de fiche apprenant n'est créé.**

---

## 5. Ce qui vit dans Redis (et pourquoi)

Pour maintenir des temps de réponse sous 500 ms même en pic de rentrée scolaire :

| Donnée | Clé Redis | TTL | Rôle |
|---|---|---|---|
| Cache capacité classe | `inscription:capacite:classe:<uuid>` | 30 secondes | Évite les requêtes de comptage répétées lors des vagues de consultation |
| Anti-flood soumission | `inscription:candidature:ip:<ip>` | 10 minutes | Limite le nombre de candidatures soumises par une même adresse IP |
| Validation CAPTCHA | `inscription:captcha:valide:<token_hash>` | 5 minutes | Garantit qu'un token CAPTCHA n'est utilisé qu'une seule fois |
| Verrou d'affectation | `inscription:verrou:classe:<id>` | 5 secondes | Verrou distribué évitant les sur-réservations concurrentes sur la dernière place |

---

## 6. RabbitMQ — Bus d'événements inter-microservices

Ce microservice publie ses événements métier sur l'exchange `sigapei.events` au format standard `@nestjs/microservices` :
```json
{
  "pattern": "nom.evenement",
  "data": { ... }
}
```

### 6.1. Événements publiés

| Événement publié | Déclenché quand | Consommateurs prévus |
|---|---|---|
| `candidature.soumise` | Réception d'une nouvelle candidature | **Communication** (accusé de réception au parent) |
| `candidature.validee` | Validation définitive par l'administration | **Communication** (confirmation d'admission + infos de rentrée), **Finances** (génération de l'échéancier initial) |
| `candidature.rejetee` | Rejet avec motif par l'administration | **Communication** (notification de refus avec motif) |
| `apprenant.reinscrit` | Validation d'une réinscription annuelle | **Finances** (actualisation des frais), **Communication** |

### 6.2. Événements consommés

| Événement consommé | Source | Action effectuée |
|---|---|---|
| `etablissement.suspendu` | `etablissements` | Invalidation du cache des modules et blocage des nouvelles candidatures pour ce tenant |
| `etablissement.reactive` | `etablissements` | Rétablissement immédiat du service |

---

## 7. Format des pièces justificatives (S3 / MinIO)

Les fichiers téléversés sont organisés selon l'arborescence :
```
sigapei-documents/
└── candidatures/
    └── {tenant_id}/
        └── {candidature_uuid}/
            ├── acte_naissance_{hash}.pdf
            ├── bulletin_{hash}.pdf
            └── photo_identite_{hash}.jpg
```

Formats autorisés : `PDF`, `JPEG`, `PNG` (taille max : 5 Mo par fichier).
Seul le chemin de stockage (`chemin_stockage`) est enregistré en base de données.

---

## 8. Toutes les routes de l'API

Toutes les routes métier sont sous le préfixe `/v1` :

| Méthode | Route | Accès | Rôle |
|---|---|---|---|
| `GET` | `/docs` | Public | **Catalogue interactif JSON** de tous les endpoints et formats |
| `GET` | `/sante` | Public | Sonde de santé du microservice |
| `POST` | `/v1/candidatures` | Public (`X-Tenant-Id`) | Soumission d'un nouveau dossier de candidature |
| `GET` | `/v1/candidatures` | Authentifié (`JWT`) | Liste des candidatures du tenant avec filtres |
| `GET` | `/v1/candidatures/{uuid}` | Authentifié (`JWT`) | Détail complet (dossier, pièces, tests) |
| `POST` | `/v1/candidatures/{uuid}/valider` | Authentifié (Admin/Personnel) | Validation d'admission & création apprenant |
| `POST` | `/v1/candidatures/{uuid}/rejeter` | Authentifié (Admin/Personnel) | Rejet avec motif obligatoire |
| `POST` | `/v1/candidatures/{uuid}/pieces-justificatives` | Authentifié | Dépôt et rattachement d'une pièce S3 |
| `POST` | `/v1/candidatures/{uuid}/tests-admission` | Authentifié (Enseignant/Admin) | Saisie de note / résultat de test d'admission |
| `POST` | `/v1/reinscriptions` | Authentifié (Admin/Personnel) | Reconduction d'un élève sur la nouvelle année |

> [!TIP]
> Pour consulter les schémas JSON complets de requêtes, réponses réussies et codes d'erreur détaillés, consultez [docs/api-documentation.md](docs/api-documentation.md) ou exécutez `GET http://localhost:4003/docs`.

---

## 9. Structure du projet

```
inscription/
├── bootstrap/
│   └── app.php                  Initialisation du framework
├── config/
│   ├── app.php, cors.php        Configuration générale & CORS
│   └── database.php             Connexion PostgreSQL Neon (schéma inscription)
├── docker/
│   └── init-db.sql              Création du schéma inscription & extensions
├── docs/
│   └── api-documentation.md     Documentation exhaustive de l'API
├── public/
│   └── index.php                Point d'entrée HTTP (avec /docs et /sante directs)
├── routes/
│   └── api.php                  Définition des routes /v1
├── src/
│   ├── candidatures/            Dossiers, validation bloquante & rejet motivé
│   │   ├── Candidature.php
│   │   ├── candidature.controller.php
│   │   ├── candidature.service.php
│   │   ├── candidature.repository.php
│   │   └── validation.service.php
│   ├── pieces-justificatives/   Gestion des pièces S3/MinIO
│   │   ├── PieceJustificative.php
│   │   ├── piece-justificative.controller.php
│   │   └── piece-justificative.service.php
│   ├── tests-admission/         Saisie et évaluation des tests
│   │   ├── TestAdmission.php
│   │   ├── test-admission.controller.php
│   │   └── test-admission.service.php
│   ├── reinscriptions/          Reconductions d'élèves sans doublon
│   │   ├── Reinscription.php
│   │   ├── reinscription.controller.php
│   │   └── reinscription.service.php
│   ├── integrations/            Clients SQL & API internes (Scolarité, Établissements)
│   │   ├── scolarite-client.php
│   │   └── etablissements-client.php
│   ├── docs/                    Contrôleur et données du catalogue /docs
│   │   ├── DocsController.php
│   │   └── DocsData.php
│   ├── common/                  Socle transverse multi-tenant
│   │   ├── Middleware/VerifyTenantAndJwt.php
│   │   ├── Scopes/TenantScope.php
│   │   ├── Traits/HasTenant.php & HasUuid.php
│   │   ├── Services/AuditService.php
│   │   └── Responses/ApiResponse.php
│   └── database/
│       ├── migrations/          Création des tables du schéma inscription
│       └── seeders/             Données de test
├── tests/
│   └── Unit/                    Tests unitaires validation & motifs
├── .env.example
├── composer.json
├── docker-compose.yml
├── Dockerfile
└── README.md
```

---

## 10. Sécurité (Garanties techniques appliquées)

* **Cloisonnement multi-tenant strict** : toute requête SQL passe par le `TenantScope` qui injecte `WHERE tenant_id = ?`.
* **Aucun ID technique exposé** : les clés primaires `id` (bigint) ne sortent jamais du microservice. Seuls les `uuid` sont manipulés en URL et en JSON.
* **Vérification CAPTCHA** : anti-spam obligatoire sur la soumission publique de candidatures.
* **Traçabilité totale** : toute action sensible (validation, rejet, ajout de document) est consignée de façon immuable dans `audit_log`.
* **Principe de moindre privilège** : seules les requêtes munies du secret partagé `INTERNAL_API_SECRET` ou d'un token JWT autorisé peuvent déclencher des admissions.
