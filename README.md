# SIGAPEI

Système d'Information de Gestion Administrative et Pédagogique des Écoles et Institutions.

## Organisation des branches

| Branche | Rôle | Qui peut y écrire |
|---|---|---|
| `main` | Code validé et stable | **Le chef de projet uniquement** |
| `develop` | Intégration : reçoit le travail de tous les développeurs | Fusion automatique (personne ne pousse dessus directement) |
| `feature/prenom` | **Une seule branche par développeur**, pour toute la durée du projet | Son propriétaire |

```
feature/marie ──┐
feature/paul  ──┼──► develop (fusion automatique) ──► test par le chef ──► main
feature/jean  ──┘
```

## Règles

1. **Une seule branche par développeur** : `feature/prenom` (par exemple `feature/marie`). On ne crée jamais de branche par tâche ou par fonctionnalité.
2. **Personne ne pousse sur `main`** à part le chef de projet.
3. **Personne ne pousse directement sur `develop`** : la fusion se fait toute seule après un push sur sa branche.
4. Chaque développeur récupère ses mises à jour **uniquement depuis `main`**.
5. Les branches `feature/prenom` ne sont **jamais supprimées**.

## Pour les développeurs

### Première fois seulement : créer sa branche

```bash
git clone https://github.com/dglink25/sigapei.git
cd sigapei
git checkout -b feature/prenom origin/main
git push -u origin feature/prenom
```

Remplacez `prenom` par votre prénom, en minuscules et sans accent.

### Chaque jour

```bash
git checkout feature/prenom
git pull origin main          # récupérer ce que le chef a validé
# ... travail, puis commits ...
git add .
git commit -m "description claire du changement"
git push                      # la fusion vers develop est automatique
```

