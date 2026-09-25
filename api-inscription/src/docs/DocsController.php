<?php

namespace App\docs;

use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;

class DocsController extends Controller
{
    /**
     * Retourne le catalogue complet des endpoints de api-inscription
     * avec le format exact de chaque requête et de chaque réponse.
     * Route publique (pas de JWT requis).
     */
    public function catalogue(): JsonResponse
    {
        return response()->json([
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
                'capacite_bloquante' => 'Toute validation de candidature vérifie en temps réel la disponibilité de place dans scolarite.classes. Si la classe est complète, la validation est refusée avec ERREUR_VALIDATION_CANDIDATURE.',
                'creation_directe' => 'La validation insère immédiatement l\'apprenant dans scolarite.apprenants (candidature_id conservé pour traçabilité). Aucune ressaisie.',
                'programme_pedagogique' => 'Si la classe visée suit le programme béninois, utilisateur_id = NULL (aucun compte élève). Si programme français au secondaire, compte élève créé.',
                'rejet_motive' => 'Tout rejet exige un motif (min 5 caractères) stocké dans motif_rejet pour consultation du candidat/parent.',
                'reinscription_sans_doublon' => 'La réinscription met à jour classe_id sur la fiche existante. Aucun doublon créé.',
            ],
            'endpoints' => [

                // ─────────────────────────────────────────
                // SANTE & DOCS
                // ─────────────────────────────────────────
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
                    'description' => 'Ce document — catalogue complet des endpoints avec formats de requête et réponse.',
                ],

                // ─────────────────────────────────────────
                // CANDIDATURES
                // ─────────────────────────────────────────
                [
                    'id' => 'candidatures.index',
                    'methode' => 'GET',
                    'route' => '/v1/candidatures',
                    'auth_requise' => true,
                    'roles_autorises' => ['administrateur', 'super_admin', 'personnel'],
                    'description' => 'Liste toutes les candidatures du tenant avec filtres. Inclut le nombre de pièces justificatives et de tests associés.',
                    'parametres_requete' => [
                        ['nom' => 'statut', 'type' => 'string', 'obligatoire' => false, 'valeurs' => ['soumise', 'en_attente', 'validee', 'rejetee'], 'exemple' => 'soumise'],
                        ['nom' => 'classe_visee_id', 'type' => 'integer', 'obligatoire' => false, 'exemple' => 1],
                        ['nom' => 'recherche', 'type' => 'string', 'obligatoire' => false, 'exemple' => 'Koffi', 'description' => 'Recherche sur nom, prénom, email ou téléphone (ILIKE)'],
                    ],
                    'corps_requete' => null,
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
                                'date_soumission' => '2026-09-01T08:30:00+01:00',
                                'nb_pieces' => 3,
                                'nb_tests' => 0,
                            ],
                        ],
                        'horodatage' => '2026-09-25T10:00:00+01:00',
                    ],
                    'codes_erreur' => [
                        ['code' => 'NON_AUTHENTIFIE', 'http' => 401, 'description' => 'Jeton JWT absent ou invalide'],
                    ],
                ],

                [
                    'id' => 'candidatures.store',
                    'methode' => 'POST',
                    'route' => '/v1/candidatures',
                    'auth_requise' => false,
                    'description' => 'Soumet un nouveau dossier de candidature. Peut être appelé sans JWT si le header X-Tenant-Id est présent (soumission publique en ligne par un parent). Le statut initial est toujours "soumise".',
                    'headers_optionnels' => [
                        'X-Tenant-Id' => 'Obligatoire si pas de JWT. Identifiant de l\'établissement visé.',
                    ],
                    'parametres_requete' => [],
                    'corps_requete' => [
                        'nom' => ['type' => 'string', 'max' => 100, 'obligatoire' => true, 'exemple' => 'Koffi'],
                        'prenom' => ['type' => 'string', 'max' => 100, 'obligatoire' => true, 'exemple' => 'Jean-Luc'],
                        'date_naissance' => ['type' => 'date (Y-m-d)', 'obligatoire' => true, 'exemple' => '2012-05-14'],
                        'sexe' => ['type' => 'string|null', 'obligatoire' => false, 'valeurs' => ['M', 'F']],
                        'email' => ['type' => 'email|null', 'max' => 150, 'obligatoire' => false, 'exemple' => 'candidat@mail.com'],
                        'telephone' => ['type' => 'string|null', 'max' => 50, 'obligatoire' => false, 'exemple' => '+22997000001'],
                        'adresse' => ['type' => 'string|null', 'max' => 255, 'obligatoire' => false],
                        'classe_visee_id' => ['type' => 'integer', 'obligatoire' => true, 'exemple' => 1, 'note' => 'ID interne de scolarite.classes'],
                        'parent_nom' => ['type' => 'string|null', 'max' => 100, 'obligatoire' => false, 'exemple' => 'Koffi'],
                        'parent_prenom' => ['type' => 'string|null', 'max' => 100, 'obligatoire' => false, 'exemple' => 'Marc'],
                        'parent_telephone' => ['type' => 'string|null', 'max' => 50, 'obligatoire' => false, 'exemple' => '+22997000002'],
                        'parent_email' => ['type' => 'email|null', 'max' => 150, 'obligatoire' => false],
                        'parent_lien' => ['type' => 'string|null', 'max' => 50, 'obligatoire' => false, 'valeurs' => ['pere', 'mere', 'tuteur', 'parent'], 'exemple' => 'pere'],
                    ],
                    'reponse_succes' => [
                        'http' => 201,
                        'succes' => true,
                        'message' => 'Candidature soumise avec succes',
                        'donnees' => [
                            'uuid' => 'f7a8b9c0-d1e2-3456-fghi-j78901234567',
                            'statut' => 'soumise',
                            'date_soumission' => '2026-09-25T10:00:00+01:00',
                        ],
                    ],
                    'codes_erreur' => [
                        ['code' => 'DONNEES_INVALIDES', 'http' => 422, 'description' => 'Champs obligatoires manquants ou format incorrect'],
                        ['code' => 'ERREUR_SOUMISSION_CANDIDATURE', 'http' => 400, 'description' => 'Erreur métier lors de la soumission'],
                    ],
                ],

                [
                    'id' => 'candidatures.show',
                    'methode' => 'GET',
                    'route' => '/v1/candidatures/{uuid}',
                    'auth_requise' => true,
                    'roles_autorises' => ['administrateur', 'super_admin', 'personnel', 'parent'],
                    'description' => 'Détail complet d\'une candidature : informations du candidat, coordonnées du parent, liste des pièces justificatives avec leur statut de validation, et résultats des tests d\'admission.',
                    'parametres_requete' => [
                        ['nom' => 'uuid', 'type' => 'uuid', 'in' => 'chemin', 'obligatoire' => true],
                    ],
                    'corps_requete' => null,
                    'reponse_succes' => [
                        'succes' => true,
                        'message' => 'Detail de la candidature',
                        'donnees' => [
                            'uuid' => 'f7a8b9c0-...',
                            'nom' => 'Koffi',
                            'prenom' => 'Jean-Luc',
                            'date_naissance' => '2012-05-14',
                            'sexe' => 'M',
                            'email' => null,
                            'telephone' => '+22997000001',
                            'adresse' => null,
                            'statut' => 'soumise',
                            'classe_visee_id' => 1,
                            'date_soumission' => '2026-09-25T10:00:00+01:00',
                            'motif_rejet' => null,
                            'parent' => [
                                'nom' => 'Koffi',
                                'prenom' => 'Marc',
                                'telephone' => '+22997000002',
                                'email' => 'parent.koffi@mail.com',
                                'lien' => 'pere',
                            ],
                            'pieces_justificatives' => [
                                [
                                    'uuid' => 'g8h9i0j1-...',
                                    'type' => 'acte_naissance',
                                    'nom_original' => 'acte_naissance_koffi.pdf',
                                    'chemin_stockage' => 's3://sigapei-documents/inscription/tenant-1/candidature-uuid/acte_naissance.pdf',
                                    'statut_validation' => 'conforme',
                                ],
                            ],
                            'tests_admission' => [
                                [
                                    'uuid' => 'h9i0j1k2-...',
                                    'type_test' => 'test_ecrit',
                                    'matiere' => 'Mathématiques',
                                    'note' => 14.5,
                                    'note_max' => 20.0,
                                    'resultat' => 'admis',
                                ],
                            ],
                        ],
                    ],
                    'codes_erreur' => [
                        ['code' => 'CANDIDATURE_INTROUVABLE', 'http' => 404, 'description' => 'UUID de candidature inexistant pour ce tenant'],
                    ],
                ],

                [
                    'id' => 'candidatures.valider',
                    'methode' => 'POST',
                    'route' => '/v1/candidatures/{uuid}/valider',
                    'auth_requise' => true,
                    'roles_autorises' => ['administrateur', 'super_admin', 'personnel'],
                    'description' => 'Valide définitivement une candidature. Opération atomique (transaction DB) : (1) vérifie l\'activation du module inscription pour l\'établissement, (2) vérifie la disponibilité en temps réel dans scolarite.classes, (3) crée l\'apprenant dans scolarite.apprenants selon la règle programme pédagogique, (4) passe le statut à "validee". Irréversible une fois validée.',
                    'parametres_requete' => [
                        ['nom' => 'uuid', 'type' => 'uuid', 'in' => 'chemin', 'obligatoire' => true],
                    ],
                    'corps_requete' => null,
                    'reponse_succes' => [
                        'succes' => true,
                        'message' => 'Candidature validee avec succes',
                        'donnees' => [
                            'candidature_uuid' => 'f7a8b9c0-...',
                            'statut' => 'validee',
                            'apprenant' => [
                                'uuid' => 'b2c3d4e5-...',
                                'classe' => '6ème A',
                                'programme' => 'beninois',
                                'compte_utilisateur_cree' => false,
                            ],
                            'message' => 'Candidature validee avec succes et apprenant genere dans la scolarite.',
                        ],
                    ],
                    'codes_erreur' => [
                        ['code' => 'ERREUR_VALIDATION_CANDIDATURE', 'http' => 400, 'description' => 'Classe complète, module inactif, déjà validée, ou précédemment rejetée'],
                        ['code' => 'CANDIDATURE_INTROUVABLE', 'http' => 404, 'description' => 'UUID de candidature inexistant'],
                    ],
                ],

                [
                    'id' => 'candidatures.rejeter',
                    'methode' => 'POST',
                    'route' => '/v1/candidatures/{uuid}/rejeter',
                    'auth_requise' => true,
                    'roles_autorises' => ['administrateur', 'super_admin', 'personnel'],
                    'description' => 'Rejette une candidature. Le motif est obligatoire (min 5 caractères) et conservé pour que le parent/candidat puisse consulter la raison du refus. Impossible de rejeter une candidature déjà validée.',
                    'parametres_requete' => [
                        ['nom' => 'uuid', 'type' => 'uuid', 'in' => 'chemin', 'obligatoire' => true],
                    ],
                    'corps_requete' => [
                        'motif' => ['type' => 'string', 'min' => 5, 'max' => 500, 'obligatoire' => true, 'exemple' => 'Dossier incomplet : acte de naissance manquant.'],
                    ],
                    'reponse_succes' => [
                        'succes' => true,
                        'message' => 'Candidature rejetee',
                        'donnees' => [
                            'candidature_uuid' => 'f7a8b9c0-...',
                            'statut' => 'rejetee',
                            'motif_rejet' => 'Dossier incomplet : acte de naissance manquant.',
                            'message' => 'Candidature rejetee avec motif enregistre.',
                        ],
                    ],
                    'codes_erreur' => [
                        ['code' => 'ERREUR_REJET_CANDIDATURE', 'http' => 400, 'description' => 'Candidature déjà validée ou introuvable'],
                        ['code' => 'DONNEES_INVALIDES', 'http' => 422, 'description' => 'Motif manquant ou trop court (< 5 caractères)'],
                    ],
                ],

                // ─────────────────────────────────────────
                // PIECES JUSTIFICATIVES
                // ─────────────────────────────────────────
                [
                    'id' => 'pieces.store',
                    'methode' => 'POST',
                    'route' => '/v1/candidatures/{uuid}/pieces-justificatives',
                    'auth_requise' => true,
                    'roles_autorises' => ['administrateur', 'super_admin', 'personnel', 'parent'],
                    'description' => 'Ajoute une pièce justificative à une candidature. Le fichier est d\'abord uploadé vers le stockage objet (S3/MinIO) côté client, et seule la référence (chemin_stockage) est transmise à cette API. Le statut initial est "en_attente".',
                    'parametres_requete' => [
                        ['nom' => 'uuid', 'type' => 'uuid', 'in' => 'chemin', 'obligatoire' => true, 'description' => 'UUID de la candidature parente'],
                    ],
                    'corps_requete' => [
                        'type' => ['type' => 'string', 'obligatoire' => true, 'valeurs' => ['bulletin', 'acte_naissance', 'certificat_nationalite', 'photo', 'autre']],
                        'nom_original' => ['type' => 'string', 'max' => 255, 'obligatoire' => true, 'exemple' => 'acte_naissance_koffi.pdf'],
                        'chemin_stockage' => ['type' => 'string', 'max' => 500, 'obligatoire' => true, 'exemple' => 's3://sigapei-documents/inscription/...'],
                        'taille_octets' => ['type' => 'integer|null', 'obligatoire' => false, 'exemple' => 204800],
                        'mime_type' => ['type' => 'string|null', 'max' => 100, 'obligatoire' => false, 'exemple' => 'application/pdf'],
                    ],
                    'reponse_succes' => [
                        'http' => 201,
                        'succes' => true,
                        'message' => 'Piece justificative enregistree avec succes',
                        'donnees' => [
                            'uuid' => 'g8h9i0j1-...',
                            'type' => 'acte_naissance',
                            'nom_original' => 'acte_naissance_koffi.pdf',
                            'chemin_stockage' => 's3://sigapei-documents/...',
                            'statut_validation' => 'en_attente',
                        ],
                    ],
                    'codes_erreur' => [
                        ['code' => 'ERREUR_AJOUT_PIECE', 'http' => 400, 'description' => 'Candidature introuvable'],
                        ['code' => 'DONNEES_INVALIDES', 'http' => 422, 'description' => 'Type de pièce non autorisé ou champs manquants'],
                    ],
                ],

                // ─────────────────────────────────────────
                // TESTS D'ADMISSION
                // ─────────────────────────────────────────
                [
                    'id' => 'tests.store',
                    'methode' => 'POST',
                    'route' => '/v1/candidatures/{uuid}/tests-admission',
                    'auth_requise' => true,
                    'roles_autorises' => ['administrateur', 'super_admin', 'personnel', 'enseignant'],
                    'description' => 'Enregistre le résultat d\'un test d\'admission (écrit, entretien, dossier) pour une candidature. Plusieurs tests peuvent être attachés à la même candidature (ex: maths + français + entretien).',
                    'parametres_requete' => [
                        ['nom' => 'uuid', 'type' => 'uuid', 'in' => 'chemin', 'obligatoire' => true, 'description' => 'UUID de la candidature'],
                    ],
                    'corps_requete' => [
                        'type_test' => ['type' => 'string', 'max' => 50, 'obligatoire' => true, 'exemple' => 'test_ecrit'],
                        'matiere' => ['type' => 'string|null', 'max' => 100, 'obligatoire' => false, 'exemple' => 'Mathématiques'],
                        'note' => ['type' => 'numeric|null', 'min' => 0, 'obligatoire' => false, 'exemple' => 14.5],
                        'note_max' => ['type' => 'numeric|null', 'min' => 1, 'obligatoire' => false, 'defaut' => 20.0],
                        'resultat' => ['type' => 'string', 'obligatoire' => true, 'valeurs' => ['admis', 'recale', 'en_attente']],
                        'observations' => ['type' => 'string|null', 'max' => 500, 'obligatoire' => false],
                        'evalue_par_id' => ['type' => 'integer|null', 'obligatoire' => false, 'description' => 'ID de l\'enseignant ou membre du jury'],
                        'date_test' => ['type' => 'date (Y-m-d)|null', 'obligatoire' => false],
                    ],
                    'reponse_succes' => [
                        'http' => 201,
                        'succes' => true,
                        'message' => 'Resultat du test d\'admission enregistre',
                        'donnees' => [
                            'uuid' => 'h9i0j1k2-...',
                            'type_test' => 'test_ecrit',
                            'matiere' => 'Mathématiques',
                            'note' => 14.5,
                            'note_max' => 20.0,
                            'resultat' => 'admis',
                        ],
                    ],
                    'codes_erreur' => [
                        ['code' => 'ERREUR_ENREGISTREMENT_TEST', 'http' => 400, 'description' => 'Candidature introuvable'],
                        ['code' => 'DONNEES_INVALIDES', 'http' => 422, 'description' => 'Résultat invalide ou note hors bornes'],
                    ],
                ],

                // ─────────────────────────────────────────
                // REINSCRIPTIONS
                // ─────────────────────────────────────────
                [
                    'id' => 'reinscriptions.store',
                    'methode' => 'POST',
                    'route' => '/v1/reinscriptions',
                    'auth_requise' => true,
                    'roles_autorises' => ['administrateur', 'super_admin', 'personnel'],
                    'description' => 'Reconduit un apprenant existant sur la nouvelle année scolaire. Met à jour classe_id sur la fiche existante dans scolarite.apprenants et enregistre l\'historique dans scolarite.historique_classes. Aucune duplication de dossier. Vérification bloquante de la capacité de la nouvelle classe.',
                    'parametres_requete' => [],
                    'corps_requete' => [
                        'apprenant_id' => ['type' => 'integer', 'obligatoire' => true, 'exemple' => 42, 'description' => 'ID interne de scolarite.apprenants'],
                        'nouvelle_classe_id' => ['type' => 'integer', 'obligatoire' => true, 'exemple' => 5, 'description' => 'ID interne de scolarite.classes'],
                        'annee_scolaire' => ['type' => 'string', 'max' => 20, 'obligatoire' => true, 'exemple' => '2026-2027'],
                    ],
                    'reponse_succes' => [
                        'http' => 201,
                        'succes' => true,
                        'message' => 'Reinscription validee',
                        'donnees' => [
                            'uuid' => 'k2l3m4n5-...',
                            'apprenant_id' => 42,
                            'apprenant_nom' => 'Koffi Jean-Luc',
                            'nouvelle_classe' => '5ème A',
                            'annee_scolaire' => '2026-2027',
                            'statut' => 'validee',
                            'message' => 'Dossier apprenant reconduit avec succes sur la nouvelle annee scolaire.',
                        ],
                    ],
                    'codes_erreur' => [
                        ['code' => 'ERREUR_REINSCRIPTION', 'http' => 400, 'description' => 'Apprenant introuvable, classe de destination complète, ou données invalides'],
                    ],
                ],
            ],
        ]);
    }
}
