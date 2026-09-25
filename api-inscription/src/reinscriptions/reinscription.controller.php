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
            'apprenant_id' => 'required|integer',
            'nouvelle_classe_id' => 'required|integer',
            'annee_scolaire' => 'required|string|max:20',
        ]);

        try {
            $resultat = $this->service->reconduireApprenant($validated);
            return ApiResponse::succes($resultat, 'Reinscription validee', 201);
        } catch (\Throwable $e) {
            return ApiResponse::erreur($e->getMessage(), 'ERREUR_REINSCRIPTION', 400);
        }
    }
}