Après le push, une demande de fusion vers `develop` est créée et fusionnée automatiquement (onglet **Actes** pour suivre l'exécution).

### En cas de conflit

Si le workflow échoue à cause d'un conflit avec le travail d'un collègue :

```bash
git checkout feature/prenom
git fetch origin
git merge origin/develop
# résoudre les conflits dans les fichiers, puis :
git add .
git commit
git push
```

C'est le seul cas où l'on récupère `develop`.

### Ce qu'il ne faut pas faire

- `git push origin main` : refusé.
- `git push origin develop` : refusé.
- `git push --force` : interdit sur `main` et `develop`.
- Créer une autre branche que `feature/prenom`.

## Pour le chef de projet

### Tester `develop`

```bash
git fetch origin
git checkout develop
git pull origin develop
# ... tests ...
```

### Publier sur `main` (si tout est bon)

```bash
git checkout main
git pull origin main
git merge --ff-only origin/develop
git push origin main
```

### Corriger un problème

Ne jamais corriger sur `develop`. Corriger sur sa propre branche :

```bash
git checkout feature/don-diegue
git merge origin/develop
# ... corrections ...
git push                      # fusion automatique vers develop, puis retest
```

## Configuration GitHub (référence)

- **Règle sur `main`** : demande de fusion obligatoire, mises à jour et suppressions restreintes, push forcé bloqué. Contournement réservé au rôle *Administrateur du dépôt*.
- **Règle sur `develop`** : demande de fusion obligatoire, 0 approbation requise, push forcé et suppression bloqués.
- **Dépôt** : *Allow merge commits* et *Allow auto-merge* activés, *Automatically delete head branches* **désactivé**.
- **Actions** : *Allow GitHub Actions to create and approve pull requests* activé.
- **Collaborateurs** : rôle **Write** pour les développeurs (jamais Admin ni Maintain).
- **Workflow** : `.github/workflows/auto-pr.yml` crée la demande de fusion vers `develop` et la fusionne à chaque push sur `feature/**`.

## Microservices de la plateforme

| Microservice | Port | Schéma DB | Rôle principal | Documentation |
|---|---|---|---|---|
| [`identite`](identite) | `4001` | `identite` | SSO, Authentification Passwordless (OTP SMS/WhatsApp/Email, WebAuthn, Firebase) | [README](identite/README.md) (`/docs`) |
| [`etablissements`](etablissements) | `4002` | `etablissements` | Onboarding, référentiel géographique panafricain, validation, plans & abonnements | [README](etablissements/README.md) |
| [`inscription`](inscription) | `4003` | `inscription` | Candidatures, pièces justificatives, tests d'admission, validation bloquante & réinscriptions | [README](inscription/README.md) • [Docs API](inscription/docs/api-documentation.md) (`/docs`) |
| [`scolarite`](scolarite) | `4004` | `scolarite` | Cycles, classes (programme béninois/français), dossiers apprenants, mutations, emplois du temps | [README](scolarite/README.md) • [Docs API](scolarite/docs/api-documentation.md) (`/docs`) |
| [`vie-scolaire`](vie-scolaire) | `4005` | `vie_scolaire` | Presences/absences, incidents disciplinaires et sanctions, alertes au seuil d'absences, dossier de vie scolaire | [README](vie-scolaire/README.md) |
| [`elearning`](elearning) | — | `elearning` | *(à documenter par son responsable)* | — |

Chaque microservice est **autonome dans son propre dossier** (son propre
`composer.json`/`package.json`, son propre `Dockerfile`, ses propres
migrations) mais **partage l'infrastructure** avec les autres : une seule
base PostgreSQL, un seul Redis, un seul RabbitMQ. La section suivante
explique comment un microservice rejoint cette infrastructure commune.

---

## Configuration commune à tous les microservices

Cette section s'adresse à **chaque développeur qui démarre un nouveau
microservice ou reprend un microservice existant** : elle décrit ce qui doit
être configuré à l'identique partout, en suivant exactement ce qui a déjà
été fait pour `identite` puis reproduit pour `etablissements`. Ne réinventez
pas ces réglages microservice par microservice : recopiez le principe
ci-dessous.

### Règle n°1 — Une seule base de données, un schéma par microservice

Tous les microservices se connectent à la **même** base PostgreSQL managée
(Neon), avec le **même hôte, le même nom de base, le même utilisateur et le
même mot de passe** — seul le schéma change d'un microservice à l'autre.

1. **Demandez au chef de projet** les identifiants Neon (hôte, port,
   `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`) — ce sont exactement les
   mêmes que ceux déjà utilisés par `identite` et `etablissements`, jamais
   des identifiants différents par microservice. Ne les redemandez pas
   ailleurs, ne créez pas de nouvelle base.
2. Dans le `.env` de **votre** microservice, reprenez ces mêmes valeurs et
   changez uniquement `DB_SCHEMA` pour le nom de votre propre microservice
   (`inscription`, `scolarite`, `vie_scolaire`, `elearning`...) :
   ```dotenv
   DB_HOST=your-neon-project.pooler.region.aws.neon.tech
   DB_PORT=5432
   DB_DATABASE=neondb
   DB_USERNAME=<fourni par le chef de projet>
   DB_PASSWORD=<fourni par le chef de projet>
   DB_SCHEMA=<le_nom_de_votre_microservice>
   DB_SSLMODE=require
   ```
   `DB_SSLMODE=require` (ou l'équivalent `DB_SSL=true` côté Node/TypeORM)
   est **obligatoire** avec Neon, qui refuse les connexions non chiffrées.
3. **Avant votre toute première migration**, créez votre schéma une seule
   fois sur Neon (il n'existe pas encore, et ni Laravel ni TypeORM ne le
   créent automatiquement avant leur toute première table technique) :
   ```bash
   psql "postgresql://<DB_USERNAME>:<DB_PASSWORD>@your-neon-project.pooler.region.aws.neon.tech/neondb?sslmode=require"
   ```
   ```sql
   CREATE SCHEMA IF NOT EXISTS <le_nom_de_votre_microservice>;
   \q
   ```
   Sans cette étape, la première commande de migration échoue avec une
   erreur du type *"no schema has been selected to create in"* (Laravel) ou
   *"schema ... does not exist"* (TypeORM/NestJS) — c'est normal, c'est
   uniquement dû à l'ordre dans lequel chaque framework crée sa table de
   suivi des migrations, pas à un problème de droits ou de configuration.
4. Lancez ensuite vos migrations normalement :
   - Laravel : `php artisan migrate`
   - NestJS/TypeORM : `npm run migration:run`
5. **Ne mettez jamais** `DB_SYNCHRONIZE=true` (TypeORM) ni de
   `Schema::create` exécuté hors migration (Laravel) en dehors de votre
   poste de développement local : en production, seules les migrations
   versionnées créent/modifient le schéma.

Chaque microservice ne lit et n'écrit **que dans son propre schéma**. Si
vous avez besoin d'une donnée qui appartient à un autre microservice
(un `tenant_id`, un rôle, un statut...), ne faites jamais de jointure SQL
inter-schémas : passez par l'API interne (`/interne/...` + header
`X-Internal-Secret`) ou par un événement RabbitMQ de ce microservice,
jamais par un accès direct à ses tables.

### Règle n°2 — Redis et RabbitMQ sont partagés, pas dupliqués

Ne faites pas tourner votre propre conteneur Redis ou RabbitMQ par
microservice : tous se connectent aux **mêmes** instances (celles déjà
lancées par `identite`), sur un réseau Docker partagé.

1. Une seule fois sur la machine (ou le serveur) qui fait tourner les
   conteneurs :
   ```bash
   docker network create sigapei
   ```
2. Dans le `docker-compose.yml` de votre microservice, rejoignez ce réseau
   externe (copiez le bloc réseau de `etablissements/docker-compose.yml`) :
   ```yaml
   networks:
     sigapei:
       external: true
   ```
3. Dans votre `.env`, pointez vers les conteneurs partagés par leur nom de
   service Docker (pas `localhost`, sauf si vous développez sans Docker) :
   ```dotenv
   REDIS_HOST=redis
   RABBITMQ_HOST=rabbitmq
   ```
4. Chaque microservice utilise un **numéro de base Redis différent**
   (`REDIS_DB`) pour ne pas mélanger ses clés de cache avec celles des
   autres — `identite` utilise `0`, `etablissements` utilise `1`, prenez le
   numéro suivant disponible pour votre microservice et notez-le ici.
5. RabbitMQ : ne créez pas votre propre exchange/queue sans en discuter
   avec l'équipe. Le principe déjà en place (voir
   `etablissements/README.md`, section RabbitMQ) est qu'un microservice
   **publie** ses événements métier vers la queue consommée par le
   microservice concerné, au format
   `{"pattern": "nom.evenement", "data": {...}}` (compatible
   `@nestjs/microservices`). Documentez tout nouvel événement publié ou
   consommé dans le README de votre microservice, sur le même modèle que le
   tableau déjà présent dans `etablissements/README.md`.

