# vie-scolaire — Microservice Vie Scolaire — sigapei

Microservice **Vie scolaire** de la plateforme SIGAPEI : presences et absences,
synthese d'absences, incidents disciplinaires et sanctions, alertes au seuil
d'absences, dossier de vie scolaire. Le tout par tenant (etablissement).

Il suit la **configuration commune a tous les microservices** (Regles n°1 a n°6 du
README general de la plateforme), reproduite a l'identique de ce qui a ete fait
pour `identite` puis `etablissements`.

- **Port** : `4005`
- **Schema PostgreSQL** : `vie_scolaire` (proprietaire exclusif)
- **Prefixe API** : toutes les routes metier sont sous `/v1/...`
- **Sonde de sante** : `GET /up`

---

## 1. Demarrage rapide (Docker)

Le reseau Docker partage se cree **une seule fois** sur la machine (Regle n°2) :

```bash
docker network create sigapei
```

Puis :

```bash
cp .env.example .env
# -> completez .env avec les valeurs fournies par le chef de projet (voir section 2)

docker compose up -d --build
```

Le `docker-compose.yml` de ce microservice ne declare **que** `app` et `nginx` :
ni PostgreSQL, ni Redis, ni RabbitMQ ne lui appartiennent (Regles n°1 et n°2).

### Sans Docker (developpement local)

```bash
composer install
npm install
php artisan migrate
php artisan serve --port=4005
```

---

## 2. Configuration a realiser vous-meme

Tout passe par le `.env` (copie de `.env.example`). **Rien de ce qui suit n'est
fonctionnel avec les valeurs par defaut** : ce sont des placeholders
(`change-me`) a remplacer par les valeurs deja en place sur la plateforme.

### 2.1. Base de donnees Neon (Regle n°1)

Une seule base pour toute la plateforme, **un schema par microservice**. Les
identifiants sont ceux de `identite` et `etablissements`, fournis par le chef de
projet — on ne redemande pas d'autres valeurs et on ne cree pas de base.

```
DB_CONNECTION=pgsql
DB_HOST=ep-raspy-brook-b46yo20b-pooler.c-6.us-east-2.aws.neon.tech
DB_PORT=5432
DB_DATABASE=neondb
DB_USERNAME=<fourni par le chef de projet>
DB_PASSWORD=<fourni par le chef de projet>
DB_SCHEMA=vie_scolaire
DB_SSLMODE=require
```

`DB_SSLMODE=require` est **obligatoire** : Neon refuse les connexions non
chiffrees. cote PHP, l'equivalent est `DB_SSL=true` (TypeORM/Node).

**Avant la toute premiere migration**, creez votre schema une seule fois sur
Neon. Ni Laravel ni TypeORM ne le creent automatiquement, parce que leur table de
suivi des migrations doit elle-meme etre creee dans un schema deja existant :

```bash
psql "postgresql://<DB_USERNAME>:<DB_PASSWORD>@ep-raspy-brook-b46yo20b-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require"
CREATE SCHEMA IF NOT EXISTS vie_scolaire;
\q
```

Sans cette etape, `php artisan migrate` echoue avec `no schema has been selected
to create in`. C'est un probleme d'ordre, pas de droits ni de configuration.

Ensuite, et seulement ensuite :

```bash
php artisan migrate
```

**Jamais** de `Schema::create` execute hors migration, ni de creation de table a
la main en dehors de votre poste : en production, seules les migrations
versionnees creent ou modifient le schema.

### 2.2. Redis et RabbitMQ partages (Regle n°2)

Ni conteneur Redis, ni conteneur RabbitMQ propres a ce microservice. On rejoint
les instances lancees par `identite` sur le reseau `sigapei` :

```
REDIS_HOST=redis
REDIS_DB=2
REDIS_CACHE_DB=3
REDIS_PREFIX=vie_scolaire-

RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USER=<fourni par le chef de projet>
RABBITMQ_PASSWORD=<fourni par le chef de projet>
```

`REDIS_DB` doit rester **unique par microservice** pour ne pas melanger les
cles : `identite=0`, `etablissements=1`, `vie_scolaire=2`. Le prefixe de cles
est un second filet de securite, il ne doit pas etre vide en environnement
partage. Mettez `localhost` uniquement si vous developpez hors Docker.

### 2.3. Secret interne partage (Regle n°3)

```
INTERNAL_API_SECRET=<fourni par le chef de projet>
```

