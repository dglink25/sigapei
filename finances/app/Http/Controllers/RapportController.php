<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * CDC §10 : calcul directement depuis finances.transactions, pas de table séparée.
 */
class RapportController extends Controller
{
    /** GET /v1/rapports/etablissement/{tenant_uuid} */
    public function parEtablissement(Request $request, string $tenantUuid): JsonResponse
    {
        return response()->json(['message' => 'Non implémenté'], 501);
    }
}
