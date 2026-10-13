<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Guide suprême 03-structure-projet.md : contrôleur cité explicitement.
 * PHASE 2 — bloqué tant que C0.1 + C0.2 non validés avec Roc (E-learning).
 *
 * Endpoints : POST /compositions, GET /compositions/{uuid}/supervision,
 *             POST /compositions/{uuid}/incidents
 */
class CompositionsController extends Controller
{
    /**
     * POST /v1/compositions
     * Guide compositions requirements §C1 : vérifier affectation,
     * créer evaluations (est_composition_en_ligne=true),
     * appeler ElearningClient::creerQuizComposition().
     */
    public function programmer(Request $request): JsonResponse
    {
        // TODO : PHASE 2 — bloqué sur C0.1 + C0.2
        return response()->json(['message' => 'Phase 2 — non implémenté'], 501);
    }

    /**
     * GET /v1/compositions/{uuid}/supervision
     * Guide compositions requirements §C5 : tableau de bord temps réel
     * (candidats connectés, statut, anomalies). Surveillance humaine uniquement.
     */
    public function supervision(Request $request, string $uuid): JsonResponse
    {
        return response()->json(['message' => 'Phase 2 — non implémenté'], 501);
    }

    /**
     * POST /v1/compositions/{uuid}/incidents
     * Guide compositions requirements §C3 : journalise dans surveillance_incident.
     * Jamais de donnée biométrique.
     */
    public function signalerIncident(Request $request, string $uuid): JsonResponse
    {
        return response()->json(['message' => 'Phase 2 — non implémenté'], 501);
    }
}
