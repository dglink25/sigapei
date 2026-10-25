<?php

namespace App\Docs;

/**
 * Spécification OpenAPI 3.0 du microservice Établissements.
 *
 * Servie en JSON sur GET /docs-json et affichée par Swagger UI sur GET /docs
 * (voir DocsController). Écrite à la main (aucune annotation dans les
 * contrôleurs) : toute nouvelle route ou tout changement de format de
 * requête/réponse doit être répercuté ici, dans la même pull request.
 */
class OpenApiSpec
{
    public static function build(): array
    {
        return [
            'openapi' => '3.0.3',
            'info' => [
                'title' => 'API Établissements - sigapei',
                'version' => '1.0.0',
                'description' => self::descriptionGenerale(),
            ],
            'servers' => [
                ['url' => '/v1', 'description' => 'Préfixe de toutes les routes métier'],
            ],
            'tags' => [
                ['name' => 'Accueil', 'description' => "Pages d'accueil publiques (plateforme et établissement), servies depuis le cache Redis."],
                ['name' => 'Géographie', 'description' => 'Référentiel géographique mondial (tous les pays), pour les listes déroulantes en cascade de l\'étape 2.'],
                ['name' => 'Onboarding', 'description' => "Demande d'inscription d'un établissement en 5 étapes, sans authentification."],
                ['name' => 'Corrections', 'description' => 'Correction d\'un dossier via un lien signé à usage unique, sans authentification.'],
                ['name' => 'Établissements', 'description' => 'Cycles autorisés, plans disponibles et abonnement d\'un établissement actif.'],
                ['name' => 'Mon établissement', 'description' => "Profil de l'établissement, modifiable par son administrateur. Headers X-Internal-Secret + X-User-Role + X-Tenant-Uuid (posés par la Gateway après vérification du JWT)."],
                ['name' => 'Configuration académique', 'description' => "Organisation pédagogique interne : années académiques, cycles actifs, subdivisions (groupes/sections/départements), niveaux scolaires, séries et filières, classes concrètes, cohortes universitaires, matières avec coefficient. Toutes ces routes sont sous `/interne/mon-etablissement/configuration/*` et exigent X-Internal-Secret + X-User-Role: administrateur + X-Tenant-Uuid. Une année académique ne peut jamais être supprimée."],
                ['name' => 'Demandes de cycle', 'description' => "Flux de demande d'extension de cycle. Un établissement ne dispose que des cycles accordés lors de sa validation. S'il souhaite un nouveau cycle, il soumet une demande que le Super Administrateur instruit. Routes établissement : `/interne/mon-etablissement/demandes-cycle`. Routes Super Admin : `/interne/demandes-cycle`."],
                ['name' => 'Interne', 'description' => 'Back-office Super Administrateur et passerelle API (Gateway). Header X-Internal-Secret obligatoire.'],
                ['name' => 'Santé', 'description' => 'Sonde de disponibilité.'],
            ],
            'paths' => self::paths(),
            'components' => self::components(),
        ];
    }

    private static function descriptionGenerale(): string
    {
        return <<<'MD'
Documentation du microservice **Établissements** de la plateforme SIGAPEI : onboarding multi-étapes d'un établissement, référentiel géographique mondial, workflow de validation par le Super Administrateur, génération du slug, du matricule et du code public (XXXX), page d'accueil dynamique, plans et abonnements.

### Conventions

- Toutes les routes métier sont sous `/v1`. Aucun identifiant interne n'est exposé : uniquement des `uuid` (et le `slug` pour un établissement).
- Les routes **publiques** (accueil, géographie, informations d'un établissement par son code, onboarding, corrections) n'exigent aucune authentification.
- Chaque établissement a un **code public unique de 4 caractères** (`XXXX`, lettres majuscules et chiffres sans I, L, O, 0, 1), distinct du `slug` (URL) et du `matricule` (identifiant de connexion du dirigeant, jamais exposé publiquement).
- Les routes **`/interne/*`** exigent le header `X-Internal-Secret` (bouton **Authorize**). Elles ne sont jamais appelées par un client final.
- Les routes **`/interne/mon-etablissement*`** exigent en plus `X-User-Role: administrateur` et `X-Tenant-Uuid` (uuid de l'établissement de l'utilisateur), posés par la Gateway après vérification du JWT d'api-identite. L'établissement visé n'est jamais lu dans l'URL.
- Réponse en succès : `{ "success": true, ... }`.
- Réponse en erreur : `{ "success": false, "error": { "code", "message", "details" }, "path", "timestamp" }`. Les erreurs levées directement par un contrôleur peuvent omettre `path` et `timestamp`.

### Cycle de vie d'une demande

`brouillon` → `soumise` → (`correction_demandee` → `soumise`)* → `validee`

À la validation, une seule transaction crée l'établissement (statut `actif`), son slug, son matricule et ses cycles autorisés.

### Événements RabbitMQ publiés

Format du message : `{ "pattern": "<evenement>", "data": { ... } }`, publié sur la queue `RABBITMQ_QUEUE_IDENTITE`.

| Événement | Déclenché par | Consommateur |
|---|---|---|
| `demande.soumise` | `POST /demandes/{uuid}/soumettre` | Communication |
| `demande.correction_demandee` | `POST /interne/demandes/{uuid}/corrections` | Communication |
| `demande.correction_relance` | Relance quotidienne à 18h59 | Communication |
| `etablissement.valide` | `POST /interne/demandes/{uuid}/valider` | Identité (création du compte administrateur), Communication |
| `etablissement.suspendu` | `POST /interne/etablissements/{uuid}/suspendre` | Communication |
| `etablissement.reactive` | `POST /interne/etablissements/{uuid}/reactiver` | Communication |
MD;
    }

    // ------------------------------------------------------------------
    // Fabriques de blocs réutilisés
    // ------------------------------------------------------------------

    private static function json(array $schema, mixed $example = null): array
    {
        $media = ['schema' => $schema];
        if ($example !== null) {
            $media['example'] = $example;
        }

        return ['application/json' => $media];
    }

    private static function succes(string $description, array $proprietes, mixed $example = null): array
    {
        return [
            'description' => $description,
            'content' => self::json([
                'type' => 'object',
                'properties' => array_merge(['success' => ['type' => 'boolean', 'example' => true]], $proprietes),
            ], $example),
        ];
    }

    private static function ref(string $schema): array
    {
        return ['$ref' => '#/components/schemas/'.$schema];
    }

    private static function reponseRef(string $reponse): array
    {
        return ['$ref' => '#/components/responses/'.$reponse];
    }

    private static function paramUuid(string $nom, string $description): array
    {
        return [
            'name' => $nom,
            'in' => 'path',
            'required' => true,
            'description' => $description,
            'schema' => ['type' => 'string', 'format' => 'uuid'],
        ];
    }

    private static function paramSlug(): array
    {
        return [
            'name' => 'slug',
            'in' => 'path',
            'required' => true,
            'description' => "Slug de l'établissement (ex. jean-marie).",
            'schema' => ['type' => 'string', 'example' => 'jean-marie'],
        ];
    }

    /** Headers de contexte utilisateur posés par la Gateway pour /interne/mon-etablissement*. */
    private static function paramsContexteTenant(): array
    {
        return [
            ['name' => 'X-User-Role', 'in' => 'header', 'required' => true, 'description' => 'Doit valoir `administrateur`.', 'schema' => ['type' => 'string', 'example' => 'administrateur']],
            ['name' => 'X-Tenant-Uuid', 'in' => 'header', 'required' => true, 'description' => "Uuid de l'établissement de l'utilisateur, tiré du JWT par la Gateway.", 'schema' => ['type' => 'string', 'format' => 'uuid']],
        ];
    }

    /** Parametres de recherche communs aux listes de departements, communes et arrondissements. */
    private static function paramsRecherche(): array
    {
        return [
            [
                'name' => 'q',
                'in' => 'query',
                'required' => false,
                'description' => "Recherche par nom (contient, sans tenir compte de la casse). Indispensable pour les niveaux très peuplés : une recherche n'est jamais mise en cache et est bornée par `limite`.",
                'schema' => ['type' => 'string', 'maxLength' => 100],
            ],
            [
                'name' => 'limite',
                'in' => 'query',
                'required' => false,
                'description' => 'Nombre maximal de résultats **quand `q` est fourni** (50 par défaut, 200 au maximum). Sans `q`, la liste complète est retournée.',
                'schema' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 200, 'default' => 50],
            ],
        ];
    }

    // ------------------------------------------------------------------
    // Routes
    // ------------------------------------------------------------------

