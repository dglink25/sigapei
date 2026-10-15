<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FactureController extends Controller
{
    /** POST /v1/factures — CDC §5 */
    public function creer(Request $request): JsonResponse
    {
        return response()->json(['message' => 'Non implémenté'], 501);
    }
}
