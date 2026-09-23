# api-identite — Microservice Identite (SSO) — sigapei

Microservice d'authentification sans mot de passe de la plateforme sigapei :
matricule + empreinte digitale, telephone + OTP (SMS + WhatsApp), e-mail + OTP,
connexion Google et connexion GitHub (via Firebase), roles dynamiques, SSO
multi-tenant (JWT), gestion des appareils/sessions, recuperation d'identifiant.

- **Port** : `4001`
- **Documentation interactive (Swagger)** : `http://localhost:4001/docs` (JSON brut : `/docs-json`)
- **Prefixe API** : toutes les routes metier sont sous `/v1/...` (ex: `POST /v1/auth/otp/envoyer`)
- **Sonde de sante** : `GET /sante`

---

## 1. Demarrage rapide (Docker)

```bash
cp .env.example .env
# -> completez .env avec VOS valeurs (voir section 2 ci-dessous, obligatoire)

docker compose up -d --build
```

Le microservice demarre sur **http://localhost:4001**, avec PostgreSQL, Redis et
RabbitMQ (interface d'administration RabbitMQ : http://localhost:15672).

Au premier demarrage, le microservice charge automatiquement les 6 roles
systeme (`super_admin`, `administrateur`, `personnel`, `enseignant`,
`apprenant`, `parent`) dans la table `identite.role`.

### Sans Docker (developpement local)

```bash
npm install
npm run start:dev
```

Il faut alors avoir PostgreSQL, Redis et RabbitMQ deja lances (localement ou
via `docker compose up -d postgres redis rabbitmq`) et un fichier `.env`
pointant vers `localhost` au lieu des noms de service Docker (`DB_HOST=localhost`,
`REDIS_HOST=localhost`, `RABBITMQ_URL=amqp://...@localhost:5672`).

---

## 2. Configuration a realiser vous-meme (obligatoire)

Toute la configuration se fait via le fichier `.env` (copie de `.env.example`).
**Rien de ce qui suit n'est fonctionnel avec les valeurs par defaut** — elles
sont volontairement des placeholders (`change-me`, `xxxxxx`) a remplacer.

### 2.1. Base de donnees PostgreSQL

Le microservice est proprietaire exclusif du schema `identite` dans la base
unique de la plateforme (partagee avec les 11 autres microservices).

- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` : vos
  identifiants PostgreSQL habituels.
- `DB_SCHEMA=identite` : ne pas modifier, sauf convention d'equipe differente.
- `DB_SYNCHRONIZE=false` **en production** (TypeORM ne doit jamais modifier le
  schema automatiquement en prod — mettez en place de vraies migrations
  `npm run typeorm migration:generate`). En local, vous pouvez temporairement
  mettre `true` pour laisser TypeORM creer les tables.
- Le script `docker/init-db.sql` cree automatiquement le schema `identite` et
  les extensions PostgreSQL `uuid-ossp`/`pgcrypto` (necessaires aux colonnes
  `uuid`) au premier demarrage du conteneur PostgreSQL.

### 2.2. Redis

`REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (laissez vide si pas de mot de
passe en local). Redis stocke **tout ce qui est volatil/session** (voir
section 4) : codes OTP en attente, compteurs anti-abus, sessions actives,
liste noire des jetons revoques, defis WebAuthn temporaires.

### 2.3. RabbitMQ (bus inter-microservices)

`RABBITMQ_USER`, `RABBITMQ_PASSWORD`, `RABBITMQ_URL`. Creez un utilisateur
RabbitMQ dedie (pas le compte `guest` par defaut) si vous deployez au-dela du
poste local. Voir section 5 pour le detail des evenements publies.

### 2.4. Secrets JWT

`JWT_ACCESS_SECRET` et `JWT_REFRESH_SECRET` : generez deux chaines aleatoires
**distinctes** d'au moins 32 caracteres, par exemple :

```bash
openssl rand -base64 48
```

Ne les committez jamais. `JWT_ACCESS_TTL` (15 min par defaut) et
`JWT_REFRESH_TTL` (30 jours par defaut) sont ajustables.

### 2.5. Convessa (WhatsApp)

1. Creez un compte sur le tableau de bord Convessa
   (`https://convessa.epac-uac-optica-chapter.bj`).
2. Connectez votre numero WhatsApp depuis "Connecter WhatsApp".
3. Recuperez votre cle API (`pk_convessa_...`) et renseignez
   `CONVESSA_API_URL` / `CONVESSA_API_KEY`.
4. Voir section 6 pour le format exact des messages WhatsApp envoyes.

### 2.6. Passerelle SMS maison

Aucune plateforme commerciale (pas de Twilio). Vous devez deployer vous-meme
la passerelle open-source (ex: Gammu-SMSD ou Kannel) pilotant vos boitiers
SIM/modems GSM, et exposer une API HTTP simple (`POST /messages`,
`GET /credit`). Renseignez ensuite :

- `SMS_GATEWAY_URL` : URL de cette passerelle.
- `SMS_GATEWAY_API_KEY` : jeton d'authentification de votre passerelle.
- `SMS_GATEWAY_SENDER_POOL` : liste des numeros emetteurs credites, separes
  par des virgules (utilises en round-robin).

Ce depot n'inclut **pas** le logiciel de passerelle SMS lui-meme (il tourne
sur un serveur avec acces physique aux boitiers SIM) — seulement le client
HTTP qui s'y connecte (`src/integrations/sms/sms-gateway-maison.provider.ts`).

