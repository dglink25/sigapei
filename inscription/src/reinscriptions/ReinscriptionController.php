<?php

namespace App\reinscriptions;

use App\common\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class ReinscriptionController extends Controller
{
    public function __construct(
        protected ReinscriptionService $service
    ) {}

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'apprenant_id'         => 'nullable|integer',
            'apprenant_uuid'       => 'nullable|uuid',
            'nouvelle_classe_id'   => 'nullable|integer',
            'nouvelle_classe_uuid' => 'nullable|uuid',
            'annee_scolaire'       => 'required|string|max:20',
        ]);

        if (empty($validated['apprenant_id']) && empty($validated['apprenant_uuid'])) {
            return ApiResponse::erreur('Identifiant de l\'apprenant requis (id ou uuid).', 'CHAMPS_MANQUANTS', 422);
        }

        if (empty($validated['nouvelle_classe_id']) && empty($validated['nouvelle_classe_uuid'])) {
            return ApiResponse::erreur('Identifiant de la nouvelle classe requis (id ou uuid).', 'CHAMPS_MANQUANTS', 422);
        }

        try {
            $resultat = $this->service->reconduireApprenant($validated);
            return ApiResponse::succes($resultat, 'Reinscription validee', 201);
        } catch (\Throwable $e) {
            return ApiResponse::erreur($e->getMessage(), 'ERREUR_REINSCRIPTION', 400);
        }
    }
}
