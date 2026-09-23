<?php

namespace App\Alertes;

use App\Common\TenantContext;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

/**
 * GET /interne/alertes-absences — endpoint interne reserve au back-office
 * du censeur (section 8 du CDC). Liste les apprenants ayant depasse le seuil
 * d'absences sur la periode glissante configuree.
 */
class AlerteController extends Controller
{
    public function __construct(
        private readonly AlerteAbsenceService $alertes,
    ) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'alertes' => $this->alertes->apprenantsEnAlerte(TenantContext::mustHaveTenant()),
        ]);
    }
}