### 2.7. E-mail transactionnel (SMTP + mot de passe d'application)

1. Sur le compte de messagerie dedie de la plateforme (Gmail, Zoho, etc.),
   activez la validation en 2 etapes puis generez un **mot de passe
   d'application** (pas le mot de passe principal du compte).
2. Renseignez `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`,
   `SMTP_APP_PASSWORD`, `SMTP_FROM`.

### 2.8. CAPTCHA (reCAPTCHA v3 ou hCaptcha)

1. Creez un site reCAPTCHA v3 (https://www.google.com/recaptcha/admin) ou un
   site hCaptcha (https://dashboard.hcaptcha.com).
2. Renseignez `CAPTCHA_PROVIDER` (`recaptcha` ou `hcaptcha`),
   `CAPTCHA_SECRET_KEY` (cle **secrete**, cote serveur) et `CAPTCHA_MIN_SCORE`
   (0.5 par defaut pour reCAPTCHA v3).
3. Cote client (application web/mobile), integrez la cle **publique**
   correspondante pour generer le `captchaToken` envoye a l'API.

### 2.9. Firebase (connexion Google et GitHub)

1. Creez un projet sur https://console.firebase.google.com.
2. Dans **Authentication > Sign-in method**, activez les fournisseurs
   **Google** et **GitHub** (pour GitHub, vous devrez creer une OAuth App sur
   GitHub et renseigner son Client ID/Secret dans Firebase).
3. Dans **Parametres du projet > Comptes de service**, generez une nouvelle
   cle privee (bouton "Generer une nouvelle cle privee") : un fichier JSON est
   telecharge.
4. Reportez dans `.env` :
   - `FIREBASE_PROJECT_ID` = `project_id` du JSON
   - `FIREBASE_CLIENT_EMAIL` = `client_email` du JSON
   - `FIREBASE_PRIVATE_KEY` = `private_key` du JSON (gardez les `\n` litteraux,
     entoures de guillemets, comme dans `.env.example`)
5. Cote application cliente (front-end), integrez le SDK Firebase Auth
   (`signInWithPopup` avec `GoogleAuthProvider` / `GithubAuthProvider`),
   recuperez le `idToken` de l'utilisateur connecte, et envoyez-le a
   `POST /v1/auth/firebase/verifier`.

**Regle metier appliquee** (voir section 3) : la connexion Google/GitHub ne
cree jamais de compte. Si l'e-mail Firebase ne correspond a aucun utilisateur
existant, l'API retourne `404 COMPTE_INTROUVABLE`.

### 2.10. WebAuthn / FIDO2 (matricule + empreinte)

- `WEBAUTHN_RP_ID` : domaine racine de votre application (ex: `sigapei.com`,
  **sans** `https://` ni sous-domaine specifique).
- `WEBAUTHN_RP_NAME` : nom affiche a l'utilisateur lors de l'enregistrement.
- `WEBAUTHN_ORIGIN` : origine exacte de l'application front-end
  (ex: `https://app.sigapei.com`), avec le schema `https://`.

En local (developpement), utilisez `WEBAUTHN_RP_ID=localhost` et
`WEBAUTHN_ORIGIN=http://localhost:3000` (adaptez au port de votre front-end).

### 2.11. Secret interne (Gateway)

`INTERNAL_API_SECRET` : chaine partagee entre ce microservice et la
passerelle API (Gateway). Generez-la avec `openssl rand -base64 32` et
configurez la Gateway pour l'envoyer dans le header `X-Internal-Secret` sur
les appels a `GET /interne/introspection`.

---

## 3. Moyens de connexion geres

| Methode | Identifiant saisi | Verification | Canal(aux) |
|---|---|---|---|
| Telephone + OTP | Numero international | Code a 6 chiffres | SMS (passerelle maison) **et** WhatsApp (Convessa) en parallele |
| E-mail + OTP | Adresse e-mail | Code a 12 caracteres (voir format ci-dessous) | E-mail (SMTP) |
| Matricule + empreinte | Matricule | Empreinte digitale WebAuthn/FIDO2 deja enregistree sur l'appareil | Aucun envoi (local a l'appareil) |
| Google | (aucun, via Firebase) | Jeton d'identite Firebase deja verifie par Google | Firebase |
| GitHub | (aucun, via Firebase) | Jeton d'identite Firebase deja verifie par GitHub | Firebase |

Pour Google/GitHub : la verification d'identite est deja faite par le
fournisseur (Firebase) — l'API retrouve simplement le compte existant par
e-mail et **connecte systematiquement** l'utilisateur sans OTP
supplementaire. Aucune inscription n'est declenchee si le compte n'existe pas.

### Format du code OTP e-mail (regle stricte)

Chaque code envoye par e-mail respecte **exactement** ces contraintes
(voir `src/otp/otp-generator.util.ts`) :

- longueur **exactement 12 caracteres** (ni plus, ni moins) ;
- **au moins 2** caracteres speciaux (parmi `! @ # $ % * ? - _ + =`) ;
- **au moins 2** lettres majuscules ;
- **au moins 2** lettres minuscules ;
- le reste est complete aleatoirement (majuscules/minuscules/chiffres/speciaux)
  pour maximiser l'entropie, puis le tout est melange (le code ne commence
  jamais forcement par les caracteres "obligatoires").

