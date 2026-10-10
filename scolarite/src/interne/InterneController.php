<?php

namespace App\interne;

use App\apprenants\Apprenant;
use App\apprenants\HistoriqueClasse;
use App\apprenants\TransfertService;
use App\classes\Classe;
use App\emplois_du_temps\EmploiDuTemps;
use App\common\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

/**
 * API interne de Scolarité, consommée par les autres microservices.
 *
 * Règle n°1 : Scolarité est le seul propriétaire du schéma `scolarite`.
 * inscription, vie-scolaire et les autres services lisent ces données par
 * ces endpoints, protégés par le secret interne `X-Internal-Secret`
 * (Règle n°3), et jamais par jointure SQL inter-schémas.
 *
 * Règle n°5 : ces routes ne vérifient aucun JWT. L'authentification de
 * l'appelant est assurée par le secret interne, appliqué par le middleware
 * VerifyTenantAndJwt.
 *
 * Contrat consommé par vie-scolaire/app/Integrations/ScolariteClient.php :
 *   GET  /v1/interne/apprenants           (uuid, id, classe_uuid, statut)
 *   GET  /v1/interne/emplois-du-temps     (uuid, id, classe_uuid, enseignant_id)
 *   GET  /v1/interne/classes/disponibilite(uuid, id)
 *   POST /v1/interne/apprenants           (création depuis une admission)
 *   POST /v1/interne/apprenants/transfert (mutation de classe)
 */
class InterneController extends Controller
{
    public function __construct(
        protected TransfertService $transfertService
    ) {}

    /**
     * GET /v1/interne/apprenants
     * Liste des apprenants, filtrable. Si `uuid` ou `id` est fourni,
     * retourne le dossier correspondant (null si absent).
     */
    public function apprenants(Request $request): JsonResponse
    {
        try {
            $query = Apprenant::query()
                ->with(['classe', 'parents'])
                ->withCount('historiqueClasses');

            // Recherche unitaire
            if ($uuid = $request->query('uuid')) {
                $apprenant = $query->where('uuid', $uuid)->first();
                return ApiResponse::succes(
                    $apprenant ? $this->serialiser($apprenant) : null,
                    'Apprenant recupere'
                );
            }

            if ($id = $request->query('id')) {
                $apprenant = $query->where('id', (int) $id)->first();
                return ApiResponse::succes(
                    $apprenant ? $this->serialiser($apprenant) : null,
                    'Apprenant recupere'
                );
            }

            // Recherche multiple
            if ($uuids = $request->query('uuids')) {
                $liste = is_array($uuids) ? $uuids : explode(',', (string) $uuids);
                $apprenants = $query->whereIn('uuid', array_map('trim', $liste))->get();
                return ApiResponse::succes(
                    $apprenants->map(fn($a) => $this->serialiser($a))->all(),
                    'Apprenants recuperes'
                );
            }

            if ($ids = $request->query('ids')) {
                $liste = is_array($ids) ? $ids : explode(',', (string) $ids);
                $apprenants = $query->whereIn('id', array_map('intval', $liste))->get();
                return ApiResponse::succes(
                    $apprenants->map(fn($a) => $this->serialiser($a))->all(),
                    'Apprenants recuperes'
                );
            }

            // Filtres simples
            if ($classeUuid = $request->query('classe_uuid')) {
                $query->whereHas('classe', fn($q) => $q->where('uuid', $classeUuid));
            }
            if ($statut = $request->query('statut')) {
                $query->where('statut', $statut);
            }

            $apprenants = $query->orderBy('nom')->orderBy('prenom')->limit(500)->get();

            return ApiResponse::succes(
                $apprenants->map(fn($a) => $this->serialiser($a))->all(),
                'Apprenants recuperes'
            );
        } catch (\Throwable $e) {
            return ApiResponse::erreur($e->getMessage(), 'ERREUR_INTERNE_APPRENANTS', 500);
        }
    }

