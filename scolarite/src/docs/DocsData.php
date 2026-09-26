<?php

namespace App\docs;

class DocsData
{
    public static function catalogue(): array
    {
        return [
            'service' => 'api-scolarite',
            'version' => '1.0.0',
            'description' => 'Microservice de gestion scolaire (cycles, classes, apprenants, mutations, emplois du temps, paiements) — SIGAPEI',
            'port' => 4004,
            'prefixe_api' => '/v1',
            'authentication' => [
                'type' => 'Bearer JWT',
                'header' => 'Authorization: Bearer <token>',
                'issuer' => 'api-identite.sigapei.com',
                'remarque' => 'Le jeton doit contenir un claim tenant_id valide. Les appels internes (Gateway) utilisent le header X-Internal-Secret.',
            ],
            'format_reponse_standard' => [
                'succes' => [
                    'succes' => true,
                    'message' => 'Description de l\'opération',
                    'donnees' => '... (voir chaque endpoint)',
                    'horodatage' => '2026-09-25T10:00:00+01:00',
                ],
                'erreur' => [
                    'succes' => false,
                    'code_erreur' => 'CODE_ERREUR_METIER',
                    'message' => 'Description de l\'erreur',
                    'details' => 'null | objet de détails',
                    'horodatage' => '2026-09-25T10:00:00+01:00',
                ],
            ],
            'endpoints' => [
                [
                    'id' => 'sante',
                    'methode' => 'GET',
                    'route' => '/sante',
                    'auth_requise' => false,
                    'description' => 'Sonde de santé du microservice.',
                    'reponse_succes' => [
                        'statut' => 'ok',
                        'service' => 'api-scolarite',
                        'horodatage' => '2026-09-25T10:00:00+01:00',
                    ],
                ],
                [
                    'id' => 'docs',
                    'methode' => 'GET',
                    'route' => '/docs',
                    'auth_requise' => false,
                    'description' => 'Catalogue interactif complet des endpoints avec formats de requêtes et de réponses.',
                ],
                [
                    'id' => 'classes.index',
                    'methode' => 'GET',
                    'route' => '/v1/classes',
                    'auth_requise' => true,
                    'roles_autorises' => ['administrateur', 'super_admin', 'personnel', 'enseignant'],
                    'description' => 'Liste les classes actives du tenant avec calcul de capacité en temps réel et programme pédagogique.',
                    'parametres_requete' => [
                        ['nom' => 'cycle', 'type' => 'string', 'valeurs' => ['primaire', 'secondaire', 'universitaire']],
                        ['nom' => 'programme', 'type' => 'string', 'valeurs' => ['beninois', 'francais']],
                        ['nom' => 'statut', 'type' => 'string', 'valeurs' => ['actif', 'archive']],
                    ],
                    'reponse_succes' => [
                        'succes' => true,
                        'message' => 'Liste des classes recuperee avec succes',
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
                                'statut' => 'actif',
                            ],
                        ],
                    ],
                ],
                [
                    'id' => 'classes.store',
                    'methode' => 'POST',
                    'route' => '/v1/classes',
                    'auth_requise' => true,
                    'roles_autorises' => ['administrateur', 'super_admin'],
                    'description' => 'Crée une nouvelle classe avec cycle, niveau, filière, programme (beninois/francais) et capacité.',
                    'corps_requete' => [
                        'nom' => ['type' => 'string', 'obligatoire' => true, 'exemple' => '6ème B (Programme Français)'],
                        'cycle' => ['type' => 'string', 'valeurs' => ['primaire', 'secondaire', 'universitaire'], 'obligatoire' => true],
                        'niveau' => ['type' => 'string', 'obligatoire' => true, 'exemple' => '6e'],
                        'programme' => ['type' => 'string', 'valeurs' => ['beninois', 'francais'], 'obligatoire' => true],
                        'capacite' => ['type' => 'integer', 'obligatoire' => true, 'exemple' => 35],
                    ],
                    'reponse_succes' => [
                        'http' => 201,
                        'succes' => true,
                        'message' => 'Classe creee avec succes',
                        'donnees' => ['uuid' => '9c8b7a6d-...', 'nom' => '6ème B', 'capacite' => 35],
                    ],
                ],
                [
                    'id' => 'classes.disponibilite',
                    'methode' => 'GET',
                    'route' => '/v1/classes/{uuid}/disponibilite',
                    'auth_requise' => true,
                    'description' => 'Retourne la capacité restante en temps réel pour une classe (consommé par Inscription).',
                    'reponse_succes' => [
                        'succes' => true,
                        'message' => 'Disponibilite calculee',
                        'donnees' => [
                            'uuid' => 'a1b2c3d4-...',
                            'nom' => '6ème A',
                            'capacite_totale' => 45,
                            'inscrits_actuels' => 40,
                            'places_disponibles' => 5,
                            'est_complete' => false,
                        ],
                    ],
                ],
                [
                    'id' => 'apprenants.show',
                    'methode' => 'GET',
                    'route' => '/v1/apprenants/{uuid}',
                    'auth_requise' => true,
                    'description' => 'Dossier complet apprenant : état civil, classe, historique des transferts, parents rattachés.',
                ],
                [
                    'id' => 'apprenants.transfert',
                    'methode' => 'POST',
                    'route' => '/v1/apprenants/{uuid}/transfert',
                    'auth_requise' => true,
                    'description' => 'Transfert/mutation vers une autre classe sans duplication du dossier (vérification bloquante de capacité).',
                    'corps_requete' => [
                        'nouvelle_classe_uuid' => ['type' => 'uuid', 'obligatoire' => true],
                        'motif' => ['type' => 'string|null', 'obligatoire' => false],
                    ],
                ],
                [
                    'id' => 'apprenants.paiements',
                    'methode' => 'GET',
                    'route' => '/v1/apprenants/{uuid}/paiements-scolarite',
                    'auth_requise' => true,
                    'description' => 'Vue consolidée en LECTURE SEULE des frais et règlements de scolarité (jointure Finances).',
                ],
                [
                    'id' => 'emplois.index',
                    'methode' => 'GET',
                    'route' => '/v1/emplois-du-temps',
                    'auth_requise' => true,
                    'description' => 'Planning des cours par classe, enseignant ou jour.',
                ],
                [
                    'id' => 'emplois.store',
                    'methode' => 'POST',
                    'route' => '/v1/emplois-du-temps',
                    'auth_requise' => true,
                    'description' => 'Création ou modification d\'un créneau de cours.',
                ],
                [
                    'id' => 'interne.classe',
                    'methode' => 'GET',
                    'route' => '/v1/interne/apprenants/{uuid}/classe',
                    'auth_requise' => true,
                    'description' => 'Endpoint interne pour Évaluations, Finances et Vie scolaire (protégé par X-Internal-Secret).',
                ],
            ],
        ];
    }
}
