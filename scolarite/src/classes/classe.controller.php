<?php

namespace App\classes;

use App\common\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class ClasseController extends Controller
{
    public function __construct(
        protected ClasseService $service
    ) {}

    public function index(Request $request): JsonResponse
    {
        $filtres = $request->only(['cycle', 'programme', 'statut']);
        $classes = $this->service->listerClasses($filtres);

        $donnees = $classes->map(fn(Classe $c) => [
            'uuid' => $c->uuid,
            'nom' => $c->nom,
            'cycle' => $c->cycle,
            'niveau' => $c->niveau,
            'filiere' => $c->filiere,
            'programme' => $c->programme,
            'capacite' => $c->capacite,
            'inscrits_count' => $c->apprenants_count ?? 0,
            'places_disponibles' => $c->places_disponibles,
            'est_complete' => $c->est_complete,
            'statut' => $c->statut,
        ]);

        return ApiResponse::succes($donnees, 'Liste des classes recuperee avec succes');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nom' => 'required|string|max:100',
            'cycle' => 'required|string|in:primaire,secondaire,universitaire',
            'niveau' => 'required|string|max:50',
            'filiere' => 'nullable|string|max:100',
            'programme' => 'required|string|in:beninois,francais',
            'capacite' => 'required|integer|min:1|max:200',
        ]);

        try {
            $classe = $this->service->creerClasse($validated);

            return ApiResponse::succes([
                'uuid' => $classe->uuid,
                'nom' => $classe->nom,
                'cycle' => $classe->cycle,
                'niveau' => $classe->niveau,
                'filiere' => $classe->filiere,
                'programme' => $classe->programme,
                'capacite' => $classe->capacite,
                'statut' => $classe->statut,
            ], 'Classe creee avec succes', 201);
        } catch (\Throwable $e) {
            return ApiResponse::erreur($e->getMessage(), 'ERREUR_CREATION_CLASSE', 400);
        }
    }

    public function disponibilite(string $uuid): JsonResponse
    {
        try {
            $dispo = $this->service->verifierDisponibilite($uuid);
            return ApiResponse::succes($dispo, 'Disponibilite calculee');
        } catch (\Throwable $e) {
            return ApiResponse::erreur($e->getMessage(), 'CLASSE_INTROUVABLE', 404);
        }
    }
}
