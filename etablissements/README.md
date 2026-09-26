# etablissements — Microservice Établissements — Plateforme SIGAPEI

Onboarding multi-étapes d'un établissement, référentiel géographique
panafricain (54 pays), workflow de validation par le Super Administrateur,
génération du matricule et de la page d'accueil dynamique par slug, gestion
des plans/modules/abonnements.

- **Port** : `4002`
- **Préfixe API** : toutes les routes sont sous `/v1/...`
- **Sonde de santé** : `GET /sante`
- **Stack** : Laravel 11 (PHP 8.3), PostgreSQL (schéma `etablissements` de
  la base unique partagée avec les 11 autres microservices), Redis
  (cache), RabbitMQ (bus d'événements, partagé avec `identite`).

---

## 1. Démarrage rapide (Docker)

```bash
cp .env.example .env

docker network create sigapei

docker compose up -d --build
```

Puis, une seule fois, les migrations et le référentiel géographique :

```bash
docker compose exec etablissements php artisan migrate
docker compose exec etablissements php artisan db:seed --class=PaysAfriqueSeeder
```

### Sans Docker (développement local)

```bash
composer install
php artisan key:generate
php artisan migrate
php artisan db:seed --class=PaysAfriqueSeeder
php artisan serve --host=0.0.0.0 --port=4002
```

Dans un second terminal, pour la relance quotidienne des corrections (section 7.3) :
```bash
php artisan schedule:work
```

---

## 2. Rendre ce microservice joignable par `identite` (réseau partagé)

Ce microservice **réutilise** le Redis et le RabbitMQ déjà démarrés par la
stack `identite` (même base PostgreSQL unique, juste un schéma différent :
`etablissements` au lieu de `identite`). Pour que les deux stacks Docker se
voient, elles doivent partager un réseau :

```bash
docker network create sigapei
```

Puis, dans le `docker-compose.yml` de **identite**, remplacez le bloc
`networks:` en bas du fichier par :

```yaml
networks:
  sigapei:
    external: true
```

... et changez chaque `networks: - e-academique` en `networks: - sigapei`
dans les services `identite`, `redis`, `rabbitmq` (le service `postgres`
local peut rester tel quel ou être retiré si, comme c'est probablement votre
cas, vous utilisez un Postgres managé distant — voir la conversation
précédente sur Neon). Relancez ensuite `docker compose up -d` côté
identite, puis côté etablissements.

---

## 3. Configuration à réaliser vous-même (obligatoire)

### 3.1. Base de données PostgreSQL

Même base **unique** que les 11 autres microservices, schéma dédié
`etablissements` (`DB_SCHEMA=etablissements` dans `.env`) :
- `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` : vos
  identifiants habituels (Neon, RDS, ou Postgres local).
- `DB_SSLMODE=require` si votre Postgres managé l'exige (cas de Neon, par
  exemple — voir `config/database.php`, option `sslmode` transmise au
  driver PDO pgsql).
- Le schéma `etablissements` est créé automatiquement par la première
  migration (`CREATE SCHEMA IF NOT EXISTS`) — inutile de le créer à la main,
  contrairement à `identite` où Neon a nécessité une commande manuelle
  la première fois (ce n'était dû qu'à l'ordre d'exécution de TypeORM, pas
  à une limite de Neon).

### 3.2. Redis et RabbitMQ

Partagés avec `identite` (voir section 2). Si vous préférez des
instances séparées, changez simplement `REDIS_HOST`/`RABBITMQ_HOST` dans
`.env` pour pointer vers vos propres services.

### 3.3. Stockage objet des documents (S3 ou MinIO)

Les documents de l'étape 4 (autorisation d'enseignement, pièce d'identité,
logo) sont téléversés vers un stockage objet, jamais dans la base :
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_BUCKET`,
  `AWS_DEFAULT_REGION` : vos identifiants S3 (AWS) ou MinIO.
- Pour MinIO auto-hébergé : `AWS_ENDPOINT=http://minio:9000` et
  `AWS_USE_PATH_STYLE_ENDPOINT=true`.

### 3.4. CAPTCHA

Identique à `identite` : `CAPTCHA_PROVIDER`, `CAPTCHA_SECRET_KEY`,
`CAPTCHA_MIN_SCORE`. Le contrôleur d'onboarding (`OnboardingController::soumettre`)
valide un `captchaToken` avant soumission finale (section 9 du cahier des
charges) — branchez-y le même `RecaptchaProvider` que sur Identité si vous
voulez éviter de dupliquer le code entre les deux dépôts.

### 3.5. Paiement des abonnements (FedaPay / KkiaPay)

- **FedaPay** : créez un compte sur https://fedapay.com, récupérez votre clé
  secrète (sandbox puis live) dans le dashboard, renseignez
  `FEDAPAY_SECRET_KEY` et `FEDAPAY_ENVIRONMENT` (`sandbox` ou `live`).
- **KkiaPay** : créez un compte sur https://kkiapay.me, récupérez vos clés
  publique/privée, renseignez `KKIAPAY_PUBLIC_KEY` (utilisée côté widget
  frontend, pas ici), `KKIAPAY_PRIVATE_KEY` (vérification serveur des
  transactions) et `KKIAPAY_SANDBOX`.
- Les deux intégrations (`app/Domain/Abonnement/FedaPayProvider.php` et
  `KkiaPayProvider.php`) suivent la structure documentée de leurs API
  respectives au moment de l'écriture — **vérifiez les endpoints exacts
  dans leur documentation officielle avant mise en production**, ces API
  évoluent.