Exemple de code genere : `aB3!kR9?mZ2#`

Le code telephone (SMS/WhatsApp) reste un code numerique a 6 chiffres, comme
specifie dans le cahier des charges d'origine (section 6.1).

---

## 4. Ce qui vit dans Redis (et pourquoi)

Pour garantir des reponses en quelques millisecondes meme en pic de charge
(rentree scolaire), **rien de volatil ne transite par PostgreSQL** :

| Donnee | Cle Redis | TTL |
|---|---|---|
| Code OTP en attente (hache, jamais en clair) | `identite:otp:<cible>` | duree de validite (5 min par defaut) |
| Compteur de renvois OTP | `identite:otp:renvois:<cible>` | fenetre glissante (10 min par defaut) |
| Delai progressif entre renvois | `identite:otp:delai:<cible>` | 30s / 60s / 120s |
| Session active (access+refresh) | `identite:session:<jti>` | duree du refresh token (30 jours par defaut) |
| Index des sessions d'un utilisateur | `identite:session:utilisateur:<uuid>` | idem |
| Liste noire des jetons revoques | `identite:jwt:revoque:<jti>` | duree de vie restante du jeton |
| Defi WebAuthn temporaire | `identite:webauthn:defi:<uuid>` | 5 min |
| Validation question de securite | `identite:recuperation:question-validee:<uuid>` | 10 min |

PostgreSQL (schema `identite`) reste la source de verite **durable** :
comptes, roles, appareils enregistres, empreintes biometriques (cle publique
uniquement), journal d'audit des tentatives de connexion.

---

## 5. RabbitMQ — bus d'evenements inter-microservices

Deux canaux distincts, tous deux geres par ce microservice :

1. **Publication d'evenements** (fire-and-forget, `src/rabbitmq/rabbitmq.service.ts`)
   consommes par les 11 autres microservices sans appel HTTP synchrone (donc
   sans latence bloquante ni panne en cascade). Evenements publies :
   `utilisateur.authentifie`, `utilisateur.deconnecte`, `otp.envoye`,
   `role.cree`, `role.modifie`, `role.supprime`, `appareil.revoque`,
   `identifiant.recupere`.
2. **Canal RPC** (requete/reponse asynchrone via la queue `identite.rpc`,
   pattern `identite.introspection`) : permet a n'importe quel autre
   microservice de verifier un JWT sans passer par la Gateway/HTTP. Voir
   `src/interne/interne.rpc.controller.ts`.

En complement, `GET /interne/introspection` (HTTP, protege par
`X-Internal-Secret`) offre le meme service a la passerelle API (Gateway), qui
route toutes les requetes entrantes de la plateforme (section 16 du cahier
des charges).

---

## 6. Format des messages WhatsApp (via Convessa)

