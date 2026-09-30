<?php

namespace App\candidatures;

use App\common\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class CandidatureController extends Controller
{
    public function __construct(
        protected CandidatureService $service
    ) {}

    public function index(Request $request): JsonResponse
    {
        $filtres = $request->only(['statut', 'classe_visee_id', 'recherche']);
        $candidatures = $this->service->listerCandidatures($filtres);

        $donnees = $candidatures->map(fn(Candidature $c) => [
            'uuid' => $c->uuid,
            'nom' => $c->nom,
            'prenom' => $c->prenom,
            'date_naissance' => $c->date_naissance?->format('Y-m-d'),
            'classe_visee_id' => $c->classe_visee_id,
            'statut' => $c->statut,
            'date_soumission' => $c->date_soumission?->toIso8601String(),
            'nb_pieces' => $c->piecesJustificatives->count(),
            'nb_tests' => $c->testsAdmission->count(),
        ]);

        return ApiResponse::succes($donnees, 'Liste des candidatures recuperee');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nom' => 'required|string|max:100',
            'prenom' => 'required|string|max:100',
            'date_naissance' => 'required|date',
            'sexe' => 'nullable|string|in:M,F',
            'email' => 'nullable|email|max:150',
            'telephone' => 'nullable|string|max:50',
            'adresse' => 'nullable|string|max:255',
            'classe_visee_id' => 'required|integer',
            'parent_nom' => 'nullable|string|max:100',
            'parent_prenom' => 'nullable|string|max:100',
            'parent_telephone' => 'nullable|string|max:50',
            'parent_email' => 'nullable|email|max:150',
            'parent_lien' => 'nullable|string|max:50',
        ]);

        try {
            $candidature = $this->service->soumettreCandidature($validated);

            return ApiResponse::succes([
                'uuid' => $candidature->uuid,
                'statut' => $candidature->statut,
                'date_soumission' => $candidature->date_soumission->toIso8601String(),
            ], 'Candidature soumise avec succes', 201);
        } catch (\Throwable $e) {
            return ApiResponse::erreur($e->getMessage(), 'ERREUR_SOUMISSION_CANDIDATURE', 400);
        }
    }

    public function show(string $uuid): JsonResponse
    {
        try {
            $detail = $this->service->consulterDetail($uuid);
            return ApiResponse::succes($detail, 'Detail de la candidature');
        } catch (\Throwable $e) {
            return ApiResponse::erreur($e->getMessage(), 'CANDIDATURE_INTROUVABLE', 404);
        }
    }

    public function valider(string $uuid): JsonResponse
    {
        try {
            $resultat = $this->service->valider($uuid);
            return ApiResponse::succes($resultat, 'Candidature validee avec succes');
        } catch (\Throwable $e) {
            return ApiResponse::erreur($e->getMessage(), 'ERREUR_VALIDATION_CANDIDATURE', 400);
        }
    }

    public function rejeter(Request $request, string $uuid): JsonResponse
    {
        $validated = $request->validate([
            'motif' => 'required|string|min:5|max:500',
        ]);

        try {
            $resultat = $this->service->rejeter($uuid, $validated['motif']);
            return ApiResponse::succes($resultat, 'Candidature rejetee');
        } catch (\Throwable $e) {
            return ApiResponse::erreur($e->getMessage(), 'ERREUR_REJET_CANDIDATURE', 400);
        }
    }
}