### Règle n°3 — Secret interne partagé (`INTERNAL_API_SECRET`)

Tous les endpoints `/interne/*` (appelés uniquement par la passerelle API
ou par un autre microservice, jamais par un client final) sont protégés par
un **même** secret partagé sur toute la plateforme, envoyé dans le header
`X-Internal-Secret`.

- Demandez la valeur au chef de projet, mettez-la telle quelle dans le
  `.env` de votre microservice (`INTERNAL_API_SECRET=...`) — ne générez
  jamais votre propre valeur différente, sinon les autres microservices ne
  pourront plus vous appeler et vous ne pourrez plus les appeler.
- Protégez vos propres endpoints `/interne/*` avec ce même mécanisme
  (reprenez `VerifierSecretInterne` côté Laravel ou `InternalSecretGuard`
  côté NestJS selon votre stack).

### Règle n°4 — CAPTCHA partagé (reCAPTCHA v3 / hCaptcha)

Un seul compte reCAPTCHA (ou hCaptcha) est créé pour toute la plateforme,
avec un site enregistré par domaine/sous-domaine front-end concerné. Ne
créez pas votre propre compte CAPTCHA par microservice.

- Demandez au chef de projet : `CAPTCHA_PROVIDER` (`recaptcha` ou
  `hcaptcha`), `CAPTCHA_SECRET_KEY` (clé **secrète**, côté serveur
  uniquement) et `CAPTCHA_MIN_SCORE` — mêmes valeurs que celles déjà
  utilisées par `identite`.