Implemente dans `src/integrations/whatsapp/convessa.provider.ts`
(`formaterMessageOtp` / `formaterMessageAlerteConnexion`). Choix de format :
texte brut uniquement (pas d'URL, pas de piece jointe) pour rester conforme
aux gabarits WhatsApp "utility" et eviter tout blocage anti-spam ; le code
est isole sur sa propre ligne pour faciliter la copie/l'auto-remplissage.

**Message OTP :**
```
sigapei - Code de verification

XXXXXX

Ce code est valable 5 minutes et ne peut etre utilise qu'une seule fois.
Ne le communiquez a personne, y compris au personnel sigapei.

Vous n'etes pas a l'origine de cette demande ? Ignorez simplement ce message.
```

**Message d'alerte nouvelle connexion (appareil non reconnu) :**
```
sigapei - Nouvelle connexion detectee

Un acces a votre compte a eu lieu depuis un nouvel appareil :
Appareil : <nom de l'appareil>
Date : <date et heure>
Localisation approximative : <ville> (si disponible)

Ce n'est pas vous ? Connectez-vous et revoquez cet appareil depuis "Vos appareils connectes".
```

L'envoi passe par `POST {CONVESSA_API_URL}/api/v1/send` avec le header
`X-Api-Key`, `to` = numero au format E.164 sans le `+`, `message` = texte
ci-dessus. Le SMS (passerelle maison) utilise un gabarit plus court
(160 caracteres) : `sigapei: votre code est XXXXXX (valable 5 min). Ne le partagez jamais.`

---

## 7. Toutes les routes de l'API

**La liste complete, avec le format exact de chaque requete et de chaque
reponse (schemas JSON, codes d'erreur, exemples), est generee automatiquement
et disponible sur `/docs` une fois le service demarre** (Swagger/OpenAPI —
JSON brut sur `/docs-json`, importable dans Postman/Insomnia).

Resume des groupes de routes (prefixees par `/v1`) :

| Prefixe | Contenu |
|---|---|
| `POST /auth/identifier` | Determine la methode de connexion applicable a un identifiant |
| `POST /auth/otp/envoyer`, `POST /auth/otp/verifier` | Connexion telephone/e-mail + OTP |
| `POST /auth/firebase/verifier` | Connexion Google / GitHub |
| `POST /auth/webauthn/*` | Connexion et enregistrement matricule + empreinte |
| `POST /auth/token/rafraichir`, `POST /auth/deconnexion` | Cycle de vie de session |
| `GET/POST/PUT/DELETE /roles` | Gestion des roles dynamiques |
| `GET /moi`, `POST /moi/identifiants-recuperation`, `PUT /moi/questions-securite` | Profil et securite du compte |
| `GET/DELETE /moi/appareils` | Appareils et sessions actives |
| `POST /recuperation/*` | Parcours d'identifiant oublie |
| `GET /interne/introspection` (secret partage), `GET /interne/tentatives` (roles admin) | Endpoints internes (Gateway / back-office) |
| `GET /sante` | Sonde de sante (hors prefixe `/v1`) |

---

## 8. Structure du projet

```
api-identite/
├── src/
│   ├── auth/            Orchestration de la connexion (toutes methodes)
│   ├── roles/            Roles dynamiques (systeme + personnalises)
│   ├── utilisateurs/     Comptes, profil, identifiants/questions de recuperation
│   ├── otp/              Generation, hachage (argon2), verification des OTP
│   ├── biometrie/         WebAuthn/FIDO2
│   ├── jetons/            JWT, liste noire et sessions (Redis)
│   ├── appareils/        Appareils connus, revocation
│   ├── recuperation/      Parcours identifiant oublie
│   ├── audit/             Journal des tentatives de connexion
│   ├── interne/           Endpoints internes (Gateway) + RPC RabbitMQ
│   ├── integrations/      Convessa, SMS maison, SMTP, Firebase, CAPTCHA
│   ├── redis/, rabbitmq/  Infrastructure partagee
│   └── common/            Guards, filtres, decorateurs, utilitaires
├── docker/init-db.sql     Creation du schema identite + extensions Postgres
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## 9. Securite (rappel des points geres nativement)

- Aucun mot de passe, jamais, nulle part.
- Codes OTP haches (argon2) avant stockage, jamais en clair, usage unique.
- Liste noire de revocation JWT + rotation du refresh token a chaque
  rafraichissement.
- CAPTCHA obligatoire sur les formulaires publics (identification, envoi
  d'OTP, recuperation).
- Aucune donnee biometrique brute stockee (delegation totale a WebAuthn).
- Journal d'audit immuable de toute tentative de connexion (succes/echec).
- Helmet + CORS restreint (`CORS_ORIGINS`) + rate limiting global
  (120 requetes/min/IP par defaut, via `@nestjs/throttler`).
- Aucun identifiant interne (`id`) expose : uniquement des `uuid`.
