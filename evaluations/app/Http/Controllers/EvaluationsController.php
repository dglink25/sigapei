<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Gestion des évaluations et des périodes.
 * Guide design §3 endpoints 3, 4.
 */
class EvaluationsController extends Controller
{
    /**
     * POST /v1/evaluations
     * Guide requirements §3 : crée une évaluation (matière, classe, type,
     * coefficient, date, période). Vérifie l'affectation enseignant.
     */
    public function creer(Request $request): JsonResponse
    {
        // TODO(DECISION-18) : vérification affectation via RhClient
        return response()->json(['message' => 'Non implémenté'], 501);
    }
}