- Toute route publique qui accepte une soumission libre (formulaire de
  connexion, d'inscription, de demande, etc.) doit vérifier un
  `captchaToken` avant traitement, sur le modèle de
  `RecaptchaProvider` (`identite/src/integrations/captcha/recaptcha.provider.ts`)
  côté NestJS. Si votre microservice est en Laravel, reproduisez la même
  logique (appel HTTP à `https://www.google.com/recaptcha/api/siteverify`
  avec `secret` + `response`, rejet si `score < CAPTCHA_MIN_SCORE`) plutôt
  que d'improviser une autre vérification.
- Ne mettez jamais la clé **publique** du CAPTCHA (celle utilisée côté
  front-end) dans le `.env` d'un microservice backend : elle n'a rien à y
  faire, seule la clé secrète y est nécessaire.

### Règle n°5 — JWT et identité de l'utilisateur courant

Aucun microservice autre qu'`identite` ne vérifie un mot de passe ou
n'émet de jeton : pour savoir *qui* appelle une route protégée, un
microservice a deux options, jamais une troisième :

1. **Cas normal (via la Gateway)** : la passerelle API a déjà validé le
   JWT et transmet le contexte utilisateur (uuid, `tenantId`, `roleCode`)
   dans des headers internes — consommez ces headers, ne re-vérifiez pas le
   JWT vous-même.
2. **Cas d'un appel direct entre microservices** (sans passer par la
   Gateway) : appelez `GET identite/interne/introspection?token=...` avec
   le header `X-Internal-Secret`, ou publiez une requête RPC RabbitMQ sur le
   pattern `identite.introspection` (voir
   `identite/src/interne/interne.rpc.controller.ts`).

Ne dupliquez jamais la logique de vérification de signature JWT
(`JWT_ACCESS_SECRET`) dans un autre microservice que `identite` : ce
secret ne doit être connu que de lui.

### Règle n°6 — Convention de port et de nommage

- Un port dédié par microservice, choisi une fois pour toutes et documenté
  dans le tableau plus haut (`identite` = 4001, `etablissements` = 4002,
  `inscription` = 4003, `scolarite` = 4004, `vie-scolaire` = 4005) —
  prenez le numéro suivant libre pour un nouveau microservice et
  mettez à jour ce README dans la même pull request.
- Nom du schéma PostgreSQL = nom du dossier du microservice, en
  minuscules avec underscores si besoin (`vie_scolaire`, pas
  `vie-scolaire` — Postgres accepte les tirets dans un identifiant entre
  guillemets mais cela complique inutilement toutes les requêtes SQL brutes
  et les migrations manuelles).
- Chaque microservice a son propre `Dockerfile` et son propre
  `docker-compose.yml`, mais rejoint toujours le réseau externe `sigapei`
  (Règle n°2) plutôt que de définir ses propres conteneurs Redis/RabbitMQ.

### Ce qu'il ne faut jamais faire

- Committer un fichier `.env` réel (mots de passe, clés API, secrets) —
  seul `.env.example` avec des valeurs `change-me` va dans Git.
- Créer une nouvelle base de données pour un microservice : tous partagent
  `neondb`, un schéma par microservice.
- Faire tourner un Redis ou un RabbitMQ local propre à un microservice en
  environnement partagé/serveur (uniquement toléré sur votre poste perso
  si vous ne pouvez pas joindre les instances partagées).
- Générer votre propre `INTERNAL_API_SECRET` ou vos propres clés CAPTCHA :
  demandez toujours les valeurs déjà en place au chef de projet.
- Faire une jointure SQL directe vers le schéma d'un autre microservice :
  passer par ses endpoints `/interne/*` ou par un événement RabbitMQ.
