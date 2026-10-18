<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * CDC §6.1 : séparation des tâches - initiateur ≠ validateur, activée par défaut.
 */
class DecaissementController extends Controller
{
    /** POST /v1/decaissements */
    public function initier(Request $request): JsonResponse
    {
        return response()->json(['message' => 'Non implémenté'], 501);
    }

    /** PUT /v1/decaissements/{uuid}/valider */
    public function valider(Request $request, string $uuid): JsonResponse
    {
        return response()->json(['message' => 'Non implémenté'], 501);
    }

    /** PUT /v1/decaissements/{uuid}/rejeter - motif obligatoire */
    public function rejeter(Request $request, string $uuid): JsonResponse
    {
        return response()->json(['message' => 'Non implémenté'], 501);
    }
}
