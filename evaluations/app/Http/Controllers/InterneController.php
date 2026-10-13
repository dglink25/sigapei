<?php

namespace App\Http\Controllers;

use App\Services\CalculService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Endpoints internes — protégés par X-Internal-Secret.
 * Guide design §3 endpoint 14 + requirements §16 + steering DECISION-03.
 */
class InterneController extends Controller
{
    public function __construct(
        private readonly CalculService $calcul,
    ) {}

    /**
     * GET /v1/interne/eligibilite-document/{apprenant_uuid}
     * Guide requirements §16 : disponibilité des bulletins pour une demande administrative.
     * Consommé par Demandes administratives.
     * Utilise le même CalculService que le reste du module.
     */
    public function eligibiliteDocument(Request $request, string $apprenantUuid): JsonResponse
    {
        return response()->json(['message' => 'Non implémenté'], 501);
    }
}