    private static function paths(): array
    {
        $secret = [['SecretInterne' => []]];

        return [
            // ---------------- Accueil ----------------
            '/accueil' => [
                'get' => [
                    'tags' => ['Accueil'],
                    'summary' => "Page d'accueil par défaut de la plateforme",
                    'description' => "Contenu public affiché sur le domaine racine quand aucun slug n'est présent dans l'URL. Mis en cache Redis (120 s par défaut).",
                    'responses' => [
                        '200' => self::succes("Contenu de la page d'accueil", [
                            'accueil' => self::ref('AccueilPlateforme'),
                        ]),
                    ],
                ],
            ],
            '/etablissements/{slug}/accueil' => [
                'get' => [
                    'tags' => ['Accueil'],
                    'summary' => "Page d'accueil publique d'un établissement",
                    'description' => "Contenu public d'un établissement, retrouvé par son slug. Si l'établissement est suspendu ou archivé, un contenu dégradé est retourné (`degrade: true`) à la place du contenu normal. Mis en cache Redis, invalidé à chaque changement de statut et à chaque modification du profil.",
                    'parameters' => [self::paramSlug()],
                    'responses' => [
                        '200' => self::succes("Contenu de l'établissement (normal ou dégradé)", [
                            'accueil' => self::ref('AccueilEtablissement'),
                        ]),
                        '404' => self::reponseRef('RessourceIntrouvable'),
                    ],
                ],
            ],

            // ---------------- Géographie ----------------
            '/geo/pays' => [
                'get' => [
                    'tags' => ['Géographie'],
                    'summary' => 'Liste des pays',
                    'description' => "Tous les pays et territoires habités du monde, triés par nom. Chaque pays indique le libellé de ses trois niveaux de subdivision (`libelle_niveau_1/2/3`, ex. « Département », « Commune », « Arrondissement » pour le Bénin) : à afficher comme étiquette des listes en cascade. Cache Redis longue durée (24 h par défaut).",
                    'parameters' => [[
                        'name' => 'continent',
                        'in' => 'query',
                        'required' => false,
                        'description' => 'Filtre par continent.',
                        'schema' => ['type' => 'string', 'enum' => ['afrique', 'amerique_nord', 'amerique_sud', 'asie', 'europe', 'oceanie']],
                    ]],
                    'responses' => [
                        '200' => self::succes('Liste des pays', [
                            'pays' => ['type' => 'array', 'items' => self::ref('Pays')],
                        ]),
                    ],
                ],
            ],
            '/geo/pays/{uuid}/departements' => [
                'get' => [
                    'tags' => ['Géographie'],
                    'summary' => 'Départements / régions d\'un pays',
                    'parameters' => array_merge([self::paramUuid('uuid', 'Identifiant du pays.')], self::paramsRecherche()),
                    'responses' => [
                        '200' => self::succes('Départements du pays', [
                            'departements' => ['type' => 'array', 'items' => self::ref('ElementGeo')],
                        ]),
                        '404' => self::reponseRef('RessourceIntrouvable'),
                    ],
                ],
            ],
            '/geo/departements/{uuid}/communes' => [
                'get' => [
                    'tags' => ['Géographie'],
                    'summary' => "Communes d'un département",
                    'parameters' => array_merge([self::paramUuid('uuid', 'Identifiant du département.')], self::paramsRecherche()),
                    'responses' => [
                        '200' => self::succes('Communes du département', [
                            'communes' => ['type' => 'array', 'items' => self::ref('ElementGeo')],
                        ]),
                        '404' => self::reponseRef('RessourceIntrouvable'),
                    ],
                ],
            ],
            '/geo/communes/{uuid}/arrondissements' => [
                'get' => [
                    'tags' => ['Géographie'],
                    'summary' => "Arrondissements d'une commune",
                    'parameters' => array_merge([self::paramUuid('uuid', 'Identifiant de la commune.')], self::paramsRecherche()),
                    'responses' => [
                        '200' => self::succes('Arrondissements de la commune', [
                            'arrondissements' => ['type' => 'array', 'items' => self::ref('ElementGeo')],
                        ]),
                        '404' => self::reponseRef('RessourceIntrouvable'),
                    ],
                ],
            ],

            // ---------------- Onboarding ----------------
            '/demandes' => [
                'post' => [
                    'tags' => ['Onboarding'],
                    'summary' => 'Crée ou met à jour un brouillon de demande',
                    'description' => "Appelé à chaque étape du formulaire (sauvegarde automatique). Sans `uuid`, une nouvelle demande est créée ; avec `uuid`, le brouillon existant est retrouvé et **fusionné** (fusion récursive) avec les données envoyées : on peut donc n'envoyer que l'étape en cours. Conserver l'`uuid` côté navigateur permet de reprendre la demande après une fermeture accidentelle.\n\nChaque uuid de `localisation` (pays, département, commune, arrondissement) est vérifié : il doit exister et être cohérent avec le niveau inférieur choisi (une commune doit appartenir au département envoyé), sinon `422`. Les niveaux supérieurs sont déduits du niveau le plus fin envoyé. Pour effacer un niveau, envoyer `null`. Seul un brouillon est modifiable : une demande déjà soumise répond `409`.",
                    'requestBody' => [
                        'required' => true,
                        'content' => self::json([
                            'type' => 'object',
                            'required' => ['donnees'],
                            'properties' => [
                                'uuid' => [
                                    'type' => 'string',
                                    'format' => 'uuid',
                                    'nullable' => true,
                                    'description' => 'Uuid du brouillon à mettre à jour. Absent à la toute première sauvegarde.',
                                ],
                                'donnees' => self::ref('DonneesFormulaire'),
                            ],
                        ], [
                            'donnees' => [
                                'etablissement' => [
                                    'nom' => 'Complexe Scolaire Kisito',
                                    'types' => ['primaire', 'secondaire'],
                                    'annee_ouverture' => 2015,
                                    'email' => 'contact@kisito.bj',
                                    'telephone_1' => '+22997000000',
                                    'telephone_2' => '+22996000000',
                                ],
                                'localisation' => [
                                    'pays_uuid' => '6a1d0c52-9f3b-4c1e-8a77-2b5e4d9c0a31',
                                    'departement_uuid' => '3e8b7a14-52c0-4d6f-b1a9-7c2d0e5f8a64',
                                    'commune_uuid' => '9c4f2e68-1a7d-4b30-8e52-6d0a3b7c1f95',
                                    'arrondissement_uuid' => '0b6f1c3e-5a2d-4b7e-9c1f-3d8a2e4f6a10',
                                    'adresse_complete' => 'Rue 123, près du marché de Ganhi',
                                ],
                                'dirigeant' => [
                                    'nom_complet' => 'Vore nom complet',
                                    'titre' => 'Fondateur',
                                    'email' => 'jean@kisito.bj',
                                    'telephone' => '+22997111111',
                                ],
                            ],
                        ]),
                    ],
                    'responses' => [
                        '200' => self::succes('Brouillon enregistré', [
                            'demandeUuid' => ['type' => 'string', 'format' => 'uuid'],
                            'statut' => ['type' => 'string', 'example' => 'brouillon'],
                        ]),
                        '409' => self::reponseRef('ConflitStatut'),
                        '422' => self::reponseRef('DonneesInvalides'),
                    ],
                ],
            ],
            '/demandes/{uuid}/documents' => [
                'post' => [
                    'tags' => ['Onboarding'],
                    'summary' => 'Téléverse un document (étape 4)',
                    'description' => "Envoie un fichier vers le stockage objet (S3/MinIO). Seule la référence (chemin, type MIME, taille) est écrite en base. Documents `autorisation` et `piece_identite` : 10 Mo maximum, formats PDF, JPG, PNG.\n\n**Logo** : jpg, png ou webp, 2 Mo maximum, SVG refusé. Une demande n'a qu'un seul logo : un nouvel envoi remplace l'ancien. Le logo est **obligatoire** pour pouvoir soumettre la demande.\n\nUn document n'est accepté que pour un brouillon ou un dossier en `correction_demandee` ; après validation, le logo se change via `POST /interne/mon-etablissement/logo`.",
                    'parameters' => [self::paramUuid('uuid', 'Uuid de la demande (brouillon).')],
                    'requestBody' => [
                        'required' => true,
                        'content' => [
                            'multipart/form-data' => [
                                'schema' => [
                                    'type' => 'object',
                                    'required' => ['type', 'fichier'],
                                    'properties' => [
                                        'type' => [
                                            'type' => 'string',
                                            'enum' => ['autorisation', 'piece_identite', 'logo'],
                                            'description' => "`autorisation` : fiche d'autorisation d'enseignement délivrée par l'État. `piece_identite` : pièce d'identité du fondateur/dirigeant. `logo` : obligatoire pour soumettre.",
                                        ],
                                        'fichier' => ['type' => 'string', 'format' => 'binary'],
                                    ],
                                ],
                            ],
                        ],
                    ],
                    'responses' => [
                        '200' => self::succes('Document enregistré', [
                            'documentUuid' => ['type' => 'string', 'format' => 'uuid'],
                        ]),
                        '404' => self::reponseRef('RessourceIntrouvable'),
                        '409' => self::reponseRef('ConflitStatut'),
                        '422' => self::reponseRef('DonneesInvalides'),
                    ],
                ],
            ],
            '/demandes/{uuid}/soumettre' => [
                'post' => [
                    'tags' => ['Onboarding'],
                    'summary' => 'Soumet la demande finalisée (étape 5)',
                    'description' => "Le **logo est obligatoire** : sans document de type `logo`, `422` (champ `documents.logo`). La localisation doit être complète : le pays est obligatoire, puis chaque niveau (département, commune, arrondissement) l'est tant que le référentiel en propose pour le niveau choisi ; l'adresse est obligatoire. Sinon `422` avec le détail par champ. Seul un brouillon peut être soumis (`409` sinon). Passe la demande au statut `soumise`, horodate la soumission et publie l'événement `demande.soumise` (notifications WhatsApp + e-mail à l'établissement, au dirigeant et au Super Administrateur, envoyées par le microservice Communication).\n\nLe jeton CAPTCHA est vérifié côté serveur avant tout traitement.",
                    'parameters' => [self::paramUuid('uuid', 'Uuid de la demande.')],
                    'requestBody' => [
                        'required' => true,
                        'content' => self::json([
                            'type' => 'object',
                            'required' => ['confirmationAuthenticite', 'acceptationConditions', 'captchaToken'],
                            'properties' => [
                                'confirmationAuthenticite' => ['type' => 'boolean', 'description' => "Case « Je confirme l'authenticité des informations fournies » : doit valoir `true`.", 'example' => true],
                                'acceptationConditions' => ['type' => 'boolean', 'description' => "Case « J'accepte les conditions d'utilisation et la politique de confidentialité » : doit valoir `true`.", 'example' => true],
                                'captchaToken' => ['type' => 'string', 'description' => 'Jeton reCAPTCHA v3 / hCaptcha obtenu côté client.'],
                            ],
                        ]),
                    ],
                    'responses' => [
                        '200' => self::succes('Demande soumise', [
                            'demandeUuid' => ['type' => 'string', 'format' => 'uuid'],
                            'statut' => ['type' => 'string', 'example' => 'soumise'],
                            'dateSoumission' => ['type' => 'string', 'format' => 'date-time'],
                        ]),
                        '401' => self::reponseRef('CaptchaInvalide'),
                        '404' => self::reponseRef('RessourceIntrouvable'),
                        '409' => self::reponseRef('ConflitStatut'),
                        '422' => self::reponseRef('DonneesInvalides'),
                    ],
                ],
            ],

            // ---------------- Corrections ----------------
            '/corrections/{token}' => [
                'get' => [
                    'tags' => ['Corrections'],
                    'summary' => 'Ouvre le formulaire de correction via le lien signé',
                    'description' => "Accès sans authentification : le jeton, reçu par WhatsApp/e-mail, fait office de preuve de possession du canal. Valable 72 h, régénéré à chaque relance, invalidé dès la première correction soumise.",
                    'parameters' => [[
                        'name' => 'token',
                        'in' => 'path',
                        'required' => true,
                        'description' => 'Jeton reçu dans le lien de correction.',
                        'schema' => ['type' => 'string'],
                    ]],
                    'responses' => [
                        '200' => self::succes('Dossier à corriger', [
                            'demandeUuid' => ['type' => 'string', 'format' => 'uuid'],
                            'champsACorriger' => [
                                'type' => 'object',
                                'additionalProperties' => ['type' => 'string'],
                                'description' => 'Sections à corriger (clé) avec le motif donné par le Super Administrateur (valeur). Seules ces sections sont éditables.',
                                'example' => ['dirigeant' => 'Le numéro de téléphone est invalide.'],
                            ],
                            'donneesFormulaire' => self::ref('DonneesFormulaire'),
                        ]),
                        '404' => [
                            'description' => 'Lien invalide, expiré ou déjà utilisé.',
                            'content' => self::json(self::ref('Erreur'), [
                                'success' => false,
                                'error' => ['code' => 'LIEN_CORRECTION_INVALIDE', 'message' => 'Ce lien est invalide ou a expiré.'],
                            ]),
                        ],
                    ],
                ],
                'post' => [
                    'tags' => ['Corrections'],
                    'summary' => 'Soumet la correction',
                    'description' => "Seules les sections marquées « à corriger » sont prises en compte : toute autre section envoyée est ignorée. Le statut repasse à `soumise`, le jeton est invalidé et la relance quotidienne s'arrête.",
                    'parameters' => [[
                        'name' => 'token',
                        'in' => 'path',
                        'required' => true,
                        'description' => 'Jeton reçu dans le lien de correction.',
                        'schema' => ['type' => 'string'],
                    ]],
                    'requestBody' => [
                        'required' => true,
                        'content' => self::json([
                            'type' => 'object',
                            'required' => ['donnees'],
                            'properties' => ['donnees' => self::ref('DonneesFormulaire')],
                        ], [
                            'donnees' => ['dirigeant' => ['telephone' => '+22997111111']],
                        ]),
                    ],
                    'responses' => [
                        '200' => self::succes('Correction enregistrée', [
                            'demandeUuid' => ['type' => 'string', 'format' => 'uuid'],
                            'statut' => ['type' => 'string', 'example' => 'soumise'],
                        ]),
                        '422' => [
                            'description' => 'Lien invalide ou expiré, ou données invalides.',
                            'content' => self::json(self::ref('Erreur'), [
                                'success' => false,
                                'error' => [
                                    'code' => 'DONNEES_INVALIDES',
                                    'message' => 'Les données envoyées sont invalides.',
                                    'details' => ['token' => ['Ce lien de correction est invalide ou a expiré.']],
                                ],
                            ]),
                        ],
                    ],
                ],
            ],

            // ---------------- Établissements ----------------
            '/etablissements/code/{code}' => [
                'get' => [
                    'tags' => ['Établissements'],
                    'summary' => "Informations publiques d'un établissement par son code",
                    'description' => "Retrouve un établissement à partir de son **code public à 4 caractères** (`XXXX`), sans authentification. La casse n'a pas d'importance (`ab3k` = `AB3K`).\n\nNe contient que des informations déjà publiques : jamais le matricule, ni les coordonnées GPS, ni les identifiants internes. Un établissement suspendu ou archivé retourne un contenu dégradé (`degrade: true`). Mis en cache Redis, invalidé à chaque changement de statut et à chaque modification du profil.\n\nUn code qui n'a pas exactement 4 caractères alphanumériques répond directement `404`.",
                    'parameters' => [[
                        'name' => 'code',
                        'in' => 'path',
                        'required' => true,
                        'description' => "Code de l'établissement (4 lettres majuscules ou chiffres).",
                        'schema' => ['type' => 'string', 'pattern' => '^[A-Za-z0-9]{4}$', 'example' => 'K7QP'],
                    ]],
                    'responses' => [
                        '200' => self::succes("Informations de l'établissement (normales ou dégradées)", [
                            'etablissement' => self::ref('EtablissementPublic'),
                        ]),
                        '404' => [
                            'description' => 'Aucun établissement ne correspond à ce code.',
                            'content' => self::json(self::ref('Erreur'), [
                                'success' => false,
                                'error' => ['code' => 'ETABLISSEMENT_INTROUVABLE', 'message' => 'Aucun établissement ne correspond à ce code.'],
                            ]),
                        ],
                    ],
                ],
            ],
            '/etablissements/{slug}/cycles-autorises' => [
                'get' => [
                    'tags' => ['Établissements'],
                    'summary' => "Cycles que l'établissement peut activer",
                    'description' => "Dérivés des types de l'établissement : `maternelle` → maternelle seul ; `primaire` → maternelle + primaire ; `secondaire` → secondaire ; `universite` → universitaire. Quand l'administrateur retire un type, ses cycles passent à `inactif` (sans suppression). Consommé par le microservice Scolarité.",
                    'parameters' => [self::paramSlug()],
                    'responses' => [
                        '200' => self::succes('Cycles autorisés', [
                            'cyclesAutorises' => ['type' => 'array', 'items' => self::ref('CycleAutorise')],
                        ]),
                        '404' => self::reponseRef('RessourceIntrouvable'),
                    ],
                ],
            ],
            '/etablissements/{slug}/plans-disponibles' => [
                'get' => [
                    'tags' => ['Établissements'],
                    'summary' => 'Plans d\'abonnement proposables',
                    'description' => 'Plans actifs, triés par prix croissant, avec les modules et fonctionnalités inclus.',
                    'parameters' => [self::paramSlug()],
                    'responses' => [
                        '200' => self::succes('Plans disponibles', [
                            'plans' => ['type' => 'array', 'items' => self::ref('Plan')],
                        ]),
                    ],
                ],
            ],
            '/etablissements/{slug}/abonnement' => [
                'post' => [
                    'tags' => ['Établissements'],
                    'summary' => 'Souscrit ou change de plan',
                    'description' => "Crée l'abonnement (statut `essai` si le plan prévoit des jours d'essai, sinon `actif`) et active les modules inclus dans le plan. Le paiement lui-même (FedaPay / KkiaPay) est confirmé séparément.",
                    'parameters' => [self::paramSlug()],
                    'requestBody' => [
                        'required' => true,
                        'content' => self::json([
                            'type' => 'object',
                            'required' => ['planUuid'],
                            'properties' => ['planUuid' => ['type' => 'string', 'format' => 'uuid']],
                        ]),
                    ],
                    'responses' => [
                        '200' => self::succes('Abonnement créé', [
                            'abonnementUuid' => ['type' => 'string', 'format' => 'uuid'],
                            'statut' => ['type' => 'string', 'enum' => ['essai', 'actif'], 'example' => 'essai'],
                        ]),
                        '404' => self::reponseRef('RessourceIntrouvable'),
                        '422' => self::reponseRef('DonneesInvalides'),
                    ],
                ],
            ],

            // ---------------- Mon établissement (administrateur de l'établissement) ----------------
            '/interne/mon-etablissement' => [
                'get' => [
                    'tags' => ['Mon établissement'],
                    'summary' => "Profil de l'établissement de l'administrateur connecté",
                    'description' => "Inclut le matricule (jamais exposé publiquement) et la liste `champsModifiables`. L'établissement est déduit du header `X-Tenant-Uuid`, jamais de l'URL.",
                    'security' => $secret,
                    'parameters' => self::paramsContexteTenant(),
                    'responses' => [
                        '200' => self::succes('Profil', ['etablissement' => self::ref('ProfilEtablissement')]),
                        '401' => self::reponseRef('SecretInvalide'),
                        '403' => self::reponseRef('AccesAdministrateurRequis'),
                        '404' => self::reponseRef('RessourceIntrouvable'),
                    ],
                ],
                'patch' => [
                    'tags' => ['Mon établissement'],
                    'summary' => 'Modifie partiellement le profil',
                    'description' => "Seules les clés envoyées sont modifiées. **Modifiables** : `types`, `adresse_complete`, `localisation` (hiérarchie complète, remplace l'ancienne, validée comme à l'onboarding), `geolocalisation`. Le logo se change via `POST /interne/mon-etablissement/logo`.\n\nTout autre champ (nom, slug, code, matricule, statut, email, téléphones, année d'ouverture, dirigeant...) est refusé : `422` listant les champs refusés dans `details`, rien n'est modifié. Un corps vide répond aussi `422`.\n\n`types` : au moins un. Un type ajouté crée ou réactive ses cycles autorisés ; un type retiré passe ses cycles à `inactif` (sans suppression). Les abonnements ne sont pas modifiés. Établissement non `actif` : `409`. Les caches publics sont invalidés.",
                    'security' => $secret,
                    'parameters' => self::paramsContexteTenant(),
                    'requestBody' => [
                        'required' => true,
                        'content' => self::json(self::ref('ModificationEtablissement'), [
                            'adresse_complete' => 'Rue 45, face à la pharmacie',
                            'geolocalisation' => ['latitude' => 6.3702930, 'longitude' => 2.3912360],
                        ]),
                    ],
                    'responses' => [
                        '200' => self::succes('Profil mis à jour', ['etablissement' => self::ref('ProfilEtablissement')]),
                        '401' => self::reponseRef('SecretInvalide'),
                        '403' => self::reponseRef('AccesAdministrateurRequis'),
                        '409' => self::reponseRef('ConflitStatut'),
                        '422' => self::reponseRef('DonneesInvalides'),
                    ],
                ],
            ],
            '/interne/mon-etablissement/logo' => [
                'post' => [
                    'tags' => ['Mon établissement'],
                    'summary' => 'Remplace le logo',
                    'description' => "Formats jpg, png, webp ; 2 Mo maximum ; SVG refusé. L'ancien logo (fichier et ligne) est supprimé et `logoDocumentId` est mis à jour. Établissement non `actif` : `409`. Les caches publics sont invalidés.",
                    'security' => $secret,
                    'parameters' => self::paramsContexteTenant(),
                    'requestBody' => [
                        'required' => true,
                        'content' => [
                            'multipart/form-data' => [
                                'schema' => [
                                    'type' => 'object',
                                    'required' => ['fichier'],
                                    'properties' => ['fichier' => ['type' => 'string', 'format' => 'binary']],
                                ],
                            ],
                        ],
                    ],
                    'responses' => [
                        '200' => self::succes('Logo remplacé', ['logoDocumentId' => ['type' => 'string', 'format' => 'uuid']]),
                        '401' => self::reponseRef('SecretInvalide'),
                        '403' => self::reponseRef('AccesAdministrateurRequis'),
                        '409' => self::reponseRef('ConflitStatut'),
                        '422' => self::reponseRef('DonneesInvalides'),
                    ],
                ],
            ],

            // ---------------- Configuration académique ----------------
            '/interne/mon-etablissement/configuration/annees' => [
                'get' => [
                    'tags' => ['Configuration académique'],
                    'summary' => 'Liste les années académiques',
                    'description' => "Années de l'établissement connecté, triées par `date_debut` décroissante. Le champ `statut` est calculé dynamiquement (jamais stocké) : `en_cours`, `a_venir`, `termine` ou `suspendu` (prioritaire). `nb_cycles` = nombre de cycles activés pour cette année.",
                    'security' => $secret,
                    'parameters' => self::paramsContexteTenant(),
                    'responses' => [
                        '200' => self::succes('Liste des années académiques', [
                            'data' => ['type' => 'array', 'items' => self::ref('AnneeAcademique')],
                        ]),
                        '401' => self::reponseRef('SecretInvalide'),
                        '403' => self::reponseRef('AccesAdministrateurRequis'),
                    ],
                ],
                'post' => [
                    'tags' => ['Configuration académique'],
                    'summary' => 'Crée une année académique',
                    'description' => "**Action irréversible** : une année créée ne peut jamais être supprimée. Le libellé (ex. `2026-2027`) est généré automatiquement depuis les dates si absent. Les chevauchements de plages entre années du même établissement sont interdits (`422`). Une confirmation explicite doit être affichée côté client avant l'appel.",
                    'security' => $secret,
                    'parameters' => self::paramsContexteTenant(),
                    'requestBody' => [
                        'required' => true,
                        'content' => self::json([
                            'type' => 'object',
                            'required' => ['date_debut', 'date_fin'],
                            'properties' => [
                                'date_debut' => ['type' => 'string', 'format' => 'date', 'example' => '2026-09-01'],
                                'date_fin'   => ['type' => 'string', 'format' => 'date', 'example' => '2027-07-31'],
                                'libelle'    => ['type' => 'string', 'maxLength' => 20, 'nullable' => true, 'description' => 'Généré automatiquement si absent (ex. 2026-2027).'],
                            ],
                        ]),
                    ],
                    'responses' => [
                        '201' => self::succes('Année créée', ['data' => self::ref('AnneeAcademique')]),
                        '401' => self::reponseRef('SecretInvalide'),
                        '403' => self::reponseRef('AccesAdministrateurRequis'),
                        '422' => self::reponseRef('DonneesInvalides'),
                    ],
                ],
            ],
            '/interne/mon-etablissement/configuration/annees/{uuid}' => [
                'get' => [
                    'tags' => ['Configuration académique'],
                    'summary' => 'Détail d\'une année académique',
                    'security' => $secret,
                    'parameters' => array_merge(self::paramsContexteTenant(), [self::paramUuid('uuid', 'Uuid de l\'année académique.')]),
                    'responses' => [
                        '200' => self::succes('Année académique', ['data' => self::ref('AnneeAcademique')]),
                        '401' => self::reponseRef('SecretInvalide'),
                        '403' => self::reponseRef('AccesAdministrateurRequis'),
                        '404' => self::reponseRef('RessourceIntrouvable'),
                    ],
                ],
                'patch' => [
                    'tags' => ['Configuration académique'],
                    'summary' => 'Modifie partiellement une année',
                    'description' => "Seules les clés envoyées sont modifiées. **Restriction** : `date_debut` et `date_fin` ne peuvent plus être modifiées si l'année est au statut `termine`. La note de suspension est modifiable à tout moment.",
                    'security' => $secret,
                    'parameters' => array_merge(self::paramsContexteTenant(), [self::paramUuid('uuid', 'Uuid de l\'année académique.')]),
                    'requestBody' => [
                        'required' => true,
                        'content' => self::json([
                            'type' => 'object',
                            'properties' => [
                                'date_debut'      => ['type' => 'string', 'format' => 'date'],
                                'date_fin'        => ['type' => 'string', 'format' => 'date'],
                                'libelle'         => ['type' => 'string', 'maxLength' => 20],
                                'note_suspension' => ['type' => 'string'],
                            ],
                        ]),
                    ],
                    'responses' => [
                        '200' => self::succes('Année mise à jour', ['data' => self::ref('AnneeAcademique')]),
                        '401' => self::reponseRef('SecretInvalide'),
                        '403' => self::reponseRef('AccesAdministrateurRequis'),
                        '404' => self::reponseRef('RessourceIntrouvable'),
                        '422' => self::reponseRef('DonneesInvalides'),
                    ],
                ],
            ],
            '/interne/mon-etablissement/configuration/annees/{uuid}/suspendre' => [
                'post' => [
                    'tags' => ['Configuration académique'],
                    'summary' => 'Suspend une année académique',
                    'description' => "La suspension est prioritaire sur le calcul normal du statut. Une année suspendue reste `suspendu` jusqu'à réactivation explicite, même si sa période est en cours. L'action est journalisée dans `audit_config_academique`.",
                    'security' => $secret,
                    'parameters' => array_merge(self::paramsContexteTenant(), [self::paramUuid('uuid', 'Uuid de l\'année académique.')]),
                    'requestBody' => [
                        'required' => false,
                        'content' => self::json([
                            'type' => 'object',
                            'properties' => ['note' => ['type' => 'string', 'description' => 'Motif de la suspension (facultatif).']],
                        ]),
                    ],
                    'responses' => [
                        '200' => self::succes('Année suspendue', ['data' => self::ref('AnneeAcademique')]),
                        '401' => self::reponseRef('SecretInvalide'),
                        '403' => self::reponseRef('AccesAdministrateurRequis'),
                        '404' => self::reponseRef('RessourceIntrouvable'),
                    ],
                ],
            ],
            '/interne/mon-etablissement/configuration/annees/{uuid}/reactiver' => [
                'post' => [
                    'tags' => ['Configuration académique'],
                    'summary' => 'Réactive une année suspendue',
                    'description' => "Efface le flag `suspendu`. Le statut est recalculé depuis les dates : `en_cours`, `a_venir` ou `termine`. L'action est journalisée.",
                    'security' => $secret,
                    'parameters' => array_merge(self::paramsContexteTenant(), [self::paramUuid('uuid', 'Uuid de l\'année académique.')]),
                    'responses' => [
                        '200' => self::succes('Année réactivée', ['data' => self::ref('AnneeAcademique')]),
                        '401' => self::reponseRef('SecretInvalide'),
                        '403' => self::reponseRef('AccesAdministrateurRequis'),
                        '404' => self::reponseRef('RessourceIntrouvable'),
                    ],
                ],
            ],

            // Cycles actifs
            '/interne/mon-etablissement/configuration/cycles' => [
                'get' => [
                    'tags' => ['Configuration académique'],
                    'summary' => 'Liste les cycles actifs',
                    'security' => $secret,
                    'parameters' => array_merge(self::paramsContexteTenant(), [[
                        'name' => 'annee_uuid', 'in' => 'query', 'required' => false,
                        'description' => 'Filtre par année académique.',
                        'schema' => ['type' => 'string', 'format' => 'uuid'],
                    ]]),
                    'responses' => [
                        '200' => self::succes('Cycles actifs', ['data' => ['type' => 'array', 'items' => self::ref('CycleConfig')]]),
                        '401' => self::reponseRef('SecretInvalide'),
                        '403' => self::reponseRef('AccesAdministrateurRequis'),
                    ],
                ],
                'post' => [
                    'tags' => ['Configuration académique'],
                    'summary' => 'Active ou désactive un cycle pour une année',
                    'description' => "Crée la ligne si elle n'existe pas (`actif: true` par défaut), sinon met à jour `actif`. Contrainte unique `(etablissement_id, annee_id, cycle)`.",
                    'security' => $secret,
                    'parameters' => self::paramsContexteTenant(),
                    'requestBody' => [
                        'required' => true,
                        'content' => self::json([
                            'type' => 'object',
                            'required' => ['annee_uuid', 'cycle'],
                            'properties' => [
                                'annee_uuid' => ['type' => 'string', 'format' => 'uuid'],
                                'cycle'      => ['type' => 'string', 'enum' => ['maternelle', 'primaire', 'secondaire', 'universitaire']],
                                'actif'      => ['type' => 'boolean', 'default' => true],
                            ],
                        ], ['annee_uuid' => '...', 'cycle' => 'primaire', 'actif' => true]),
                    ],
                    'responses' => [
                        '200' => self::succes('Cycle mis à jour', ['data' => self::ref('CycleConfig')]),
                        '401' => self::reponseRef('SecretInvalide'),
                        '403' => self::reponseRef('AccesAdministrateurRequis'),
                        '422' => self::reponseRef('DonneesInvalides'),
                    ],
                ],
            ],

            // Subdivisions
            '/interne/mon-etablissement/configuration/subdivisions' => [
                'get' => [
                    'tags' => ['Configuration académique'],
                    'summary' => 'Liste les subdivisions pédagogiques',
                    'description' => 'Groupes (primaire/maternelle), sections (secondaire) ou départements (université) filtrables par `annee_uuid` et `cycle_uuid`.',
                    'security' => $secret,
                    'parameters' => array_merge(self::paramsContexteTenant(), [
                        ['name' => 'annee_uuid',  'in' => 'query', 'required' => false, 'schema' => ['type' => 'string', 'format' => 'uuid']],
                        ['name' => 'cycle_uuid',  'in' => 'query', 'required' => false, 'schema' => ['type' => 'string', 'format' => 'uuid']],
                    ]),
                    'responses' => [
                        '200' => self::succes('Subdivisions', ['data' => ['type' => 'array', 'items' => self::ref('SubdivisionPedagogique')]]),
                        '401' => self::reponseRef('SecretInvalide'),
                        '403' => self::reponseRef('AccesAdministrateurRequis'),
                    ],
                ],
                'post' => [
                    'tags' => ['Configuration académique'],
                    'summary' => 'Crée une subdivision pédagogique',
                    'security' => $secret,
                    'parameters' => self::paramsContexteTenant(),
                    'requestBody' => [
                        'required' => true,
                        'content' => self::json([
                            'type' => 'object',
                            'required' => ['annee_uuid', 'cycle_config_uuid', 'type', 'nom'],
                            'properties' => [
                                'annee_uuid'        => ['type' => 'string', 'format' => 'uuid'],
                                'cycle_config_uuid' => ['type' => 'string', 'format' => 'uuid'],
                                'type'              => ['type' => 'string', 'enum' => ['groupe', 'section', 'departement']],
                                'nom'               => ['type' => 'string', 'maxLength' => 100, 'example' => 'Groupe A'],
                                'code'              => ['type' => 'string', 'maxLength' => 20, 'nullable' => true, 'example' => 'A'],
                                'description'       => ['type' => 'string', 'nullable' => true],
                            ],
                        ]),
                    ],
                    'responses' => [
                        '201' => self::succes('Subdivision créée', ['data' => self::ref('SubdivisionPedagogique')]),
                        '401' => self::reponseRef('SecretInvalide'),
                        '403' => self::reponseRef('AccesAdministrateurRequis'),
                        '422' => self::reponseRef('DonneesInvalides'),
                    ],
                ],
            ],
            '/interne/mon-etablissement/configuration/subdivisions/{uuid}' => [
                'patch' => [
                    'tags' => ['Configuration académique'],
                    'summary' => 'Modifie une subdivision',
                    'security' => $secret,
                    'parameters' => array_merge(self::paramsContexteTenant(), [self::paramUuid('uuid', 'Uuid de la subdivision.')]),
                    'requestBody' => [
                        'required' => true,
                        'content' => self::json([
                            'type' => 'object',
                            'properties' => [
                                'nom'        => ['type' => 'string', 'maxLength' => 100],
                                'code'       => ['type' => 'string', 'maxLength' => 20],
                                'description'=> ['type' => 'string'],
                                'actif'      => ['type' => 'boolean'],
                            ],
                        ]),
                    ],
                    'responses' => [
                        '200' => self::succes('Subdivision mise à jour', ['data' => self::ref('SubdivisionPedagogique')]),
                        '401' => self::reponseRef('SecretInvalide'),
                        '403' => self::reponseRef('AccesAdministrateurRequis'),
                        '404' => self::reponseRef('RessourceIntrouvable'),
                    ],
                ],
            ],

            // Niveaux
            '/interne/mon-etablissement/configuration/niveaux' => [
                'get' => [
                    'tags' => ['Configuration académique'],
                    'summary' => 'Liste les niveaux scolaires',
                    'description' => "Référentiel des niveaux du tenant. Un même niveau (ex. CM2) est partagé par tous les groupes ; les classes concrètes font le lien avec une subdivision.",
                    'security' => $secret,
                    'parameters' => array_merge(self::paramsContexteTenant(), [[
                        'name' => 'cycle', 'in' => 'query', 'required' => false,
                        'schema' => ['type' => 'string', 'enum' => ['maternelle', 'primaire', 'secondaire', 'universitaire']],
                    ]]),
                    'responses' => [
                        '200' => self::succes('Niveaux scolaires', ['data' => ['type' => 'array', 'items' => self::ref('NiveauScolaire')]]),
                        '401' => self::reponseRef('SecretInvalide'),
                        '403' => self::reponseRef('AccesAdministrateurRequis'),
                    ],
                ],
                'post' => [
                    'tags' => ['Configuration académique'],
                    'summary' => 'Crée un niveau scolaire',
                    'description' => "L'abréviation est utilisée dans les sigles de classes (ex. `CM2` → `CM2 A`, `Tle` → `Tle D`). Contrainte unique `(etablissement_id, cycle, nom)`.",
                    'security' => $secret,
                    'parameters' => self::paramsContexteTenant(),
                    'requestBody' => [
                        'required' => true,
                        'content' => self::json([
                            'type' => 'object',
                            'required' => ['cycle', 'nom'],
                            'properties' => [
                                'cycle'       => ['type' => 'string', 'enum' => ['maternelle', 'primaire', 'secondaire', 'universitaire']],
                                'nom'         => ['type' => 'string', 'maxLength' => 100, 'example' => 'Cours moyen 2e année'],
                                'abreviation' => ['type' => 'string', 'maxLength' => 20, 'nullable' => true, 'example' => 'CM2'],
                                'ordre'       => ['type' => 'integer', 'minimum' => 0, 'description' => "Ordre d'affichage (0 = premier)."],
                            ],
                        ]),
                    ],
                    'responses' => [
                        '201' => self::succes('Niveau créé', ['data' => self::ref('NiveauScolaire')]),
                        '401' => self::reponseRef('SecretInvalide'),
                        '403' => self::reponseRef('AccesAdministrateurRequis'),
                        '422' => self::reponseRef('DonneesInvalides'),
                    ],
                ],
            ],
            '/interne/mon-etablissement/configuration/niveaux/{uuid}' => [
                'patch' => [
                    'tags' => ['Configuration académique'],
                    'summary' => 'Modifie un niveau scolaire',
                    'security' => $secret,
                    'parameters' => array_merge(self::paramsContexteTenant(), [self::paramUuid('uuid', 'Uuid du niveau.')]),
                    'requestBody' => [
                        'required' => true,
                        'content' => self::json([
                            'type' => 'object',
                            'properties' => [
                                'nom'         => ['type' => 'string', 'maxLength' => 100],
                                'abreviation' => ['type' => 'string', 'maxLength' => 20],
                                'ordre'       => ['type' => 'integer', 'minimum' => 0],
                                'actif'       => ['type' => 'boolean'],
                            ],
                        ]),
                    ],
                    'responses' => [
                        '200' => self::succes('Niveau mis à jour', ['data' => self::ref('NiveauScolaire')]),
                        '401' => self::reponseRef('SecretInvalide'),
                        '403' => self::reponseRef('AccesAdministrateurRequis'),
                        '404' => self::reponseRef('RessourceIntrouvable'),
                    ],
                ],
            ],

            // Séries / filières
            '/interne/mon-etablissement/configuration/series' => [
                'get' => [
                    'tags' => ['Configuration académique'],
                    'summary' => 'Liste les séries et filières',
                    'security' => $secret,
                    'parameters' => array_merge(self::paramsContexteTenant(), [[
                        'name' => 'cycle', 'in' => 'query', 'required' => false,
                        'schema' => ['type' => 'string', 'enum' => ['secondaire', 'universitaire']],
                    ]]),
                    'responses' => [
                        '200' => self::succes('Séries / filières', ['data' => ['type' => 'array', 'items' => self::ref('SerieFiliere')]]),
                        '401' => self::reponseRef('SecretInvalide'),
                        '403' => self::reponseRef('AccesAdministrateurRequis'),
                    ],
                ],
                'post' => [
                    'tags' => ['Configuration académique'],
                    'summary' => 'Crée une série ou une filière',
                    'description' => "Secondaire : `A`, `C`, `D`, `F3`, `G2`… Université : `IT`, `EE`, `GC`… (filières rattachées à un département/`subdivision_uuid`). Contrainte unique `(etablissement_id, cycle, code)`.",
                    'security' => $secret,
                    'parameters' => self::paramsContexteTenant(),
                    'requestBody' => [
                        'required' => true,
                        'content' => self::json([
                            'type' => 'object',
                            'required' => ['cycle', 'nom', 'code'],
                            'properties' => [
                                'cycle'            => ['type' => 'string', 'enum' => ['secondaire', 'universitaire']],
                                'nom'              => ['type' => 'string', 'maxLength' => 100, 'example' => 'Sciences expérimentales'],
                                'code'             => ['type' => 'string', 'maxLength' => 20, 'example' => 'D'],
                                'description'      => ['type' => 'string', 'nullable' => true],
                                'subdivision_uuid' => ['type' => 'string', 'format' => 'uuid', 'nullable' => true, 'description' => 'Département universitaire auquel rattacher la filière (université uniquement).'],
                            ],
                        ]),
                    ],
                    'responses' => [
                        '201' => self::succes('Série / filière créée', ['data' => self::ref('SerieFiliere')]),
                        '401' => self::reponseRef('SecretInvalide'),
                        '403' => self::reponseRef('AccesAdministrateurRequis'),
                        '422' => self::reponseRef('DonneesInvalides'),
                    ],
                ],
            ],

            // Classes concrètes
            '/interne/mon-etablissement/configuration/classes' => [
                'get' => [
                    'tags' => ['Configuration académique'],
                    'summary' => 'Liste les classes concrètes',
                    'description' => "Une classe = niveau × subdivision × (série optionnelle). Le sigle est généré automatiquement (`CM2 A`, `Tle D`) mais reste modifiable.",
                    'security' => $secret,
                    'parameters' => array_merge(self::paramsContexteTenant(), [
                        ['name' => 'annee_uuid', 'in' => 'query', 'required' => false, 'schema' => ['type' => 'string', 'format' => 'uuid']],
                        ['name' => 'cycle',      'in' => 'query', 'required' => false, 'schema' => ['type' => 'string', 'enum' => ['maternelle', 'primaire', 'secondaire', 'universitaire']]],
                    ]),
                    'responses' => [
                        '200' => self::succes('Classes concrètes', ['data' => ['type' => 'array', 'items' => self::ref('ClasseConfig')]]),
                        '401' => self::reponseRef('SecretInvalide'),
                        '403' => self::reponseRef('AccesAdministrateurRequis'),
                    ],
                ],
                'post' => [
                    'tags' => ['Configuration académique'],
                    'summary' => 'Crée une classe concrète',
                    'security' => $secret,
                    'parameters' => self::paramsContexteTenant(),
                    'requestBody' => [
                        'required' => true,
                        'content' => self::json([
                            'type' => 'object',
                            'required' => ['annee_uuid', 'niveau_uuid', 'subdivision_uuid'],
                            'properties' => [
                                'annee_uuid'             => ['type' => 'string', 'format' => 'uuid'],
                                'niveau_uuid'            => ['type' => 'string', 'format' => 'uuid'],
                                'subdivision_uuid'       => ['type' => 'string', 'format' => 'uuid'],
                                'serie_uuid'             => ['type' => 'string', 'format' => 'uuid', 'nullable' => true, 'description' => 'Optionnel. Secondaire ou université.'],
                                'sigle'                  => ['type' => 'string', 'maxLength' => 50, 'nullable' => true, 'description' => 'Laissez vide pour génération automatique.'],
                                'effectif_previsionnel'  => ['type' => 'integer', 'minimum' => 1, 'nullable' => true],
                            ],
                        ]),
                    ],
                    'responses' => [
                        '201' => self::succes('Classe créée', ['data' => self::ref('ClasseConfig')]),
                        '401' => self::reponseRef('SecretInvalide'),
                        '403' => self::reponseRef('AccesAdministrateurRequis'),
                        '422' => self::reponseRef('DonneesInvalides'),
                    ],
                ],
            ],

            // Cohortes
            '/interne/mon-etablissement/configuration/cohortes' => [
                'get' => [
                    'tags' => ['Configuration académique'],
                    'summary' => 'Liste les cohortes universitaires',
                    'security' => $secret,
                    'parameters' => array_merge(self::paramsContexteTenant(), [[
                        'name' => 'annee_uuid', 'in' => 'query', 'required' => false, 'schema' => ['type' => 'string', 'format' => 'uuid'],
                    ]]),
                    'responses' => [
                        '200' => self::succes('Cohortes universitaires', ['data' => ['type' => 'array', 'items' => self::ref('CohorteUniversitaire')]]),
                        '401' => self::reponseRef('SecretInvalide'),
                        '403' => self::reponseRef('AccesAdministrateurRequis'),
                    ],
                ],
                'post' => [
                    'tags' => ['Configuration académique'],
                    'summary' => 'Crée une cohorte universitaire',
                    'description' => "Le sigle est généré automatiquement (ex. `IT2A` = filière IT, niveau L2, lettre A) si absent.",
                    'security' => $secret,
                    'parameters' => self::paramsContexteTenant(),
                    'requestBody' => [
                        'required' => true,
                        'content' => self::json([
                            'type' => 'object',
                            'required' => ['annee_uuid', 'filiere_uuid', 'niveau_uuid', 'diplome'],
                            'properties' => [
                                'annee_uuid'   => ['type' => 'string', 'format' => 'uuid'],
                                'filiere_uuid' => ['type' => 'string', 'format' => 'uuid'],
                                'niveau_uuid'  => ['type' => 'string', 'format' => 'uuid'],
                                'diplome'      => ['type' => 'string', 'enum' => ['licence', 'master', 'doctorat', 'ingenieur', 'bts', 'dut', 'autre']],
                                'lettre'       => ['type' => 'string', 'maxLength' => 5, 'nullable' => true, 'example' => 'A'],
                                'sigle'        => ['type' => 'string', 'maxLength' => 30, 'nullable' => true],
                                'semestres'    => ['type' => 'string', 'maxLength' => 50, 'nullable' => true, 'example' => '1,2'],
                            ],
                        ]),
                    ],
                    'responses' => [
                        '201' => self::succes('Cohorte créée', ['data' => self::ref('CohorteUniversitaire')]),
                        '401' => self::reponseRef('SecretInvalide'),
                        '403' => self::reponseRef('AccesAdministrateurRequis'),
                        '422' => self::reponseRef('DonneesInvalides'),
                    ],
                ],
            ],

            // Matières
            '/interne/mon-etablissement/configuration/matieres' => [
                'get' => [
                    'tags' => ['Configuration académique'],
                    'summary' => 'Liste les configurations de matières',
                    'security' => $secret,
                    'parameters' => array_merge(self::paramsContexteTenant(), [
                        ['name' => 'annee_uuid',  'in' => 'query', 'required' => false, 'schema' => ['type' => 'string', 'format' => 'uuid']],
                        ['name' => 'niveau_uuid', 'in' => 'query', 'required' => false, 'schema' => ['type' => 'string', 'format' => 'uuid']],
                        ['name' => 'cycle',       'in' => 'query', 'required' => false, 'schema' => ['type' => 'string', 'enum' => ['maternelle', 'primaire', 'secondaire', 'universitaire']]],
                    ]),
                    'responses' => [
                        '200' => self::succes('Configurations de matières', ['data' => ['type' => 'array', 'items' => self::ref('MatiereConfig')]]),
                        '401' => self::reponseRef('SecretInvalide'),
                        '403' => self::reponseRef('AccesAdministrateurRequis'),
                    ],
                ],
                'post' => [
                    'tags' => ['Configuration académique'],
                    'summary' => 'Configure une matière avec son coefficient',
                    'description' => "`coefficient` **NULL** = non défini (pas de coefficient, approprié maternelle/primaire). `coefficient = 0` est une valeur numérique différente. `matiere_uuid_externe` = UUID depuis `evaluations.matieres` (jamais de FK locale inter-microservice). Contrainte unique `(etablissement_id, annee_id, niveau_id, serie_id, matiere_uuid_externe)`. Après création, appeler `GET …/matieres/{uuid}/propagation` pour voir les classes homologues potentielles.",
                    'security' => $secret,
                    'parameters' => self::paramsContexteTenant(),
                    'requestBody' => [
                        'required' => true,
                        'content' => self::json([
                            'type' => 'object',
                            'required' => ['annee_uuid', 'cycle', 'niveau_uuid', 'matiere_uuid_externe', 'nom_matiere'],
                            'properties' => [
                                'annee_uuid'           => ['type' => 'string', 'format' => 'uuid'],
                                'cycle'                => ['type' => 'string', 'enum' => ['maternelle', 'primaire', 'secondaire', 'universitaire']],
                                'niveau_uuid'          => ['type' => 'string', 'format' => 'uuid'],
                                'serie_uuid'           => ['type' => 'string', 'format' => 'uuid', 'nullable' => true],
                                'matiere_uuid_externe' => ['type' => 'string', 'format' => 'uuid', 'description' => 'UUID de la matière dans evaluations.matieres.'],
                                'nom_matiere'          => ['type' => 'string', 'maxLength' => 255, 'example' => 'Éducation scientifique et technologie'],
                                'code_matiere'         => ['type' => 'string', 'maxLength' => 30, 'nullable' => true, 'example' => 'EST'],
                                'coefficient'          => ['type' => 'number', 'nullable' => true, 'description' => 'NULL = non défini. 0 est une valeur numérique différente.'],
                                'est_obligatoire'      => ['type' => 'boolean', 'default' => true],
                            ],
                        ]),
                    ],
                    'responses' => [
                        '201' => self::succes('Matière configurée', ['data' => self::ref('MatiereConfig')]),
                        '401' => self::reponseRef('SecretInvalide'),
                        '403' => self::reponseRef('AccesAdministrateurRequis'),
                        '422' => self::reponseRef('DonneesInvalides'),
                    ],
                ],
            ],
            '/interne/mon-etablissement/configuration/matieres/{uuid}/propagation' => [
                'get' => [
                    'tags' => ['Configuration académique'],
                    'summary' => 'Aperçu des classes homologues pour propagation',
                    'description' => "Retourne les classes qui partagent le même niveau et la même année mais dans d'autres subdivisions, et pour lesquelles cette matière n'est pas encore configurée.",
                    'security' => $secret,
                    'parameters' => array_merge(self::paramsContexteTenant(), [self::paramUuid('uuid', 'Uuid de la MatiereConfig.')]),
                    'responses' => [
                        '200' => self::succes('Classes homologues', [
                            'data' => [
                                'type' => 'object',
                                'properties' => [
                                    'classes' => ['type' => 'array', 'items' => ['type' => 'object', 'properties' => [
                                        'uuid' => ['type' => 'string', 'format' => 'uuid'],
                                        'sigle' => ['type' => 'string'],
                                        'niveau' => ['type' => 'string'],
                                        'subdivision' => ['type' => 'string'],
                                    ]]],
                                    'count' => ['type' => 'integer'],
                                ],
                            ],
                        ]),
                        '401' => self::reponseRef('SecretInvalide'),
                        '403' => self::reponseRef('AccesAdministrateurRequis'),
                        '404' => self::reponseRef('RessourceIntrouvable'),
                    ],
                ],
            ],
            '/interne/mon-etablissement/configuration/matieres/{uuid}/propager' => [
                'post' => [
                    'tags' => ['Configuration académique'],
                    'summary' => 'Propage une matière aux classes homologues',
                    'description' => "Crée une `MatiereConfig` identique (même nom, code, coefficient, caractère obligatoire) pour chaque classe homologue (même niveau, même année, autre subdivision) qui n'en dispose pas encore. Les doublons sont évités par la contrainte d'unicité en base. L'action est journalisée dans `audit_config_academique`.",
                    'security' => $secret,
                    'parameters' => array_merge(self::paramsContexteTenant(), [self::paramUuid('uuid', 'Uuid de la MatiereConfig source.')]),
                    'responses' => [
                        '200' => self::succes('Propagation effectuée', [
                            'data' => ['type' => 'object', 'properties' => ['crees' => ['type' => 'integer', 'description' => 'Nombre de nouvelles configurations créées.']]],
                        ]),
                        '401' => self::reponseRef('SecretInvalide'),
                        '403' => self::reponseRef('AccesAdministrateurRequis'),
                        '404' => self::reponseRef('RessourceIntrouvable'),
                    ],
                ],
            ],

            // ---------------- Interne ----------------
            '/interne/demandes' => [
                'get' => [
                    'tags' => ['Interne'],
                    'summary' => 'Demandes à instruire',
                    'description' => 'Demandes au statut `soumise`, de la plus ancienne à la plus récente. Back-office Super Administrateur.',
                    'security' => $secret,
                    'responses' => [
                        '200' => self::succes('Demandes à instruire', [
                            'demandes' => ['type' => 'array', 'items' => self::ref('Demande')],
                        ]),
                        '401' => self::reponseRef('SecretInvalide'),
                    ],
                ],
            ],
            '/interne/demandes/{uuid}/corrections' => [
                'post' => [
                    'tags' => ['Interne'],
                    'summary' => 'Marque des sections à corriger',
                    'description' => "Renvoie le dossier au statut `correction_demandee`, génère un lien de correction à usage unique (72 h) et publie `demande.correction_demandee`. Une relance est ensuite publiée chaque jour à 18h59 (`demande.correction_relance`) tant que le dossier n'est pas corrigé.\n\nLes clés de `champsACorriger` sont les sections du formulaire (`etablissement`, `localisation`, `dirigeant`, `geolocalisation`) ; chaque valeur est le motif, obligatoire.",
                    'security' => $secret,
                    'parameters' => [self::paramUuid('uuid', 'Uuid de la demande.')],
                    'requestBody' => [
                        'required' => true,
                        'content' => self::json([
                            'type' => 'object',
                            'required' => ['champsACorriger'],
                            'properties' => [
                                'champsACorriger' => [
                                    'type' => 'object',
                                    'additionalProperties' => ['type' => 'string'],
                                ],
                            ],
                        ], [
                            'champsACorriger' => [
                                'dirigeant' => 'Le numéro de téléphone est invalide.',
                                'etablissement' => "L'année d'ouverture est incohérente avec l'autorisation fournie.",
                            ],
                        ]),
                    ],
                    'responses' => [
                        '200' => self::succes('Correction demandée', [
                            'demandeUuid' => ['type' => 'string', 'format' => 'uuid'],
                            'statut' => ['type' => 'string', 'example' => 'correction_demandee'],
                        ]),
                        '401' => self::reponseRef('SecretInvalide'),
                        '404' => self::reponseRef('RessourceIntrouvable'),
                        '409' => self::reponseRef('ConflitStatut'),
                        '422' => self::reponseRef('DonneesInvalides'),
                    ],
                ],
            ],
            '/interne/demandes/{uuid}/valider' => [
                'post' => [
                    'tags' => ['Interne'],
                    'summary' => 'Valide définitivement la demande',
                    'description' => "La localisation doit être complète (même règle qu'à la soumission), sinon `422` : demander alors une correction. En **une seule transaction** : crée l'établissement (statut `actif`) avec son code public, son slug et son matricule, rattache le logo de la demande (`logoDocumentId`), enregistre ses cycles autorisés et passe la demande à `validee`. Publie ensuite `etablissement.valide`, que le microservice Identité consomme pour créer le compte administrateur du dirigeant.\n\nSlug : minuscules, sans accents, suffixe numérique en cas de collision (`jean-marie-2`). Matricule : mot significatif le plus court du nom + code à 4 chiffres (ex. `kisito8945`).",
                    'security' => $secret,
                    'parameters' => [self::paramUuid('uuid', 'Uuid de la demande.')],
                    'responses' => [
                        '200' => self::succes('Établissement créé', [
                            'etablissementUuid' => ['type' => 'string', 'format' => 'uuid'],
                            'code' => ['type' => 'string', 'example' => 'K7QP', 'description' => "Code public unique de l'établissement (XXXX)."],
                            'slug' => ['type' => 'string', 'example' => 'complexe-scolaire-kisito'],
                            'matricule' => ['type' => 'string', 'example' => 'kisito8945'],
                        ]),
                        '401' => self::reponseRef('SecretInvalide'),
                        '404' => self::reponseRef('RessourceIntrouvable'),
                        '409' => self::reponseRef('ConflitStatut'),
                        '422' => self::reponseRef('DonneesInvalides'),
                    ],
                ],
            ],
            '/interne/etablissements/{uuid}/suspendre' => [
                'post' => [
                    'tags' => ['Interne'],
                    'summary' => 'Suspend un établissement',
                    'description' => "Effet immédiat : le statut passe à `suspendu`, les caches Redis du slug sont invalidés et `etablissement.suspendu` est publié. La page d'accueil publique affiche alors un contenu dégradé. Tant qu'il est suspendu, son administrateur ne peut plus modifier le profil (`409`).",
                    'security' => $secret,
                    'parameters' => [self::paramUuid('uuid', "Uuid de l'établissement.")],
                    'responses' => [
                        '200' => self::succes('Établissement suspendu', [
                            'etablissementUuid' => ['type' => 'string', 'format' => 'uuid'],
                            'statut' => ['type' => 'string', 'example' => 'suspendu'],
                        ]),
                        '401' => self::reponseRef('SecretInvalide'),
                        '404' => self::reponseRef('RessourceIntrouvable'),
                    ],
                ],
            ],
            '/interne/etablissements/{uuid}/reactiver' => [
                'post' => [
                    'tags' => ['Interne'],
                    'summary' => 'Réactive un établissement',
                    'description' => "Rétablit l'accès dès la requête suivante : le statut repasse à `actif`, les caches Redis du slug sont invalidés et `etablissement.reactive` est publié.",
                    'security' => $secret,
                    'parameters' => [self::paramUuid('uuid', "Uuid de l'établissement.")],
                    'responses' => [
                        '200' => self::succes('Établissement réactivé', [
                            'etablissementUuid' => ['type' => 'string', 'format' => 'uuid'],
                            'statut' => ['type' => 'string', 'example' => 'actif'],
                        ]),
                        '401' => self::reponseRef('SecretInvalide'),
                        '404' => self::reponseRef('RessourceIntrouvable'),
                    ],
                ],
            ],
            '/interne/resolution-slug/{slug}' => [
                'get' => [
                    'tags' => ['Interne'],
                    'summary' => 'Résout un slug en tenant + statut',
                    'description' => "Consommé par la passerelle API (Gateway) à chaque requête contenant un slug. Résultat mis en cache Redis (60 s par défaut), invalidé à chaque changement de statut.",
                    'security' => $secret,
                    'parameters' => [self::paramSlug()],
                    'responses' => [
                        '200' => self::succes('Établissement résolu', [
                            'tenantUuid' => ['type' => 'string', 'format' => 'uuid'],
                            'code' => ['type' => 'string', 'example' => 'K7QP'],
                            'slug' => ['type' => 'string', 'example' => 'jean-marie'],
                            'statut' => ['type' => 'string', 'enum' => ['actif', 'suspendu', 'archive']],
                        ]),
                        '401' => self::reponseRef('SecretInvalide'),
                        '404' => [
                            'description' => 'Slug inconnu.',
                            'content' => self::json(self::ref('Erreur'), [
                                'success' => false,
                                'error' => ['code' => 'SLUG_INTROUVABLE', 'message' => 'Aucun établissement ne correspond à ce slug.'],
                            ]),
                        ],
                    ],
                ],
            ],

            // ---------------- Santé ----------------
            '/sante' => [
                'servers' => [['url' => '/', 'description' => 'Hors préfixe /v1']],
                'get' => [
                    'tags' => ['Santé'],
                    'summary' => 'Sonde de disponibilité',
                    'description' => 'Utilisée par le HEALTHCHECK Docker. Répond 200 quand le service est démarré.',
                    'responses' => [
                        '200' => ['description' => 'Service disponible.'],
                    ],
                ],
            ],
        ];
    }

