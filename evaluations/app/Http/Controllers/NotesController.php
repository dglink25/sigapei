<?php

namespace App\Http\Controllers;

use App\Integrations\RhClient;
use App\Integrations\ScolariteClient;
use App\Services\CalculService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Guide suprême 03-structure-projet.md : contrôleur cité explicitement.
 * Endpoints : POST /notes, GET /notes/classe/{uuid}, PUT /notes/{uuid}/corriger
 */
class NotesController extends Controller
{
    public function __construct(
        private readonly RhClient       $rh,
        private readonly ScolariteClient $scolarite,
        private readonly CalculService  $calcul,
    ) {}

    /**
     * POST /v1/notes
     * Guide requirements §1 : vérifier affectation RH + appartenance classe.
     * Période ouverte obligatoire.
     */
    public function saisir(Request $request): JsonResponse
    {
        // TODO(DECISION-18) : implémentation bloquée sur noms colonnes RH/Scolarité
        return response()->json(['message' => 'Non implémenté'], 501);
    }

    /**
     * GET /v1/notes/classe/{uuid}
     * Guide requirements §2 : filtré par affectation (enseignant) ou tenant (admin).
     */
    public function parClasse(Request $request, string $uuid): JsonResponse
    {
        return response()->json(['message' => 'Non implémenté'], 501);
    }

    /**
     * PUT /v1/notes/{uuid}/corriger
     * Guide requirements §12 : motif obligatoire, audit_note immuable,
     * invalidation cache Redis, nouvelle version PDF.
     */
    public function corriger(Request $request, string $uuid): JsonResponse
    {
        return response()->json(['message' => 'Non implémenté'], 501);
    }
}
