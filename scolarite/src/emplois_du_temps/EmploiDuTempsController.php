<?php

namespace App\emplois_du_temps;

use App\common\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class EmploiDuTempsController extends Controller
{
    public function __construct(
        protected EmploiDuTempsService $service
    ) {}

    public function index(Request $request): JsonResponse
    {
        $filtres = $request->only(['classe_uuid', 'enseignant_id', 'jour']);
        $creneaux = $this->service->lister($filtres);

        $donnees = $creneaux->map(fn(EmploiDuTemps $c) => [
            'uuid' => $c->uuid,
            'classe' => [
                'uuid' => $c->classe?->uuid,
                'nom' => $c->classe?->nom,
            ],
            'enseignant_id' => $c->enseignant_id,
            'matiere_id' => $c->matiere_id,
            'creneau' => $c->creneau,
            'jour' => $c->jour,
            'heure_debut' => $c->heure_debut,
            'heure_fin' => $c->heure_fin,
            'salle' => $c->salle,
            'statut' => $c->statut,
        ]);

        return ApiResponse::succes($donnees, 'Emploi du temps recupere');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'uuid' => 'nullable|uuid',
            'classe_uuid' => 'required|uuid',
            'enseignant_id' => 'required|integer',
            'matiere_id' => 'required|integer',
            'creneau' => 'nullable|string|max:50',
            'jour' => 'required|string|in:lundi,mardi,mercredi,jeudi,vendredi,samedi',
            'heure_debut' => 'required|date_format:H:i',
            'heure_fin' => 'required|date_format:H:i|after:heure_debut',
            'salle' => 'nullable|string|max:50',
        ]);

        try {
            $creneau = $this->service->creerOuModifier($validated);

            return ApiResponse::succes([
                'uuid' => $creneau->uuid,
                'jour' => $creneau->jour,
                'heure_debut' => $creneau->heure_debut,
                'heure_fin' => $creneau->heure_fin,
                'salle' => $creneau->salle,
            ], 'Creneau enregistre avec succes', 201);
        } catch (\Throwable $e) {
            return ApiResponse::erreur($e->getMessage(), 'ERREUR_ENREGISTREMENT_CRENEAU', 400);
        }
    }
}