    // ------------------------------------------------------------------
    // Composants (schémas, réponses, sécurité)
    // ------------------------------------------------------------------

    private static function components(): array
    {
        return [
            'securitySchemes' => [
                'SecretInterne' => [
                    'type' => 'apiKey',
                    'in' => 'header',
                    'name' => 'X-Internal-Secret',
                    'description' => 'Secret partagé entre la passerelle API et les microservices (variable INTERNAL_API_SECRET, identique sur toute la plateforme).',
                ],
            ],
            'responses' => [
                'RessourceIntrouvable' => [
                    'description' => 'Ressource introuvable.',
                    'content' => self::json(self::ref('Erreur'), [
                        'success' => false,
                        'error' => ['code' => 'RESSOURCE_INTROUVABLE', 'message' => 'Ressource introuvable.', 'details' => null],
                        'path' => '/v1/exemple',
                        'timestamp' => '2026-10-13T06:18:00+01:00',
                    ]),
                ],
                'DonneesInvalides' => [
                    'description' => 'Données invalides : `details` liste les messages par champ.',
                    'content' => self::json(self::ref('Erreur'), [
                        'success' => false,
                        'error' => [
                            'code' => 'DONNEES_INVALIDES',
                            'message' => 'Les données envoyées sont invalides.',
                            'details' => ['donnees' => ['Le champ donnees est obligatoire.']],
                        ],
                        'path' => '/v1/demandes',
                        'timestamp' => '2026-10-13T06:18:00+01:00',
                    ]),
                ],
                'SecretInvalide' => [
                    'description' => 'Header X-Internal-Secret absent ou incorrect.',
                    'content' => self::json(self::ref('Erreur'), [
                        'success' => false,
                        'error' => ['code' => 'SECRET_INTERNE_INVALIDE', 'message' => 'Acces reserve aux services internes de la plateforme.'],
                    ]),
                ],
                'AccesAdministrateurRequis' => [
                    'description' => "Rôle `administrateur` absent, ou header `X-Tenant-Uuid` absent ou invalide.",
                    'content' => self::json(self::ref('Erreur'), [
                        'success' => false,
                        'error' => ['code' => 'ROLE_ADMINISTRATEUR_REQUIS', 'message' => "Action réservée à l'administrateur de l'établissement."],
                    ]),
                ],
                'ConflitStatut' => [
                    'description' => "Action impossible dans l'état actuel de la demande ou de l'établissement (ex. demande déjà soumise ou déjà validée, établissement non actif).",
                    'content' => self::json(self::ref('Erreur'), [
                        'success' => false,
                        'error' => ['code' => 'CONFLIT', 'message' => 'Cette demande a déjà été soumise.', 'details' => null],
                        'path' => '/v1/demandes/0b6f1c3e-5a2d-4b7e-9c1f-3d8a2e4f6a10/soumettre',
                        'timestamp' => '2026-10-13T06:18:00+01:00',
                    ]),
                ],
                'CaptchaInvalide' => [
                    'description' => 'Vérification anti-robot échouée.',
                    'content' => self::json(self::ref('Erreur'), [
                        'success' => false,
                        'error' => ['code' => 'CAPTCHA_INVALIDE', 'message' => 'La vérification anti-robot a échoué, veuillez réessayer.'],
                    ]),
                ],
            ],
            'schemas' => [
                'Erreur' => [
                    'type' => 'object',
                    'properties' => [
                        'success' => ['type' => 'boolean', 'example' => false],
                        'error' => [
                            'type' => 'object',
                            'properties' => [
                                'code' => ['type' => 'string', 'description' => 'Code stable, exploitable côté client.'],
                                'message' => ['type' => 'string'],
                                'details' => ['nullable' => true, 'description' => 'Détail éventuel (messages par champ pour une erreur de validation).'],
                            ],
                        ],
                        'path' => ['type' => 'string', 'description' => 'Optionnel.'],
                        'timestamp' => ['type' => 'string', 'format' => 'date-time', 'description' => 'Optionnel.'],
                    ],
                ],
                'Pays' => [
                    'type' => 'object',
                    'properties' => [
                        'uuid' => ['type' => 'string', 'format' => 'uuid'],
                        'code_iso' => ['type' => 'string', 'example' => 'BJ', 'description' => 'Code ISO 3166-1 alpha-2.'],
                        'code_iso3' => ['type' => 'string', 'example' => 'BEN', 'description' => 'Code ISO 3166-1 alpha-3.'],
                        'nom' => ['type' => 'string', 'example' => 'Bénin'],
                        'indicatif_tel' => ['type' => 'string', 'example' => '229'],
                        'continent' => ['type' => 'string', 'enum' => ['afrique', 'amerique_nord', 'amerique_sud', 'asie', 'europe', 'oceanie']],
                        'libelle_niveau_1' => ['type' => 'string', 'example' => 'Département', 'description' => 'Étiquette de la 1re liste (départements, régions, États, provinces...).'],
                        'libelle_niveau_2' => ['type' => 'string', 'example' => 'Commune', 'description' => 'Étiquette de la 2e liste (communes, villes...).'],
                        'libelle_niveau_3' => ['type' => 'string', 'example' => 'Arrondissement', 'description' => 'Étiquette de la 3e liste (arrondissements, quartiers...).'],
                    ],
                ],
                'ElementGeo' => [
                    'type' => 'object',
                    'description' => 'Département, commune ou arrondissement.',
                    'properties' => [
                        'uuid' => ['type' => 'string', 'format' => 'uuid'],
                        'nom' => ['type' => 'string', 'example' => 'Littoral'],
                    ],
                ],
                'DonneesFormulaire' => [
                    'type' => 'object',
                    'description' => "Contenu du formulaire en 5 étapes, regroupé en sections. Chaque section est facultative à l'envoi : les données sont fusionnées avec le brouillon existant.",
                    'properties' => [
                        'etablissement' => [
                            'type' => 'object',
                            'description' => 'Étape 1 - Informations sur l\'établissement.',
                            'properties' => [
                                'nom' => ['type' => 'string', 'example' => 'Complexe Scolaire Kisito'],
                                'types' => [
                                    'type' => 'array',
                                    'minItems' => 1,
                                    'items' => ['type' => 'string', 'enum' => ['maternelle', 'primaire', 'secondaire', 'universite']],
                                    'description' => 'Un établissement peut cumuler plusieurs types ; au moins un est obligatoire. `maternelle` peut être demandé seul.',
                                ],
                                'annee_ouverture' => ['type' => 'integer', 'description' => 'Inférieure ou égale à l\'année en cours.', 'example' => 2015],
                                'email' => ['type' => 'string', 'format' => 'email'],
                                'telephone_1' => ['type' => 'string', 'description' => 'Format E.164.', 'example' => '+22997000000'],
                                'telephone_2' => ['type' => 'string', 'nullable' => true, 'description' => 'Format E.164, facultatif si telephone_1 est renseigné.'],
                            ],
                        ],
                        'localisation' => [
                            'type' => 'object',
                            'description' => 'Étape 2 - Localisation (valeurs issues des listes en cascade `/geo/...`). Le pays est obligatoire ; chaque niveau suivant l\'est tant que le référentiel en propose pour le niveau choisi (un pays ou une commune sans subdivision connue n\'en exige pas).',
                            'properties' => [
                                'pays_uuid' => ['type' => 'string', 'format' => 'uuid'],
                                'departement_uuid' => ['type' => 'string', 'format' => 'uuid'],
                                'commune_uuid' => ['type' => 'string', 'format' => 'uuid'],
                                'arrondissement_uuid' => ['type' => 'string', 'format' => 'uuid', 'nullable' => true, 'description' => "Facultatif : tous les pays n'ont pas ce niveau dans le référentiel."],
                                'adresse_complete' => ['type' => 'string', 'description' => 'Rue, numéro ou repère.'],
                            ],
                        ],
                        'dirigeant' => [
                            'type' => 'object',
                            'description' => 'Étape 3 - Dirigeant.',
                            'properties' => [
                                'nom_complet' => ['type' => 'string'],
                                'titre' => ['type' => 'string', 'example' => 'Fondateur'],
                                'email' => ['type' => 'string', 'format' => 'email', 'description' => 'Canal de notification personnel du dirigeant.'],
                                'telephone' => ['type' => 'string', 'description' => 'Format E.164. Canal WhatsApp personnel du dirigeant.'],
                            ],
                        ],
                        'geolocalisation' => [
                            'type' => 'object',
                            'description' => "Capturée en arrière-plan à l'étape 5, strictement facultative et jamais bloquante. Jamais affichée publiquement : aide à la vérification du Super Administrateur.",
                            'properties' => [
                                'latitude' => ['type' => 'number', 'format' => 'double'],
                                'longitude' => ['type' => 'number', 'format' => 'double'],
                                'precision' => ['type' => 'number', 'description' => 'En mètres.'],
                            ],
                        ],
                    ],
                ],
                'Demande' => [
                    'type' => 'object',
                    'description' => 'Demande telle que vue par le back-office Super Administrateur.',
                    'properties' => [
                        'uuid' => ['type' => 'string', 'format' => 'uuid'],
                        'statut' => ['type' => 'string', 'enum' => ['brouillon', 'soumise', 'correction_demandee', 'validee', 'rejetee']],
                        'donnees_formulaire' => self::ref('DonneesFormulaire'),
                        'adresse_complete' => ['type' => 'string', 'nullable' => true],
                        'latitude' => ['type' => 'string', 'nullable' => true, 'example' => '6.3702930'],
                        'longitude' => ['type' => 'string', 'nullable' => true, 'example' => '2.3912360'],
                        'dirigeant_nom' => ['type' => 'string', 'nullable' => true],
                        'dirigeant_titre' => ['type' => 'string', 'nullable' => true],
                        'dirigeant_email' => ['type' => 'string', 'nullable' => true],
                        'dirigeant_telephone' => ['type' => 'string', 'nullable' => true],
                        'champs_a_corriger' => ['type' => 'object', 'nullable' => true, 'additionalProperties' => ['type' => 'string']],
                        'lien_correction_expire_le' => ['type' => 'string', 'format' => 'date-time', 'nullable' => true],
                        'date_dernier_rappel' => ['type' => 'string', 'format' => 'date-time', 'nullable' => true],
                        'date_soumission' => ['type' => 'string', 'format' => 'date-time', 'nullable' => true],
                        'created_at' => ['type' => 'string', 'format' => 'date-time'],
                        'updated_at' => ['type' => 'string', 'format' => 'date-time'],
                    ],
                ],
                'CycleAutorise' => [
                    'type' => 'object',
                    'properties' => [
                        'cycle' => ['type' => 'string', 'enum' => ['maternelle', 'primaire', 'secondaire', 'universitaire']],
                        'statut' => ['type' => 'string', 'enum' => ['actif', 'inactif']],
                    ],
                ],
                'Plan' => [
                    'type' => 'object',
                    'properties' => [
                        'uuid' => ['type' => 'string', 'format' => 'uuid'],
                        'nom' => ['type' => 'string', 'example' => 'Essentiel'],
                        'prix' => ['type' => 'string', 'description' => 'Montant décimal sérialisé en chaîne.', 'example' => '15000.00'],
                        'periodicite' => ['type' => 'string', 'enum' => ['mensuel', 'annuel']],
                        'actif' => ['type' => 'boolean'],
                        'jours_essai' => ['type' => 'integer', 'example' => 14],
                        'modules' => ['type' => 'array', 'items' => self::ref('PlanModule')],
                    ],
                ],
                'PlanModule' => [
                    'type' => 'object',
                    'properties' => [
                        'module' => ['type' => 'string', 'example' => 'scolarite'],
                        'fonctionnalite' => ['type' => 'string', 'nullable' => true],
                        'inclus' => ['type' => 'boolean'],
                    ],
                ],
                'EtablissementPublic' => [
                    'type' => 'object',
                    'description' => 'Informations publiques (normales, `degrade: false`) ou dégradées (`degrade: true` : seuls `code`, `slug`, `statut`, `degrade` et `message` sont présents).',
                    'properties' => [
                        'code' => ['type' => 'string', 'example' => 'K7QP'],
                        'slug' => ['type' => 'string', 'example' => 'complexe-scolaire-kisito'],
                        'nom' => ['type' => 'string', 'example' => 'Complexe Scolaire Kisito'],
                        'types' => ['type' => 'array', 'items' => ['type' => 'string', 'enum' => ['maternelle', 'primaire', 'secondaire', 'universite']]],
                        'anneeOuverture' => ['type' => 'integer', 'example' => 2015],
                        'logoDocumentId' => ['type' => 'string', 'nullable' => true],
                        'adresseComplete' => ['type' => 'string'],
                        'localisation' => [
                            'type' => 'object',
                            'properties' => [
                                'pays' => [
                                    'type' => 'object',
                                    'nullable' => true,
                                    'properties' => [
                                        'code' => ['type' => 'string', 'example' => 'BJ'],
                                        'nom' => ['type' => 'string', 'example' => 'Bénin'],
                                    ],
                                ],
                                'departement' => ['type' => 'string', 'nullable' => true, 'example' => 'Littoral'],
                                'commune' => ['type' => 'string', 'nullable' => true, 'example' => 'Cotonou'],
                                'arrondissement' => ['type' => 'string', 'nullable' => true],
                            ],
                        ],
                        'contact' => [
                            'type' => 'object',
                            'properties' => [
                                'email' => ['type' => 'string'],
                                'telephone1' => ['type' => 'string'],
                                'telephone2' => ['type' => 'string', 'nullable' => true],
                            ],
                        ],
                        'statut' => ['type' => 'string', 'enum' => ['actif', 'suspendu', 'archive']],
                        'degrade' => ['type' => 'boolean'],
                        'message' => ['type' => 'string', 'description' => 'Présent uniquement en contenu dégradé.'],
                    ],
                ],
                'ModificationEtablissement' => [
                    'type' => 'object',
                    'description' => 'Tous les champs sont facultatifs ; au moins un est requis. Toute autre clé est refusée (`422`).',
                    'properties' => [
                        'types' => [
                            'type' => 'array',
                            'minItems' => 1,
                            'items' => ['type' => 'string', 'enum' => ['maternelle', 'primaire', 'secondaire', 'universite']],
                            'description' => 'Remplace la liste des types. Un type retiré passe ses cycles à `inactif`.',
                        ],
                        'adresse_complete' => ['type' => 'string', 'minLength' => 5, 'maxLength' => 1000],
                        'localisation' => [
                            'type' => 'object',
                            'required' => ['pays_uuid'],
                            'description' => "Hiérarchie complète : remplace l'ancienne. Un niveau absent est effacé ; la règle de complétude de l'onboarding s'applique.",
                            'properties' => [
                                'pays_uuid' => ['type' => 'string', 'format' => 'uuid'],
                                'departement_uuid' => ['type' => 'string', 'format' => 'uuid', 'nullable' => true],
                                'commune_uuid' => ['type' => 'string', 'format' => 'uuid', 'nullable' => true],
                                'arrondissement_uuid' => ['type' => 'string', 'format' => 'uuid', 'nullable' => true],
                            ],
                        ],
                        'geolocalisation' => [
                            'type' => 'object',
                            'required' => ['latitude', 'longitude'],
                            'properties' => [
                                'latitude' => ['type' => 'number', 'minimum' => -90, 'maximum' => 90],
                                'longitude' => ['type' => 'number', 'minimum' => -180, 'maximum' => 180],
                            ],
                        ],
                    ],
                ],
                'ProfilEtablissement' => [
                    'type' => 'object',
                    'description' => "Profil vu par l'administrateur de l'établissement (matricule inclus). `nom`, `contact`, `anneeOuverture`, `code`, `slug` et `matricule` sont en lecture seule.",
                    'properties' => [
                        'uuid' => ['type' => 'string', 'format' => 'uuid'],
                        'code' => ['type' => 'string', 'example' => 'K7QP'],
                        'slug' => ['type' => 'string', 'example' => 'complexe-scolaire-kisito'],
                        'matricule' => ['type' => 'string', 'example' => 'kisito8945'],
                        'nom' => ['type' => 'string'],
                        'types' => ['type' => 'array', 'items' => ['type' => 'string', 'enum' => ['maternelle', 'primaire', 'secondaire', 'universite']]],
                        'anneeOuverture' => ['type' => 'integer', 'example' => 2015],
                        'logoDocumentId' => ['type' => 'string', 'nullable' => true],
                        'adresseComplete' => ['type' => 'string'],
                        'localisation' => [
                            'type' => 'object',
                            'description' => 'Chaque niveau : { uuid, nom } (pays : + code), ou null.',
                            'properties' => [
                                'pays' => ['type' => 'object', 'nullable' => true, 'properties' => ['uuid' => ['type' => 'string', 'format' => 'uuid'], 'code' => ['type' => 'string', 'example' => 'BJ'], 'nom' => ['type' => 'string']]],
                                'departement' => ['type' => 'object', 'nullable' => true, 'properties' => ['uuid' => ['type' => 'string', 'format' => 'uuid'], 'nom' => ['type' => 'string']]],
                                'commune' => ['type' => 'object', 'nullable' => true, 'properties' => ['uuid' => ['type' => 'string', 'format' => 'uuid'], 'nom' => ['type' => 'string']]],
                                'arrondissement' => ['type' => 'object', 'nullable' => true, 'properties' => ['uuid' => ['type' => 'string', 'format' => 'uuid'], 'nom' => ['type' => 'string']]],
                            ],
                        ],
                        'geolocalisation' => [
                            'type' => 'object',
                            'properties' => [
                                'latitude' => ['type' => 'number', 'nullable' => true],
                                'longitude' => ['type' => 'number', 'nullable' => true],
                            ],
                        ],
                        'contact' => [
                            'type' => 'object',
                            'description' => 'Lecture seule.',
                            'properties' => [
                                'email' => ['type' => 'string'],
                                'telephone1' => ['type' => 'string'],
                                'telephone2' => ['type' => 'string', 'nullable' => true],
                            ],
                        ],
                        'cyclesAutorises' => ['type' => 'array', 'items' => self::ref('CycleAutorise')],
                        'statut' => ['type' => 'string', 'enum' => ['actif', 'suspendu', 'archive']],
                        'dateValidation' => ['type' => 'string', 'format' => 'date-time'],
                        'champsModifiables' => ['type' => 'array', 'items' => ['type' => 'string'], 'example' => ['types', 'adresse_complete', 'localisation', 'geolocalisation', 'logo']],
                    ],
                ],
                'AccueilPlateforme' => [
                    'type' => 'object',
                    'properties' => [
                        'plateforme' => ['type' => 'string', 'example' => 'SIGAPEI'],
                        'titre' => ['type' => 'string'],
                        'accroche' => ['type' => 'string'],
                        'appelAAction' => [
                            'type' => 'object',
                            'properties' => [
                                'texte' => ['type' => 'string'],
                                'url' => ['type' => 'string'],
                            ],
                        ],
                    ],
                ],
                'AccueilEtablissement' => [
                    'type' => 'object',
                    'description' => 'Contenu normal (`degrade: false`) ou dégradé (`degrade: true`, seuls `slug`, `statut`, `degrade` et `message` sont présents).',
                    'properties' => [
                        'code' => ['type' => 'string', 'example' => 'K7QP', 'description' => "Code public unique de l'établissement (XXXX)."],
                        'slug' => ['type' => 'string', 'example' => 'jean-marie'],
                        'nom' => ['type' => 'string'],
                        'types' => ['type' => 'array', 'items' => ['type' => 'string']],
                        'logoDocumentId' => ['type' => 'string', 'nullable' => true],
                        'adresseComplete' => ['type' => 'string'],
                        'email' => ['type' => 'string'],
                        'telephone1' => ['type' => 'string'],
                        'statut' => ['type' => 'string', 'enum' => ['actif', 'suspendu', 'archive']],
                        'degrade' => ['type' => 'boolean'],
                        'message' => ['type' => 'string', 'description' => 'Présent uniquement en contenu dégradé.'],
                    ],
                ],

                // ── Demandes de cycle (établissement) ──────────────────────
            '/interne/mon-etablissement/demandes-cycle' => [
                'get' => [
                    'tags' => ['Demandes de cycle'],
                    'summary' => 'Liste mes demandes de cycle',
                    'description' => "Retourne toutes les demandes de cycle de l'établissement connecté, triées par date décroissante.",
                    'security' => $secret,
                    'parameters' => self::paramsContexteTenant(),
                    'responses' => [
                        '200' => self::succes('Demandes de cycle', ['data' => ['type' => 'array', 'items' => self::ref('DemandeCycle')]]),
                        '401' => self::reponseRef('SecretInvalide'),
                        '403' => self::reponseRef('AccesAdministrateurRequis'),
                    ],
                ],
                'post' => [
                    'tags' => ['Demandes de cycle'],
                    'summary' => 'Soumettre une demande de cycle',
                    'description' => "L'établissement demande l'accès à un cycle qu'il ne possède pas encore. Une seule demande en attente par cycle par établissement. Le motif est obligatoire (min. 20 caractères) et doit justifier le besoin.",
                    'security' => $secret,
                    'parameters' => self::paramsContexteTenant(),
                    'requestBody' => [
                        'required' => true,
                        'content' => self::json([
                            'type' => 'object',
                            'required' => ['cycle', 'motif'],
                            'properties' => [
                                'cycle' => ['type' => 'string', 'enum' => ['maternelle', 'primaire', 'secondaire', 'universitaire']],
                                'motif' => ['type' => 'string', 'minLength' => 20, 'maxLength' => 1000, 'description' => 'Justification du besoin.'],
                            ],
                        ]),
                    ],
                    'responses' => [
                        '201' => self::succes('Demande créée', ['data' => self::ref('DemandeCycle')]),
                        '401' => self::reponseRef('SecretInvalide'),
                        '403' => self::reponseRef('AccesAdministrateurRequis'),
                        '422' => self::reponseRef('DonneesInvalides'),
                    ],
                ],
            ],
            '/interne/mon-etablissement/demandes-cycle/{uuid}' => [
                'delete' => [
                    'tags' => ['Demandes de cycle'],
                    'summary' => 'Annuler une demande en attente',
                    'description' => "Seule une demande au statut `en_attente` peut être annulée. La suppression est physique.",
                    'security' => $secret,
                    'parameters' => array_merge(self::paramsContexteTenant(), [self::paramUuid('uuid', 'Uuid de la demande.')]),
                    'responses' => [
                        '200' => ['description' => 'Demande annulée.', 'content' => self::json(['type' => 'object', 'properties' => ['success' => ['type' => 'boolean']]])],
                        '401' => self::reponseRef('SecretInvalide'),
                        '403' => self::reponseRef('AccesAdministrateurRequis'),
                        '409' => self::reponseRef('ConflitStatut'),
                    ],
                ],
            ],

            // ── Demandes de cycle (Super Administrateur) ────────────────
            '/interne/demandes-cycle' => [
                'get' => [
                    'tags' => ['Demandes de cycle'],
                    'summary' => 'Lister toutes les demandes de cycle',
                    'security' => $secret,
                    'parameters' => [[
                        'name' => 'statut', 'in' => 'query', 'required' => false,
                        'description' => 'Filtre par statut. `tous` retourne toutes les demandes.',
                        'schema' => ['type' => 'string', 'enum' => ['en_attente', 'acceptee', 'refusee', 'tous'], 'default' => 'en_attente'],
                    ]],
                    'responses' => [
                        '200' => self::succes('Demandes de cycle', ['data' => ['type' => 'array', 'items' => self::ref('DemandeCycle')]]),
                        '401' => self::reponseRef('SecretInvalide'),
                    ],
                ],
            ],
            '/interne/demandes-cycle/{uuid}/accepter' => [
                'post' => [
                    'tags' => ['Demandes de cycle'],
                    'summary' => 'Accepter une demande',
                    'description' => "Crée ou réactive la ligne dans `cycles_autorises`. L'établissement peut ensuite activer ce cycle dans sa configuration académique annuelle.",
                    'security' => $secret,
                    'parameters' => [self::paramUuid('uuid', 'Uuid de la demande.')],
                    'requestBody' => [
                        'required' => false,
                        'content' => self::json([
                            'type' => 'object',
                            'properties' => ['note' => ['type' => 'string', 'description' => 'Note optionnelle pour l\'établissement.']],
                        ]),
                    ],
                    'responses' => [
                        '200' => self::succes('Demande acceptée', ['data' => self::ref('DemandeCycle')]),
                        '401' => self::reponseRef('SecretInvalide'),
                        '404' => self::reponseRef('RessourceIntrouvable'),
                        '422' => self::reponseRef('DonneesInvalides'),
                    ],
                ],
            ],
            '/interne/demandes-cycle/{uuid}/refuser' => [
                'post' => [
                    'tags' => ['Demandes de cycle'],
                    'summary' => 'Refuser une demande',
                    'description' => "Le refus est définitif pour cette demande. L'établissement peut re-soumettre. La note est obligatoire pour expliquer le refus.",
                    'security' => $secret,
                    'parameters' => [self::paramUuid('uuid', 'Uuid de la demande.')],
                    'requestBody' => [
                        'required' => true,
                        'content' => self::json([
                            'type' => 'object',
                            'required' => ['note'],
                            'properties' => ['note' => ['type' => 'string', 'minLength' => 10, 'description' => 'Motif du refus (obligatoire).']],
                        ]),
                    ],
                    'responses' => [
                        '200' => self::succes('Demande refusée', ['data' => self::ref('DemandeCycle')]),
                        '401' => self::reponseRef('SecretInvalide'),
                        '404' => self::reponseRef('RessourceIntrouvable'),
                        '422' => self::reponseRef('DonneesInvalides'),
                    ],
                ],
            ],

            // ── Configuration académique ────────────────────────────────────
                'AnneeAcademique' => [
                    'type' => 'object',
                    'description' => "Année académique d'un établissement. Jamais supprimable. Statut calculé dynamiquement.",
                    'properties' => [
                        'uuid'             => ['type' => 'string', 'format' => 'uuid'],
                        'libelle'          => ['type' => 'string', 'example' => '2026-2027'],
                        'date_debut'       => ['type' => 'string', 'format' => 'date', 'example' => '2026-09-01'],
                        'date_fin'         => ['type' => 'string', 'format' => 'date', 'example' => '2027-07-31'],
                        'suspendu'         => ['type' => 'boolean', 'description' => 'Flag de suspension explicite, prioritaire sur le calcul des dates.'],
                        'note_suspension'  => ['type' => 'string', 'description' => 'Motif de suspension.'],
                        'statut'           => ['type' => 'string', 'enum' => ['en_cours', 'a_venir', 'termine', 'suspendu'], 'description' => 'Calculé dynamiquement : jamais stocké en base.'],
                        'nb_cycles'        => ['type' => 'integer', 'description' => 'Nombre de cycles actifs pour cette année.'],
                        'created_at'       => ['type' => 'string', 'format' => 'date-time'],
                        'updated_at'       => ['type' => 'string', 'format' => 'date-time'],
                    ],
                ],
                'CycleConfig' => [
                    'type' => 'object',
                    'description' => "Activation d'un cycle pédagogique pour une année académique.",
                    'properties' => [
                        'uuid'  => ['type' => 'string', 'format' => 'uuid'],
                        'cycle' => ['type' => 'string', 'enum' => ['maternelle', 'primaire', 'secondaire', 'universitaire']],
                        'actif' => ['type' => 'boolean'],
                        'annee' => [
                            'type' => 'object',
                            'properties' => [
                                'uuid'    => ['type' => 'string', 'format' => 'uuid'],
                                'libelle' => ['type' => 'string', 'example' => '2026-2027'],
                            ],
                        ],
                        'created_at' => ['type' => 'string', 'format' => 'date-time'],
                    ],
                ],
                'SubdivisionPedagogique' => [
                    'type' => 'object',
                    'description' => "Groupe (primaire/maternelle), section (secondaire) ou département (université).",
                    'properties' => [
                        'uuid'        => ['type' => 'string', 'format' => 'uuid'],
                        'type'        => ['type' => 'string', 'enum' => ['groupe', 'section', 'departement']],
                        'nom'         => ['type' => 'string', 'example' => 'Groupe A'],
                        'code'        => ['type' => 'string', 'example' => 'A'],
                        'description' => ['type' => 'string'],
                        'actif'       => ['type' => 'boolean'],
                        'annee'       => ['type' => 'object', 'properties' => ['uuid' => ['type' => 'string', 'format' => 'uuid'], 'libelle' => ['type' => 'string']]],
                        'cycle_config'=> ['type' => 'object', 'properties' => ['uuid' => ['type' => 'string', 'format' => 'uuid'], 'cycle' => ['type' => 'string']]],
                        'created_at'  => ['type' => 'string', 'format' => 'date-time'],
                    ],
                ],
                'NiveauScolaire' => [
                    'type' => 'object',
                    'description' => "Niveau du référentiel du tenant (partagé entre tous les groupes).",
                    'properties' => [
                        'uuid'        => ['type' => 'string', 'format' => 'uuid'],
                        'cycle'       => ['type' => 'string', 'enum' => ['maternelle', 'primaire', 'secondaire', 'universitaire']],
                        'nom'         => ['type' => 'string', 'example' => 'Cours moyen 2e année'],
                        'abreviation' => ['type' => 'string', 'example' => 'CM2'],
                        'ordre'       => ['type' => 'integer', 'description' => "Ordre d'affichage (0 = premier)."],
                        'actif'       => ['type' => 'boolean'],
                        'created_at'  => ['type' => 'string', 'format' => 'date-time'],
                    ],
                ],
                'SerieFiliere' => [
                    'type' => 'object',
                    'description' => "Série (secondaire : A, C, D, F3…) ou filière universitaire (IT, EE, GC…).",
                    'properties' => [
                        'uuid'        => ['type' => 'string', 'format' => 'uuid'],
                        'cycle'       => ['type' => 'string', 'enum' => ['secondaire', 'universitaire']],
                        'nom'         => ['type' => 'string', 'example' => 'Sciences expérimentales'],
                        'code'        => ['type' => 'string', 'example' => 'D'],
                        'description' => ['type' => 'string'],
                        'actif'       => ['type' => 'boolean'],
                        'subdivision' => ['type' => 'object', 'nullable' => true, 'properties' => ['uuid' => ['type' => 'string', 'format' => 'uuid'], 'nom' => ['type' => 'string']]],
                        'created_at'  => ['type' => 'string', 'format' => 'date-time'],
                    ],
                ],
                'ClasseConfig' => [
                    'type' => 'object',
                    'description' => "Classe concrète = niveau × subdivision × (série optionnelle) pour une année. Sigle généré automatiquement.",
                    'properties' => [
                        'uuid'                   => ['type' => 'string', 'format' => 'uuid'],
                        'sigle'                  => ['type' => 'string', 'example' => 'CM2 A'],
                        'effectif_previsionnel'  => ['type' => 'integer', 'nullable' => true],
                        'classe_uuid_externe'    => ['type' => 'string', 'format' => 'uuid', 'nullable' => true, 'description' => 'UUID de la classe dans scolarite.classes (pont optionnel).'],
                        'actif'                  => ['type' => 'boolean'],
                        'annee'                  => ['type' => 'object', 'properties' => ['uuid' => ['type' => 'string', 'format' => 'uuid'], 'libelle' => ['type' => 'string']]],
                        'niveau'                 => ['type' => 'object', 'properties' => ['uuid' => ['type' => 'string', 'format' => 'uuid'], 'nom' => ['type' => 'string'], 'abreviation' => ['type' => 'string']]],
                        'subdivision'            => ['type' => 'object', 'properties' => ['uuid' => ['type' => 'string', 'format' => 'uuid'], 'nom' => ['type' => 'string'], 'code' => ['type' => 'string']]],
                        'serie'                  => ['type' => 'object', 'nullable' => true, 'properties' => ['uuid' => ['type' => 'string', 'format' => 'uuid'], 'nom' => ['type' => 'string'], 'code' => ['type' => 'string']]],
                        'created_at'             => ['type' => 'string', 'format' => 'date-time'],
                    ],
                ],
                'CohorteUniversitaire' => [
                    'type' => 'object',
                    'description' => "Cohorte universitaire : filière × niveau × lettre. Sigle généré automatiquement (ex. IT2A).",
                    'properties' => [
                        'uuid'      => ['type' => 'string', 'format' => 'uuid'],
                        'sigle'     => ['type' => 'string', 'example' => 'IT2A'],
                        'diplome'   => ['type' => 'string', 'enum' => ['licence', 'master', 'doctorat', 'ingenieur', 'bts', 'dut', 'autre']],
                        'lettre'    => ['type' => 'string', 'example' => 'A'],
                        'semestres' => ['type' => 'string', 'example' => '1,2'],
                        'actif'     => ['type' => 'boolean'],
                        'annee'     => ['type' => 'object', 'properties' => ['uuid' => ['type' => 'string', 'format' => 'uuid'], 'libelle' => ['type' => 'string']]],
                        'filiere'   => ['type' => 'object', 'properties' => ['uuid' => ['type' => 'string', 'format' => 'uuid'], 'nom' => ['type' => 'string'], 'code' => ['type' => 'string']]],
                        'niveau'    => ['type' => 'object', 'properties' => ['uuid' => ['type' => 'string', 'format' => 'uuid'], 'nom' => ['type' => 'string']]],
                        'created_at'=> ['type' => 'string', 'format' => 'date-time'],
                    ],
                ],
                'DemandeCycle' => [
                    'type' => 'object',
                    'description' => "Demande d'extension de cycle soumise par un établissement. Cycle de vie : `en_attente` → `acceptee` | `refusee`.",
                    'properties' => [
                        'uuid'              => ['type' => 'string', 'format' => 'uuid'],
                        'cycle'             => ['type' => 'string', 'enum' => ['maternelle', 'primaire', 'secondaire', 'universitaire']],
                        'statut'            => ['type' => 'string', 'enum' => ['en_attente', 'acceptee', 'refusee']],
                        'motif'             => ['type' => 'string', 'description' => 'Justification fournie par l\'établissement.'],
                        'note_instruction'  => ['type' => 'string', 'description' => 'Note du Super Administrateur.'],
                        'date_instruction'  => ['type' => 'string', 'format' => 'date-time', 'nullable' => true],
                        'etablissement_nom' => ['type' => 'string', 'description' => 'Présent dans les réponses Super Admin.', 'nullable' => true],
                        'etablissement_slug'=> ['type' => 'string', 'nullable' => true],
                        'created_at'        => ['type' => 'string', 'format' => 'date-time'],
                        'updated_at'        => ['type' => 'string', 'format' => 'date-time'],
                    ],
                ],
                'MatiereConfig' => [                    'type' => 'object',
                    'description' => "Configuration locale d'une matière externe (evaluations.matieres) dans un contexte pédagogique précis. `coefficient` NULL = non défini ≠ 0.",
                    'properties' => [
                        'uuid'                 => ['type' => 'string', 'format' => 'uuid'],
                        'cycle'                => ['type' => 'string', 'enum' => ['maternelle', 'primaire', 'secondaire', 'universitaire']],
                        'matiere_uuid_externe' => ['type' => 'string', 'format' => 'uuid', 'description' => 'UUID de la matière dans evaluations.matieres.'],
                        'nom_matiere'          => ['type' => 'string', 'example' => 'Éducation scientifique et technologie'],
                        'code_matiere'         => ['type' => 'string', 'nullable' => true, 'example' => 'EST'],
                        'coefficient'          => ['type' => 'string', 'nullable' => true, 'description' => 'Décimal sérialisé en chaîne. NULL = non défini.', 'example' => '2.00'],
                        'est_obligatoire'      => ['type' => 'boolean'],
                        'actif'                => ['type' => 'boolean'],
                        'annee'                => ['type' => 'object', 'properties' => ['uuid' => ['type' => 'string', 'format' => 'uuid'], 'libelle' => ['type' => 'string']]],
                        'niveau'               => ['type' => 'object', 'properties' => ['uuid' => ['type' => 'string', 'format' => 'uuid'], 'nom' => ['type' => 'string'], 'abreviation' => ['type' => 'string']]],
                        'serie'                => ['type' => 'object', 'nullable' => true, 'properties' => ['uuid' => ['type' => 'string', 'format' => 'uuid'], 'nom' => ['type' => 'string'], 'code' => ['type' => 'string']]],
                        'created_at'           => ['type' => 'string', 'format' => 'date-time'],
                    ],
                ],
            ],
        ];
    }
}
