<?php

namespace App\Http\Controllers;

use App\Domain\Geo\GeoService;
use Illuminate\Http\JsonResponse;

class GeoController extends Controller
{
    public function __construct(private GeoService $geoService) {}

    public function pays(): JsonResponse
    {
        return response()->json(['success' => true, 'pays' => $this->geoService->listerPays()]);
    }

    public function departements(string $paysUuid): JsonResponse
    {
        return response()->json(['success' => true, 'departements' => $this->geoService->listerDepartements($paysUuid)]);
    }

    public function communes(string $departementUuid): JsonResponse
    {
        return response()->json(['success' => true, 'communes' => $this->geoService->listerCommunes($departementUuid)]);
    }

    public function arrondissements(string $communeUuid): JsonResponse
    {
        return response()->json(['success' => true, 'arrondissements' => $this->geoService->listerArrondissements($communeUuid)]);
    }
}
