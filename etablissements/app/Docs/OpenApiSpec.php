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
                ['name' => 'Géographie', 'description' => 'Référentiel géographique panafricain (54 pays), pour les listes déroulantes en cascade de l\'étape 2.'],
                ['name' => 'Onboarding', 'description' => "Demande d'inscription d'un établissement en 5 étapes, sans authentification."],
                ['name' => 'Corrections', 'description' => 'Correction d\'un dossier via un lien signé à usage unique, sans authentification.'],
                ['name' => 'Établissements', 'description' => 'Cycles autorisés, plans disponibles et abonnement d\'un établissement actif.'],
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
Documentation du microservice **Établissements** de la plateforme SIGAPEI : onboarding multi-étapes d'un établissement, référentiel géographique panafricain, workflow de validation par le Super Administrateur, génération du slug et du matricule, page d'accueil dynamique, plans et abonnements.

### Conventions

- Toutes les routes métier sont sous `/v1`. Aucun identifiant interne n'est exposé : uniquement des `uuid` (et le `slug` pour un établissement).
- Les routes **publiques** (accueil, géographie, onboarding, corrections) n'exigent aucune authentification.
- Les routes **`/interne/*`** exigent le header `X-Internal-Secret` (bouton **Authorize**). Elles ne sont jamais appelées par un client final.
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
                    'description' => "Contenu public d'un établissement, retrouvé par son slug. Si l'établissement est suspendu ou archivé, un contenu dégradé est retourné (`degrade: true`) à la place du contenu normal. Mis en cache Redis, invalidé à chaque changement de statut.",
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
                    'summary' => 'Liste des pays africains couverts',
                    'description' => 'Les 54 pays du continent, triés par nom. Cache Redis longue durée (24 h par défaut).',
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
                    'parameters' => [self::paramUuid('uuid', 'Identifiant du pays.')],
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
                    'parameters' => [self::paramUuid('uuid', 'Identifiant du département.')],
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
                    'parameters' => [self::paramUuid('uuid', 'Identifiant de la commune.')],
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
                    'description' => "Appelé à chaque étape du formulaire (sauvegarde automatique). Sans `uuid`, une nouvelle demande est créée ; avec `uuid`, le brouillon existant est retrouvé et **fusionné** (fusion récursive) avec les données envoyées : on peut donc n'envoyer que l'étape en cours. Conserver l'`uuid` côté navigateur permet de reprendre la demande après une fermeture accidentelle.\n\nSeul `localisation.arrondissement_uuid` est résolu vers une clé étrangère ; les autres uuid de la cascade sont conservés tels quels dans le brouillon.",
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
                                    'arrondissement_uuid' => '0b6f1c3e-5a2d-4b7e-9c1f-3d8a2e4f6a10',
                                    'adresse_complete' => 'Rue 123, près du marché de Ganhi',
                                ],
                                'dirigeant' => [
                                    'nom_complet' => 'Jean Dupont',
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
                        '422' => self::reponseRef('DonneesInvalides'),
                    ],
                ],
            ],
            '/demandes/{uuid}/documents' => [
                'post' => [
                    'tags' => ['Onboarding'],
                    'summary' => 'Téléverse un document (étape 4)',
                    'description' => "Envoie un fichier vers le stockage objet (S3/MinIO). Seule la référence (chemin, type MIME, taille) est écrite en base. Taille maximale : 10 Mo. Formats attendus : PDF, JPG, PNG (SVG accepté pour le logo).",
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
                                            'description' => "`autorisation` : fiche d'autorisation d'enseignement délivrée par l'État. `piece_identite` : pièce d'identité du fondateur/dirigeant. `logo` : facultatif à la soumission.",
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
                        '422' => self::reponseRef('DonneesInvalides'),
                    ],
                ],
            ],
            '/demandes/{uuid}/soumettre' => [
                'post' => [
                    'tags' => ['Onboarding'],
                    'summary' => 'Soumet la demande finalisée (étape 5)',
                    'description' => "Passe la demande au statut `soumise`, horodate la soumission et publie l'événement `demande.soumise` (notifications WhatsApp + e-mail à l'établissement, au dirigeant et au Super Administrateur, envoyées par le microservice Communication).\n\nLe jeton CAPTCHA est vérifié côté serveur avant tout traitement.",
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
            '/etablissements/{slug}/cycles-autorises' => [
                'get' => [
                    'tags' => ['Établissements'],
                    'summary' => "Cycles que l'établissement peut activer",
                    'description' => "Dérivés des types choisis à l'étape 1 : `primaire` → maternelle + primaire ; `secondaire` → secondaire ; `universite` → universitaire. Consommé par le microservice Scolarité.",
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
                        '422' => self::reponseRef('DonneesInvalides'),
                    ],
                ],
            ],
            '/interne/demandes/{uuid}/valider' => [
                'post' => [
                    'tags' => ['Interne'],
                    'summary' => 'Valide définitivement la demande',
                    'description' => "En **une seule transaction** : crée l'établissement (statut `actif`) avec son slug et son matricule, enregistre ses cycles autorisés et passe la demande à `validee`. Publie ensuite `etablissement.valide`, que le microservice Identité consomme pour créer le compte administrateur du dirigeant.\n\nSlug : minuscules, sans accents, suffixe numérique en cas de collision (`jean-marie-2`). Matricule : mot significatif le plus court du nom + code à 4 chiffres (ex. `kisito8945`).",
                    'security' => $secret,
                    'parameters' => [self::paramUuid('uuid', 'Uuid de la demande.')],
                    'responses' => [
                        '200' => self::succes('Établissement créé', [
                            'etablissementUuid' => ['type' => 'string', 'format' => 'uuid'],
                            'slug' => ['type' => 'string', 'example' => 'complexe-scolaire-kisito'],
                            'matricule' => ['type' => 'string', 'example' => 'kisito8945'],
                        ]),
                        '401' => self::reponseRef('SecretInvalide'),
                        '404' => self::reponseRef('RessourceIntrouvable'),
                    ],
                ],
            ],
            '/interne/etablissements/{uuid}/suspendre' => [
                'post' => [
                    'tags' => ['Interne'],
                    'summary' => 'Suspend un établissement',
                    'description' => "Effet immédiat : le statut passe à `suspendu`, les caches Redis du slug sont invalidés et `etablissement.suspendu` est publié. La page d'accueil publique affiche alors un contenu dégradé.",
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
                        'code_iso' => ['type' => 'string', 'example' => 'BJ'],
                        'nom' => ['type' => 'string', 'example' => 'Benin'],
                        'indicatif_tel' => ['type' => 'string', 'example' => '229'],
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
                                    'items' => ['type' => 'string', 'enum' => ['primaire', 'secondaire', 'universite']],
                                    'description' => 'Un établissement peut cumuler plusieurs types ; au moins un est obligatoire.',
                                ],
                                'annee_ouverture' => ['type' => 'integer', 'description' => 'Inférieure ou égale à l\'année en cours.', 'example' => 2015],
                                'email' => ['type' => 'string', 'format' => 'email'],
                                'telephone_1' => ['type' => 'string', 'description' => 'Format E.164.', 'example' => '+22997000000'],
                                'telephone_2' => ['type' => 'string', 'nullable' => true, 'description' => 'Format E.164, facultatif si telephone_1 est renseigné.'],
                            ],
                        ],
                        'localisation' => [
                            'type' => 'object',
                            'description' => 'Étape 2 - Localisation (valeurs issues des listes en cascade `/geo/...`).',
                            'properties' => [
                                'pays_uuid' => ['type' => 'string', 'format' => 'uuid'],
                                'departement_uuid' => ['type' => 'string', 'format' => 'uuid'],
                                'commune_uuid' => ['type' => 'string', 'format' => 'uuid'],
                                'arrondissement_uuid' => ['type' => 'string', 'format' => 'uuid', 'description' => "Seul uuid résolu vers une clé étrangère : c'est lui qui rattache la demande au référentiel."],
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
            ],
        ];
    }
}
