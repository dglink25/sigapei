<?php

namespace App\docs;

use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;

class DocsController extends Controller
{
    /**
     * Retourne le catalogue complet des endpoints de l'API avec
     * le format exact de chaque requête et chaque réponse.
     * Route publique (pas de JWT requis).
     */
    public function catalogue(): JsonResponse
    {
        return response()->json([
            'service' => 'api-scolarite',
            'version' => '1.0.0',
            'description' => 'Microservice de gestion scolaire (cycles, classes, apprenants, emplois du temps, paiements) — SIGAPEI',
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

                // ─────────────────────────────────────────
                // SANTE
                // ─────────────────────────────────────────
                [
                    'id' => 'sante',
                    'methode' => 'GET',
                    'route' => '/sante',
                    'auth_requise' => false,
                    'description' => 'Sonde de santé du microservice. Utilisée par Docker, load-balancers et la Gateway pour vérifier la disponibilité.',
                    'parametres_requete' => [],
                    'corps_requete' => null,
                    'reponse_succes' => [
                        'statut' => 'ok',
                        'service' => 'api-scolarite',
                        'horodatage' => '2026-09-25T10:00:00+01:00',
                    ],
                    'codes_erreur' => [],
                ],

                // ─────────────────────────────────────────
                // DOCUMENTATION
                // ─────────────────────────────────────────
                [
                    'id' => 'docs',
                    'methode' => 'GET',
                    'route' => '/docs',
                    'auth_requise' => false,
                    'description' => 'Catalogue complet des endpoints avec formats de requête et de réponse. Ce que vous lisez en ce moment.',
                    'parametres_requete' => [],
                    'corps_requete' => null,
                    'reponse_succes' => ['... le présent document ...'],
                    'codes_erreur' => [],
                ],

                // ─────────────────────────────────────────
                // CLASSES
                // ─────────────────────────────────────────
                [
                    'id' => 'classes.index',
                    'methode' => 'GET',
                    'route' => '/v1/classes',
                    'auth_requise' => true,
                    'roles_autorises' => ['administrateur', 'super_admin', 'personnel', 'enseignant'],
                    'description' => 'Liste toutes les classes actives du tenant. Retourne la capacité en temps réel et le programme pédagogique.',
                    'parametres_requete' => [
                        ['nom' => 'cycle', 'type' => 'string', 'obligatoire' => false, 'valeurs' => ['primaire', 'secondaire', 'universitaire'], 'exemple' => 'secondaire'],
                        ['nom' => 'programme', 'type' => 'string', 'obligatoire' => false, 'valeurs' => ['beninois', 'francais'], 'exemple' => 'beninois'],
                        ['nom' => 'statut', 'type' => 'string', 'obligatoire' => false, 'valeurs' => ['actif', 'archive'], 'exemple' => 'actif'],
                    ],
                    'corps_requete' => null,
                    'reponse_succes' => [
                        'succes' => true,
                        'message' => 'Liste des classes recuperee avec succes',
                        'donnees' => [
                            [
                                'uuid' => 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                                'nom' => '6ème A',
                                'cycle' => 'secondaire',
                                'niveau' => '6e',
                                'filiere' => null,
                                'programme' => 'beninois',
                                'capacite' => 45,
                                'inscrits_count' => 38,
                                'places_disponibles' => 7,
                                'est_complete' => false,
                                'statut' => 'actif',
                            ],
                        ],
                        'horodatage' => '2026-09-25T10:00:00+01:00',
                    ],
                    'codes_erreur' => [
                        ['code' => 'NON_AUTHENTIFIE', 'http' => 401, 'description' => 'Jeton JWT absent ou invalide'],
                        ['code' => 'TENANT_MANQUANT', 'http' => 403, 'description' => 'Le jeton ne contient pas de tenant_id'],
                    ],
                ],

                [
                    'id' => 'classes.store',
                    'methode' => 'POST',
                    'route' => '/v1/classes',
                    'auth_requise' => true,
                    'roles_autorises' => ['administrateur', 'super_admin'],
                    'description' => 'Crée une nouvelle classe, un niveau ou une filière. Le champ programme définit si les élèves auront un compte de connexion propre (règle béninois/français).',
                    'parametres_requete' => [],
                    'corps_requete' => [
                        'nom' => ['type' => 'string', 'max' => 100, 'obligatoire' => true, 'exemple' => '6ème A'],
                        'cycle' => ['type' => 'string', 'obligatoire' => true, 'valeurs' => ['primaire', 'secondaire', 'universitaire'], 'exemple' => 'secondaire'],
                        'niveau' => ['type' => 'string', 'max' => 50, 'obligatoire' => true, 'exemple' => '6e'],
                        'filiere' => ['type' => 'string|null', 'max' => 100, 'obligatoire' => false, 'exemple' => 'Scientifique'],
                        'programme' => ['type' => 'string', 'obligatoire' => true, 'valeurs' => ['beninois', 'francais'], 'exemple' => 'beninois'],
                        'capacite' => ['type' => 'integer', 'min' => 1, 'max' => 200, 'obligatoire' => true, 'exemple' => 45],
                    ],
                    'reponse_succes' => [
                        'http' => 201,
                        'succes' => true,
                        'message' => 'Classe creee avec succes',
                        'donnees' => [
                            'uuid' => 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                            'nom' => '6ème A',
                            'cycle' => 'secondaire',
                            'niveau' => '6e',
                            'filiere' => null,
                            'programme' => 'beninois',
                            'capacite' => 45,
                            'statut' => 'actif',
                        ],
                    ],
                    'codes_erreur' => [
                        ['code' => 'DONNEES_INVALIDES', 'http' => 422, 'description' => 'Champs obligatoires manquants ou valeurs non autorisées'],
                        ['code' => 'ERREUR_CREATION_CLASSE', 'http' => 400, 'description' => 'Erreur métier (ex: programme invalide)'],
                    ],
                ],

                [
                    'id' => 'classes.disponibilite',
                    'methode' => 'GET',
                    'route' => '/v1/classes/{uuid}/disponibilite',
                    'auth_requise' => true,
                    'description' => 'Retourne la capacité restante en temps réel pour une classe. Consommé par api-inscription avant toute validation de candidature (vérification bloquante).',
                    'parametres_requete' => [
                        ['nom' => 'uuid', 'type' => 'uuid', 'in' => 'chemin', 'obligatoire' => true, 'exemple' => 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'],
                    ],
                    'corps_requete' => null,
                    'reponse_succes' => [
                        'succes' => true,
                        'message' => 'Disponibilite calculee',
                        'donnees' => [
                            'uuid' => 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                            'nom' => '6ème A',
                            'cycle' => 'secondaire',
                            'niveau' => '6e',
                            'programme' => 'beninois',
                            'capacite_totale' => 45,
                            'inscrits_actuels' => 38,
                            'places_disponibles' => 7,
                            'est_complete' => false,
                        ],
                    ],
                    'codes_erreur' => [
                        ['code' => 'CLASSE_INTROUVABLE', 'http' => 404, 'description' => 'UUID de classe inexistant pour ce tenant'],
                    ],
                ],

                // ─────────────────────────────────────────
                // APPRENANTS
                // ─────────────────────────────────────────
                [
                    'id' => 'apprenants.show',
                    'methode' => 'GET',
                    'route' => '/v1/apprenants/{uuid}',
                    'auth_requise' => true,
                    'roles_autorises' => ['administrateur', 'super_admin', 'personnel', 'enseignant', 'parent'],
                    'description' => 'Retourne le dossier complet d\'un apprenant : classe actuelle, historique de toutes ses mutations de classe, liste de ses parents rattachés, et indicateur de compte de connexion actif.',
                    'parametres_requete' => [
                        ['nom' => 'uuid', 'type' => 'uuid', 'in' => 'chemin', 'obligatoire' => true],
                    ],
                    'corps_requete' => null,
                    'reponse_succes' => [
                        'succes' => true,
                        'message' => 'Dossier apprenant recupere',
                        'donnees' => [
                            'uuid' => 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
                            'matricule' => 'MAT-AB12CD34',
                            'nom' => 'Koffi',
                            'prenom' => 'Jean-Luc',
                            'date_naissance' => '2012-05-14',
                            'sexe' => 'M',
                            'statut' => 'actif',
                            'classe' => [
                                'uuid' => 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                                'nom' => '6ème A',
                                'cycle' => 'secondaire',
                                'niveau' => '6e',
                                'programme' => 'beninois',
                            ],
                            'compte_utilisateur_actif' => false,
                            'historique_classes' => [
                                [
                                    'uuid' => 'c3d4e5f6-...',
                                    'ancienne_classe' => 'CM2 A',
                                    'nouvelle_classe' => '6ème A',
                                    'date_transfert' => '2026-09-01T00:00:00+01:00',
                                    'motif' => 'Passage en classe supérieure',
                                ],
                            ],
                            'parents' => [
                                [
                                    'parent_id' => 12,
                                    'lien_parente' => 'pere',
                                    'est_responsable_legal' => true,
                                    'est_contact_urgence' => true,
                                ],
                            ],
                        ],
                    ],
                    'codes_erreur' => [
                        ['code' => 'DOSSIER_INTROUVABLE', 'http' => 404, 'description' => 'Aucun apprenant avec cet UUID pour ce tenant'],
                    ],
                ],

                [
                    'id' => 'apprenants.transfert',
                    'methode' => 'POST',
                    'route' => '/v1/apprenants/{uuid}/transfert',
                    'auth_requise' => true,
                    'roles_autorises' => ['administrateur', 'super_admin', 'personnel'],
                    'description' => 'Effectue un transfert ou une mutation interne de l\'apprenant vers une autre classe. La fiche apprenant n\'est jamais dupliquée : seul classe_id est mis à jour, et la mutation est journalisée dans historique_classes. Vérification bloquante si la classe de destination est complète. Détecte automatiquement un changement de programme pédagogique (béninois→français) et signale si un compte élève doit être créé.',
                    'parametres_requete' => [
                        ['nom' => 'uuid', 'type' => 'uuid', 'in' => 'chemin', 'obligatoire' => true, 'description' => 'UUID de l\'apprenant'],
                    ],
                    'corps_requete' => [
                        'nouvelle_classe_uuid' => ['type' => 'uuid', 'obligatoire' => true, 'exemple' => 'd4e5f6a7-...'],
                        'motif' => ['type' => 'string|null', 'max' => 255, 'obligatoire' => false, 'exemple' => 'Transfert à la demande des parents'],
                    ],
                    'reponse_succes' => [
                        'succes' => true,
                        'message' => 'Transfert effectue avec succes',
                        'donnees' => [
                            'apprenant_uuid' => 'b2c3d4e5-...',
                            'nom' => 'Koffi',
                            'prenom' => 'Jean-Luc',
                            'ancienne_classe' => ['uuid' => '...', 'nom' => '6ème A', 'programme' => 'beninois'],
                            'nouvelle_classe' => ['uuid' => '...', 'nom' => '6ème B', 'programme' => 'francais'],
                            'date_transfert' => '2026-09-25T10:00:00+01:00',
                            'changement_programme' => true,
                            'compte_apprenant_a_creer' => true,
                            'message' => 'Transfert effectue avec succes sans duplication du dossier.',
                        ],
                    ],
                    'codes_erreur' => [
                        ['code' => 'ERREUR_TRANSFERT', 'http' => 400, 'description' => 'Classe de destination inexistante, déjà inscrit dans cette classe, ou classe complète'],
                    ],
                ],

                [
                    'id' => 'apprenants.paiements',
                    'methode' => 'GET',
                    'route' => '/v1/apprenants/{uuid}/paiements-scolarite',
                    'auth_requise' => true,
                    'roles_autorises' => ['administrateur', 'super_admin', 'personnel', 'parent', 'apprenant'],
                    'description' => 'Retourne la vue consolidée des paiements de scolarité par jointure directe en LECTURE SEULE sur finances.factures et finances.transactions. Aucune écriture financière n\'est effectuée côté Scolarité.',
                    'parametres_requete' => [
                        ['nom' => 'uuid', 'type' => 'uuid', 'in' => 'chemin', 'obligatoire' => true],
                    ],
                    'corps_requete' => null,
                    'reponse_succes' => [
                        'succes' => true,
                        'message' => 'Situation des paiements de scolarite recuperee',
                        'donnees' => [
                            'apprenant' => [
                                'uuid' => 'b2c3d4e5-...',
                                'nom' => 'Koffi',
                                'prenom' => 'Jean-Luc',
                                'classe' => '6ème A',
                            ],
                            'situation_financiere' => [
                                'total_du' => 150000.0,
                                'total_regle' => 75000.0,
                                'solde_restant' => 75000.0,
                                'statut_global' => 'EN_RETARD',
                                'nombre_factures' => 3,
                                'factures' => [
                                    ['id' => 1, 'montant' => 50000.0, 'echeance' => '2026-10-01', 'statut' => 'en_attente'],
                                ],
                            ],
                        ],
                    ],
                    'codes_erreur' => [
                        ['code' => 'ERREUR_LECTURE_PAIEMENTS', 'http' => 404, 'description' => 'Apprenant introuvable'],
                    ],
                ],

                // ─────────────────────────────────────────
                // EMPLOIS DU TEMPS
                // ─────────────────────────────────────────
                [
                    'id' => 'emplois.index',
                    'methode' => 'GET',
                    'route' => '/v1/emplois-du-temps',
                    'auth_requise' => true,
                    'roles_autorises' => ['administrateur', 'super_admin', 'personnel', 'enseignant', 'apprenant', 'parent'],
                    'description' => 'Liste les créneaux de cours avec filtres par classe, enseignant ou jour de la semaine.',
                    'parametres_requete' => [
                        ['nom' => 'classe_uuid', 'type' => 'uuid', 'obligatoire' => false, 'exemple' => 'a1b2c3d4-...'],
                        ['nom' => 'enseignant_id', 'type' => 'integer', 'obligatoire' => false, 'exemple' => 5],
                        ['nom' => 'jour', 'type' => 'string', 'obligatoire' => false, 'valeurs' => ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']],
                    ],
                    'corps_requete' => null,
                    'reponse_succes' => [
                        'succes' => true,
                        'message' => 'Emploi du temps recupere',
                        'donnees' => [
                            [
                                'uuid' => 'e5f6a7b8-...',
                                'classe' => ['uuid' => 'a1b2c3d4-...', 'nom' => '6ème A'],
                                'enseignant_id' => 5,
                                'matiere_id' => 3,
                                'creneau' => 'Lundi 08h-10h',
                                'jour' => 'lundi',
                                'heure_debut' => '08:00',
                                'heure_fin' => '10:00',
                                'salle' => 'Salle B2',
                                'statut' => 'actif',
                            ],
                        ],
                    ],
                    'codes_erreur' => [
                        ['code' => 'NON_AUTHENTIFIE', 'http' => 401, 'description' => 'Jeton manquant'],
                    ],
                ],

                [
                    'id' => 'emplois.store',
                    'methode' => 'POST',
                    'route' => '/v1/emplois-du-temps',
                    'auth_requise' => true,
                    'roles_autorises' => ['administrateur', 'super_admin', 'personnel'],
                    'description' => 'Crée ou met à jour un créneau de cours. Si un uuid existant est fourni, le créneau correspondant est modifié.',
                    'parametres_requete' => [],
                    'corps_requete' => [
                        'uuid' => ['type' => 'uuid|null', 'obligatoire' => false, 'description' => 'Si fourni, met à jour le créneau existant'],
                        'classe_uuid' => ['type' => 'uuid', 'obligatoire' => true],
                        'enseignant_id' => ['type' => 'integer', 'obligatoire' => true],
                        'matiere_id' => ['type' => 'integer', 'obligatoire' => true],
                        'creneau' => ['type' => 'string|null', 'max' => 50, 'obligatoire' => false, 'exemple' => 'Lundi 08h-10h'],
                        'jour' => ['type' => 'string', 'obligatoire' => true, 'valeurs' => ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']],
                        'heure_debut' => ['type' => 'string (H:i)', 'obligatoire' => true, 'exemple' => '08:00'],
                        'heure_fin' => ['type' => 'string (H:i)', 'obligatoire' => true, 'exemple' => '10:00', 'note' => 'Doit être postérieure à heure_debut'],
                        'salle' => ['type' => 'string|null', 'max' => 50, 'obligatoire' => false, 'exemple' => 'Salle B2'],
                    ],
                    'reponse_succes' => [
                        'http' => 201,
                        'succes' => true,
                        'message' => 'Creneau enregistre avec succes',
                        'donnees' => [
                            'uuid' => 'e5f6a7b8-...',
                            'jour' => 'lundi',
                            'heure_debut' => '08:00',
                            'heure_fin' => '10:00',
                            'salle' => 'Salle B2',
                        ],
                    ],
                    'codes_erreur' => [
                        ['code' => 'DONNEES_INVALIDES', 'http' => 422, 'description' => 'Champs manquants ou heure_fin antérieure à heure_debut'],
                        ['code' => 'ERREUR_ENREGISTREMENT_CRENEAU', 'http' => 400, 'description' => 'Classe inexistante'],
                    ],
                ],

                // ─────────────────────────────────────────
                // ENDPOINTS INTERNES (inter-microservices)
                // ─────────────────────────────────────────
                [
                    'id' => 'interne.apprenant.classe',
                    'methode' => 'GET',
                    'route' => '/v1/interne/apprenants/{uuid}/classe',
                    'auth_requise' => true,
                    'description' => 'Endpoint interne consommé par api-evaluations, api-finances et api-vie-scolaire pour récupérer les informations de classe d\'un apprenant sans appel HTTP inter-services. Protégé par X-Internal-Secret.',
                    'headers_internes' => [
                        'X-Internal-Secret' => 'secret partagé entre microservices (INTERNAL_API_SECRET)',
                        'X-Tenant-Id' => 'identifiant du tenant',
                    ],
                    'parametres_requete' => [
                        ['nom' => 'uuid', 'type' => 'uuid', 'in' => 'chemin', 'obligatoire' => true],
                    ],
                    'corps_requete' => null,
                    'reponse_succes' => [
                        'succes' => true,
                        'message' => 'Informations apprenant',
                        'donnees' => [
                            'uuid' => 'b2c3d4e5-...',
                            'nom' => 'Koffi',
                            'prenom' => 'Jean-Luc',
                            'statut' => 'actif',
                            'classe_nom' => '6ème A',
                            'cycle' => 'secondaire',
                            'programme' => 'beninois',
                        ],
                    ],
                    'codes_erreur' => [
                        ['code' => 'APPRENANT_INTROUVABLE', 'http' => 404, 'description' => 'UUID inexistant'],
                        ['code' => 'JETON_INVALIDE', 'http' => 401, 'description' => 'Secret interne invalide'],
                    ],
                ],
            ],
        ]);
    }
}
