<?php

namespace App\Http\Controllers;

use App\Services\ContestationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Guide design §3 endpoint 9 + requirements §14.
 */
class ContestationsController extends Controller
{
    public function __construct(
        private readonly ContestationService $contestation,
    ) {}

    /**
     * POST /v1/contestations
     * Guide requirements §14.1 : statut initial "ouverte", motif obligatoire.
     */
    public function ouvrir(Request $request): JsonResponse
    {
        return response()->json(['message' => 'Non implémenté'], 501);
    }
}
