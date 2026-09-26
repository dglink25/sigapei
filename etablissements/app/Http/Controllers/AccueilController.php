<?php

namespace App\Http\Controllers;

use App\Domain\PageAccueil\AccueilEtablissementService;
use App\Domain\PageAccueil\AccueilPlateformeService;
use Illuminate\Http\JsonResponse;

class AccueilController extends Controller
{
    public function __construct(
        private AccueilPlateformeService $plateformeService,
        private AccueilEtablissementService $etablissementService,
    ) {}

    public function plateforme(): JsonResponse
    {
        return response()->json(['success' => true, 'accueil' => $this->plateformeService->contenu()]);
    }

    public function etablissement(string $slug): JsonResponse
    {
        $contenu = $this->etablissementService->contenu($slug);

        if (! $contenu) {
            return response()->json(['success' => false, 'error' => ['code' => 'ETABLISSEMENT_INTROUVABLE']], 404);
        }

        return response()->json(['success' => true, 'accueil' => $contenu]);
    }
}
