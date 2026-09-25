<?php

namespace App\docs;

class DocsData
{
    public static function catalogue(): array
    {
        return [
            'service' => 'api-inscription',
            'version' => '1.0.0',
            'description' => 'Microservice de gestion des admissions et réinscriptions — SIGAPEI',
            'port' => 4003,
            'prefixe_api' => '/v1',
            'authentication' => [
                'type' => 'Bearer JWT',
                'header' => 'Authorization: Bearer <token>',
                'issuer' => 'api-identite.sigapei.com',
                'exception_soumission' => 'POST /v1/candidatures accepte un appel sans JWT si le header X-Tenant-Id est présent (soumission publique par un parent sans compte).',
                'appels_internes' => 'Utiliser le header X-Internal-Secret à la place du Bearer JWT pour les appels entre microservices.',
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
                    'details' => 'null | objet de détails (ex: erreurs de validation)',
                    'horodatage' => '2026-09-25T10:00:00+01:00',
                ],
            ],
            'regles_metier_cles' => [
                'capacite_bloquante' => 'Toute validation de candidature vérifie en temps réel la disponibilité de place dans scolarite.classes. Si la classe est complète, la validation est bloquée.',
                'creation_directe' => 'La validation insère immédiatement l\'apprenant dans scolarite.apprenants (candidature_id conservé pour traçabilité). Aucune ressaisie.',
                'programme_pedagogique' => 'Si la classe visée suit le programme béninois, utilisateur_id = NULL (aucun compte élève). Si programme français au secondaire, compte élève créé.',
                'rejet_motive' => 'Tout rejet exige un motif (min 5 caractères) stocké dans motif_rejet pour consultation du candidat/parent.',
                'reinscription_sans_doublon' => 'La réinscription met à jour classe_id sur la fiche existante. Aucun doublon créé.',
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
                        'service' => 'api-inscription',
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
                    'id' => 'candidatures.index',
                    'methode' => 'GET',
                    'route' => '/v1/candidatures',
                    'auth_requise' => true,
                    'description' => 'Liste toutes les candidatures du tenant avec filtres (statut, classe_visee_id, recherche).',
                    'reponse_succes' => [
                        'succes' => true,
                        'message' => 'Liste des candidatures recuperee',
                        'donnees' => [
                            [
                                'uuid' => 'f7a8b9c0-d1e2-3456-fghi-j78901234567',
                                'nom' => 'Koffi',
                                'prenom' => 'Jean-Luc',
                                'date_naissance' => '2012-05-14',
                                'classe_visee_id' => 1,
                                'statut' => 'soumise',
                                'date_soumission' => '2026-09-25T10:00:00+01:00',
                                'nb_pieces' => 2,
                                'nb_tests' => 1,
                            ],
                        ],
                    ],
                ],
                [
                    'id' => 'candidatures.store',
                    'methode' => 'POST',
                    'route' => '/v1/candidatures',
                    'auth_requise' => false,
                    'description' => 'Soumission d\'un nouveau dossier de candidature (secrétaire ou parent en accès public avec X-Tenant-Id).',
                    'corps_requete' => [
                        'nom' => ['type' => 'string', 'obligatoire' => true],
                        'prenom' => ['type' => 'string', 'obligatoire' => true],
                        'date_naissance' => ['type' => 'date (Y-m-d)', 'obligatoire' => true],
                        'classe_visee_id' => ['type' => 'integer', 'obligatoire' => true],
                        'parent_nom' => ['type' => 'string|null'],
                        'parent_telephone' => ['type' => 'string|null'],
                    ],
                    'reponse_succes' => [
                        'http' => 201,
                        'succes' => true,
                        'message' => 'Candidature soumise avec succes',
                        'donnees' => ['uuid' => 'f7a8b9c0-...', 'statut' => 'soumise'],
                    ],
                ],
                [
                    'id' => 'candidatures.show',
                    'methode' => 'GET',
                    'route' => '/v1/candidatures/{uuid}',
                    'auth_requise' => true,
                    'description' => 'Détail d\'une candidature : état civil, parent, pièces justificatives, résultats de tests.',
                ],
                [
                    'id' => 'candidatures.valider',
                    'methode' => 'POST',
                    'route' => '/v1/candidatures/{uuid}/valider',
                    'auth_requise' => true,
                    'description' => 'Validation définitive et bloquante : vérifie la capacité dans scolarite.classes, crée l\'apprenant dans scolarite.apprenants selon la règle du programme pédagogique.',
                    'reponse_succes' => [
                        'succes' => true,
                        'message' => 'Candidature validee avec succes',
                        'donnees' => [
                            'candidature_uuid' => 'f7a8b9c0-...',
                            'statut' => 'validee',
                            'apprenant' => [
                                'uuid' => 'b2c3d4e5-...',
                                'classe' => '6ème A (Programme Béninois)',
                                'programme' => 'beninois',
                                'compte_utilisateur_cree' => false,
                            ],
                        ],
                    ],
                ],
                [
                    'id' => 'candidatures.rejeter',
                    'methode' => 'POST',
                    'route' => '/v1/candidatures/{uuid}/rejeter',
                    'auth_requise' => true,
                    'description' => 'Rejette la candidature avec motif obligatoire (min 5 caractères).',
                    'corps_requete' => [
                        'motif' => ['type' => 'string', 'min' => 5, 'obligatoire' => true],
                    ],
                ],
                [
                    'id' => 'pieces.store',
                    'methode' => 'POST',
                    'route' => '/v1/candidatures/{uuid}/pieces-justificatives',
                    'auth_requise' => true,
                    'description' => 'Ajoute une pièce justificative référencée S3/MinIO à la candidature.',
                ],
                [
                    'id' => 'tests.store',
                    'methode' => 'POST',
                    'route' => '/v1/candidatures/{uuid}/tests-admission',
                    'auth_requise' => true,
                    'description' => 'Enregistre le résultat d\'un test d\'admission (écrit, entretien, etc.).',
                ],
                [
                    'id' => 'reinscriptions.store',
                    'methode' => 'POST',
                    'route' => '/v1/reinscriptions',
                    'auth_requise' => true,
                    'description' => 'Reconduit un apprenant existant vers une nouvelle classe/année scolaire sans duplication.',
                ],
            ],
        ];
    }
}
