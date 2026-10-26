<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * CDC §7.1 : idempotence stricte sur les webhooks.
 * Confirmation exclusivement par webhook, jamais saisie manuelle.
 */
class PaiementController extends Controller
{
    /** POST /v1/paiements/initier */
    public function initier(Request $request): JsonResponse
    {
        return response()->json(['message' => 'Non implémenté'], 501);
    }

    /** POST /v1/webhooks/fedapay - vérifier signature + idempotence */
    public function webhookFedapay(Request $request): JsonResponse
    {
        return response()->json(['message' => 'Non implémenté'], 501);
    }

    /** POST /v1/webhooks/kkiapay */
    public function webhookKkiapay(Request $request): JsonResponse
    {
        return response()->json(['message' => 'Non implémenté'], 501);
    }
}
