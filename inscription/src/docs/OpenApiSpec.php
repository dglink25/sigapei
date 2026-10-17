<?php

namespace App\docs;

class OpenApiSpec
{
    public static function build(): array
    {
        return [
            'openapi' => '3.0.3',
            'info' => [
                'title' => 'API Inscription (Admissions) - SIGAPEI',
                'version' => '1.0.0',
                'description' => self::descriptionGenerale(),
            ],
            'servers' => [
                ['url' => '/v1', 'description' => 'Prefixe de toutes les routes metier'],
                ['url' => '/', 'description' => 'Racine du service (sante et docs)'],
            ],
            'tags' => [
                ['name' => 'Sante', 'description' => 'Sonde de disponibilite'],
                ['name' => 'Candidatures', 'description' => 'Depot public, suivi et validation des dossiers de candidature'],
                ['name' => 'Pieces Justificatives', 'description' => 'Televersement et liaison des pieces justificatives'],
                ['name' => 'Tests d\'Admission', 'description' => 'Saisie et evaluation des epreuves de selection'],
                ['name' => 'Reinscriptions', 'description' => 'Reconduction d\'annee scolaire sans duplication de dossier'],
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
                                            'service' => 'api-inscription',
                                            'horodatage' => '2026-10-17T12:00:00+01:00',
                                        ],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
                '/candidatures' => [
                    'get' => [
                        'tags' => ['Candidatures'],
                        'summary' => 'Lister les candidatures d\'un etablissement',
                        'security' => [['BearerAuth' => []]],
                        'parameters' => [
                            ['name' => 'X-Tenant-Id', 'in' => 'header', 'required' => true, 'schema' => ['type' => 'string', 'format' => 'uuid']],
                            ['name' => 'statut', 'in' => 'query', 'required' => false, 'schema' => ['type' => 'string', 'enum' => ['soumise', 'en_evaluation', 'validee', 'rejetee']]],
                            ['name' => 'classe_visee_id', 'in' => 'query', 'required' => false, 'schema' => ['type' => 'integer']],
                        ],
                        'responses' => [
                            '200' => [
                                'description' => 'Liste recuperee',
                                'content' => [
                                    'application/json' => [
                                        'example' => [
                                            'succes' => true,
                                            'donnees' => [
                                                [
                                                    'uuid' => 'f7a8b9c0-d1e2-3456-fghi-j78901234567',
                                                    'nom' => 'Koffi',
                                                    'prenom' => 'Jean-Luc',
                                                    'date_naissance' => '2012-05-14',
                                                    'classe_visee_id' => 1,
                                                    'statut' => 'soumise',
                                                    'date_soumission' => '2026-09-25T10:00:00+01:00',
                                                ],
                                            ],
                                        ],
                                    ],
                                ],
                            ],
                        ],
                    ],
                    'post' => [
                        'tags' => ['Candidatures'],
                        'summary' => 'Soumission d\'une nouvelle candidature (Public ou Personnel)',
                        'description' => 'Accessible publiquement par un parent ou par un secretaire.',
                        'parameters' => [
                            ['name' => 'X-Tenant-Id', 'in' => 'header', 'required' => true, 'schema' => ['type' => 'string', 'format' => 'uuid']],
                        ],
                        'requestBody' => [
                            'required' => true,
                            'content' => [
                                'application/json' => [
                                    'example' => [
                                        'nom' => 'Koffi',
                                        'prenom' => 'Jean-Luc',
                                        'date_naissance' => '2012-05-14',
                                        'sexe' => 'M',
                                        'classe_visee_id' => 1,
                                        'parent_nom' => 'Koffi Paul',
                                        'parent_telephone' => '+22997000000',
                                        'parent_email' => 'paul.koffi@example.com',
                                    ],
                                ],
                            ],
                        ],
                        'responses' => [
                            '201' => [
                                'description' => 'Candidature creee avec succes',
                                'content' => [
                                    'application/json' => [
                                        'example' => [
                                            'succes' => true,
                                            'message' => 'Candidature soumise avec succes',
                                            'donnees' => [
                                                'uuid' => 'f7a8b9c0-d1e2-3456-fghi-j78901234567',
                                                'statut' => 'soumise',
                                            ],
                                        ],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
                '/candidatures/{uuid}' => [
                    'get' => [
                        'tags' => ['Candidatures'],
                        'summary' => 'Consulter le dossier d\'une candidature',
                        'security' => [['BearerAuth' => []]],
                        'parameters' => [
                            ['name' => 'uuid', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'string', 'format' => 'uuid']],
                            ['name' => 'X-Tenant-Id', 'in' => 'header', 'required' => true, 'schema' => ['type' => 'string', 'format' => 'uuid']],
                        ],
                        'responses' => [
                            '200' => ['description' => 'Dossier complet de la candidature'],
                            '404' => ['description' => 'Candidature introuvable'],
                        ],
                    ],
                ],
                '/candidatures/{uuid}/valider' => [
                    'post' => [
                        'tags' => ['Candidatures'],
                        'summary' => 'Valider definitivement une candidature (Administrateur)',
                        'description' => 'Controle bloquant de disponibilite de place dans Scolarite et creation automatique de l\'apprenant.',
                        'security' => [['BearerAuth' => []]],
                        'parameters' => [
                            ['name' => 'uuid', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'string', 'format' => 'uuid']],
                            ['name' => 'X-Tenant-Id', 'in' => 'header', 'required' => true, 'schema' => ['type' => 'string', 'format' => 'uuid']],
                        ],
                        'responses' => [
                            '200' => [
                                'description' => 'Candidature validee et apprenant inscrit',
                                'content' => [
                                    'application/json' => [
                                        'example' => [
                                            'succes' => true,
                                            'message' => 'Candidature validee avec succes',
                                            'donnees' => [
                                                'candidature_uuid' => 'f7a8b9c0-d1e2-3456-fghi-j78901234567',
                                                'statut' => 'validee',
                                                'apprenant' => [
                                                    'uuid' => 'b2c3d4e5-6789-0123-bcde-f45678901234',
                                                    'matricule' => 'APP20260001',
                                                    'classe' => '6ème A',
                                                    'programme' => 'beninois',
                                                    'compte_utilisateur_cree' => false,
                                                ],
                                            ],
                                        ],
                                    ],
                                ],
                            ],
                            '400' => ['description' => 'Classe complete ou conditions non remplies'],
                        ],
                    ],
                ],
                '/candidatures/{uuid}/rejeter' => [
                    'post' => [
                        'tags' => ['Candidatures'],
                        'summary' => 'Rejeter une candidature avec motif obligatoire',
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
                                        'motif' => 'Dossier incomplet : livret scolaire de l\'annee precedente manquant apres relance.',
                                    ],
                                ],
                            ],
                        ],
                        'responses' => [
                            '200' => ['description' => 'Candidature rejetee avec motif'],
                        ],
                    ],
                ],
                '/candidatures/{uuid}/pieces-justificatives' => [
                    'post' => [
                        'tags' => ['Pieces Justificatives'],
                        'summary' => 'Ajouter une piece justificative au dossier',
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
                                        'type_piece' => 'acte_naissance',
                                        'nom_fichier' => 'acte_naissance.pdf',
                                        'fichier_url' => 'https://s3.region.amazonaws.com/sigapei-documents/tenants/1/acte.pdf',
                                    ],
                                ],
                            ],
                        ],
                        'responses' => [
                            '201' => ['description' => 'Piece justificative enregistree'],
                        ],
                    ],
                ],
                '/candidatures/{uuid}/tests-admission' => [
                    'post' => [
                        'tags' => ['Tests d\'Admission'],
                        'summary' => 'Enregistrer les resultats d\'un test d\'admission',
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
                                        'type_test' => 'ecrit_francais_maths',
                                        'note' => 16.5,
                                        'note_sur' => 20,
                                        'observations' => 'Tres bon niveau en mathematiques.',
                                    ],
                                ],
                            ],
                        ],
                        'responses' => [
                            '201' => ['description' => 'Resultat de test enregistre'],
                        ],
                    ],
                ],
                '/reinscriptions' => [
                    'post' => [
                        'tags' => ['Reinscriptions'],
                        'summary' => 'Reconduire un apprenant existant vers une nouvelle annee/classe',
                        'description' => 'Reconduction sans duplication : met a jour la classe de l\'apprenant et journalise dans l\'historique.',
                        'security' => [['BearerAuth' => []]],
                        'parameters' => [
                            ['name' => 'X-Tenant-Id', 'in' => 'header', 'required' => true, 'schema' => ['type' => 'string', 'format' => 'uuid']],
                        ],
                        'requestBody' => [
                            'required' => true,
                            'content' => [
                                'application/json' => [
                                    'example' => [
                                        'apprenant_uuid' => 'b2c3d4e5-6789-0123-bcde-f45678901234',
                                        'nouvelle_classe_uuid' => '9c8b7a6d-5e4f-3210-fedc-ba9876543210',
                                        'annee_scolaire' => '2026-2027',
                                    ],
                                ],
                            ],
                        ],
                        'responses' => [
                            '200' => ['description' => 'Reinscription effectuee sans duplication'],
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
Microservice de gestion du parcours d'admission et des réinscriptions pour la plateforme SIGAPEI.

### Fonctionnalités Clés :
- **Soumission publique ou interne** des candidatures.
- **Vérification bloquante** de disponibilité de places dans la classe visée via le microservice Scolarité.
- **Admission directe** sans double saisie : création de l'élève dans `scolarite.apprenants`.
- **Règles pédagogiques** : compte élève activé uniquement pour le programme français secondaire, gestion déléguée aux parents pour le programme béninois.
- **Réinscriptions sans duplication** de dossier.
MD;
    }
}
