<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InterneController extends Controller
{
    /**
     * GET /v1/interne/solde/{apprenant_uuid}
     * Consommé par Demandes administratives (CDC §17.6).
     */
    public function soldeApprenant(Request $request, string $apprenantUuid): JsonResponse
    {
        return response()->json(['message' => 'Non implémenté'], 501);
    }

    /**
     * GET /v1/interne/revenus-consolides
     * Super Admin uniquement (CDC §15).
     */
    public function revenusConsolides(Request $request): JsonResponse
    {
        return response()->json(['message' => 'Non implémenté'], 501);
    }
}
