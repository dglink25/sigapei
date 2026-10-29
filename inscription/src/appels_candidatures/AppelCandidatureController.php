<?php

namespace App\appels_candidatures;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Validation\Rule;

class AppelCandidatureController extends Controller
{
    public function __construct(
        private AppelCandidatureService $service,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $filtres = $request->only(['cycle', 'statut', 'annee_scolaire']);
        $appels = $this->service->lister($filtres);

        return response()->json([
            'succes' => true,
            'data'   => $appels,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $donnees = $request->validate([
            'cycle'                 => ['required', Rule::in(['maternelle', 'primaire', 'secondaire', 'universitaire'])],
            'annee_scolaire'        => ['nullable', 'string', 'max:20'],
            'titre'                 => ['nullable', 'string', 'max:255'],
            'description'           => ['nullable', 'string'],
            'date_debut'            => ['required', 'date'],
            'date_fin'              => ['required', 'date', 'after:date_debut'],
            'est_payant'            => ['sometimes', 'boolean'],
            'montant'               => ['nullable', 'numeric', 'min:0'],
            'devise'                => ['nullable', 'string', 'max:10'],
            'places_disponibles'    => ['nullable', 'integer', 'min:1'],
            'statut'                => ['sometimes', Rule::in(['brouillon', 'ouvert', 'ferme', 'termine', 'annule'])],

            // Cibles par cycle
            'groupe_id'             => ['nullable', 'integer'],
            'groupe_nom'            => ['nullable', 'string', 'max:100'],
            'est_cycle_unique'      => ['sometimes', 'boolean'],

            'promotion_nom'         => ['nullable', 'string', 'max:100'],
            'promotion_abreviation' => ['nullable', 'string', 'max:50'],
            'serie_nom'             => ['nullable', 'string', 'max:100'],
            'serie_code'            => ['nullable', 'string', 'max:50'],

            'cycle_univ'            => ['nullable', 'string', 'max:50'],
            'departement_nom'       => ['nullable', 'string', 'max:100'],
            'option_nom'            => ['nullable', 'string', 'max:100'],
            'niveau_etude'          => ['nullable', 'string', 'max:100'],
            'filiere_complete'      => ['nullable', 'string', 'max:255'],

            // Listes dynamiques
            'criteres_eligibilite'  => ['nullable', 'array'],
            'criteres_eligibilite.*.label' => ['required_with:criteres_eligibilite', 'string'],
            'criteres_eligibilite.*.type'  => ['required_with:criteres_eligibilite', 'string'],
            
            'pieces_fournir'        => ['nullable', 'array'],
            'pieces_fournir.*.libelle' => ['required_with:pieces_fournir', 'string'],
        ]);

        $appel = $this->service->creer($donnees);

        return response()->json([
            'succes'  => true,
            'message' => 'Appel à candidature lancé avec succès.',
            'data'    => $appel,
        ], 201);
    }

    public function show(string $uuid): JsonResponse
    {
        $appel = $this->service->trouverParUuid($uuid);

        return response()->json([
            'succes' => true,
            'data'   => $appel,
        ]);
    }

    public function update(Request $request, string $uuid): JsonResponse
    {
        $donnees = $request->validate([
            'cycle'                 => ['sometimes', Rule::in(['maternelle', 'primaire', 'secondaire', 'universitaire'])],
            'annee_scolaire'        => ['sometimes', 'nullable', 'string', 'max:20'],
            'titre'                 => ['sometimes', 'string', 'max:255'],
            'description'           => ['sometimes', 'nullable', 'string'],
            'date_debut'            => ['sometimes', 'date'],
            'date_fin'              => ['sometimes', 'date'],
            'est_payant'            => ['sometimes', 'boolean'],
            'montant'               => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'devise'                => ['sometimes', 'nullable', 'string', 'max:10'],
            'places_disponibles'    => ['sometimes', 'nullable', 'integer', 'min:1'],
            'statut'                => ['sometimes', Rule::in(['brouillon', 'ouvert', 'ferme', 'termine', 'annule'])],

            'groupe_id'             => ['sometimes', 'nullable', 'integer'],
            'groupe_nom'            => ['sometimes', 'nullable', 'string', 'max:100'],
            'est_cycle_unique'      => ['sometimes', 'boolean'],

            'promotion_nom'         => ['sometimes', 'nullable', 'string', 'max:100'],
            'promotion_abreviation' => ['sometimes', 'nullable', 'string', 'max:50'],
            'serie_nom'             => ['sometimes', 'nullable', 'string', 'max:100'],
            'serie_code'            => ['sometimes', 'nullable', 'string', 'max:50'],

            'cycle_univ'            => ['sometimes', 'nullable', 'string', 'max:50'],
            'departement_nom'       => ['sometimes', 'nullable', 'string', 'max:100'],
            'option_nom'            => ['sometimes', 'nullable', 'string', 'max:100'],
            'niveau_etude'          => ['sometimes', 'nullable', 'string', 'max:100'],
            'filiere_complete'      => ['sometimes', 'nullable', 'string', 'max:255'],

            'criteres_eligibilite'  => ['sometimes', 'nullable', 'array'],
            'pieces_fournir'        => ['sometimes', 'nullable', 'array'],
        ]);

        $appel = $this->service->modifier($uuid, $donnees);

        return response()->json([
            'succes'  => true,
            'message' => 'Appel à candidature mis à jour.',
            'data'    => $appel,
        ]);
    }

    public function terminer(string $uuid): JsonResponse
    {
        $appel = $this->service->marquerTermine($uuid);

        return response()->json([
            'succes'  => true,
            'message' => 'Appel à candidature marqué comme terminé.',
            'data'    => $appel,
        ]);
    }

    public function destroy(string $uuid): JsonResponse
    {
        $this->service->supprimer($uuid);

        return response()->json([
            'succes'  => true,
            'message' => 'Appel à candidature supprimé avec succès.',
        ]);
    }
}
