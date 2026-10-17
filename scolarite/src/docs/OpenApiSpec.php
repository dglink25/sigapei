<?php

namespace App\docs;

class OpenApiSpec
{
    public static function build(): array
    {
        return [
            'openapi' => '3.0.3',
            'info' => [
                'title' => 'API Scolarite - SIGAPEI',
                'version' => '1.0.0',
                'description' => self::descriptionGenerale(),
            ],
            'servers' => [
                ['url' => '/v1', 'description' => 'Prefixe de toutes les routes metier'],
                ['url' => '/', 'description' => 'Racine du service (sante et docs)'],
            ],
            'tags' => [
                ['name' => 'Sante', 'description' => 'Sonde de disponibilite'],
                ['name' => 'Classes', 'description' => 'Gestion des classes, cycles, niveaux et capacite en temps reel'],
                ['name' => 'Apprenants', 'description' => 'Dossier unique, transferts internes et consultation financiere'],
                ['name' => 'Emplois du Temps', 'description' => 'Plannings et assignation des salles et enseignants'],
                ['name' => 'Interne', 'description' => 'Endpoints pour les autres microservices de la plateforme'],
            ],
            'paths' => [
                '/sante' => [
                    'get' => [
                        'tags' => ['Sante'],
                        'summary' => 'Sonde de sante du microservice',
                        'responses' => [
                            '200' => [
                                'description' => 'Service operationnel',
                                'content' => [
                                    'application/json' => [
                                        'example' => [
                                            'statut' => 'ok',
                                            'service' => 'api-scolarite',
                                            'horodatage' => '2026-10-17T12:00:00+01:00',
                                        ],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
                '/classes' => [
                    'get' => [
                        'tags' => ['Classes'],
                        'summary' => 'Lister les classes avec calcul de capacite en temps reel',
                        'security' => [['BearerAuth' => []]],
                        'parameters' => [
                            ['name' => 'X-Tenant-Id', 'in' => 'header', 'required' => true, 'schema' => ['type' => 'string', 'format' => 'uuid']],
                            ['name' => 'cycle', 'in' => 'query', 'required' => false, 'schema' => ['type' => 'string', 'enum' => ['maternelle', 'primaire', 'secondaire', 'universitaire']]],
                            ['name' => 'programme', 'in' => 'query', 'required' => false, 'schema' => ['type' => 'string', 'enum' => ['beninois', 'francais']]],
                        ],
                        'responses' => [
                            '200' => [
                                'description' => 'Liste des classes avec places disponibles',
                                'content' => [
                                    'application/json' => [
                                        'example' => [
                                            'succes' => true,
                                            'donnees' => [
                                                [
                                                    'uuid' => 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                                                    'nom' => '6ème A (Programme Béninois)',
                                                    'cycle' => 'secondaire',
                                                    'niveau' => '6e',
                                                    'programme' => 'beninois',
                                                    'capacite' => 45,
                                                    'inscrits_count' => 40,
                                                    'places_disponibles' => 5,
                                                    'est_complete' => false,
                                                ],
                                            ],
                                        ],
                                    ],
                                ],
                            ],
                        ],
                    ],
                    'post' => [
                        'tags' => ['Classes'],
                        'summary' => 'Creer une nouvelle classe (Administrateur)',
                        'security' => [['BearerAuth' => []]],
                        'parameters' => [
                            ['name' => 'X-Tenant-Id', 'in' => 'header', 'required' => true, 'schema' => ['type' => 'string', 'format' => 'uuid']],
                        ],
                        'requestBody' => [
                            'required' => true,
                            'content' => [
                                'application/json' => [
                                    'example' => [
                                        'nom' => '6ème B (Programme Français)',
                                        'cycle' => 'secondaire',
                                        'niveau' => '6e',
                                        'programme' => 'francais',
                                        'capacite' => 35,
                                    ],
                                ],
                            ],
                        ],
                        'responses' => [
                            '201' => ['description' => 'Classe creee avec succes'],
                        ],
                    ],
                ],
                '/classes/{uuid}/disponibilite' => [
                    'get' => [
                        'tags' => ['Classes'],
                        'summary' => 'Verifier la disponibilite restante d\'une classe en temps reel',
                        'description' => 'Utilise par Inscription avant de valider une candidature.',
                        'security' => [['BearerAuth' => []]],
                        'parameters' => [
                            ['name' => 'uuid', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'string', 'format' => 'uuid']],
                            ['name' => 'X-Tenant-Id', 'in' => 'header', 'required' => true, 'schema' => ['type' => 'string', 'format' => 'uuid']],
                        ],
                        'responses' => [
                            '200' => [
                                'description' => 'Capacite et places restantes',
                                'content' => [
                                    'application/json' => [
                                        'example' => [
                                            'succes' => true,
                                            'donnees' => [
                                                'uuid' => 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                                                'nom' => '6ème A',
                                                'capacite_totale' => 45,
                                                'inscrits_actuels' => 40,
                                                'places_disponibles' => 5,
                                                'est_complete' => false,
                                            ],
                                        ],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
                '/apprenants/{uuid}' => [
                    'get' => [
                        'tags' => ['Apprenants'],
                        'summary' => 'Consulter le dossier unique d\'un apprenant',
                        'security' => [['BearerAuth' => []]],
                        'parameters' => [
                            ['name' => 'uuid', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'string', 'format' => 'uuid']],
                            ['name' => 'X-Tenant-Id', 'in' => 'header', 'required' => true, 'schema' => ['type' => 'string', 'format' => 'uuid']],
                        ],
                        'responses' => [
                            '200' => ['description' => 'Dossier complet (classe, historique, tuteurs)'],
                            '404' => ['description' => 'Apprenant introuvable'],
                        ],
                    ],
                ],
                '/apprenants/{uuid}/transfert' => [
                    'post' => [
                        'tags' => ['Apprenants'],
                        'summary' => 'Transferer un apprenant vers une autre classe sans duplication',
                        'description' => 'Mutation interne : verification de disponibilite de place et archivage du mouvement dans historique_classes.',
                        'security' => [['BearerAuth' => []]],
                        'parameters' => [
                            ['name' => 'uuid', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'string', 'format' => 'uuid']],
                            ['name' => 'X-Tenant-Id', 'in' => 'header', 'required' => true, 'schema' => ['type' => 'string', 'format' => 'uuid']],
                        ],
                        'requestBody' => [
                            'required' => true,
                            'content' => [
                                'application/json' => [
                                    'example' => [
                                        'nouvelle_classe_uuid' => '9c8b7a6d-5e4f-3210-fedc-ba9876543210',
                                        'motif' => 'Changement de filiere scientifique vers litteraire',
                                    ],
                                ],
                            ],
                        ],
                        'responses' => [
                            '200' => ['description' => 'Transfert realise avec succes'],
                            '400' => ['description' => 'Classe de destination complete ou invalide'],
                        ],
                    ],
                ],
                '/apprenants/{uuid}/paiements-scolarite' => [
                    'get' => [
                        'tags' => ['Apprenants'],
                        'summary' => 'Situation financiere de scolarite (Lecture seule pure)',
                        'security' => [['BearerAuth' => []]],
                        'parameters' => [
                            ['name' => 'uuid', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'string', 'format' => 'uuid']],
                            ['name' => 'X-Tenant-Id', 'in' => 'header', 'required' => true, 'schema' => ['type' => 'string', 'format' => 'uuid']],
                        ],
                        'responses' => [
                            '200' => ['description' => 'Frais, echeances et paiements de scolarite enregistres'],
                        ],
                    ],
                ],
                '/emplois-du-temps' => [
                    'get' => [
                        'tags' => ['Emplois du Temps'],
                        'summary' => 'Consulter les emplois du temps',
                        'security' => [['BearerAuth' => []]],
                        'parameters' => [
                            ['name' => 'classe_uuid', 'in' => 'query', 'required' => false, 'schema' => ['type' => 'string', 'format' => 'uuid']],
                            ['name' => 'enseignant_id', 'in' => 'query', 'required' => false, 'schema' => ['type' => 'integer']],
                            ['name' => 'X-Tenant-Id', 'in' => 'header', 'required' => true, 'schema' => ['type' => 'string', 'format' => 'uuid']],
                        ],
                        'responses' => [
                            '200' => ['description' => 'Grille horaire de la semaine'],
                        ],
                    ],
                    'post' => [
                        'tags' => ['Emplois du Temps'],
                        'summary' => 'Creer ou modifier un creneau de cours',
                        'security' => [['BearerAuth' => []]],
                        'parameters' => [
                            ['name' => 'X-Tenant-Id', 'in' => 'header', 'required' => true, 'schema' => ['type' => 'string', 'format' => 'uuid']],
                        ],
                        'requestBody' => [
                            'required' => true,
                            'content' => [
                                'application/json' => [
                                    'example' => [
                                        'classe_uuid' => 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                                        'matiere_nom' => 'Mathematiques',
                                        'enseignant_id' => 12,
                                        'jour' => 'lundi',
                                        'heure_debut' => '08:00',
                                        'heure_fin' => '10:00',
                                        'salle' => 'Salle 102',
                                    ],
                                ],
                            ],
                        ],
                        'responses' => [
                            '201' => ['description' => 'Creneau horaire planifie'],
                        ],
                    ],
                ],
                '/interne/apprenants/{uuid}/classe' => [
                    'get' => [
                        'tags' => ['Interne'],
                        'summary' => 'Informations d\'un apprenant pour les autres microservices',
                        'description' => 'Utilise par Evaluations, Vie scolaire et Finances. Securise par X-Internal-Secret.',
                        'parameters' => [
                            ['name' => 'uuid', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'string', 'format' => 'uuid']],
                            ['name' => 'X-Internal-Secret', 'in' => 'header', 'required' => true, 'schema' => ['type' => 'string']],
                            ['name' => 'X-Tenant-Id', 'in' => 'header', 'required' => true, 'schema' => ['type' => 'string', 'format' => 'uuid']],
                        ],
                        'responses' => [
                            '200' => ['description' => 'Informations pedagogiques sans donnees sensibles'],
                        ],
                    ],
                ],
            ],
            'components' => [
                'securitySchemes' => [
                    'BearerAuth' => [
                        'type' => 'http',
                        'scheme' => 'bearer',
                        'bearerFormat' => 'JWT',
                        'description' => 'Jeton JWT issu du microservice Identite',
                    ],
                ],
            ],
        ];
    }

    private static function descriptionGenerale(): string
    {
        return <<<'MD'
Microservice de gestion administrative et pédagogique de la plateforme SIGAPEI.

### Fonctionnalités Clés :
- **Classes & Capacité en temps réel** : Suivi des effectifs et calcul immédiat des places disponibles.
- **Dossier unique apprenant** : Source de vérité unique pour toute la scolarité de l'élève.
- **Transferts internes & Mutations** : Changement de classe/filière sans recréation de dossier.
- **Règles pédagogiques strictes** : Compte élève activé uniquement pour le programme français secondaire, espace parent pour le programme béninois.
- **Finances en lecture seule** : Consultation sécurisée des frais de scolarité sans altération de données financières.
MD;
    }
}