Meme valeur que celle utilisee par tous les autres microservices, envoyee dans
l'entete `X-Internal-Secret`. **N'en generez jamais une locale** : les autres
microservices ne pourraient plus vous appeler, et vous ne pourriez plus les
appeler. La comparaison est faite en temps constant par
`app/Common/Middlewares/VerifySecretInternal.php`.

### 2.4. CAPTCHA partage (Regle n°4)

Un seul compte reCAPTCHA / hCaptcha pour toute la plateforme, avec les memes
valeurs que celles deja utilisees par `identite` :

```
CAPTCHA_PROVIDER=recaptcha        # ou hcaptcha
CAPTCHA_SECRET_KEY=<fourni par le chef de projet>
CAPTCHA_MIN_SCORE=0.5
```

La cle **publique** (celle du front-end, qui genere le `captchaToken`) n'a rien a
faire dans le `.env` d'un backend.

### 2.5. URL des autres microservices

```
IDENTITE_URL=http://identite:4001
SCOLARITE_URL=http://scolarite:<port>
RH_URL=http://rh:<port>
```

Utilisees par `app/Integrations/InterneClient.php` pour les lectures chez les
autres (voir section 3).

---

## 3. Regle n°1 en pratique : aucune jointure inter-schemas

Ce microservice est proprietaire exclusif du schema `vie_scolaire`. Il **ne lit
jamais** les tables d'un autre microservice, meme si les deux partagent la meme
base. Les donnees externes passent par l'API interne du microservice concerne,
avec `X-Internal-Secret` :

