<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** CDC §4 : actif | grace | hibernation */
class AbonnementController extends Controller
{
    /** GET /v1/abonnements/{tenant_uuid} */
    public function statut(Request $request, string $tenantUuid): JsonResponse
    {
        return response()->json(['message' => 'Non implémenté'], 501);
    }

    /** POST /v1/abonnements/{tenant_uuid}/paiement */
    public function payer(Request $request, string $tenantUuid): JsonResponse
    {
        return response()->json(['message' => 'Non implémenté'], 501);
    }
}
