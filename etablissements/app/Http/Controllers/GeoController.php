<?php

namespace App\Http\Controllers;

use App\Domain\Geo\GeoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Referentiel geographique mondial. Les listes de departements, communes et
 * arrondissements acceptent ?q=<texte> (recherche par nom) et ?limite=<n>
 * (50 par defaut, 200 au maximum) pour les niveaux tres peuples.
 */
class GeoController extends Controller
{
    public function __construct(private GeoService $geoService) {}

    public function pays(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'pays' => $this->geoService->listerPays($request->query('continent')),
        ]);
    }

    public function departements(Request $request, string $paysUuid): JsonResponse
    {
        return response()->json([
            'success' => true,
            'departements' => $this->geoService->listerDepartements($paysUuid, $request->query('q'), $this->limite($request)),
        ]);
    }

    public function communes(Request $request, string $departementUuid): JsonResponse
    {
        return response()->json([
            'success' => true,
            'communes' => $this->geoService->listerCommunes($departementUuid, $request->query('q'), $this->limite($request)),
        ]);
    }

    public function arrondissements(Request $request, string $communeUuid): JsonResponse
    {
        return response()->json([
            'success' => true,
            'arrondissements' => $this->geoService->listerArrondissements($communeUuid, $request->query('q'), $this->limite($request)),
        ]);
    }

    private function limite(Request $request): ?int
    {
        $limite = $request->query('limite');

        return is_numeric($limite) ? (int) $limite : null;
    }
}