    /**
     * POST /v1/interne/apprenants
     * Création d'un apprenant depuis le microservice Inscription.
     * Applique la règle du programme pédagogique (propriété de Scolarité).
     */
    public function creerApprenant(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'classe_uuid'          => 'required|uuid',
            'candidature_uuid'     => 'nullable|string|max:64',
            'parent_identite_uuid' => 'nullable|string|max:64',
            'nom'                  => 'required|string|max:100',
            'prenom'               => 'required|string|max:100',
            'date_naissance'       => 'required|date',
            'sexe'                 => 'nullable|string|max:10',
            'parent_lien'          => 'nullable|string|max:50',
        ]);

        try {
            $classe = Classe::where('uuid', $validated['classe_uuid'])->first();

            if (!$classe) {
                return ApiResponse::erreur(
                    'Classe de destination introuvable.',
                    'CLASSE_INTROUVABLE',
                    404
                );
            }

            // Contrôle bloquant de capacité, refait côté propriétaire
            $inscrits = $classe->apprenants()->where('statut', 'actif')->count();
            if ($inscrits >= $classe->capacite) {
                return ApiResponse::erreur(
                    "La classe '{$classe->nom}' a atteint sa capacité maximale ({$classe->capacite} places).",
                    'ERREUR_VALIDATION_CANDIDATURE',
                    409
                );
            }

            // --- Règle pédagogique : appliquée ici, seul le propriétaire ---
            //   Programme béninois  → aucun compte élève, quel que soit le cycle
            //   Programme français + secondaire → compte si fourni
            //   Cycle universitaire → compte si fourni
            $utilisateurIdentiteUuid = null;
            if ($classe->programme === 'francais' && $classe->cycle === 'secondaire') {
                $utilisateurIdentiteUuid = $validated['parent_identite_uuid'] ?? null;
            } elseif ($classe->cycle === 'universitaire') {
                $utilisateurIdentiteUuid = $validated['parent_identite_uuid'] ?? null;
            }

            $apprenant = Apprenant::create([
                'tenant_id'      => $classe->tenant_id,
                'classe_id'      => $classe->id,
                'utilisateur_id' => null,
                'candidature_id' => null,
                'matricule'      => 'MAT-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 8)),
                'nom'            => $validated['nom'],
                'prenom'         => $validated['prenom'],
                'date_naissance' => $validated['date_naissance'],
                'sexe'           => $validated['sexe'] ?? null,
                'statut'         => 'actif',
            ]);

            return ApiResponse::succes([
                'uuid'                    => $apprenant->uuid,
                'id'                      => $apprenant->id,
                'classe_nom'              => $classe->nom,
                'programme'               => $classe->programme,
                'cycle'                   => $classe->cycle,
                'compte_utilisateur_cree' => $utilisateurIdentiteUuid !== null,
            ], 'Apprenant cree');

        } catch (\Throwable $e) {
            return ApiResponse::erreur($e->getMessage(), 'ERREUR_CREATION_APPRENANT', 500);
        }
    }

    /**
     * POST /v1/interne/apprenants/transfert
     * Mutation de classe demandée par un autre microservice.
     */
    public function transfertInterne(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'apprenant_uuid'       => 'required|uuid',
            'nouvelle_classe_uuid' => 'required|uuid',
            'motif'                => 'nullable|string|max:255',
        ]);

        try {
            $resultat = $this->transfertService->executerTransfert(
                $validated['apprenant_uuid'],
                $validated['nouvelle_classe_uuid'],
                $validated['motif'] ?? null,
                null
            );

            return ApiResponse::succes($resultat, 'Transfert effectue');
        } catch (\Throwable $e) {
            return ApiResponse::erreur($e->getMessage(), 'ERREUR_TRANSFERT', 400);
        }
    }

    /**
     * GET /v1/interne/emplois-du-temps
     */
    public function emploisDuTemps(Request $request): JsonResponse
    {
        try {
            $query = EmploiDuTemps::query()->with('classe');

            if ($uuid = $request->query('uuid')) {
                $cours = $query->where('uuid', $uuid)->first();
                return ApiResponse::succes(
                    $cours ? $this->serialiserCours($cours) : null,
                    'Cours recupere'
                );
            }

            if ($id = $request->query('id')) {
                $cours = $query->where('id', (int) $id)->first();
                return ApiResponse::succes(
                    $cours ? $this->serialiserCours($cours) : null,
                    'Cours recupere'
                );
            }

            if ($classeUuid = $request->query('classe_uuid')) {
                $query->whereHas('classe', fn($q) => $q->where('uuid', $classeUuid));
            }
            if ($enseignantId = $request->query('enseignant_id')) {
                $query->where('enseignant_id', (int) $enseignantId);
            }
            if ($jour = $request->query('jour')) {
                $query->where('jour', $jour);
            }

            $cours = $query->orderBy('jour')->orderBy('heure_debut')->limit(1000)->get();

            return ApiResponse::succes(
                $cours->map(fn($c) => $this->serialiserCours($c))->all(),
                'Emplois du temps recuperes'
            );
        } catch (\Throwable $e) {
            return ApiResponse::erreur($e->getMessage(), 'ERREUR_INTERNE_EDT', 500);
        }
    }

    /**
     * GET /v1/interne/classes/disponibilite
     * Capacité en temps réel, consommée par Inscription lors de l'admission.
     */
    public function disponibilite(Request $request): JsonResponse
    {
        try {
            $query = Classe::query();

            if ($uuid = $request->query('uuid')) {
                $query->where('uuid', $uuid);
            } elseif ($id = $request->query('id')) {
                $query->where('id', (int) $id);
            } else {
                return ApiResponse::erreur(
                    'uuid ou id de classe requis.',
                    'PARAMETRE_MANQUANT',
                    422
                );
            }

            $classe = $query->first();

            if (!$classe) {
                return ApiResponse::erreur('Classe introuvable.', 'CLASSE_INTROUVABLE', 404);
            }

            $inscrits = $classe->apprenants()->where('statut', 'actif')->count();
            $places = max(0, $classe->capacite - $inscrits);

            return ApiResponse::succes([
                'id'                  => $classe->id,
                'uuid'                => $classe->uuid,
                'nom'                 => $classe->nom,
                'cycle'               => $classe->cycle,
                'niveau'              => $classe->niveau,
                'programme'           => $classe->programme,
                'capacite'            => (int) $classe->capacite,
                'inscrits'            => (int) $inscrits,
                'places_disponibles'  => $places,
                'est_complete'        => $places <= 0,
            ], 'Disponibilite recuperee');

        } catch (\Throwable $e) {
            return ApiResponse::erreur($e->getMessage(), 'ERREUR_DISPONIBILITE', 500);
        }
    }

    /**
     * Sérialisation standardisée d'un apprenant.
     */
    private function serialiser(Apprenant $apprenant): array
    {
        return [
            'id'             => $apprenant->id,
            'uuid'           => $apprenant->uuid,
            'matricule'      => $apprenant->matricule,
            'nom'            => $apprenant->nom,
            'prenom'         => $apprenant->prenom,
            'date_naissance' => $apprenant->date_naissance?->format('Y-m-d'),
            'sexe'           => $apprenant->sexe,
            'statut'         => $apprenant->statut,
            'classe'         => $apprenant->classe ? [
                'id'        => $apprenant->classe->id,
                'uuid'      => $apprenant->classe->uuid,
                'nom'       => $apprenant->classe->nom,
                'cycle'     => $apprenant->classe->cycle,
                'niveau'    => $apprenant->classe->niveau,
                'programme' => $apprenant->classe->programme,
            ] : null,
            'parents'        => $apprenant->parents->map(fn($p) => [
                'parent_id'    => $p->parent_id,
                'lien_parente' => $p->lien_parente,
            ])->all(),
            'nb_mutations'   => $apprenant->historique_classes_count ?? 0,
        ];
    }

    /**
     * Sérialisation standardisée d'un créneau d'emploi du temps.
     */
    private function serialiserCours(EmploiDuTemps $cours): array
    {
        return [
            'id'            => $cours->id,
            'uuid'          => $cours->uuid,
            'classe_id'     => $cours->classe_id,
            'classe_uuid'   => $cours->classe?->uuid,
            'classe_nom'    => $cours->classe?->nom,
            'enseignant_id' => $cours->enseignant_id,
            'matiere_id'    => $cours->matiere_id,
            'jour'          => $cours->jour,
            'heure_debut'   => $cours->heure_debut,
            'heure_fin'     => $cours->heure_fin,
            'salle'         => $cours->salle,
            'statut'        => $cours->statut,
        ];
    }
}