### 3.6. Secret interne (Gateway)

`INTERNAL_API_SECRET` : **la même valeur** que celle configurée côté
`identite`, pour que la passerelle API (Gateway) puisse appeler les
endpoints `/interne/*` des deux microservices avec un seul secret.

### 3.7. Lien de correction

`FRONT_URL_CORRECTION` : URL de la page front-end qui affichera le
formulaire de correction (le microservice génère le token, le front
l'affiche). `CORRECTION_TOKEN_TTL_HEURES=72` conforme au cahier des charges.

---

## 4. Communication avec les autres microservices (RabbitMQ)

Ce microservice **publie** des événements sur la queue consommée par
`identite` (`RABBITMQ_QUEUE_IDENTITE`, `identite.rpc` par défaut), au
format exact attendu par le transport RMQ de NestJS
(`{"pattern": "...", "data": {...}}`) — voir `app/Services/RabbitMQService.php`.

| Événement publié | Déclenché quand | Consommateur prévu |
|---|---|---|
| `demande.soumise` | Soumission finale du formulaire (étape 5) | Communication (WhatsApp+e-mail à l'établissement, au dirigeant, au Super Admin) |
| `demande.correction_demandee` | Le Super Admin marque des champs à corriger | Communication (notification + lien de correction) |
| `demande.correction_relance` | Relance quotidienne (18h59, tant que non corrigé) | Communication (rappel) |
| `etablissement.valide` | Validation définitive par le Super Admin | **identite** (création du compte administrateur, rôle `administrateur`, `tenantId` = uuid de l'établissement) + Communication (envoi matricule + lien de définition du mot de passe) |
| `etablissement.suspendu` | Suspension par le Super Admin | Communication (notification), Gateway (invalidation immédiate déjà gérée côté cache Redis local) |
| `etablissement.reactive` | Réactivation par le Super Admin | Communication (notification) |

**Côté `identite`** : un petit ajout est nécessaire pour que ce
microservice consomme l'événement `etablissement.valide` et crée
effectivement le compte administrateur (section 7.4, point 4 du cahier des
charges). Voir les fichiers fournis séparément (`interne.rpc.controller.ts`
mis à jour) — sans cet ajout, l'établissement est bien créé mais aucun
compte administrateur n'est créé automatiquement.

---

## 5. Algorithmes clés

### 5.1. Génération du slug (section 2.2)
`app/Domain/Etablissement/SlugService.php` : minuscules, sans accents,
tirets ; en cas de collision, suffixe numérique (`jean-marie`, `jean-marie-2`...).

### 5.2. Génération du matricule (section 7.5)
`app/Domain/Etablissement/MatriculeService.php` : implémente exactement les
6 étapes du cahier des charges (mots génériques ignorés, mot le plus court
retenu, normalisation, code 4 chiffres, unicité avec régénération du seul
code en cas de collision). Exemple : « Complexe Scolaire Kisito » → `kisito8945`.

### 5.3. Cycles autorisés (section 8.2)
`app/Domain/Etablissement/CyclesAutorisesService.php` : Primaire → Maternelle
+ Primaire ; Secondaire → Secondaire ; Université → Universitaire.

---

## 6. Toutes les routes de l'API

| Groupe | Contenu |
|---|---|
| `GET /accueil`, `GET /etablissements/{slug}/accueil` | Pages d'accueil publiques (cache Redis) |
| `GET /geo/pays`, `.../departements`, `.../communes`, `.../arrondissements` | Référentiel géographique en cascade |
| `POST /demandes`, `POST /demandes/{uuid}/documents`, `POST /demandes/{uuid}/soumettre` | Onboarding 5 étapes (sans authentification) |
| `GET/POST /corrections/{token}` | Formulaire de correction via lien signé (sans authentification) |
| `GET /etablissements/{slug}/cycles-autorises`, `.../plans-disponibles`, `POST .../abonnement` | Cycles et abonnements |
| `GET/POST /interne/demandes...`, `/interne/etablissements/{uuid}/suspendre|reactiver`, `GET /interne/resolution-slug/{slug}` | Endpoints internes (secret partagé `X-Internal-Secret`) |
| `GET /sante` | Sonde de santé (hors préfixe `/v1`) |

Une génération Swagger/OpenAPI (comme sur `identite`) peut être ajoutée
via le paquet `darkaonline/l5-swagger` si vous le souhaitez — non incluse
ici pour rester dans le périmètre demandé ; dites-le moi si vous voulez que
je l'ajoute.

---

## 7. Planificateur (relance quotidienne, section 7.3)

Laravel n'a pas de démon cron intégré. En Docker, le service
`etablissements-scheduler` (même image, entrypoint différent) exécute
`php artisan schedule:run` toutes les 60 secondes, ce qui déclenche
effectivement `demandes:relancer-corrections` une fois par jour à 18h59
(défini dans `routes/console.php`). Sans Docker, lancez `php artisan schedule:work`.

---

## 8. Sécurité

- Liens de correction : jetons signés à usage unique (SHA-256 du token,
  jamais stocké en clair), expiration 72h, invalidés dès la première
  utilisation.
- Aucun identifiant interne (`id`) exposé : uniquement `uuid` (et `slug`
  pour les établissements).
- CAPTCHA sur la soumission finale du formulaire public.
- Secret interne partagé (`X-Internal-Secret`) sur tous les endpoints `/interne/*`.
- Documents chiffrés au repos côté stockage objet (S3/MinIO), jamais en base.