| Besoin | Avant (interdit) | Maintenant |
|---|---|---|
| Apprenant, classe, emploi du temps | jointure SQL sur `scolarite.*` | `GET scolarite/interne/apprenants`, `/interne/classes`, `/interne/classes/apprenants`, `/interne/emplois-du-temps` |
| Personnel (auteur d'incident, correcteur) | jointure SQL sur `rh.personnel` | `GET rh/interne/personnel` |

Implementations : `app/Integrations/ScolariteClient.php`, `RhClient.php` et
`InterneClient.php` (en-tete `X-Internal-Secret`, delai de 5 s, erreurs
 explicites). Les chemins ci-dessus sont le **contrat consomme** : toute evolution
se fait des deux cotes, dans la meme pull request.

Aucune donnee n'est dupliquee : le schema ne conserve que les cles externes
(`apprenant_id`, `cours_id`, `auteur_id`, `corrige_par_id`), et les uuid sont
resolus a la volee au moment de la serialisation.

## 4. Regle n°5 en pratique : aucun JWT verifie ici

Le seul possesseur de `JWT_ACCESS_SECRET` est le microservice `identite`. Ce
microservice ne duplique pas la verification de signature, il consomme les
entetes transmis par la passerelle :

| Entete | Signification |
|---|---|
| `X-Tenant-Id` | identifiant du tenant (etablissement) — obligatoire |
| `X-User-Id` | uuid de l'utilisateur connecte (claim `sub`) |
| `X-User-Role` | role sur ce module (enseignant, censeur, ...) |

`app/Common/Middlewares/ResolveTenantContext.php` les transforme en
`TenantContext`, qui alimente le `TenantScope` global applique a tous les
modeles. Un appel direct d'un autre microservice (sans passerelle) s'authentifie
via `GET identite/interne/introspection?token=...` + `X-Internal-Secret`, ou via
la requete RPC RabbitMQ sur le pattern `identite.introspection`.

---

## 5. Tables du schema `vie_scolaire`

| Table | Contenu | Statut |
|---|---|---|
| `presences` | presences/absences/retards d'un cours pour une classe, avec journal de correction | expose |
| `incidents_disciplinaires` | signalements et sanctions (la sanction est un etat de l'incident, pas une table : une sanction sans incident est impossible au niveau du schema) | expose |
| `audit_logs` | journal inalterable des corrections, incidents et sanctions | interne |
| `cantine` | structure posee en V2+ | reserve (non expose) |
| `transport` | structure posee en V2+ | reserve (non expose) |
| `migrations`, `cache`, `jobs`, `sessions`, `users` | tables techniques Laravel, dans le meme schema | technique |

Aucune contrainte FK n'est posee vers un autre schema : les cles externes sont
des `unsignedBigInteger` sans contrainte, la coherence est applicative.

Filtre tenant : `TenantScope` ajoute `where tenant_id = ?` a **toutes** les
requetes. Aucun identifiant interne n'est expose par l'API, uniquement des `uuid`.

---

## 6. Routes de l'API

| Route | Middleware | Description |
|---|---|---|
| `POST /v1/presences` | `tenant`, `captcha` | enregistre les presences d'un cours pour une classe |
| `GET /v1/presences` | `tenant` | liste filtrable (classe, apprenant, cours, statut, periode) |
| `PUT /v1/presences/{uuid}` | `tenant`, `captcha` | correction (fenetre enseignant, sinon censeur/administrateur) |
| `GET /v1/apprenants/{uuid}/absences/synthese` | `tenant` | totaux sur la periode glissante + seuil |
| `GET /v1/apprenants/{uuid}/dossier-vie-scolaire` | `tenant` | dossier consolide (presences, incidents, synthese) |
| `POST /v1/incidents` | `tenant`, `captcha` | signalement d'un incident disciplinaire |
| `GET /v1/incidents` | `tenant` | liste filtrable par apprenant |
| `POST /v1/incidents/{uuid}/sanction` | `tenant`, `captcha` | application d'une sanction |
| `GET /v1/interne/alertes-absences` | `tenant`, `interne` | alertes au seuil d'absences (Regle n°3) |

- `tenant` = `ResolveTenantContext` (entetes de la passerelle, Regle n°5)
- `captcha` = `VerifyCaptcha` (`X-Captcha-Token` ou `captcha_token`, Regle n°4)
- `interne` = `VerifySecretInternal` (`X-Internal-Secret`, Regle n°3)

---

## 7. RabbitMQ

Evenements applicatifs.domines (classes `App\Events\`) :

| Evenement | Declencheur | Destination |
|---|---|---|
| `AbsenceDeclaree` | absence enregistree pour un apprenant | microservice Communication (notification parent) |
| `AlerteAbsencesDeclenchee` | seuil d'absences franchi sur la periode glissante | back-office censeur |

Ils sont dispatches par Laravel, pas publies en RabbitMQ : le choix du
**driver de file** (ajout d'un exchange / d'une file) doit etre discute avec
l'equipe avant d'etre fait, conformement a la Regle n°2. `QUEUE_CONNECTION` est
donc encore `database` et le tableau de publication RabbitMQ n'est pas encore
ouvert. `RABBITMQ_HOST`, `RABBITMQ_PORT` et `RABBITMQ_URL` sont deja en place
dans le `.env` pour le branchement ulterieur.

---

## 8. Ce qui ne doit jamais etre fait

- Committer un `.env` reel (mots de passe, cles API, secrets) : seul
  `.env.example` avec des valeurs `change-me` va dans Git.
- Creer une base de donnees pour ce microservice : tout le monde partage
  `neondb`, un schema par microservice.
- Faire tourner un Redis ou un RabbitMQ propre hors poste de developpement.
- Generer son propre `INTERNAL_API_SECRET` ou ses propres cles CAPTCHA.
- Faire une jointure SQL vers le schema d'un autre microservice : passer par
  ses endpoints `/interne/*` ou par un evenement RabbitMQ.
- Verifier une signature JWT hors du microservice `identite`.
- Executer `Schema::create` hors migration, ou poser `DB_SYNCHRONIZE=true` en
  production.

---

## 9. Structure du projet

```
vie-scolaire/
├── app/
│   ├── Alertes/          Seuil d'absences et alertes
│   ├── Common/           TenantContext, TenantScope, HasUuid, AuditLogger, middlewares
│   ├── Discipline/       Incidents disciplinaires et sanctions
│   ├── Events/           AbsenceDeclaree, AlerteAbsencesDeclenchee
│   ├── Http/Requests/    Validation des entrees
│   ├── Integrations/     InterneClient, ScolariteClient, RhClient, Captcha/
│   ├── Models/           Presence, IncidentDisciplinaire, Cantine, Transport, AuditLog
│   ├── Presences/        Enregistrement, liste, correction, synthese
│   └── Providers/
├── config/
│   ├── database.php      Connexion pgsql + search_path = vie_scolaire, Redis
│   ├── services.php      URLs des microservices, secret interne, CAPTCHA
│   └── vie-scolaire.php  Seuils et fenetres metier
├── database/migrations/  Tables du schema vie_scolaire
├── docker/               entrypoint.sh (attend Neon, puis migrate), nginx
├── routes/api.php
├── Dockerfile
└── docker-compose.yml    app + nginx, sur le reseau externe `sigapei`
```

## 10. Tests

```bash
php artisan test
vendor\bin\pint
```

Les tests tournent en SQLite `:memory:` et n'appellent **ni** Neon, **ni** un
autre microservice : les clients Scolarite et RH sont remplace par des fakes
(`tests/Support/`), et le fournisseur CAPTCHA est simule en HTTP.
